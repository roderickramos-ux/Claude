import "server-only";
import { z } from "zod";
import { fieldErrors } from "@/lib/validation/checkout";
import { requireRole, type Role, type SessionUser } from "../../auth/session";
import { UploadError, uploadFile, validateUpload, type Bucket } from "../../storage";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

/** Wraps an admin server action with a role check and uniform error handling. */
export async function guarded(min: Role, fn: (user: SessionUser) => Promise<ActionState | void>): Promise<ActionState> {
  const user = await requireRole(min);
  try {
    return (await fn(user)) ?? { ok: true, message: "Saved." };
  } catch (e) {
    if (e instanceof z.ZodError) return { message: "Please fix the highlighted fields.", errors: fieldErrors(e) };
    if (e instanceof UploadError) return { message: e.message };
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect()/notFound()
    if (e instanceof Error && e.name !== "Error") throw e;
    const message = e instanceof Error ? e.message : "Something went wrong";
    if (/duplicate key/.test(message)) return { message: "That value is already in use (e.g. slug or code must be unique)." };
    return { message };
  }
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

/** Uploads a file field if present; returns the storage path, or undefined when no file was chosen. */
export async function maybeUpload(fd: FormData, field: string, bucket: Bucket, folder: string, opts: Parameters<typeof validateUpload>[1]) {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return undefined;
  validateUpload(file, opts);
  return uploadFile(bucket, folder, file);
}
