import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import "./globals.css";
import { MotionProvider } from "@/components/motion";

export const metadata: Metadata = {
  title: "Optimus — Grade the work, not how it was built",
  description:
    "One contract. Many different builds. Evidence-backed verdicts. Kane CLI acts in a real browser; Optimus judges the evidence deterministically.",
  openGraph: {
    title: "Optimus — Grade the work, not how it was built",
    description: "One contract. Many different builds. Evidence-backed verdicts.",
    images: ["/art/scene/H-01-plate.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#128aef",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only z-50 rounded-sm bg-paper px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
