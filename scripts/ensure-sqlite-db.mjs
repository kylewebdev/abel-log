import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const schemaDir = path.join(root, "prisma");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const env = fs.readFileSync(envPath, "utf8");
  const match = env.match(/^DATABASE_URL=(.+)$/m);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

const databaseUrl = readDatabaseUrl();

if (!databaseUrl?.startsWith("file:")) {
  process.exit(0);
}

const rawPath = databaseUrl.slice("file:".length);
const sqlitePath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(schemaDir, rawPath);

fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

if (!fs.existsSync(sqlitePath)) {
  fs.closeSync(fs.openSync(sqlitePath, "a"));
}
