import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../.env" });
dotenv.config();

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  BACKEND_PORT: z.string().default("4000"),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PORT: z.string().default("5432"),
  POSTGRES_HOST: z.string().default("localhost"),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  UPLOAD_MAX_SIZE_MB: z.string().default("10"),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  BACKEND_PORT: Number(parsed.data.BACKEND_PORT),
  POSTGRES_PORT: Number(parsed.data.POSTGRES_PORT),
  UPLOAD_MAX_SIZE_MB: Number(parsed.data.UPLOAD_MAX_SIZE_MB)
};
