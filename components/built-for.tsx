"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Marquee } from "@/components/magicui/marquee";

const useCases = [
  {
    title: "Defence manufacturing",
    body: "Sub-assemblies, tooling records and build sheets move between plants and partners. Binding each record to a DID makes the holder of every revision explicit, and reassignment requires an authorized administrator rather than a shared folder permission.",
  },
  {
    title: "Secure document custody",
    body: "Classified drawings, tender documents and signed approvals are hashed before storage. Custody changes are ledger entries, so the question is not who currently has access but who has ever held it.",
  },
  {
    title: "Firmware & design-file provenance",
    body: "A firmware image or PCB design is registered by its SHA-256 digest. Anything later presented as that artefact either hashes to the recorded value or is demonstrably not the artefact that was registered.",
  },
  {
    title: "Contractor & vendor access",
    body: "External parties receive an identity with a scoped role instead of a shared credential. Permissions are evaluated by contract on every operation and withdrawn by changing the role, which is itself an audited event.",
  },
  {
    title: "Licence & certificate issuance",
    body: "Calibration certificates, test reports and software licences are minted as non-duplicable tokens. Verification is a lookup against the issuing identity, not a phone call to the issuer.",
  },
  {
    title: "Compliance auditing",
    body: "Auditors get a role that can read the full trail without the ability to mutate it. The chain check recomputes every link, so an audit is a computation rather than a request for cooperation.",
  },
];

const specs = [
  "did:blkl:sol:<pubkey>",
  "W3C DID Document",
  "Ed25519 verification method",
  "SHA-256 content hashing",
  "IPFS content identifiers",
  "Pinata pinning when configured",
  "Hash-chained append-only ledger",
  "Solana devnet anchoring",
  "Admin / Manager / Auditor / User",
  "Contract-enforced permission matrix",
  "Reverts on unauthorized calls",
  "Full-chain tamper detection",
];

export function BuiltForSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="mb-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-[640px]">
          <div className="flex justify-center">
            <div className="group relative z-[60] mx-auto rounded-full border border-white/20 bg-white/5 px-6 py-1 text-xs backdrop-blur md:text-sm">
              <div className="absolute inset-x-0 -top-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-[color:var(--brand-blue)] to-transparent shadow-2xl"></div>
              <div className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-[color:var(--brand-blue)] to-transparent shadow-2xl"></div>
              <span className="relative text-white">Built for</span>
            </div>
          </div>

          <h2 className="from-foreground/60 via-foreground to-foreground/60 dark:from-muted-foreground/55 dark:via-foreground dark:to-muted-foreground/55 relative z-10 mt-5 bg-gradient-to-r bg-clip-text text-center text-4xl font-semibold tracking-tighter text-transparent md:text-[54px] md:leading-[60px]">
            Where provenance has to hold
          </h2>

          <p className="relative z-10 mt-5 text-center text-lg text-zinc-500">
            Environments where an access log is not sufficient evidence and the
            authenticity of an artefact must be independently checkable.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {useCases.map((u, idx) => (
            <motion.div
              key={u.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: (idx % 3) * 0.1 }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-8 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset]"
            >
              <div className="absolute -top-5 -left-5 -z-10 h-40 w-40 rounded-full bg-gradient-to-b from-[color:var(--brand-blue)]/12 to-transparent blur-md"></div>
              <h3 className="text-lg font-medium tracking-tight text-white">
                {u.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {u.body}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14">
          <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Technical surface
          </p>
          <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <Marquee pauseOnHover className="[--duration:38s]">
              {specs.map((s) => (
                <span
                  key={s}
                  className="mx-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white/70"
                >
                  {s}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BuiltForSection;
