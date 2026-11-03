import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const directory = resolve(".local/postgres");
const port = 55432;
if (!existsSync(".env")) {
  const password = randomBytes(24).toString("base64url");
  const adminPassword = randomBytes(18).toString("base64url");
  writeFileSync(
    ".env",
    [
      `DATABASE_URL="postgresql://aiforwork:${password}@127.0.0.1:${port}/aiforwork?schema=public&connection_limit=3"`,
      `ADMIN_EMAIL="admin@aiforwork.local"`,
      `ADMIN_PASSWORD="${adminPassword}"`,
      `JWT_SECRET="${randomBytes(48).toString("base64url")}"`,
      `CRON_SECRET="${randomBytes(32).toString("base64url")}"`,
      `NEXT_PUBLIC_APP_URL="http://localhost:3000"`,
      "",
    ].join("\n"),
  );
  console.log(
    "Created ignored .env with random local credentials. Admin login is in ADMIN_EMAIL / ADMIN_PASSWORD.",
  );
}
process.loadEnvFile(".env");
const url = new URL(process.env.DATABASE_URL);
if (
  url.hostname !== "127.0.0.1" ||
  Number(url.port) !== port ||
  url.username !== "aiforwork"
)
  throw new Error(
    "DATABASE_URL is not the dedicated local database. Use your configured PostgreSQL instead of db:local.",
  );
mkdirSync(resolve(".local"), { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  port,
  user: url.username,
  password: decodeURIComponent(url.password),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: [
    "-h",
    "localhost",
    "-c",
    "shared_buffers=32MB",
    "-c",
    "max_connections=20",
  ],
  onLog: console.log,
  onError: console.error,
});
if (!existsSync(resolve(directory, "PG_VERSION"))) await pg.initialise();
try {
  await pg.start();
  const client = pg.getPgClient("postgres", "127.0.0.1");
  try {
    await client.connect();
    for (const database of ["aiforwork", "aiforwork_test"]) {
      const { rows } = await client.query(
        "SELECT datname FROM pg_database WHERE datname=$1",
        [database],
      );
      if (!rows.length) await client.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await client.end();
  }
} catch (error) {
  await pg.stop();
  throw (
    error ||
    new Error("PostgreSQL could not start. Check the preceding database log.")
  );
}
console.log(
  `Local PostgreSQL listening on 127.0.0.1:${port}. Keep this terminal open. Run npm run db:migrate, npm run db:seed, then npm run dev in another terminal.`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
