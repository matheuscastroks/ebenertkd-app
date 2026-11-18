import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallGuide } from "@/components/pwa/install-guide";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" }
  ],
  display: "swap",
  variable: "--font-body"
});

export const viewport: Viewport = {
  themeColor: "#f59300",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Ebener TKD",
  description: "Treinos, frequência e vida na academia em um só lugar.",
  applicationName: "Ebener TKD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ebener TKD",
  },
  icons: {
    icon: [
      { url: "/brand-icon.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={poppins.variable}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <RegisterServiceWorker />
            <InstallGuide />
            {children}
            <Toaster closeButton position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
