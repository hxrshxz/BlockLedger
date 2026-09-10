"use client";

import { toast } from "sonner";
import { isContractRevert, revertMessage } from "@/lib/contracts/errors";

/**
 * Surfaces a failed mutation. A `ContractRevert` is shown *verbatim* — the
 * raw revert string is the point, so it is never paraphrased.
 */
export function reportRevert(e: unknown, fallback = "Transaction failed"): string {
  const message = revertMessage(e) || fallback;

  if (isContractRevert(e)) {
    toast.error("Transaction reverted", {
      description: message,
      duration: 8000,
    });
  } else {
    toast.error(fallback, { description: message, duration: 6000 });
  }

  return message;
}
