import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SupabaseAuthListener } from "@/lib/auth/client";
import { AuthHashRecovery } from "@/components/auth/auth-hash-recovery";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const PWA_THEME_COLOR = "#f97316";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopEasy - 您的優質購物平台",
  description: "探索精選好物，發現優質商家，享受便捷購物體驗",
  applicationName: "ShopEasy",
  appleWebApp: {
    capable: true,
    title: "ShopEasy",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PwaProvider>
          <SupabaseAuthListener>
            <AuthHashRecovery />
            {children}
          </SupabaseAuthListener>
        </PwaProvider>
      </body>
    </html>
  );
}

