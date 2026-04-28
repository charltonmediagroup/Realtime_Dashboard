export type Filter = Record<string, any>;
export type Projection = Record<string, 0 | 1>;
export type SortSpec = Record<string, 1 | -1>;

export interface FindOptions {
  projection?: Projection;
}

export interface UpdateOptions {
  upsert?: boolean;
}

export interface DbCursor<T = any> {
  sort(spec: SortSpec): DbCursor<T>;
  skip(n: number): DbCursor<T>;
  limit(n: number): DbCursor<T>;
  project(spec: Projection): DbCursor<T>;
  toArray(): Promise<T[]>;
}

export interface DbCollection<T = any> {
  findOne<R = T>(filter: Filter, options?: FindOptions): Promise<R | null>;
  find<R = T>(filter: Filter): DbCursor<R>;
  updateOne(
    filter: Filter,
    update: { $set: Record<string, any> },
    options?: UpdateOptions,
  ): Promise<void>;
}

export interface DbAdapter {
  kind: "sqlite" | "mongodb";
  getCollection<T = any>(name: string): DbCollection<T>;
  close(): Promise<void>;
}
