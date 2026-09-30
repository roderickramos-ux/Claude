import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">404</p>
        <h1 className="mt-2 text-4xl text-ink">Page not found</h1>
        <p className="mt-3 text-ink-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/" className="text-primary underline">Home</Link>
          <Link href="/courses" className="text-primary underline">Browse courses</Link>
        </div>
      </div>
    </div>
  );
}
