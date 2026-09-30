import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const colors = { navy: "#0f2342", gold: "#b08a3e", ink: "#1f2937", muted: "#6b7280", bg: "#f5f3ee", border: "#e5e1d6" };

export function EmailLayout({
  preview,
  heading,
  children,
  footerNote,
  businessName,
  contactEmail,
}: {
  preview: string;
  heading: string;
  children: ReactNode;
  footerNote?: string;
  businessName: string;
  contactEmail?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", maxWidth: 600, borderRadius: 8, overflow: "hidden", border: `1px solid ${colors.border}` }}>
          <Section style={{ backgroundColor: colors.navy, padding: "20px 28px" }}>
            <Text style={{ color: "#ffffff", fontFamily: "Georgia, serif", fontSize: 22, letterSpacing: 4, margin: 0 }}>PRAXIS</Text>
            <Text style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, margin: "4px 0 0", textTransform: "uppercase" }}>
              Center for Advanced Management
            </Text>
          </Section>
          <Section style={{ padding: "28px" }}>
            <Heading as="h1" style={{ color: colors.navy, fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 600, margin: "0 0 16px" }}>
              {heading}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: colors.border, margin: 0 }} />
          <Section style={{ padding: "16px 28px" }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: "18px", margin: 0 }}>
              {footerNote ? `${footerNote} ` : ""}
              {businessName}
              {contactEmail ? (
                <>
                  {" · "}
                  <Link href={`mailto:${contactEmail}`} style={{ color: colors.muted }}>
                    {contactEmail}
                  </Link>
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const P = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: colors.ink, fontSize: 15, lineHeight: "24px", margin: "0 0 14px" }}>{children}</Text>
);

export const Small = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: colors.muted, fontSize: 13, lineHeight: "20px", margin: "0 0 12px" }}>{children}</Text>
);

export const Cta = ({ href, children }: { href: string; children: ReactNode }) => (
  <Section style={{ margin: "8px 0 20px" }}>
    <Button
      href={href}
      style={{ backgroundColor: colors.navy, color: "#ffffff", borderRadius: 6, padding: "12px 22px", fontSize: 15, fontWeight: 600 }}
    >
      {children}
    </Button>
  </Section>
);

export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Section style={{ backgroundColor: colors.bg, borderRadius: 6, padding: "12px 16px", margin: "0 0 18px" }}>
      {rows.map(([k, v]) => (
        <Text key={k} style={{ color: colors.ink, fontSize: 14, lineHeight: "22px", margin: 0 }}>
          <span style={{ color: colors.muted }}>{k}: </span>
          <strong>{v}</strong>
        </Text>
      ))}
    </Section>
  );
}
