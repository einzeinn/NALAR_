import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // INI YANG PALING PENTING!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NalarAI - Enterprise Risk Assistant",
  description: "AI-powered anomaly detection and risk scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}