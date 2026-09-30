import { Card } from "@/components/ui/misc";
import { LinkedinIcon } from "@/components/site/social-icons";
import { facultyDisplayName, type FacultyRow } from "@/server/queries/catalog";
import { Cover } from "./cover";

export function FacultyCard({ person, compact = false }: { person: FacultyRow; compact?: boolean }) {
  const initials = person.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <Card className="overflow-hidden" id={person.slug}>
      <div className="flex gap-5 p-6">
        {person.photoPath ? (
          <Cover path={person.photoPath} alt={facultyDisplayName(person)} className="size-20 shrink-0 rounded-full sm:size-24" sizes="96px" />
        ) : (
          <div
            className="grid size-20 shrink-0 place-items-center rounded-full bg-primary-soft font-heading text-2xl text-primary sm:size-24"
            aria-hidden
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-xl leading-snug text-ink">{facultyDisplayName(person)}</h3>
          {person.positionTitle && <p className="mt-1 text-sm text-accent-strong">{person.positionTitle}</p>}
          {!compact && person.credentials.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-ink-muted">
              {person.credentials.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {person.linkedinUrl && (
            <a
              href={person.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <LinkedinIcon width={16} height={16} /> LinkedIn
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
