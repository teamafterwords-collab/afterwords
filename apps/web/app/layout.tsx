import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/next'
import "./globals.css";
import BugReportButton from '@/components/BugReportButton'
import { PaddleProvider } from '@/contexts/PaddleContext'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Afterwords App – AI Reading Journal & Reflection Companion",
  description: "Afterwords turns your reading into memory cards and AI reflections — see how your books connect over time. No streaks, no pressure. Try free for 30 days.",
  openGraph: {
    title: "Afterwords – AI Reading Journal & Reflection Companion",
    description: "Turn your reading into memory cards and AI reflections. See how your books connect over time. No streaks, no pressure. Try free for 30 days.",
    url: "https://myafterwordsapp.com",
    siteName: "Afterwords",
    images: [
      {
        url: "https://myafterwordsapp.com/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Afterwords — a quiet reading journal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Afterwords – AI Reading Journal & Reflection Companion",
    description: "Turn your reading into memory cards and AI reflections. See how your books connect over time. No streaks, no pressure.",
    images: ["https://myafterwordsapp.com/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;1,400&family=Spectral:ital,wght@0,400;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Afterwords",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "description": "An AI reading journal that helps you reflect on what you read, discover connections between books, and remember what stays with you.",
              "url": "https://myafterwordsapp.com",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Free",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                {
                  "@type": "Offer",
                  "name": "Afterwords Plus (Monthly)",
                  "price": "4.99",
                  "priceCurrency": "USD"
                },
                {
                  "@type": "Offer",
                  "name": "Afterwords Plus (Annual)",
                  "price": "47.88",
                  "priceCurrency": "USD"
                }
              ]
            }),
          }}
        />
      </head>
      <body>
        <PaddleProvider>
          {children}
          <BugReportButton />
        </PaddleProvider>
        <Analytics />
      </body>
    </html>
  )
}
