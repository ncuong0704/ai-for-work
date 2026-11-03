import { existsSync } from "node:fs";
import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (existsSync(".env")) process.loadEnvFile(".env");
const entry = resolve(".next/standalone/server.js");
if (!existsSync(entry)) throw new Error("Chưa có production build. Chạy npm run build trước.");
await cp(resolve(".next/static"), resolve(".next/standalone/.next/static"), { recursive: true, force: false, errorOnExist: false });
if (existsSync("public")) await cp(resolve("public"), resolve(".next/standalone/public"), { recursive: true, force: false, errorOnExist: false });
process.env.HOSTNAME ||= "::";
await import(pathToFileURL(entry).href);
