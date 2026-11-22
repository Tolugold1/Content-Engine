import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { requireOwnerPage } from "@/lib/auth/session";

/** Everything inside the studio needs the owner to be signed in (checked here as well as in the proxy). */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const viewer = await requireOwnerPage();
  return (
    <>
      <SiteHeader viewer={viewer} />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">{children}</main>
    </>
  );
}
