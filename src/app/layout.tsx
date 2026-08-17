import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://freefall-news.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Free-Fall News",
    template: "%s | Free-Fall News",
  },
  description:
    "Your source for the latest news in school and world news, made by students for students. World news, Hong Kong news, school news, sports and more.",
  keywords: [
    "Free-Fall News",
    "school news",
    "world news",
    "Hong Kong news",
    "student news",
    "NAISHK",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Free-Fall News",
    title: "Free-Fall News",
    description:
      "Your source for the latest news in school and world news, made by students for students.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Free-Fall News",
    description:
      "Your source for the latest news in school and world news, made by students for students.",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Free-Fall News",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  themeColor: "#23e1cb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-white text-ink">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function (OneSignal) {
  await OneSignal.init({
    appId: ${JSON.stringify(
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ""
    )},
    serviceWorkerParam: { scope: "/" },
    serviceWorkerPath: "OneSignalSDKWorker.js",
    notifyButton: { enable: false }
  });
});`}
        </Script>
      </body>
    </html>
  );
}
