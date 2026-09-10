"use client"

import { useRef, useState } from "react"
import { Plus, Minus } from "lucide-react"
import { motion, AnimatePresence, useInView } from "framer-motion"

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const faqs = [
    {
      question: "What exactly is a DID, and how is it different from a user account?",
      answer:
        "A decentralized identifier is a string of the form did:blkl:sol:<pubkey> that is derived from a keypair the holder controls. An account is a row in someone else's database and can be created, altered or deleted by whoever runs that database. A DID is proved by signing a challenge with the corresponding private key, so authentication is a cryptographic check rather than a lookup. BlockLedger publishes a W3C-shaped DID Document listing the Ed25519 verification method and pins it to IPFS; the registry records that the identity exists, but it does not own it.",
    },
    {
      question: "How is an NFT bound to an identity rather than to an address?",
      answer:
        "When an asset is minted, its owner field is set to the holder's DID and not to a bare wallet address or a display name. Because the DID resolves to a document containing the holder's verification method, the link between asset and owner stays verifiable even as the presentation layer changes. Reassignment is a governed operation: the contract logic permits it only for an authorized administrator, so an asset cannot be duplicated or silently moved to a different holder.",
    },
    {
      question: "How is role-based access control actually enforced?",
      answer:
        "There are four roles — Admin, Manager, Auditor and User — and an administrator maps each role to a set of permissions per identity. Enforcement happens in the contract layer that every operation passes through, not in the interface. A call made without the required permission reverts with a reason rather than being hidden behind a disabled button, which means the same rules apply whether the request arrives from the UI or from a direct call. Changes to the matrix are themselves recorded as audit events.",
    },
    {
      question: "What is stored on-chain, and what is stored on IPFS?",
      answer:
        "Payloads never go on-chain. A file is hashed with SHA-256 and pinned to IPFS, which returns a content identifier derived from the content itself. The registry records the DID, the content identifier and the hash; audit-chain checkpoints are anchored to Solana devnet. The consequence is that a retrieved file can be re-hashed and compared against the recorded value — either it matches, or it is not the file that was registered.",
    },
    {
      question: "What makes the audit trail tamper-proof?",
      answer:
        "Every entry commits to the hash of the entry before it, so the log is an append-only chain rather than a list of independent rows. Editing a historical record changes its hash, which invalidates the link held by the next entry and every entry after it. The platform recomputes the whole chain on demand and reports the first index at which it breaks. Anchoring checkpoints on-chain means the expected chain state is also recorded outside the platform's own storage.",
    },
    {
      question: "What happens if a private key is lost?",
      answer:
        "Self-sovereign identity means there is no administrator who can sign on the holder's behalf, so a lost key cannot be recovered by the platform. The recovery path is procedural rather than cryptographic: an administrator registers a new identity for the person and reassigns the affected assets, and both the new registration and each reassignment are written to the audit trail. The historical record remains intact and continues to show what the retired identity held and when custody moved.",
    },
    {
      question: "What is deployed today, and what is not?",
      answer:
        "BlockLedger anchors to Solana devnet and pins to IPFS through Pinata when credentials are configured. Without them it falls back to a local simulation that is labelled as such in the interface rather than presented as an on-chain result. It has not been deployed to mainnet and has not undergone an external security audit or certification. This build is a Smart India Hackathon submission for problem statement 26125, Bharat Electronics Limited.",
    },
  ]

  return (
    <section className="relative overflow-hidden pb-120 pt-24">
      {/* Background blur effects */}
      <div className="bg-primary/20 absolute top-1/2 -right-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl"></div>
      <div className="bg-primary/20 absolute top-1/2 -left-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl"></div>

      <div ref={ref} className="z-10 container mx-auto px-4">
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div className="border-primary/40 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase">
            <span>✶</span>
            <span className="text-sm">Faqs</span>
          </div>
        </motion.div>

        <motion.h2
          className="mx-auto mt-6 max-w-2xl text-center text-4xl font-medium md:text-[54px] md:leading-[60px]"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          How it{" "}
          <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent">
            works
          </span>
          , precisely
        </motion.h2>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="from-secondary/40 to-secondary/10 rounded-2xl border border-white/10 bg-gradient-to-b p-6 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] transition-all duration-300 hover:border-white/20 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleItem(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleItem(index)
                }
              }}
              {...(index === faqs.length - 1 && { "data-faq": faq.question })}
            >
              <div className="flex items-start justify-between">
                <h3 className="m-0 font-medium pr-4">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openItems.includes(index) ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className=""
                >
                  {openItems.includes(index) ? (
                    <Minus className="text-primary flex-shrink-0 transition duration-300" size={24} />
                  ) : (
                    <Plus className="text-primary flex-shrink-0 transition duration-300" size={24} />
                  )}
                </motion.div>
              </div>
              <AnimatePresence>
                {openItems.includes(index) && (
                  <motion.div
                    className="mt-4 text-muted-foreground leading-relaxed overflow-hidden"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                      opacity: { duration: 0.2 },
                    }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
