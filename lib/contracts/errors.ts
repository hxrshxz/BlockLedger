/**
 * Solidity-style reverts for the simulated contract layer.
 *
 * Messages deliberately mirror OpenZeppelin's wording so the demo reads like
 * a real EVM/Anchor deployment, and so the UI can surface the raw revert
 * string without translation.
 */

import type { Address, Permission, Role } from "@/lib/blockchain/types";

export type RevertContract =
  | "AccessControl"
  | "IdentityRegistry"
  | "AssetNFT"
  | "AuditTrail";

function short(account: string): string {
  if (!account) return "0x0";
  return account.length <= 12
    ? account
    : `${account.slice(0, 6)}…${account.slice(-4)}`;
}

export class ContractRevert extends Error {
  readonly name = "ContractRevert";
  /** The bare revert string, e.g. `IdentityRegistry: DID already registered`. */
  readonly reason: string;
  readonly contract: RevertContract;

  constructor(contract: RevertContract, reason: string) {
    super(`${contract}: ${reason}`);
    this.contract = contract;
    this.reason = `${contract}: ${reason}`;
    Object.setPrototypeOf(this, ContractRevert.prototype);
  }

  // -- AccessControl ------------------------------------------------------

  static missingRole(account: Address, role: Role): ContractRevert {
    return new ContractRevert(
      "AccessControl",
      `account ${short(account)} is missing role ${role}_ROLE`
    );
  }

  static missingPermission(
    account: Address,
    permission: Permission,
    role: Role
  ): ContractRevert {
    return new ContractRevert(
      "AccessControl",
      `account ${short(account)} with role ${role}_ROLE is missing permission ${permission}`
    );
  }

  static outOfScope(account: Address, permission: Permission): ContractRevert {
    return new ContractRevert(
      "AccessControl",
      `account ${short(account)} may only exercise ${permission} on its own records`
    );
  }

  static cannotSelfRevoke(account: Address): ContractRevert {
    return new ContractRevert(
      "AccessControl",
      `account ${short(account)} cannot revoke its own ADMIN_ROLE`
    );
  }

  // -- IdentityRegistry ---------------------------------------------------

  static didAlreadyRegistered(): ContractRevert {
    return new ContractRevert("IdentityRegistry", "DID already registered");
  }

  static didNotRegistered(did: string): ContractRevert {
    return new ContractRevert(
      "IdentityRegistry",
      `DID is not registered: ${short(did)}`
    );
  }

  static identityRevoked(did: string): ContractRevert {
    return new ContractRevert(
      "IdentityRegistry",
      `identity is revoked: ${short(did)}`
    );
  }

  static identityNotActive(did: string): ContractRevert {
    return new ContractRevert(
      "IdentityRegistry",
      `identity is not active: ${short(did)}`
    );
  }

  static invalidAddress(address: string): ContractRevert {
    return new ContractRevert(
      "IdentityRegistry",
      `invalid Solana address: ${short(address)}`
    );
  }

  // -- AssetNFT -----------------------------------------------------------

  static tokenDoesNotExist(tokenId?: string): ContractRevert {
    return new ContractRevert(
      "AssetNFT",
      tokenId
        ? `token does not exist: ${tokenId}`
        : "token does not exist"
    );
  }

  static notOwnerNorApproved(): ContractRevert {
    return new ContractRevert("AssetNFT", "caller is not owner nor approved");
  }

  static tokenBurned(tokenId: string): ContractRevert {
    return new ContractRevert("AssetNFT", `token is burned: ${tokenId}`);
  }

  static transferToSelf(): ContractRevert {
    return new ContractRevert("AssetNFT", "transfer to current owner");
  }

  static invalidReceiver(did: string): ContractRevert {
    return new ContractRevert(
      "AssetNFT",
      `transfer to non-active identity ${short(did)}`
    );
  }

  static emptyContentHash(): ContractRevert {
    return new ContractRevert("AssetNFT", "content hash is required to mint");
  }
}

/** Type guard so callers can distinguish reverts from infrastructure errors. */
export function isContractRevert(e: unknown): e is ContractRevert {
  return e instanceof ContractRevert;
}

/** Best-effort human message for any thrown value. */
export function revertMessage(e: unknown): string {
  if (isContractRevert(e)) return e.reason;
  if (e instanceof Error) return e.message;
  return String(e);
}
