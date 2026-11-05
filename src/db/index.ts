import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The fallback string only exists so `next build` can import this file without env vars.
const sql = neon(process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/db");
export const db = drizzle(sql, { schema });
