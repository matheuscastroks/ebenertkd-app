import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Chakra_Petch } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { AppwriteConnectionCheck } from "@/components/appwrite/appwrite-connection-check";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Ebener TKD",
  description: "Treinos, frequência e vida na academia em um só lugar.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${chakraPetch.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <AppwriteConnectionCheck />
            <RegisterServiceWorker />
            {children}
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
