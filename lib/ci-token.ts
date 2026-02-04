import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 32;
const HASH_ALG = "sha256";

/** Genera un token casuale (esadecimale, 64 caratteri). Da mostrare una sola volta all'utente. */
export function generateCiToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** Restituisce l'hash SHA-256 del token, per confronto con il valore salvato in DB. */
export function hashCiToken(token: string): string {
  return createHash(HASH_ALG).update(token, "utf8").digest("hex");
}
