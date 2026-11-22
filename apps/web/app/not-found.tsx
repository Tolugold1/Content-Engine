import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="coin mx-auto h-16 w-16 text-2xl">G</div>
        <h1 className="mt-6 font-display text-3xl font-bold text-white">That video isn&apos;t here</h1>
        <p className="mt-2 text-muted">It may have been removed, or the link is wrong.</p>
        <Link href="/library" className="btn btn-gold mt-6">
          Back to the library
        </Link>
      </div>
    </main>
  );
}
