"use client";

import { useTheme } from "next-themes";
import Earth from "./ui/globe";
import ScrambleHover from "./ui/scramble";
import { FollowerPointerCard } from "./ui/following-pointer";
import { motion, useInView } from "framer-motion";
import { Suspense, useEffect, useRef, useState } from "react";
import { geist } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type Pillar = {
  title: string;
  body: string;
  detail: string[];
};

const pillars: Pillar[] = [
  {
    title: "Decentralized Identity",
    body: "Every participant holds a self-sovereign DID of the form did:blkl:sol:<pubkey>, derived from their own keypair. No central directory issues it and no administrator can silently revoke it — authentication is a cryptographic proof, not a database lookup.",
    detail: [
      "W3C-shaped DID Documents",
      "Ed25519 verification methods",
      "DID Document pinned to IPFS",
    ],
  },
  {
    title: "NFT-Based Asset Ownership",
    body: "Documents, design files, firmware images, certificates, licences and hardware passports are minted as NFTs. Each token is unique, traceable and bound directly to a holder's DID, creating a permanent and unforgeable link between the asset and its owner.",
    detail: [
      "SHA-256 content hash as the asset fingerprint",
      "Owner field references a DID, not an address alias",
      "Transfer history retained per token",
    ],
  },
  {
    title: "Smart-Contract Governance",
    body: "Minting, allocation, transfer and validation rules live in contract logic rather than in application code. Only authorized administrators can mint and assign assets, so unauthorized duplication or reassignment fails at the protocol layer instead of being caught after the fact.",
    detail: [
      "Deterministic authorization checks",
      "Unauthorized calls revert with a reason",
      "Same rules for UI, API and direct calls",
    ],
  },
  {
    title: "Role-Based Access Control",
    body: "Four roles — Admin, Manager, Auditor and User — are attached to identities, not to sessions. Administrators define which permissions each role carries, and the contracts evaluate that matrix on every single operation.",
    detail: [
      "Live role × permission matrix",
      "Permission changes are themselves audited",
      "Least-privilege by default for User and Auditor",
    ],
  },
  {
    title: "Immutable Audit Trail",
    body: "Identity creation, NFT minting, asset allocation, permission changes and ownership transfers are appended to a hash-chained ledger where every entry commits to the hash of the one before it. Altering any historical record breaks the chain and is detected immediately.",
    detail: [
      "Hash-chained, append-only entries",
      "Anchored on Solana devnet",
      "Built-in tamper detection over the full chain",
    ],
  },
  {
    title: "Content-Addressed Storage",
    body: "Payloads are addressed by their own hash rather than by location. The content identifier is what gets recorded on-chain, so a retrieved file either hashes back to the recorded value or it is not the file that was registered.",
    detail: [
      "IPFS pinning via Pinata when configured",
      "Clearly-labelled local simulation otherwise",
      "Hash verification on every retrieval",
    ],
  },
];

function PillarCard({
  pillar,
  index,
  isInView,
}: {
  pillar: Pillar;
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      className="group border-secondary/40 text-card-foreground relative col-span-12 flex flex-col gap-5 overflow-hidden rounded-xl border-2 p-6 shadow-xl md:col-span-6"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
      whileHover={{
        scale: 1.01,
        borderColor: "rgba(231, 138, 83, 0.6)",
        boxShadow: "0 0 30px rgba(231, 138, 83, 0.2)",
      }}
    >
      <div className="text-primary/70 font-mono text-xs tracking-widest">
        {String(index + 1).padStart(2, "0")}
      </div>
      <h3 className="text-2xl leading-none font-semibold tracking-tight uppercase">
        {pillar.title}
      </h3>
      <p className="text-muted-foreground max-w-[520px] text-sm leading-relaxed">
        {pillar.body}
      </p>
      <ul className="mt-auto flex flex-col gap-2 pt-2">
        {pillar.detail.map((d) => (
          <li
            key={d}
            className="text-muted-foreground/80 flex items-start gap-2 font-mono text-xs"
          >
            <span className="text-primary mt-[2px]">—</span>
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const { theme } = useTheme();
  const [isHovering, setIsHovering] = useState(false);

  const [baseColor, setBaseColor] = useState<[number, number, number]>([
    0.906, 0.541, 0.325,
  ]);
  const [glowColor, setGlowColor] = useState<[number, number, number]>([
    0.906, 0.541, 0.325,
  ]);
  const [dark, setDark] = useState<number>(theme === "dark" ? 1 : 0);

  useEffect(() => {
    setBaseColor([0.906, 0.541, 0.325]);
    setGlowColor([0.906, 0.541, 0.325]);
    setDark(theme === "dark" ? 1 : 0);
  }, [theme]);

  return (
    <section className="text-foreground relative overflow-hidden py-12 sm:py-24 md:py-32">
      <div className="bg-primary absolute -top-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full opacity-40 blur-3xl select-none"></div>
      <div className="via-primary/50 absolute top-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent"></div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto flex flex-col items-center gap-6 px-4 sm:gap-12"
      >
        <div className="flex flex-col items-center gap-4">
          <h2
            className={cn(
              "via-foreground bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-4xl font-semibold tracking-tighter text-transparent md:text-[54px] md:leading-[60px]",
              geist.className
            )}
          >
            The platform, in six parts
          </h2>
          <p className="text-muted-foreground max-w-2xl text-center text-sm md:text-base">
            Centralized IAM concentrates every credential behind one perimeter,
            and asset ownership is scattered across disconnected systems where
            provenance cannot be checked. BlockLedger removes both single points
            of failure.
          </p>
        </div>

        <FollowerPointerCard title={<span>BlockLedger</span>}>
          <div className="cursor-none">
            <div className="grid grid-cols-12 justify-center gap-4">
              {pillars.map((pillar, index) => (
                <PillarCard
                  key={pillar.title}
                  pillar={pillar}
                  index={index}
                  isInView={isInView}
                />
              ))}

              {/* On-chain anchoring */}
              <motion.div
                className="group border-secondary/40 text-card-foreground relative col-span-12 flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight uppercase">
                    Anchored on a public ledger
                  </h3>
                  <p className="text-muted-foreground max-w-[560px] text-sm leading-relaxed">
                    Audit-chain checkpoints are committed to Solana devnet, so
                    the record of who holds what — and who was allowed to change
                    it — is verifiable outside BlockLedger itself. Where network
                    credentials are not configured, the platform falls back to a
                    clearly-labelled local simulation rather than pretending an
                    anchor exists.
                  </p>
                </div>
                <div className="flex min-h-[320px] grow items-start justify-center select-none">
                  <h3 className="mt-8 text-center text-5xl leading-[100%] font-semibold sm:leading-normal lg:mt-12 lg:text-6xl">
                    <span className="bg-background relative mt-3 inline-block w-fit rounded-md border px-1.5 py-0.5">
                      <ScrambleHover
                        text="Verifiable"
                        scrambleSpeed={70}
                        maxIterations={20}
                        useOriginalCharsOnly={false}
                        className="cursor-pointer bg-gradient-to-t from-[#e78a53] to-[#e78a53] bg-clip-text text-transparent"
                        isHovering={isHovering}
                        setIsHovering={setIsHovering}
                        characters="abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;':\,./<>?"
                      />
                    </span>
                  </h3>
                  <div className="absolute top-64 z-10 flex items-center justify-center">
                    <div className="h-[400px] w-[400px]">
                      <Suspense
                        fallback={
                          <div className="bg-secondary/20 h-[400px] w-[400px] animate-pulse rounded-full"></div>
                        }
                      >
                        <Earth
                          baseColor={baseColor}
                          markerColor={[0, 0, 0]}
                          glowColor={glowColor}
                          dark={dark}
                        />
                      </Suspense>
                    </div>
                  </div>
                  <div className="absolute top-1/2 w-full translate-y-20 scale-x-[1.2] opacity-70 transition-all duration-1000 group-hover:translate-y-8 group-hover:opacity-100">
                    <div className="from-primary/50 to-primary/0 absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[512px] dark:opacity-100"></div>
                    <div className="from-primary/30 to-primary/0 absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-200 rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[256px] dark:opacity-100"></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </FollowerPointerCard>
      </motion.div>
    </section>
  );
}
