import 'dotenv/config';
import { z } from 'zod';
const env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('127.0.0.1'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_PATH: z.string().default('./data/pets.sqlite'),
  ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'generate a 32-byte hex key'),
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).default('gemini-3.5-flash-lite'),
  POST_RECEIVE_TOKEN: z.string().min(32).optional(),
  ENABLE_SCHEDULER: z.enum(['true','false']).default('false'),
}).parse(process.env);
export default env;
