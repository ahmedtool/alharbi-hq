/**
 * A small Firestore-style API on top of Supabase.
 *
 * All data lives in one table, `public.documents (collection, id, data jsonb)`
 * (see supabase/migrations/0001_init.sql). This module exposes the subset of
 * the Firestore API the app uses (collection, doc, query, where, orderBy,
 * limit, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch,
 * onSnapshot, Timestamp, serverTimestamp) so pages could move off Firebase
 * without rewriting their data logic.
 *
 * Timestamps are stored in JSON as {"__ts": "<ISO date>"} and come back as
 * Timestamp objects, so `.toDate()` keeps working.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const TABLE = "documents";
const PAGE_SIZE = 1000;

/* ---------------- Database handle ---------------- */

export interface Db {
  client: SupabaseClient;
}

/** Default handle for browser code. */
export const db: Db = { client: supabase };

/** Handle bound to another client (e.g. a server client acting as the user). */
export function dbFor(client: SupabaseClient): Db {
  return { client };
}

/* ---------------- Timestamps ---------------- */

export class Timestamp {
  constructor(private readonly date: Date) {}
  static now() { return new Timestamp(new Date()); }
  static fromDate(d: Date) { return new Timestamp(new Date(d.getTime())); }
  static fromMillis(ms: number) { return new Timestamp(new Date(ms)); }
  toDate() { return new Date(this.date.getTime()); }
  toMillis() { return this.date.getTime(); }
  get seconds() { return Math.floor(this.date.getTime() / 1000); }
  get nanoseconds() { return (this.date.getTime() % 1000) * 1e6; }
  toJSON() { return { __ts: this.date.toISOString() }; }
  isEqual(other: Timestamp) { return other instanceof Timestamp && other.toMillis() === this.toMillis(); }
}

/** Firestore's server timestamp; here the client clock is used. */
export function serverTimestamp() {
  return Timestamp.now();
}

function encode(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toJSON();
  if (value instanceof Date) return { __ts: value.toISOString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = encode(v); // Firestore rejects undefined; we drop it.
    }
    return out;
  }
  return value;
}

function decode(value: unknown): any {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === "__ts" && typeof obj.__ts === "string") {
      return new Timestamp(new Date(obj.__ts));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = decode(v);
    return out;
  }
  return value;
}

/* ---------------- References ---------------- */

export interface CollectionReference {
  kind: "collection";
  db: Db;
  path: string;
}

export interface DocumentReference {
  kind: "doc";
  db: Db;
  collection: string;
  id: string;
  path: string;
}

function joinPath(parts: string[]) {
  return parts.flatMap((p) => p.split("/")).filter(Boolean).join("/");
}

/** Firestore-style random id (20 alphanumerics). */
export function newId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function collection(db: Db, path: string, ...segments: string[]): CollectionReference {
  return { kind: "collection", db, path: joinPath([path, ...segments]) };
}

export function doc(dbOrCollection: Db | CollectionReference, path?: string, ...segments: string[]): DocumentReference {
  if ("kind" in dbOrCollection && dbOrCollection.kind === "collection") {
    const id = path ? joinPath([path, ...segments]) : newId();
    return makeDocRef(dbOrCollection.db, dbOrCollection.path, id);
  }
  const parts = joinPath([path ?? "", ...segments]).split("/");
  if (parts.length < 2 || parts.length % 2 !== 0) {
    throw new Error(`Invalid document path: ${parts.join("/")}`);
  }
  const id = parts.pop()!;
  return makeDocRef(dbOrCollection as Db, parts.join("/"), id);
}

function makeDocRef(db: Db, coll: string, id: string): DocumentReference {
  return { kind: "doc", db, collection: coll, id, path: `${coll}/${id}` };
}

/* ---------------- Queries ---------------- */

type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=";

type Constraint =
  | { type: "where"; field: string; op: WhereOp; value: unknown }
  | { type: "orderBy"; field: string; dir: "asc" | "desc" }
  | { type: "limit"; n: number };

export interface Query {
  kind: "query";
  ref: CollectionReference;
  constraints: Constraint[];
}

export function where(field: string, op: WhereOp, value: unknown): Constraint {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, dir: "asc" | "desc" = "asc"): Constraint {
  return { type: "orderBy", field, dir };
}

export function limit(n: number): Constraint {
  return { type: "limit", n };
}

export function query(ref: CollectionReference | Query, ...constraints: Constraint[]): Query {
  if (ref.kind === "query") return { ...ref, constraints: [...ref.constraints, ...constraints] };
  return { kind: "query", ref, constraints };
}

/** JSON path for PostgREST: data->a->>b (text) or data->a->b (json). */
function jsonPath(field: string, asText: boolean) {
  const parts = field.split(".");
  const last = parts.pop()!;
  return ["data", ...parts].join("->") + (asText ? "->>" : "->") + last;
}

function asText(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === "string" ? value : JSON.stringify(value);
}

/* ---------------- Snapshots ---------------- */

export class DocumentSnapshot<T = any> {
  constructor(
    public readonly ref: DocumentReference,
    private readonly _data: T | undefined
  ) {}
  get id() { return this.ref.id; }
  exists() { return this._data !== undefined; }
  data(): T | undefined { return this._data; }
}

export class QueryDocumentSnapshot<T = any> extends DocumentSnapshot<T> {
  data(): T { return super.data() as T; }
}

export class QuerySnapshot<T = any> {
  constructor(public readonly docs: QueryDocumentSnapshot<T>[]) {}
  get size() { return this.docs.length; }
  get empty() { return this.docs.length === 0; }
  forEach(cb: (d: QueryDocumentSnapshot<T>) => void) { this.docs.forEach(cb); }
}

export type DocumentData = Record<string, any>;

/* ---------------- Reads ---------------- */

function fail(action: string, error: { message: string; code?: string }): never {
  const err = new Error(`${action}: ${error.message}`) as Error & { code?: string };
  err.code = error.code;
  throw err;
}

export async function getDocs(q: CollectionReference | Query): Promise<QuerySnapshot> {
  const qq = q.kind === "query" ? q : query(q);
  const { db, path } = qq.ref;
  const limitC = qq.constraints.find((c) => c.type === "limit") as { n: number } | undefined;
  const wanted = limitC?.n ?? Infinity;

  const rows: { id: string; data: unknown }[] = [];
  for (let from = 0; rows.length < wanted; from += PAGE_SIZE) {
    let req = db.client.from(TABLE).select("id,data").eq("collection", path);
    for (const c of qq.constraints) {
      if (c.type !== "where") continue;
      const col = jsonPath(c.field, true);
      const v = asText(c.value);
      if (c.op === "==") req = req.eq(col, v);
      else if (c.op === "!=") req = req.neq(col, v);
      else if (c.op === "<") req = req.lt(col, v);
      else if (c.op === "<=") req = req.lte(col, v);
      else if (c.op === ">") req = req.gt(col, v);
      else if (c.op === ">=") req = req.gte(col, v);
    }
    const orders = qq.constraints.filter((c) => c.type === "orderBy") as Extract<Constraint, { type: "orderBy" }>[];
    for (const o of orders) req = req.order(jsonPath(o.field, false), { ascending: o.dir === "asc", nullsFirst: false });
    req = req.order("id", { ascending: true }); // stable paging

    const take = Math.min(PAGE_SIZE, wanted - rows.length);
    const { data, error } = await req.range(from, from + take - 1);
    if (error) fail(`getDocs(${path})`, error);
    rows.push(...(data ?? []));
    if (!data || data.length < take) break;
  }

  return new QuerySnapshot(
    rows.map((r) => new QueryDocumentSnapshot(makeDocRef(db, path, r.id), decode(r.data)))
  );
}

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  const { data, error } = await ref.db.client
    .from(TABLE)
    .select("data")
    .eq("collection", ref.collection)
    .eq("id", ref.id)
    .maybeSingle();
  if (error) fail(`getDoc(${ref.path})`, error);
  return new DocumentSnapshot(ref, data ? decode(data.data) : undefined);
}

/* ---------------- Writes ---------------- */

export async function addDoc(ref: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  const docRef = makeDocRef(ref.db, ref.path, newId());
  // No .select(): visitors may insert (e.g. support tickets) without being allowed to read back.
  const { error } = await ref.db.client
    .from(TABLE)
    .insert({ collection: ref.path, id: docRef.id, data: encode(data) });
  if (error) fail(`addDoc(${ref.path})`, error);
  return docRef;
}

export async function setDoc(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
  if (options?.merge) {
    const { error } = await ref.db.client.rpc("merge_document", {
      p_collection: ref.collection, p_id: ref.id, p_patch: encode(data), p_upsert: true,
    });
    if (error) fail(`setDoc(${ref.path})`, error);
    return;
  }
  const { error } = await ref.db.client
    .from(TABLE)
    .upsert({ collection: ref.collection, id: ref.id, data: encode(data) });
  if (error) fail(`setDoc(${ref.path})`, error);
}

export async function updateDoc(ref: DocumentReference, data: DocumentData) {
  const { error } = await ref.db.client.rpc("merge_document", {
    p_collection: ref.collection, p_id: ref.id, p_patch: encode(data), p_upsert: false,
  });
  if (error) fail(`updateDoc(${ref.path})`, error);
}

export async function deleteDoc(ref: DocumentReference) {
  const { error } = await ref.db.client
    .from(TABLE)
    .delete()
    .eq("collection", ref.collection)
    .eq("id", ref.id);
  if (error) fail(`deleteDoc(${ref.path})`, error);
}

/** Batched writes. Unlike Firestore they are applied in order, not atomically. */
export function writeBatch(_db: Db) {
  const ops: Array<() => Promise<void>> = [];
  const batch = {
    set(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
      ops.push(() => setDoc(ref, data, options));
      return batch;
    },
    update(ref: DocumentReference, data: DocumentData) {
      ops.push(() => updateDoc(ref, data));
      return batch;
    },
    delete(ref: DocumentReference) {
      ops.push(() => deleteDoc(ref));
      return batch;
    },
    async commit() {
      for (const op of ops) await op();
    },
  };
  return batch;
}

/* ---------------- Live updates ---------------- */

/**
 * Calls `onNext` with fresh results now and whenever the collection changes.
 * Returns an unsubscribe function.
 */
export function onSnapshot(
  q: CollectionReference | Query,
  onNext: (snap: QuerySnapshot) => void,
  onError?: (error: Error) => void
): () => void {
  const qq = q.kind === "query" ? q : query(q);
  const client = qq.ref.db.client;
  let stopped = false;
  const refresh = () =>
    getDocs(qq).then((s) => { if (!stopped) onNext(s); }, (e) => { if (!stopped) onError?.(e); });

  refresh();
  const channel = client
    .channel(`documents:${qq.ref.path}:${newId()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `collection=eq.${qq.ref.path}` },
      () => refresh()
    )
    .subscribe();

  return () => {
    stopped = true;
    client.removeChannel(channel);
  };
}
