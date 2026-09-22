import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  github: {
    clientId: required("GITHUB_CLIENT_ID"),
    clientSecret: required("GITHUB_CLIENT_SECRET"),
    callbackUrl: process.env.GITHUB_CALLBACK_URL ?? "http://localhost:4000/auth/github/callback",
  },
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
};
