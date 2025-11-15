import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Anna Murphy Presents: Can I Afford It? – Simple Money Health Check",
  description:
    "A simple, friendly money planner from Anna Murphy that helps you quickly see if a new purchase is Healthy, Tight, or Risky for your budget. No spreadsheets, just clarity.",
  keywords: [
    "Anna Murphy",
    "Can I Afford It",
    "money health check",
    "budget planner",
    "bookkeeping for entrepreneurs",
    "Girl Let's Talk Money",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Anna Murphy Presents: Can I Afford It?",
    description:
      "Check whether your next money move is Healthy, Tight, or Risky for your budget in 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
