import type { ReactNode } from "react";
import { HeroEmblem } from "@/components/emblem";

/** Sign-in and sign-up: no navigation, just the emblem and a card. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="h-44 w-full sm:h-52" aria-hidden>
        <HeroEmblem />
      </div>
      <div className="glass rise mt-2 rounded-[28px] p-6 sm:p-8">{children}</div>
      <p className="mt-6 text-center text-xs text-faint">Golden Gist Studio · private to its owner</p>
    </main>
  );
}
