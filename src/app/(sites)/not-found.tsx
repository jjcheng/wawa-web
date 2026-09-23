import Link from "next/link";

export default function PublicStorefrontNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 font-[family-name:var(--font-inter)] text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">This page is not available.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">It may have moved, been removed, or never existed.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/80">
          Back to store
        </Link>
      </div>
    </main>
  );
}