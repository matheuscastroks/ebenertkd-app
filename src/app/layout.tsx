import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AcademyConfigProvider } from "@/components/academy-config-provider";
import { getAcademyIdentity, getBeltContext, getPolicy } from "@/features/academy/config-service";
import { professorLabel, toBrand } from "@/features/academy/identity-rules";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallGuide } from "@/components/pwa/install-guide";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
  // A barra do navegador acompanha o canvas de cada aparência (HIG: a marca defere ao conteúdo).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getAcademyIdentity();
  return {
  title: identity.short_name,
  description: "Treinos, frequência e vida na academia em um só lugar.",
  applicationName: identity.short_name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: identity.short_name,
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
}

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const [identity, billingPolicy, belts] = await Promise.all([getAcademyIdentity(), getPolicy("billing"), getBeltContext()]);
  const config = { ...toBrand(identity), dueDayOptions: billingPolicy.due_day_options, professorLabel: professorLabel(identity), ...belts };
  return (
    <html lang="pt-BR">
      <body className={poppins.variable}>
        <AcademyConfigProvider value={config}>
          <TooltipProvider>
            <RegisterServiceWorker />
            <InstallGuide />
            {children}
            <Toaster closeButton position="top-right" />
          </TooltipProvider>
        </AcademyConfigProvider>
      </body>
    </html>
  );
}
