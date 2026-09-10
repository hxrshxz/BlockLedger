/**
 * Browser-safe hashing helpers.
 *
 * All security-relevant hashing goes through Web Crypto's SHA-256, which is
 * async and unavailable during SSR — every entry point guards for that.
 */

import type { Hex } from "./types";

const HEX = "0123456789abcdef";

function toHex(buffer: ArrayBuffer): Hex {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return `0x${out}`;
}

/** Works in the browser, in Node >= 18 and inside Next's server runtime. */
function getSubtle(): SubtleCrypto | null {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  return c && "subtle" in c ? c.subtle : null;
}

/** True when real SHA-256 is available in this runtime. */
export function isCryptoAvailable(): boolean {
  return getSubtle() !== null;
}

function encode(input: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(input);
  // Return a standalone ArrayBuffer so the type is unambiguous.
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

/**
 * SHA-256 of a UTF-8 string or of raw bytes, as `0x…` hex.
 * Throws if the runtime has no Web Crypto — callers should not silently
 * downgrade to a weak hash for anything that backs an integrity claim.
 */
export async function sha256Hex(input: string | ArrayBuffer): Promise<Hex> {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error(
      "crypto.subtle is unavailable in this runtime; SHA-256 cannot be computed"
    );
  }
  const data = typeof input === "string" ? encode(input) : input;
  const digest = await subtle.digest("SHA-256", data);
  return toHex(digest);
}

/** SHA-256 of a file's bytes — the content integrity proof stored on an asset. */
export async function hashFile(file: File): Promise<Hex> {
  const buffer = await file.arrayBuffer();
  return sha256Hex(buffer);
}

/** `0xabcdef…123456` — for compact display of a digest or signature. */
export function shortHash(h: string, n = 6): string {
  if (!h) return "";
  const body = h.startsWith("0x") ? h.slice(2) : h;
  if (body.length <= n * 2) return h;
  const prefix = h.startsWith("0x") ? "0x" : "";
  return `${prefix}${body.slice(0, n)}…${body.slice(-n)}`;
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Renders a hex digest using the base58 alphabet so demo identifiers *look*
 * like Solana keys. This is a display encoding only — it is NOT a real
 * base58check encoding and must never be used to derive an address.
 */
export function toBase58Like(hex: string, length = 44): string {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  let out = "";
  for (let i = 0; out.length < length; i++) {
    const pair = body.slice((i * 2) % body.length, ((i * 2) % body.length) + 2);
    const value = parseInt(pair || "00", 16) || i + 7;
    out += BASE58[(value + i * 31) % BASE58.length];
  }
  return out.slice(0, length);
}

/**
 * Synchronous, NON-CRYPTOGRAPHIC 32-bit FNV-1a digest.
 * Use only for React keys, colour pickers and other display-only ids.
 * Never use for audit hashes or content integrity.
 */
export function unsafeShortId(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
