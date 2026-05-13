import "server-only";

import { assertOracleEnv } from "@/lib/env";

export function getOracleConfig() {
  const env = assertOracleEnv();
  return {
    user: env.DB_USER!,
    password: env.DB_PASSWORD!,
    connectString: env.DB_CONNECT_STRING!,
  };
}
