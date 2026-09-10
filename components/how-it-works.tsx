"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { GradientText } from "@/components/ui/gradient-text";
import { PillBadge } from "@/components/ui/pill-badge";
import { AnimatedButton } from "@/components/ui/animated-button";

const steps = [
  {
    step: "01",
    title: "Register an identity",
    route: "/identity",
    body: "A keypair produces a decentralized identifier — did:blkl:sol:<pubkey>. BlockLedger assembles a W3C-shaped DID Document containing the Ed25519 verification method and pins it to IPFS. The identity belongs to the holder; the platform only records that it exists.",
    outputs: ["DID string", "DID Document CID", "Registry entry"],
  },
  {
    step: "02",
    title: "Mint the asset as an NFT",
    route: "/assets",
    body: "The file — a document, design file, firmware image, certificate, licence or hardware passport — is hashed with SHA-256, pinned to IPFS, and minted as a token whose owner field is the holder's DID. Only an Admin may mint, enforced in contract logic.",
    outputs: ["SHA-256 digest", "IPFS CID", "Token bound to a DID"],
  },
  {
    step: "03",
    title: "Assign roles and permissions",
    route: "/access-control",
    body: "Admin, Manager, Auditor and User are mapped to explicit permissions against each identity. Every subsequent operation is evaluated against that matrix, and calls made without the required permission revert rather than degrade silently.",
    outputs: ["Role assignment", "Permission matrix", "Reverts on violation"],
  },
  {
    step: "04",
    title: "Verify on the immutable trail",
    route: "/audit",
    body: "Each of the preceding actions appends an entry that commits to the hash of the previous one. Re-running the chain check recomputes every link and anchors a checkpoint on Solana devnet, so any edit to history is surfaced rather than absorbed.",
    outputs: ["Hash-chained entries", "Tamper check", "On-chain anchor"],
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <SectionWrapper className="bg-gray-50/50 dark:bg-gray-900/20">
      <div className="mb-14 space-y-5 text-center">
        <PillBadge showArrow={false}>How it works</PillBadge>
        <h2 className="font-geist text-3xl font-bold tracking-tighter md:text-5xl">
          <GradientText variant="heading">From keypair to </GradientText>
          <GradientText variant="primary">verifiable provenance</GradientText>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Four operations cover the whole lifecycle. Each one leaves a record
          that the next one can be checked against.
        </p>
      </div>

      <div ref={ref} className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        {steps.map((s, idx) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="group relative flex flex-col gap-4 rounded-2xl border-[2px] border-black/5 bg-white/80 p-8 backdrop-blur-md transition-all duration-300 hover:scale-[1.01] dark:border-white/5 dark:bg-gray-950/80"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-geist text-4xl font-bold">
                <GradientText variant="primary">{s.step}</GradientText>
              </span>
              <a
                href={s.route}
                className="font-mono text-xs text-gray-500 transition-colors hover:text-blue-500 dark:text-gray-400"
              >
                {s.route}
              </a>
            </div>

            <h3 className="font-geist text-xl font-bold text-gray-900 dark:text-white">
              {s.title}
            </h3>

            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {s.body}
            </p>

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {s.outputs.map((o) => (
                <span
                  key={o}
                  className="rounded-full border border-black/5 bg-gradient-to-tr from-blue-600/10 to-cyan-500/10 px-3 py-1 font-mono text-[11px] text-gray-700 dark:border-white/10 dark:text-gray-300"
                >
                  {o}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Run the full sequence yourself — the platform ships with the registry,
          the permission matrix and the audit chain already wired together.
        </p>
        <AnimatedButton href="/dashboard">Launch Platform</AnimatedButton>
      </div>
    </SectionWrapper>
  );
}

export default HowItWorks;
