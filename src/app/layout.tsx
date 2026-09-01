import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Disabilita la cache a livello di layout per evitare problemi di caching su mobile
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ Metadata ottimizzati per SEO e social sharing
export const metadata: Metadata = {
  title: {
    default: "NMP - Network Marketing Program",
    template: "%s | NMP",
  },
  description:
    "La piattaforma #1 per il Network Marketing digitale. Costruisci il tuo impero con matrice 5xN automatica, marketplace gratuito e guadagni multi-livello.",
  keywords: [
    "network marketing",
    "multi-level marketing",
    "matrice 5xN",
    "guadagni online",
    "business digitale",
    "affiliate marketing",
    "NMP",
  ],
  authors: [{ name: "NMP Team" }],
  creator: "NMP",
  publisher: "NMP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "NMP - Network Marketing Program",
    title: "NMP - Costruisci il Tuo Impero Digitale",
    description:
      "Unisciti a migliaia di imprenditori che stanno rivoluzionando il network marketing con strumenti digitali all'avanguardia.",
    images: [
      {
        url: "/og-image.jpg", // Aggiungi un'immagine 1200x630 nella cartella public
        width: 1200,
        height: 630,
        alt: "NMP - Network Marketing Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NMP - Network Marketing Program",
    description:
      "La piattaforma #1 per il Network Marketing digitale.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// ✅ Viewport ottimizzata per mobile (evita zoom indesiderati su input)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#4f46e5" },
  ],
};

// ✅ Tipo corretto per i children (sostituisce il LayoutProps errato)
type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {children}
      </body>
    </html>
  );
}