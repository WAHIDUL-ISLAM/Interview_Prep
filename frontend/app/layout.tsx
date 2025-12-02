import type { Metadata } from "next";
// 1. Import Lato
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "Interview Prep",
  description: "An AI powered interview preparation app.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        // 3. Apply the font class
        className={`${lato.className} antialiased pattern`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}