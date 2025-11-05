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
  title: "Can I Afford It? – Anna Murphy",
  description:
    "A 60-second money planner from financial guide Anna Murphy that checks your cushion, color-codes your money health, and emails you a personalized plan.",
  keywords: [
    "money planner",
    "budget tool",
    "cash cushion calculator",
    "Anna Murphy",
    "financial clarity",
  ],
  icons: {
    icon: "/favicon.svg",
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
