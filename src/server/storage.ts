import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage. Production uses Supabase Storage (buckets "public" and "private");
 * local development falls back to ./.data/uploads, served by /api/files.
 *   public  — logos, course covers, faculty photos, brochures, payment QR codes
 *   private — proofs of payment (admin-only, served via short-lived signed URLs)
 */
export type Bucket = "public" | "private";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export class UploadError extends Error {}

export function validateUpload(
  file: File,
  opts: { images?: boolean; pdf?: boolean; svg?: boolean } = { images: true },
) {
  if (!file || file.size === 0) throw new UploadError("Please choose a file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("File is too large (max 4 MB).");
  const ok =
    (opts.images && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) ||
    (opts.svg && file.type === "image/svg+xml") ||
    (opts.pdf && file.type === "application/pdf");
  if (!ok) throw new UploadError("Unsupported file type.");
}

/** Stores a file and returns its storage path (e.g. "courses/2b1c….jpg"). */
export async function uploadFile(bucket: Bucket, folder: string, file: File): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("Unsupported file type.");
  const key = `${folder.replace(/[^a-z0-9/_-]/gi, "")}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(bucket).upload(key, bytes, { contentType: file.type, upsert: false });
    if (error) throw new UploadError(`Upload failed: ${error.message}`);
    return key;
  }
  const dest = path.join(LOCAL_ROOT, bucket, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  return key;
}

/** Public URL for a file in the public bucket. */
export function publicFileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && process.env.SUPABASE_SERVICE_ROLE_KEY) return `${url}/storage/v1/object/public/public/${key}`;
  return `/api/files/public/${key}`;
}

/** Short-lived URL for a private file. Callers must authorize first. */
export async function privateFileUrl(key: string, expiresInSeconds = 600): Promise<string | null> {
  const sb = supabase();
  if (sb) {
    const { data } = await sb.storage.from("private").createSignedUrl(key, expiresInSeconds);
    return data?.signedUrl ?? null;
  }
  return `/api/files/private/${key}`;
}

/** Local-dev only: read a stored file. */
export async function readLocalFile(bucket: Bucket, key: string) {
  const full = path.join(LOCAL_ROOT, bucket, key);
  if (!full.startsWith(path.join(LOCAL_ROOT, bucket) + path.sep)) throw new Error("Invalid path");
  const ext = path.extname(full).slice(1);
  const type = Object.entries(ALLOWED).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  return { bytes: await readFile(full), type };
}

export const isSupabaseStorage = () => supabase() !== null;
