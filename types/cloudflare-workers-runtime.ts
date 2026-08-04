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
  declare protected ctx: DurableObjectState;
  declare protected env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export interface DurableObjectSqlCursor<T = unknown> {
  one(): T;
  toArray(): T[];
}

export interface DurableObjectStorageSql {
  exec<T = unknown>(query: string, ...bindings: unknown[]): DurableObjectSqlCursor<T>;
}

export interface DurableObjectState {
  storage: { sql: DurableObjectStorageSql };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

export class WorkflowEntrypoint<Env = unknown> {
  declare env: Env;
}

export {};
