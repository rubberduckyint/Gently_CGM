import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import {
  appRouter,
  createTRPCContext,
  initNotificationRouter,
} from "@gently/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

// Initialize the notification router with email configuration
initNotificationRouter({
  smtpHost: env.EMAIL_SERVER_HOST,
  smtpPort: env.EMAIL_SERVER_PORT,
  smtpUser: env.EMAIL_SERVER_USER,
  smtpPassword: env.EMAIL_SERVER_PASSWORD,
  emailFrom: env.EMAIL_FROM,
});

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        auth: auth,
        headers: req.headers,
      }),
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
