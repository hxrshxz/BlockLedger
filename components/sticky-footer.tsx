"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

const columns: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Platform",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Identity Registry", href: "/identity" },
        { label: "Asset Registry", href: "/assets" },
      ],
    },
    {
      heading: "Governance",
      links: [
        { label: "Access Control", href: "/access-control" },
        { label: "Audit Trail", href: "/audit" },
        { label: "Wallet", href: "/wallet" },
      ],
    },
  ];

export function StickyFooter() {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const isNearBottom = scrollTop + windowHeight >= documentHeight - 100;

          setIsAtBottom(isNearBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isAtBottom && (
        <motion.div
          className="fixed bottom-0 left-0 z-50 flex h-80 w-full items-center justify-center"
          style={{ backgroundColor: "var(--brand-blue)" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            className="relative flex h-full w-full flex-col justify-between overflow-hidden px-8 py-10 md:px-12"
            style={{ color: "#121113" }}
          >
            <motion.div
              className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="max-w-sm">
                <div className="text-2xl font-semibold tracking-tight md:text-3xl">
                  BlockLedger
                </div>
                <p className="mt-2 text-sm leading-relaxed opacity-80">
                  Blockchain-based secure platform for identity, access control
                  and digital asset management.
                </p>
              </div>

              <div className="flex flex-row gap-12 text-sm sm:gap-16 md:gap-24 md:text-base">
                {columns.map((col) => (
                  <div key={col.heading}>
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-widest opacity-60">
                      {col.heading}
                    </div>
                    <ul className="space-y-2">
                      {col.links.map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            className="transition-opacity hover:underline hover:opacity-70"
                            style={{ color: "#121113" }}
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col gap-2 border-t border-black/15 pt-5 text-xs md:flex-row md:items-center md:justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <span className="opacity-80">
                Smart India Hackathon — Problem Statement 26125, Bharat
                Electronics Limited (BEL). Theme: Blockchain &amp;
                Cybersecurity.
              </span>
              <span className="font-mono opacity-70">
                blockledger.io · contact@blockledger.io
              </span>
            </motion.div>

            <div className="pointer-events-none absolute -bottom-4 right-6 select-none text-xs opacity-50">
              Anchored on Solana devnet · IPFS via Pinata when configured
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
