import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendPilot | Shorts Studio",
  description: "Discover trends, produce Shorts, and manage your YouTube publishing pipeline.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
