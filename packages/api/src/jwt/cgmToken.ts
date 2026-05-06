import type { CryptoKey, JWK } from "jose";
import { exportJWK, importPKCS8, SignJWT } from "jose";

const ALG = "RS256";
const AUDIENCE = "cgm-cloud";
const DEFAULT_TTL_SECONDS = 15 * 60;

export interface CgmTokenJwks {
  keys: JWK[];
}

export interface MintCgmTokenResult {
  token: string;
  expiresAt: Date;
}

export async function mintCgmTokenWithKey(opts: {
  userId: string;
  issuer: string;
  privateKey: CryptoKey;
  kid: string;
  ttlSeconds?: number;
}): Promise<MintCgmTokenResult> {
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttl;

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALG, kid: opts.kid, typ: "JWT" })
    .setSubject(opts.userId)
    .setAudience(AUDIENCE)
    .setIssuer(opts.issuer)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(opts.privateKey);

  return { token, expiresAt: new Date(exp * 1000) };
}

export async function buildJwks(
  privateKey: CryptoKey,
  kid: string,
): Promise<CgmTokenJwks> {
  const fullJwk = await exportJWK(privateKey);
  // Strip private key components — JWKS must publish public material only.
  const { d, p, q, dp, dq, qi, ...publicJwk } = fullJwk;
  void d;
  void p;
  void q;
  void dp;
  void dq;
  void qi;
  return {
    keys: [{ ...publicJwk, kid, alg: ALG, use: "sig" }],
  };
}

export async function loadPrivateKeyFromBase64(
  base64Pkcs8: string,
): Promise<CryptoKey> {
  const body = base64Pkcs8.replace(/\s+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  const pem = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
  return importPKCS8(pem, ALG, { extractable: true });
}

let cachedKey: { kid: string; privateKey: CryptoKey } | null = null;

async function loadConfiguredKey(): Promise<{
  kid: string;
  privateKey: CryptoKey;
}> {
  if (cachedKey) return cachedKey;
  const b64 = process.env.CGM_TOKEN_PRIVATE_KEY;
  const kid = process.env.CGM_TOKEN_KID;
  if (!b64 || !kid) {
    throw new Error(
      "CGM_TOKEN_PRIVATE_KEY and CGM_TOKEN_KID must be set to mint CGM tokens",
    );
  }
  const privateKey = await loadPrivateKeyFromBase64(b64);
  cachedKey = { kid, privateKey };
  return cachedKey;
}

export async function mintCgmToken(opts: {
  userId: string;
  issuer: string;
  ttlSeconds?: number;
}): Promise<MintCgmTokenResult> {
  const { kid, privateKey } = await loadConfiguredKey();
  return mintCgmTokenWithKey({ ...opts, kid, privateKey });
}

export async function getCgmJwks(): Promise<CgmTokenJwks> {
  const { kid, privateKey } = await loadConfiguredKey();
  return buildJwks(privateKey, kid);
}
