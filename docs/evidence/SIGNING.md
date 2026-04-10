# Evidence Signing

## Algorithm

Evidence records are signed using **Ed25519** (RFC 8032):
- 32-byte keys, 64-byte signatures
- Fast signing and verification
- No configuration (no key size, curve, or padding choices)
- Widely supported across languages and platforms

## Key identification

Each signing key is identified by `base64url(SHA-256(publicKey))`. This 43-character string appears in the `signature.key_id` field of every evidence record.

This scheme allows verification without a central key registry: anyone with the public key can recompute the key_id and match it against the record.

## Implementations

### LocalSigner (SaaS default)

The `LocalSigner` reads a 32-byte Ed25519 seed from:
1. Environment variable `DECERN_EVIDENCE_SIGNING_KEY` (base64-encoded)
2. File at path `DECERN_EVIDENCE_SIGNING_KEY_PATH` (raw 32 bytes)

If neither is set, `LocalSigner` can generate a new keypair (for development/testing only).

**Key generation:**
```bash
# Generate a 32-byte random seed and base64-encode it
openssl rand 32 | base64
```

Set the output as `DECERN_EVIDENCE_SIGNING_KEY` in your environment.

### ExternalKMSSigner (self-hosted / enterprise)

The `ExternalKMSSigner` is a stub interface designed for integration with external Key Management Systems. The interface (`Signer`) requires three methods:

- `sign(payload: Uint8Array): Promise<Uint8Array>` — Sign raw bytes
- `getPublicKey(): Promise<Uint8Array>` — Return the 32-byte Ed25519 public key
- `getKeyId(): Promise<string>` — Return `base64url(SHA-256(publicKey))`

#### Integration targets

| Provider | Integration approach |
|----------|---------------------|
| **AWS KMS** | Use `@aws-sdk/client-kms` with an Ed25519 signing key. `sign()` calls `Sign` with `ECDSA_SHA_256` message type. `getPublicKey()` calls `GetPublicKey`. |
| **GCP Cloud KMS** | Use `@google-cloud/kms`. Create an Ed25519 key in a key ring. `sign()` calls `asymmetricSign`. |
| **HashiCorp Vault** | Use the Transit secrets engine with an `ed25519` key. `sign()` calls `POST /transit/sign/:name`. |
| **PKCS#11 HSM** | Use `graphene-pk11` or `node-pkcs11`. Requires a PKCS#11 library from the HSM vendor. Sign with `CKM_EDDSA`. |

To implement: create a class extending `ExternalKMSSigner` (or directly implementing `Signer`) with the provider-specific logic. No changes to the evidence layer are needed.

## Key rotation

1. Generate a new keypair.
2. Set the new seed as the active signing key.
3. New records are signed with the new key.
4. Old records remain verifiable because the `key_id` in each record identifies which key signed it.
5. Export bundles include all public keys referenced in the records (`public_keys/` directory).

There is no need to re-sign old records.

## Verification

The `decern-gate verify-evidence <bundle>` command:
1. Reads all records from the bundle.
2. For each record, looks up the public key by `signature.key_id` in the `public_keys/` directory.
3. Recomputes `current_evidence_hash` from the record fields.
4. Verifies the Ed25519 signature over the hash bytes using the public key.
5. Reports any mismatches with the exact `evidence_id`.

## Security considerations

- Ed25519 private keys must never be logged, committed to version control, or transmitted over unencrypted channels.
- In production (SaaS), the signing key should be stored in a secrets manager (AWS Secrets Manager, GCP Secret Manager, etc.) and injected as an environment variable at deploy time.
- For self-hosted deployments in regulated environments, use `ExternalKMSSigner` with a hardware security module (HSM) so the private key never leaves the secure boundary.
- Key compromise: if a signing key is compromised, rotate immediately. All records signed with the compromised key should be considered unverifiable for audit purposes. The hash chain integrity is independent of the signature (the chain is based on hashes, not signatures), so chain verification still works.
