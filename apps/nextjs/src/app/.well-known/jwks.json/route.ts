import { getCgmJwks } from "@gently/api";

export async function GET() {
  const jwks = await getCgmJwks();
  return new Response(JSON.stringify(jwks), {
    status: 200,
    headers: {
      "Content-Type": "application/jwk-set+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
