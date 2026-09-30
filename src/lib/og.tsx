import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/** Branded 1200×630 social card used for Open Graph / Twitter previews. */
export function brandedOgImage({ eyebrow, title, subtitle, footer }: { eyebrow: string; title: string; subtitle?: string; footer?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f2342 0%, #1b3a66 100%)",
          color: "white",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 10, background: "#0b1a33", border: "2px solid #c29a4b", color: "#c29a4b", fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>P</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, letterSpacing: 8 }}>PRAXIS</div>
            <div style={{ fontSize: 14, letterSpacing: 4, color: "rgba(255,255,255,0.7)" }}>CENTER FOR ADVANCED MANAGEMENT</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, letterSpacing: 5, color: "#c29a4b", textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 40 ? 64 : 76, lineHeight: 1.05, marginTop: 16, maxWidth: 1000 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 30, marginTop: 24, color: "rgba(255,255,255,0.82)", maxWidth: 1000 }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.7)" }}>{footer ?? "praxiscenter.ph"}</div>
      </div>
    ),
    ogSize,
  );
}
