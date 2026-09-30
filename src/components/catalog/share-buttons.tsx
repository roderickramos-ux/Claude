"use client";

import { Check, Link2, Mail } from "lucide-react";
import { useState } from "react";
import { FacebookIcon, LinkedinIcon, MessengerIcon, XIcon } from "@/components/site/social-icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: FacebookIcon },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: LinkedinIcon },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, Icon: XIcon },
    { label: "Share on Viber", href: `viber://forward?text=${t}%20${u}`, Icon: MessengerIcon },
  ];
  const btn = "grid size-10 place-items-center rounded-full bg-muted text-primary transition-colors hover:bg-primary-soft";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-ink-muted">Share:</span>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={btn}>
          <Icon width={18} height={18} />
        </a>
      ))}
      <a href={`mailto:?subject=${t}&body=${u}`} aria-label="Share by email" className={btn}>
        <Mail className="size-[18px]" />
      </a>
      <button
        type="button"
        className={btn}
        aria-label={copied ? "Link copied" : "Copy link"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? <Check className="size-[18px]" /> : <Link2 className="size-[18px]" />}
      </button>
    </div>
  );
}
