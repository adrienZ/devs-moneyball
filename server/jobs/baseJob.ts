import type { PgBoss, Job as PgBossJob, SendOptions } from "pg-boss";

export type Job<T extends object, N extends string> = {
  type: N;
  options: SendOptions;
  start: () => Promise<void>;
  work: (jobs: PgBossJob<T>[]) => Promise<void>;
  emit: (data: T) => Promise<void>;
};

export abstract class BaseJob<T extends object, N extends string> implements Job<T, N> {
  protected boss: PgBoss;
  abstract readonly type: N;
  readonly options: SendOptions = { retryLimit: 3, retryDelay: 1000 };

  constructor(boss: PgBoss) {
    this.boss = boss;
  }

  async start(): Promise<void> {
    await this.boss.work(this.type, this.work);
  }

  abstract work(jobs: PgBossJob<T>[]): Promise<void>;

  async emit(data: T): Promise<void> {
    await this.boss.send(this.type, data, this.options);
  }
}
