import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configPath = path.join(projectRoot, "config.json");

function loadConfig() {
  let raw;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    throw new Error(
      `Missing config.json. Copy config.example.json to config.json and fill in your clientId.`
    );
  }

  const config = JSON.parse(raw);
  if (!config.clientId) {
    throw new Error("config.json is missing a clientId. See README.md for setup steps.");
  }

  return config;
}

export const config = loadConfig();
export const tokenCachePath = path.join(projectRoot, "token-cache.json");
