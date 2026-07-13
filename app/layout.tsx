import type { Metadata } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://jim4226.github.io"),
  title: {
    default: "HumanVector Atlas — From Clocks to Coordinates",
    template: "%s · HumanVector Atlas",
  },
  description:
    "An interactive, cross-cohort evidence atlas exploring electrical, brain, skeletal, organ, motion, and genomic aging coordinates.",
  applicationName: "HumanVector Atlas",
  keywords: [
    "biological age",
    "ECG",
    "medical research",
    "multimodal atlas",
    "HeartVector",
  ],
  openGraph: {
    title: "HumanVector Atlas — From clocks to coordinates",
    description:
      "Explore real ECG records, frozen coordinate outputs, and an honest cross-cohort evidence story.",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "HumanVector Atlas — real scans, named structures, visible boundaries" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HumanVector Atlas",
    description: "Real ECG records. Hidden coordinates. Honest cross-cohort evidence.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
