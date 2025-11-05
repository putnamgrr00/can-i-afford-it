import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="bg-[#f7f7f7] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
