import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Poppins, Geist } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { AppwriteConnectionCheck } from "@/components/appwrite/appwrite-connection-check";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Ebenert KD",
  description: "PWA para gestão da academia de taekwondo com jornada do aluno e painel admin.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable}`}>
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
