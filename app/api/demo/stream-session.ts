import { estimateTextTokens } from "@/lib/ai/context";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { ErmaMeshError, streamWithErmaMesh } from "@/lib/ai/providers/mesh";
import { createAiResponseMeta } from "@/lib/ai/response";
import { aiStreamHeaders, encodeAiStreamEvent } from "@/lib/ai/sse";
import { encodeAgentRunEvent } from "@/lib/ai/stream-v2";
import type { AgentRunEventName } from "@/lib/ai/agent-run";
import { prepareReadOnlyToolAugmentation } from "@/lib/ai/tools/route-tools";
import type { AiProvider, AiToolCallTrace } from "@/lib/ai/types";
import { safetyRefusal } from "@/lib/ai-safety";
import { contextualFallbackPrompt, providerFailureReason, resolveFallback, streamInterruptedText, visionUnavailableText, withContextMetadata, withToolCalls } from "./fallback";
import type { PreparedDemoRequest } from "./request-context";

type StreamEvent = Parameters<typeof encodeAiStreamEvent>[0];

function withPersonalMemory(summary: string | undefined, memory: string) {
  return [summary, memory].filter(Boolean).join("\n\n") || undefined;
}

export class DemoStreamSession {
  private readonly providerController = new AbortController();
  private partialAnswer = "";
  private firstTokenAt = 0;
  private streamClosed = false;
  private toolCalls: AiToolCallTrace[] = [];
  private augmentedSummary: string | undefined;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private sequence = 0;
  private terminalSent = false;
  private quotaSettlement: Promise<void> | null = null;

  private settle(billable: boolean) {
    this.quotaSettlement ??= billable ? this.input.quota.commit() : this.input.quota.release();
    return this.quotaSettlement;
  }

  constructor(private readonly input: PreparedDemoRequest) {
    this.augmentedSummary = withPersonalMemory(input.context.summary, input.personalMemoryContext);
    if (input.request.signal.aborted) this.abortProvider();
    else input.request.signal.addEventListener("abort", this.abortProvider, { once: true });
  }

  response() {
    const responseStream = new ReadableStream<Uint8Array>({
      start: (controller) => { this.controller = controller; return this.run(); },
      cancel: async () => { this.detach(); this.providerController.abort("response_cancelled"); if (this.partialAnswer) await this.settle(true); else await this.settle(false); },
    });
    const headers = aiStreamHeaders(this.input.requestId, this.input.rateLimitCookie);
    headers.set("x-erma-run-protocol", "2.1");
    headers.set("x-erma-run-id", this.input.requestId);
    return new Response(responseStream, { status: 200, headers });
  }

  private readonly abortProvider = () => { if (!this.providerController.signal.aborted) this.providerController.abort(this.input.request.signal.reason); };
  private detach() { this.input.request.signal.removeEventListener("abort", this.abortProvider); }
  private sendNamed(event: AgentRunEventName, payload: unknown = {}) {
    if (this.streamClosed || !this.controller) return false;
    try {
      this.controller.enqueue(encodeAgentRunEvent({ event, runId: this.input.requestId, sequence: this.sequence++, timestamp: Date.now(), payload }));
      return true;
    } catch { this.streamClosed = true; return false; }
  }
  private send(event: StreamEvent, payload: unknown = {}) {
    if (this.streamClosed || !this.controller) return false;
    const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    if (event === "start") this.sendNamed("run.started", { requestId: this.input.requestId });
    if (event === "tool") this.sendNamed("tool.completed", data);
    if (event === "delta") this.sendNamed("answer.delta", { text: data.text });
    if (event === "error" && !this.terminalSent) { this.sendNamed("run.failed", { error: data.error, partial: data.partial }); this.terminalSent = true; }
    if (event === "done" && !this.terminalSent) { this.sendNamed(data.stopped === true ? "run.cancelled" : "run.completed", { requestId: this.input.requestId, partial: data.partial }); this.terminalSent = true; }
    try { this.controller.enqueue(encodeAiStreamEvent(event, payload)); return true; } catch { this.streamClosed = true; return false; }
  }
  private close() { if (this.streamClosed) return; this.streamClosed = true; this.detach(); try { this.controller?.close(); } catch { /* browser may close first */ } }
  private startPayload() { const { context, requestId } = this.input; return { requestId, status: "connecting", context: { estimatedTokens: context.estimatedTokens, messages: context.includedMessageCount, attachments: context.attachmentCount, limit: context.contextLimit, compacted: context.compacted } }; }

  private async run() {
    const { request, body, requestId, prompt, context, personalMemoryContext, language, model, requestedReasoning, effort, tone, privilegedAccount, documents, images, startedAt, requestedModel } = this.input;
    this.send("start", this.startPayload());
    this.sendNamed("run.status", { status: "using_tools" });
    try {
      const toolAugmentation = await prepareReadOnlyToolAugmentation({ request, requestId, prompt, context, language, model, localArchive: body.localArchive, documents, allowCodeSandbox: privilegedAccount, signal: this.providerController.signal, onToolStart: (id, name) => { this.sendNamed("tool.started", { id, name, status: "running" }); }, onToolComplete: (trace) => { this.send("tool", trace); } });
      this.toolCalls = toolAugmentation.traces;
      this.augmentedSummary = withPersonalMemory(toolAugmentation.summary, personalMemoryContext);
      this.sendNamed("run.status", { status: "generating", delivery: toolAugmentation.directGrounding || toolAugmentation.guardedAnswer ? "buffered" : "streaming" });

      if (toolAugmentation.directGrounding) {
        const direct = toolAugmentation.directGrounding;
        const delivered = this.send("delta", { text: direct.answer });
        if (!delivered) {
          if (!this.providerController.signal.aborted) this.providerController.abort("response_closed");
          throw new DOMException("Response closed", "AbortError");
        }
        this.firstTokenAt = Date.now();
        this.partialAnswer = direct.answer;
        await this.settle(true);
        const directResult = withContextMetadata(withToolCalls({
          answer: direct.answer,
          provider: "google-grounding",
          actualModel: direct.model,
          inputTokens: estimateTextTokens(prompt),
          outputTokens: estimateTextTokens(direct.answer),
          timeToFirstTokenMs: this.firstTokenAt - startedAt,
          grounding: direct.grounding,
        }, this.toolCalls), context);
        const meta = createAiResponseMeta(directResult, requestedModel, requestId, startedAt);
        logAiRequest(meta);
        this.send("meta", meta);
        this.send("done", { requestId, stopped: false });
        this.close();
        return;
      }

      if (toolAugmentation.guardedAnswer) {
        const guarded = toolAugmentation.guardedAnswer;
        const delivered = this.send("delta", { text: guarded.answer });
        if (!delivered) {
          if (!this.providerController.signal.aborted) this.providerController.abort("response_closed");
          throw new DOMException("Response closed", "AbortError");
        }
        this.firstTokenAt = Date.now();
        this.partialAnswer = guarded.answer;
        await this.settle(true);
        const guardedResult = withContextMetadata(withToolCalls({
          answer: guarded.answer,
          provider: "edge-fallback",
          actualModel: "kazakhstan-verification-guard",
          fallbackReason: guarded.reason,
          inputTokens: estimateTextTokens(prompt),
          outputTokens: estimateTextTokens(guarded.answer),
          timeToFirstTokenMs: this.firstTokenAt - startedAt,
        }, this.toolCalls), context);
        const meta = createAiResponseMeta(guardedResult, requestedModel, requestId, startedAt);
        logAiRequest(meta);
        this.send("meta", meta);
        this.send("done", { requestId, stopped: false });
        this.close();
        return;
      }

      const result = await streamWithErmaMesh({
        messages: context.messages,
        summary: this.augmentedSummary,
        language,
        model,
        requestedReasoning,
        effort,
        allowCode: privilegedAccount,
        tone,
        images,
        signal: this.providerController.signal,
        requestId,
        fairnessKey: this.input.quota.fairnessKey,
        estimatedInputTokens: context.estimatedTokens,
      }, async (delta) => {
        const delivered = this.send("delta", { text: delta });
        if (!delivered) { if (!this.providerController.signal.aborted) this.providerController.abort("response_closed"); return; }
        if (!this.firstTokenAt) this.firstTokenAt = Date.now();
        this.partialAnswer += delta;
        await this.settle(true);
      });

      const generationResult = withContextMetadata(withToolCalls({
        answer: result.answer,
        reasoningUsed: result.reasoningUsed,
        provider: result.provider,
        actualModel: result.actualModel,
        fallbackReason: result.fallbackReason,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined,
      }, this.toolCalls), context);
      const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
      await this.settle(true); logAiRequest(meta); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close();
    } catch (error) { await this.handleFailure(error); }
  }

  private async handleFailure(error: unknown) {
    const { requestId, language, model, privilegedAccount, context, images, startedAt, requestedModel } = this.input;
    const aborted = this.providerController.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    const meshProvider = error instanceof ErmaMeshError && error.provider !== "mesh" ? error.provider : undefined;
    const failureProvider: AiProvider = meshProvider ?? "nvidia";
    const failureModel = error instanceof ErmaMeshError && error.lane ? error.lane : model.nvidiaModel ?? model.name;
    if (aborted) {
      if (this.partialAnswer) await this.settle(true); else await this.settle(false);
      if (this.partialAnswer) {
        const stoppedResult = withContextMetadata(withToolCalls({ answer: this.partialAnswer, provider: failureProvider, actualModel: failureModel, outputTokens: estimateTextTokens(this.partialAnswer), timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined, fallbackReason: "generation_stopped" }, this.toolCalls), context);
        const meta = createAiResponseMeta(stoppedResult, requestedModel, requestId, startedAt, 499); logAiRequest(meta); this.send("meta", meta);
      }
      this.send("done", { requestId, stopped: true, partial: Boolean(this.partialAnswer) }); this.close(); return;
    }

    const reason = providerFailureReason(error);
    const status = error instanceof ErmaMeshError
      ? error.status
      : typeof error === "object" && error && "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
    logAiProviderFailure({ requestId, requestedModel, provider: error instanceof ErmaMeshError ? error.provider : failureProvider, status, reason });

    if (this.partialAnswer) {
      await this.settle(true);
      const partialResult = withContextMetadata(withToolCalls({ answer: this.partialAnswer, provider: failureProvider, actualModel: failureModel, fallbackReason: reason === "safety_output_blocked" ? reason : "provider_stream_interrupted", outputTokens: estimateTextTokens(this.partialAnswer), timeToFirstTokenMs: this.firstTokenAt ? this.firstTokenAt - startedAt : undefined }, this.toolCalls), context);
      const meta = createAiResponseMeta(partialResult, requestedModel, requestId, startedAt, reason === "safety_output_blocked" ? 200 : 502);
      logAiRequest(meta); this.send("meta", meta); this.send("error", { error: streamInterruptedText(language), requestId, partial: true }); this.send("done", { requestId, stopped: false, partial: true }); this.close(); return;
    }

    if (reason === "safety_output_blocked") {
      await this.settle(true);
      const safetyResult = withContextMetadata(withToolCalls({ answer: safetyRefusal(language), provider: "edge-fallback", actualModel: "safety-policy", fallbackReason: reason }, this.toolCalls), context);
      const meta = createAiResponseMeta(safetyResult, requestedModel, requestId, startedAt); logAiRequest(meta); this.send("delta", { text: safetyResult.answer }); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close(); return;
    }

    if (images.length) {
      await this.settle(false);
      const visionResult = withContextMetadata(withToolCalls({ answer: visionUnavailableText(language), provider: "edge-fallback", actualModel: "vision-unavailable", fallbackReason: reason }, this.toolCalls), context);
      const meta = createAiResponseMeta(visionResult, requestedModel, requestId, startedAt, 503);
      logAiRequest(meta); this.send("delta", { text: visionResult.answer }); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close(); return;
    }

    const fallback = withContextMetadata(withToolCalls(await resolveFallback({ prompt: contextualFallbackPrompt(context, this.augmentedSummary), language, allowCode: privilegedAccount, requestId, requestedModel, primaryReason: reason, signal: this.providerController.signal }), this.toolCalls), context);
    if (fallback.provider === "clodex") await this.settle(true); else await this.settle(false);
    const meta = createAiResponseMeta(fallback, requestedModel, requestId, startedAt); logAiRequest(meta); this.send("delta", { text: fallback.answer }); this.send("meta", meta); this.send("done", { requestId, stopped: false }); this.close();
  }
}
