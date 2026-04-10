/** Stub: evidence signer. Real implementation in cloud/lib/evidence/signer-factory.ts. */
export function getServerSigner(): unknown { return null; }
export async function signEvidenceHash(_hashHex: string): Promise<{ algorithm: string; key_id: string; value: string }> {
  return { algorithm: "none", key_id: "stub", value: "" };
}
