import type { Metadata } from "next";
import { DesignAnnotations } from "./components/design-annotations";
import { localHttpOrigin } from "./lib/local-http";
import { Open_Sans, IBM_Plex_Sans_Arabic, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./ten-signals.css";
import "./imported-design.css";
import "./report-research-controls.css";
import "./site-design.css";
import "./report-workspace.css";
import "./design-system.css";
import "./design-landing.css";
import "./design-report.css";
import "./design-account.css";
import "./agent-home.css";
import "./homepage-system.css";

const geistSans = Open_Sans({ variable: "--font-geist-sans", subsets: ["latin"] });
const arabicSans = IBM_Plex_Sans_Arabic({ variable: "--font-arabic", weight: ["400", "500", "600", "700"], subsets: ["arabic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "10 Signals — Know where your market is moving",
  description: "Evidence-backed competitive intelligence for startups, agencies, and ecommerce brands.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=dot", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-32.png?v=dot", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico?v=dot",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body data-local-self-host={localHttpOrigin() ? "true" : undefined} className={`${geistSans.variable} ${arabicSans.variable} ${geistMono.variable}`}>{children}{process.env.NODE_ENV === "development" && <DesignAnnotations />}</body></html>;
}
