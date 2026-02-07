import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from main project
dotenv.config({ path: resolve(__dirname, '../../.env') });
// Also try the parent project's .env
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: resolve(__dirname, '../../../.env') });
}
const globalForPrisma = globalThis;
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = db;
