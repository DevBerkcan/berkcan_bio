import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { KlaroCookieConsent } from "@/components/KlaroCookieConsent";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { TrackingProvider } from "@/components/analytics/TrackingProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Berk-Can – Link in Bio | Premium Barbershop Düsseldorf",
  description:
    "Premium Barbershop in Düsseldorf – moderne Cuts, Fades & Bartpflege bei Berk-Can. Jetzt online Termin buchen!",
  keywords: [
    "Berk-Can",
    "Barbershop Düsseldorf",
    "Barber Düsseldorf",
    "Friseur Düsseldorf",
    "Fade Haircut",
    "Bartpflege",
    "Herrenfriseur",
    "Berliner Allee",
  ],
  openGraph: {
    title: "Berk-Can – Premium Barbershop Düsseldorf",
    description:
      "Premium Barbershop in Düsseldorf – moderne Cuts, Fades & Bartpflege. Jetzt online buchen!",
    type: "website",
    locale: "de_DE",
    siteName: "Berk-Can",
  },
  twitter: {
    card: "summary_large_image",
    title: "Berk-Can – Premium Barbershop Düsseldorf",
    description:
      "Premium Barbershop in Düsseldorf – moderne Cuts, Fades & Bartpflege. Online buchen!",
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
    <html lang="de">
      <body className={inter.className}>
        <GoogleAnalytics />
        <NextUIProvider>
          <Suspense fallback={null}>
            <TrackingProvider>
              {/* Klaro Cookie Consent - Open Source & Kostenlos */}
              <KlaroCookieConsent />
              {children}
            </TrackingProvider>
          </Suspense>
        </NextUIProvider>
      </body>
    </html>
  );
}
