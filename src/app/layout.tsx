import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { BadgeToastProvider } from "@/components/badges/BadgeToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recipe Chef - Your Personal Recipe Manager",
  description: "Organize, discover, and manage your recipes with AI-powered search and smart meal planning.",
  keywords: ["recipes", "cooking", "meal planning", "recipe manager", "chef"],
  authors: [{ name: "Recipe Chef" }],
  creator: "Recipe Chef",
  publisher: "Recipe Chef",
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.APP_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Recipe Chef - Your Personal Recipe Manager",
    description: "Organize, discover, and manage your recipes with AI-powered search and smart meal planning.",
    url: "/",
    siteName: "Recipe Chef",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recipe Chef - Your Personal Recipe Manager",
    description: "Organize, discover, and manage your recipes with AI-powered search and smart meal planning.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://cdn.paddle.com/paddle/paddle.js"
          data-vendor={process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID}
          data-environment={process.env.NEXT_PUBLIC_PADDLE_ENV === 'live' ? 'production' : 'sandbox'}
          async
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen flex flex-col antialiased`}>
        <BadgeToastProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <OfflineIndicator />
          <InstallPrompt />
          <Toaster />
        </BadgeToastProvider>
      </body>
    </html>
  );
}
