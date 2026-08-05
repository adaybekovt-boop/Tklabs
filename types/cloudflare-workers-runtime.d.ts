declare module "cloudflare:workers" {
  type D1Database = Record<string, unknown>;

  export const env: { DB?: D1Database };

  export class WorkerEntrypoint<Env = unknown> {
    env: Env;
  }

  export class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;

    constructor(ctx: DurableObjectState, env: Env);
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
    env: Env;
  }
}
