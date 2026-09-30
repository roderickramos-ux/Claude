import { brandedOgImage, ogSize } from "@/lib/og";

export const alt = "Praxis Center for Advanced Management: doctorate-led professional training";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return brandedOgImage({
    eyebrow: "Doctorate-led professional training",
    title: "Management education you can put to work on Monday.",
    subtitle: "Short, intensive programs for professionals and teams in the Philippines.",
  });
}
