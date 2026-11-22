import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BackgroundEmblem } from "@/components/emblem";

export const metadata: Metadata = {
  title: { default: "Golden Gist Studio", template: "%s · Golden Gist Studio" },
  description: "Review, download and track every Golden Gist video.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <div className="bg-aura" aria-hidden />
        <BackgroundEmblem />
        {children}
      </body>
    </html>
  );
}
