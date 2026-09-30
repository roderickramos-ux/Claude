import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-4xl text-ink">Access denied</h1>
        <p className="mt-3 text-ink-muted">Your account does not have permission to view this page.</p>
        <Link href="/" className="mt-6 inline-block text-primary underline">Back to the site</Link>
      </div>
    </div>
  );
}
