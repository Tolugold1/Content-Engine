"use client";

import dynamic from "next/dynamic";

/** WebGL only runs in the browser; the gold coin shows while it loads. */
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="coin h-36 w-36 text-6xl opacity-80">G</div>
    </div>
  ),
});

export function HeroCanvas() {
  return (
    <div className="relative h-full w-full">
      <HeroScene />
    </div>
  );
}
