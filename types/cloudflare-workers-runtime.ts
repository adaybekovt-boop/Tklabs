declare global {
  type D1Database = Record<string, unknown>;

  interface Fetcher {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }
}

export const env: { DB?: D1Database } = {};

export class WorkerEntrypoint<Env = unknown> {
  declare env: Env;
}

export class DurableObject<Env = unknown> {
  declare env: Env;
}

export class WorkflowEntrypoint<Env = unknown> {
  declare env: Env;
}

export {};
