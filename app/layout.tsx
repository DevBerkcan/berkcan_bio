import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { KlaroCookieConsent } from "@/components/KlaroCookieConsent";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { TrackingProvider } from "@/components/analytics/TrackingProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Berk-Can Atesoglu | Software Developer & Entrepreneur",
  description:
    "Software Developer & Entrepreneur aus Düsseldorf. Spezialisiert auf React, Next.js & TypeScript. Portfolio, GitHub & Kontakt.",
  keywords: [
    "Berk-Can Atesoglu",
    "Software Developer",
    "Web Developer",
    "Entrepreneur",
    "React Developer",
    "Next.js",
    "TypeScript",
    "Düsseldorf",
    "Freelancer",
  ],
  icons: {
    icon: "/berkcan.png",
    shortcut: "/berkcan.png",
    apple: "/berkcan.png",
  },
  openGraph: {
    title: "Berk-Can Atesoglu | Software Developer & Entrepreneur",
    description:
      "Software Developer & Entrepreneur aus Düsseldorf. React, Next.js & TypeScript.",
    type: "website",
    locale: "de_DE",
    siteName: "Berk-Can Atesoglu",
    images: ["/berkcan.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Berk-Can Atesoglu | Software Developer & Entrepreneur",
    description:
      "Software Developer & Entrepreneur aus Düsseldorf.",
    images: ["/berkcan.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleAnalytics />
        <MicrosoftClarity />
        <ThemeProvider>
          <NextUIProvider>
            <Suspense fallback={null}>
              <TrackingProvider>
                <KlaroCookieConsent />
                {children}
              </TrackingProvider>
            </Suspense>
          </NextUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
