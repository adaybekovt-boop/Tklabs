import { estimateTextTokens } from "@/lib/ai/context";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { streamWithNvidia } from "@/lib/ai/providers/nvidia";
import { createAiResponseMeta } from "@/lib/ai/response";
import { aiStreamHeaders, encodeAiStreamEvent } from "@/lib/ai/sse";
import { prepareReadOnlyToolAugmentation } from "@/lib/ai/tools/route-tools";
import type { AiToolCallTrace } from "@/lib/ai/types";
import { safetyRefusal } from "@/lib/ai-safety";
import { contextualFallbackPrompt, providerFailureReason, resolveFallback, streamInterruptedText, withContextMetadata, withToolCalls } from "./fallback";
import type { PreparedDemoRequest } from "./request-context";

type StreamEvent = Parameters<typeof encodeAiStreamEvent>[0];

export class DemoStreamSession {
  private readonly providerController = new AbortController();
  private partialAnswer = "";
  private firstTokenAt = 0;
  private streamClosed = false;
  private toolCalls: AiToolCallTrace[] = [];
  private augmentedSummary: string | undefined;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  constructor(private readonly input: PreparedDemoRequest) {
    this.augmentedSummary = input.context.summary;
    if (input.request.signal.aborted) this.abortProvider();
    else input.request.signal.addEventListener("abort", this.abortProvider, { once: true });
  }

  response() {
    const responseStream = new ReadableStream<Uint8Array>({
      start: (controller) => { this.controller = controller; return this.run(); },
      cancel: async () => { this.detach(); this.providerController.abort("response_cancelled"); if (this.partialAnswer) await this.input.quota.commit(); else await this.input.quota.release(); },
    });
    return new Response(responseStream, { status: 200, headers: aiStreamHeaders(this.input.requestId, this.input.rateLimitCookie) });
  }

  private readonly abortProvider = () => { if (!this.providerController.signal.aborted) this.providerController.abort(this.input.request.signal.reason); };
  private detach() { this.input.request.signal.removeEventListener("abort", this.abortProvider); }
  private send(event: StreamEvent, payload: unknown = {}) { if (this.streamClosed || !this.controller) return false; try { this.controller.enqueue(encodeAiStreamEvent(event, payload)); return true; } catch { this.streamClosed = true; return false; } }
  private close() { if (this.streamClosed) return; this.streamClosed = true; this.detach(); try { this.controller?.close(); } catch { /* browser may close first */ } }
  private startPayload() { const { context, requestId } = this.input; return { requestId, status: "connecting", context: { estimatedTokens: context.estimatedTokens, messages: context.includedMessageCount, attachments: context.attachmentCount, limit: context.contextLimit, compacted: context.compacted } }; }

  private async run() {
    const { request, body, requestId, prompt, context, language, model, requestedReasoning, effort, tone, privilegedAccount, documents, quota, startedAt, requestedModel } = this.input;
    this.send("start", this.startPayload());
    try {
      const toolAugmentation = await prepareReadOnlyToolAugmentation({ request, requestId, prompt, context, language, model, localArchive: body.localArchive, documents, allowCodeSandbox: privilegedAccount, signal: this.providerController.signal });
      this.toolCalls = toolAugmentation.traces;
      this.augmentedSummary = toolAugmentation.summary;
      for (const trace of this.toolCalls) this.send("tool", trace);

      const result = await streamWithNvidia({ messages: context.messages, summary: this.augmentedSummary, language, model, requestedReasoning, effort, allowCode: privilegedAccount, tone, signal: this.providerController.signal }, async (delta) => {
        const delivered = this.send("delta", { text: delta });
        if (!delivered) { if (!this.providerController.signal.aborted) this.providerController.abort("response_closed"); return; }
        if (!this.firstTokenAt) this.firstTokenAt = Date.now();
        this.partialAnswer += delta;
        await quota.commit();
      });

      const generationResult = withContextMetadata(withToolCalls({ answer: result.answer, reasoningUsed: result.reasoningUsed, provider: "nvidia", actualModel: result.actualModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens, timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined }, this.toolCalls), context);
      const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
      await quota.commit(); logAiRequest(meta); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close();
    } catch (error) { await this.handleFailure(error); }
  }

  private async handleFailure(error: unknown) {
    const { requestId, language, model, privilegedAccount, context, quota, startedAt, requestedModel } = this.input;
    const aborted = this.providerController.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    if (aborted) {
      if (this.partialAnswer) await quota.commit(); else await quota.release();
      if (this.partialAnswer) {
        const stoppedResult = withContextMetadata(withToolCalls({ answer: this.partialAnswer, provider: "nvidia", actualModel: model.nvidiaModel ?? model.name, outputTokens: estimateTextTokens(this.partialAnswer), timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined, fallbackReason: "generation_stopped" }, this.toolCalls), context);
        const meta = createAiResponseMeta(stoppedResult, requestedModel, requestId, startedAt, 499); logAiRequest(meta); this.send("meta", meta);
      }
      this.send("done", { requestId, stopped: true, partial: Boolean(this.partialAnswer) }); this.close(); return;
    }

    const reason = providerFailureReason(error);
    logAiProviderFailure({ requestId, requestedModel, provider: "nvidia", status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined, reason });

    if (this.partialAnswer) {
      await quota.commit();
      const partialResult = withContextMetadata(withToolCalls({ answer: this.partialAnswer, provider: "nvidia", actualModel: model.nvidiaModel ?? model.name, fallbackReason: reason === "safety_output_blocked" ? reason : "nvidia_stream_interrupted", outputTokens: estimateTextTokens(this.partialAnswer), timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined }, this.toolCalls), context);
      const meta = createAiResponseMeta(partialResult, requestedModel, requestId, startedAt, reason === "safety_output_blocked" ? 200 : 502);
      logAiRequest(meta); this.send("meta", meta); this.send("error", { error: streamInterruptedText(language), requestId, partial: true }); this.send("done", { requestId, stopped: false, partial: true }); this.close(); return;
    }

    if (reason === "safety_output_blocked") {
      await quota.commit();
      const safetyResult = withContextMetadata(withToolCalls({ answer: safetyRefusal(language), provider: "edge-fallback", actualModel: "safety-policy", fallbackReason: reason }, this.toolCalls), context);
      const meta = createAiResponseMeta(safetyResult, requestedModel, requestId, startedAt); logAiRequest(meta); this.send("delta", { text: safetyResult.answer }); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close(); return;
    }

    const fallback = withContextMetadata(withToolCalls(await resolveFallback({ prompt: contextualFallbackPrompt(context, this.augmentedSummary), language, allowCode: privilegedAccount, requestId, requestedModel, primaryReason: reason, signal: this.providerController.signal }), this.toolCalls), context);
    if (fallback.provider === "clodex") await quota.commit(); else await quota.release();
    const meta = createAiResponseMeta(fallback, requestedModel, requestId, startedAt); logAiRequest(meta); this.send("delta", { text: fallback.answer }); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close();
  }
}
