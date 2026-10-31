import type { Metadata } from "next";
import "./globals.css";
import AppearanceControls from "@/components/appearance-controls";

export const metadata: Metadata = {
  title: "LUMI — Read beyond the words.",
  description: "A thoughtful English deep-reading companion. Explore language, discover meaning, and make every passage yours.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><AppearanceControls />{children}</body></html>;
}
