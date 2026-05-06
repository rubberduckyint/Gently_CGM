import {
  createLocalJWKSet,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
} from "jose";
import { describe, expect, it } from "vitest";

import {
  buildJwks,
  loadPrivateKeyFromBase64,
  mintCgmTokenWithKey,
} from "./cgmToken";

const ISSUER = "https://api.gently.us";
const AUDIENCE = "cgm-cloud";
const KID = "test-key-2026-05";
const USER_ID = "user_abc123";

async function setup() {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  return { privateKey };
}

describe("cgmToken", () => {
  it("mints a token verifiable against the published JWKS", async () => {
    const { privateKey } = await setup();

    const before = Math.floor(Date.now() / 1000);
    const { token, expiresAt } = await mintCgmTokenWithKey({
      userId: USER_ID,
      issuer: ISSUER,
      privateKey,
      kid: KID,
    });
    const after = Math.floor(Date.now() / 1000);

    const jwks = await buildJwks(privateKey, KID);
    const getKey = createLocalJWKSet(jwks);

    const { payload, protectedHeader } = await jwtVerify(token, getKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(protectedHeader.alg).toBe("RS256");
    expect(protectedHeader.kid).toBe(KID);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.aud).toBe(AUDIENCE);
    expect(payload.iss).toBe(ISSUER);
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
    // 15 minute TTL
    expect(payload.exp).toBe((payload.iat as number) + 15 * 60);
    expect(Math.floor(expiresAt.getTime() / 1000)).toBe(payload.exp);
  });

  it("publishes only public key material in JWKS (no private params)", async () => {
    const { privateKey } = await setup();
    const jwks = await buildJwks(privateKey, KID);

    expect(jwks.keys).toHaveLength(1);
    const jwk = jwks.keys[0]!;
    expect(jwk.kty).toBe("RSA");
    expect(jwk.alg).toBe("RS256");
    expect(jwk.use).toBe("sig");
    expect(jwk.kid).toBe(KID);
    expect(jwk.n).toBeTruthy();
    expect(jwk.e).toBeTruthy();
    // Private key components must never leak
    for (const field of ["d", "p", "q", "dp", "dq", "qi"] as const) {
      expect(jwk[field]).toBeUndefined();
    }
  });

  it("loads a base64-encoded PKCS8 private key from env format", async () => {
    const { privateKey } = await setup();
    const pem = await exportPKCS8(privateKey);
    const body = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");

    const reloaded = await loadPrivateKeyFromBase64(body);

    // Round-trip: minting with the reloaded key should produce a token
    // verifiable against a JWKS derived from the original.
    const { token } = await mintCgmTokenWithKey({
      userId: USER_ID,
      issuer: ISSUER,
      privateKey: reloaded,
      kid: KID,
    });
    const jwks = await buildJwks(privateKey, KID);
    const getKey = createLocalJWKSet(jwks);
    const { payload } = await jwtVerify(token, getKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    expect(payload.sub).toBe(USER_ID);
  });
});
