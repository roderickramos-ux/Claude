import { getCurrentUser, hasRole } from "@/server/auth/session";
import { isSupabaseStorage, readLocalFile } from "@/server/storage";

/** Serves locally stored uploads in development. Private files require a staff session. */
export async function GET(_: Request, ctx: RouteContext<"/api/files/[bucket]/[...path]">) {
  if (isSupabaseStorage()) return new Response("Not found", { status: 404 });
  const { bucket, path } = await ctx.params;
  if (bucket !== "public" && bucket !== "private") return new Response("Not found", { status: 404 });
  if (bucket === "private" && !hasRole(await getCurrentUser(), "staff")) return new Response("Forbidden", { status: 403 });
  try {
    const { bytes, type } = await readLocalFile(bucket, path.join("/"));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Cache-Control": bucket === "public" ? "public, max-age=3600" : "private, no-store",
        // SVG uploads must never execute scripts.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
