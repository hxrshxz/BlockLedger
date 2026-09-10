import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { appFontsClass } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/ErrorBoundary";
import SolanaWalletProvider from "@/components/WalletProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { ChainProvider } from "@/contexts/ChainContext";
import { LedgerProvider } from "@/contexts/LedgerContext";
import { Toaster } from "sonner";
import "./globals.css";
import ClientRouteClass from "./route-class-client";
import ServiceWorkerGuard from "@/components/ServiceWorkerGuard";

export const metadata: Metadata = {
  title:
    "BlockLedger — Decentralized Identity, Access Control & Digital Asset Management",
  description:
    "BlockLedger is a blockchain platform for decentralized identifiers (DIDs), NFT-based digital asset ownership, role-based access control enforced by smart contracts, and an immutable on-chain audit trail.",
  generator: "BlockLedger",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${appFontsClass} ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* External variable fonts for app pages (landing keeps Geist) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/satoshi@5.1.0/index.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/general-sans@5.1.0/index.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/supreme@5.1.0/index.css"
          rel="stylesheet"
        />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", GeistSans.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SolanaWalletProvider>
              <StorageProvider>
                {/* Chain + Ledger must sit inside the wallet provider: they
                    read `useWallet()` to decide onchain vs simulated mode. */}
                <ChainProvider>
                  <LedgerProvider>
                    {/* Applies the landing palette on `/` and `mono-dark`
                        everywhere else. */}
                    <ClientRouteClass>{children}</ClientRouteClass>
                    <Toaster
                      position="bottom-right"
                      richColors
                      closeButton
                      theme="dark"
                    />
                  </LedgerProvider>
                </ChainProvider>
              </StorageProvider>
            </SolanaWalletProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
