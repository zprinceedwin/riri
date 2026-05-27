import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stratton — Voice AI Sales Agents",
  description:
    "Voice AI sales agents with the personality of a real closer. Built on Agora + Couchbase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
