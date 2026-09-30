import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/settings-schema";
import { FacebookIcon, InstagramIcon, LinkedinIcon, MessengerIcon, TiktokIcon, YoutubeIcon } from "./social-icons";

export function SocialLinks({
  socials,
  className,
  tone = "dark",
}: {
  socials: SiteSettings["socials"];
  className?: string;
  tone?: "dark" | "light";
}) {
  const items = [
    { href: socials.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: socials.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
    { href: socials.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: socials.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: socials.tiktok, label: "TikTok", Icon: TiktokIcon },
    { href: socials.messenger, label: "Messenger", Icon: MessengerIcon },
  ].filter((i) => i.href);
  if (items.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={cn(
              "grid size-10 place-items-center rounded-full transition-colors",
              tone === "light" ? "bg-white/10 text-white hover:bg-white/20" : "bg-muted text-primary hover:bg-primary-soft",
            )}
          >
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  );
}
