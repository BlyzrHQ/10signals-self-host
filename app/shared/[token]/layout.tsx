import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared market report — 10 Signals",
  description: "A read-only 10 Signals report shared by its owner.",
  referrer: "same-origin",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function SharedReportLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
