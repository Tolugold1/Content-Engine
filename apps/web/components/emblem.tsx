"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

/** WebGL only runs in the browser; a flat gold coin shows while it loads. */
const EmblemScene = dynamic(() => import("./emblem-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="coin h-36 w-36 text-6xl opacity-80">G</div>
    </div>
  ),
});

/** The large spinning G in the Studio hero. */
export function HeroEmblem() {
  return (
    <div className="relative h-full w-full">
      <EmblemScene variant="hero" />
    </div>
  );
}

/**
 * A faint, slowly spinning G behind every screen except the Studio, which
 * already shows it in the hero. Fixed and click-through, so it never gets in the way.
 */
export function BackgroundEmblem() {
  const pathname = usePathname();
  // The Studio hero and the sign-in pages show the emblem up front instead.
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -right-[8vmin] top-[14vh] -z-1 h-[88vmin] w-[88vmin] opacity-40 [mask-image:radial-gradient(closest-side,black_60%,transparent)] max-sm:-right-[28vmin] max-sm:top-[38vh] max-sm:h-[110vmin] max-sm:w-[110vmin] max-sm:opacity-35"
    >
      <EmblemScene variant="background" />
    </div>
  );
}
