"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PillBadge } from "@/components/ui/pill-badge";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedButton } from "@/components/ui/animated-button";
import { SectionWrapper } from "@/components/ui/section-wrapper";

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  badge?: string;
  subtitle?: {
    regular: string;
    gradient: string;
  };
  description?: string;
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      badge = "Smart India Hackathon · PS 26125 · Bharat Electronics Limited",
      subtitle = {
        regular: "Identity, access and asset ownership ",
        gradient: "secured by cryptography, not by trust.",
      },
      description = "BlockLedger replaces centralized identity and asset registries with self-sovereign DIDs, NFT-bound asset ownership and smart-contract-enforced role permissions. Every identity creation, mint, allocation, permission change and transfer is written to a hash-chained ledger anchored on-chain — verifiable by anyone, alterable by no one.",
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative", className)} ref={ref} {...props}>
        <SectionWrapper>
          <div className="space-y-6 max-w-3xl mx-auto text-center">
            <PillBadge showArrow={false}>{badge}</PillBadge>

            <h1 className="text-4xl tracking-tighter font-geist font-bold mx-auto md:text-6xl">
              <GradientText variant="heading">{subtitle.regular}</GradientText>
              <GradientText variant="primary">{subtitle.gradient}</GradientText>
            </h1>

            <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
              {description}
            </p>

            <div className="items-center justify-center gap-x-4 space-y-3 sm:flex sm:space-y-0">
              <AnimatedButton href="/dashboard">Launch Platform</AnimatedButton>
              <Link
                href="/audit"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-4 text-xs font-medium text-gray-800 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10 dark:text-white"
              >
                View Audit Trail
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 font-mono text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500">
              <span>did:blkl:sol:&lt;pubkey&gt;</span>
              <span>W3C DID Documents</span>
              <span>SHA-256 content hashing</span>
              <span>Solana devnet anchoring</span>
              <span>IPFS pinning</span>
            </div>
          </div>
        </SectionWrapper>
      </div>
    );
  }
);

HeroSection.displayName = "HeroSection";
export default HeroSection;
