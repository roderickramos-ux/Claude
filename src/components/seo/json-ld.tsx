import { manilaDateTime } from "@/lib/dates";
import type { SiteSettings } from "@/lib/settings-schema";
import { absoluteUrl } from "@/lib/utils";
import type { CourseDetail } from "@/server/queries/catalog";
import { facultyDisplayName } from "@/server/queries/catalog";
import { publicFileUrl } from "@/server/storage";

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function OrganizationJsonLd({ settings }: { settings: SiteSettings }) {
  const sameAs = Object.values(settings.socials).filter((v) => /^https?:\/\//.test(v));
  const logo = publicFileUrl(settings.logoPath);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: settings.businessName,
        url: absoluteUrl("/"),
        ...(logo && { logo: logo.startsWith("http") ? logo : absoluteUrl(logo) }),
        ...(settings.contactEmail && { email: settings.contactEmail }),
        ...(settings.contactPhone && { telephone: settings.contactPhone }),
        ...(settings.address && {
          address: { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "PH" },
        }),
        ...(sameAs.length && { sameAs }),
      }}
    />
  );
}

export function CourseJsonLd({ course, settings }: { course: CourseDetail; settings: SiteSettings }) {
  const url = absoluteUrl(`/courses/${course.slug}`);
  const provider = { "@type": "Organization", name: settings.businessName, sameAs: absoluteUrl("/") };
  const instances = course.runs.map((run) => {
    const first = run.sessions[0];
    const last = run.sessions[run.sessions.length - 1];
    const mode = run.format === "online" ? "Online" : run.format === "hybrid" ? "Blended" : "Onsite";
    return {
      "@type": "CourseInstance",
      courseMode: mode,
      startDate: first ? manilaDateTime(first.date, first.start).toISOString() : run.startDate,
      endDate: last ? manilaDateTime(last.date, last.end).toISOString() : run.endDate,
      ...(run.venueName && {
        location: { "@type": "Place", name: run.venueName, address: run.venueAddress ?? "Philippines" },
      }),
      instructor: run.facultyList.map((f) => ({ "@type": "Person", name: facultyDisplayName(f) })),
      offers: {
        "@type": "Offer",
        price: (run.regularPriceCentavos / 100).toFixed(2),
        priceCurrency: "PHP",
        availability: run.isBookable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        url,
        category: "Paid",
      },
    };
  });

  const events = course.runs.map((run) => ({
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: `${course.title} (${run.code})`,
    description: course.summary ?? course.tagline ?? undefined,
    startDate: run.sessions[0] ? manilaDateTime(run.sessions[0].date, run.sessions[0].start).toISOString() : run.startDate,
    endDate: run.sessions.at(-1)
      ? manilaDateTime(run.sessions.at(-1)!.date, run.sessions.at(-1)!.end).toISOString()
      : run.endDate,
    eventStatus: run.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      run.format === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : run.format === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    location: [
      ...(run.format !== "online"
        ? [{ "@type": "Place", name: run.venueName ?? "Metro Manila", address: run.venueAddress ?? "Metro Manila, Philippines" }]
        : []),
      ...(run.format !== "in_person" ? [{ "@type": "VirtualLocation", url }] : []),
    ],
    organizer: { "@type": "Organization", name: settings.businessName, url: absoluteUrl("/") },
    offers: {
      "@type": "Offer",
      price: (run.regularPriceCentavos / 100).toFixed(2),
      priceCurrency: "PHP",
      availability: run.isBookable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url,
    },
    url,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.seoDescription ?? course.summary ?? course.tagline ?? course.title,
          url,
          provider,
          ...(instances.length && { hasCourseInstance: instances }),
          offers: course.runs[0] && {
            "@type": "Offer",
            price: (course.runs[0].regularPriceCentavos / 100).toFixed(2),
            priceCurrency: "PHP",
            category: "Paid",
          },
        }}
      />
      {events.map((e, i) => (
        <JsonLd key={i} data={e} />
      ))}
    </>
  );
}
