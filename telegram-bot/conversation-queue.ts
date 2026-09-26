export const CONVERSATION_BUSY_ERROR = "conversation_busy";

/** Keep a conversation's read → provider request → write sequence in order. */
export class ConversationQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;

  constructor(private readonly maxPending = 2) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    if (this.pending >= this.maxPending) return Promise.reject(new Error(CONVERSATION_BUSY_ERROR));
    this.pending += 1;
    const result = this.tail.then(task).finally(() => { this.pending -= 1; });
    // A failed provider request must not poison all subsequent messages.
    this.tail = result.catch(() => undefined);
    return result;
  }
}
