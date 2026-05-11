import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { isDebugEnabledServer } from "@/lib/debug/env";
import DebugButton from "@/components/debug/DebugButton";

const geistSans = localFont({
  src: "../../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Next API Debugger",
  description: "Local developer debug console for Next.js Server Components",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const debugEnabled = isDebugEnabledServer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Floating debug button — only rendered in development / test */}
        {debugEnabled && <DebugButton />}
      </body>
    </html>
  );
}
