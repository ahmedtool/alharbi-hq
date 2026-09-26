/**
 * Firebase-Storage-style helpers on top of Supabase Storage.
 * Everything lives in the public "files" bucket (see supabase/migrations).
 */
import { supabase } from "./supabase";

const BUCKET = "files";

export interface StorageHandle { bucket: string }
export interface StorageReference { bucket: string; fullPath: string; name: string }

export const storage: StorageHandle = { bucket: BUCKET };

// Supabase Storage only accepts ASCII-safe keys, but many file names here are Arabic.
const SAFE_SEGMENT = /^[A-Za-z0-9_!\-.*'() &$@=;:+,?]+$/;

function hash(text: string) {
  let h = 0x811c9dc5; // FNV-1a
  for (const ch of new TextEncoder().encode(text)) {
    h ^= ch;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Deterministically turns a path segment into a key Supabase accepts. */
export function safeSegment(segment: string) {
  if (SAFE_SEGMENT.test(segment)) return segment;
  const dot = segment.lastIndexOf(".");
  const ext = dot > 0 ? segment.slice(dot).replace(/[^A-Za-z0-9.]/g, "") : "";
  const base = (dot > 0 ? segment.slice(0, dot) : segment).replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${base || "file"}-${hash(segment)}${ext}`;
}

export function ref(handle: StorageHandle, path: string): StorageReference {
  const segments = path.replace(/^\/+/, "").split("/").filter(Boolean);
  const fullPath = segments.map(safeSegment).join("/");
  return { bucket: handle.bucket, fullPath, name: segments[segments.length - 1] ?? fullPath };
}

export async function uploadBytes(r: StorageReference, file: Blob | File) {
  const contentType = (file as File).type || undefined;
  const bucket = supabase.storage.from(r.bucket);
  // Try a plain upload first (visitors may only insert), then overwrite if it already exists.
  let { error } = await bucket.upload(r.fullPath, file, { contentType, upsert: false });
  if (error && /exists|duplicate/i.test(error.message)) {
    ({ error } = await bucket.upload(r.fullPath, file, { contentType, upsert: true }));
  }
  if (error) throw new Error(`uploadBytes(${r.fullPath}): ${error.message}`);
  return { ref: r };
}

export async function getDownloadURL(r: StorageReference): Promise<string> {
  return supabase.storage.from(r.bucket).getPublicUrl(r.fullPath).data.publicUrl;
}

export async function deleteObject(r: StorageReference) {
  const { error } = await supabase.storage.from(r.bucket).remove([r.fullPath]);
  if (error) throw new Error(`deleteObject(${r.fullPath}): ${error.message}`);
}
