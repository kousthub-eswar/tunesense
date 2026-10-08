import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
const serverEnvPath = path.resolve(process.cwd(), 'server/.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().optional(),
  CLIENT_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB_NAME: z.string().default('tunesense'),
  JAMENDO_CLIENT_ID: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('[TuneSense Server] Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

const resolvedClientOrigin =
  parsedEnv.data.CLIENT_ORIGIN || parsedEnv.data.CLIENT_URL || 'http://localhost:5173';

const DEV_FALLBACK_JWT_SECRET = 'tunesense_dev_jwt_secret_key_minimum_32_characters_12345';
const resolvedJwtSecret =
  parsedEnv.data.JWT_SECRET ||
  (parsedEnv.data.NODE_ENV !== 'production' ? DEV_FALLBACK_JWT_SECRET : undefined);

export const config = {
  port: parsedEnv.data.PORT,
  nodeEnv: parsedEnv.data.NODE_ENV,
  clientOrigin: resolvedClientOrigin,
  clientUrl: resolvedClientOrigin,
  mongodbUri: parsedEnv.data.MONGODB_URI,
  mongodbDbName: parsedEnv.data.MONGODB_DB_NAME,
  jamendoClientId: parsedEnv.data.JAMENDO_CLIENT_ID,
  jwtSecret: resolvedJwtSecret,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',
} as const;

/**
 * Validates critical environment configuration on server startup.
 * In production, missing database or security credentials cause a clean fatal exit.
 * In development, helpful diagnostic warnings are emitted while degraded mode is maintained.
 */
export function validateStartupConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rawJwt = process.env.JWT_SECRET;

  if (config.isProduction) {
    if (!config.mongodbUri || config.mongodbUri.trim() === '') {
      errors.push('MONGODB_URI is required in production environment.');
    }
    if (!rawJwt || rawJwt.trim() === '') {
      errors.push('JWT_SECRET is required in production environment for secure session signing.');
    }
    if (!config.jamendoClientId || config.jamendoClientId.trim() === '') {
      warnings.push(
        'JAMENDO_CLIENT_ID is not configured. Live catalogue search will be unavailable.'
      );
    }
  } else {
    if (!config.mongodbUri) {
      warnings.push('MONGODB_URI is not set. Server will operate in in-memory degraded mode.');
    }
    if (!rawJwt) {
      warnings.push('JWT_SECRET is not set. Using temporary development fallback secret.');
    }
    if (!config.jamendoClientId) {
      warnings.push('JAMENDO_CLIENT_ID is not set. Live music search will return mock/catalogue data.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
