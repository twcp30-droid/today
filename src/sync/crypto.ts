import { parseStoredState, type StoredState } from '../storage'

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Domain-separated salt so blob ids are not raw passphrase hashes. */
export const BLOB_ID_SALT = "today-app:sync-blob-id:v1";
export const PBKDF2_ITERATIONS = 210_000;
const VERSION = 1;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

export function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize("NFKC").trim();
}

export async function blobIdFromPassphrase(passphrase: string): Promise<string> {
  const normalized = normalizePassphrase(passphrase);
  if (!normalized) throw new CryptoError("Enter a passphrase");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${BLOB_ID_SALT}\0${normalized}`),
  );
  return bytesToHex(new Uint8Array(digest));
}

export async function encryptState(
  state: StoredState,
  passphrase: string,
  options?: { iterations?: number },
): Promise<string> {
  const normalized = normalizePassphrase(passphrase);
  if (!normalized) throw new CryptoError("Enter a passphrase");

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(normalized, salt, options?.iterations ?? PBKDF2_ITERATIONS);
  const plaintext = encoder.encode(JSON.stringify(state));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );

  const packed = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ciphertext.length);
  packed[0] = VERSION;
  packed.set(salt, 1);
  packed.set(iv, 1 + SALT_BYTES);
  packed.set(ciphertext, 1 + SALT_BYTES + IV_BYTES);
  return bytesToBase64(packed);
}

export async function decryptState(
  envelope: string,
  passphrase: string,
  options?: { iterations?: number },
): Promise<StoredState> {
  const normalized = normalizePassphrase(passphrase);
  if (!normalized) throw new CryptoError("Enter a passphrase");

  let packed: Uint8Array;
  try {
    packed = base64ToBytes(envelope);
  } catch {
    throw new CryptoError("Cloud data is not valid ciphertext");
  }
  if (packed.length < 1 + SALT_BYTES + IV_BYTES + 16 || packed[0] !== VERSION) {
    throw new CryptoError("Cloud data is not a Today sync blob");
  }

  const salt = packed.slice(1, 1 + SALT_BYTES);
  const iv = packed.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
  const ciphertext = packed.slice(1 + SALT_BYTES + IV_BYTES);
  const key = await deriveKey(normalized, salt, options?.iterations ?? PBKDF2_ITERATIONS);

  let plaintext: Uint8Array;
  try {
    plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
    );
  } catch {
    throw new CryptoError("Wrong passphrase, or this blob belongs to a different passphrase");
  }

  try {
    return parseStoredState(decoder.decode(plaintext));
  } catch {
    throw new CryptoError("Decrypted data was not a valid Today backup");
  }
}

async function deriveKey(
  passphrase: string,
  salt: BufferSource,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
