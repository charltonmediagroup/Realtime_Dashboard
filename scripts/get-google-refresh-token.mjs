import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import open from "open";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

function loadCreds() {
  const fromEnvId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const fromEnvSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (fromEnvId && fromEnvSecret) return { client_id: fromEnvId, client_secret: fromEnvSecret };

  const argPath = process.argv[2];
  if (argPath) {
    const raw = JSON.parse(readFileSync(argPath, "utf8"));
    const body = raw.web ?? raw.installed;
    if (!body) throw new Error("Credential file missing 'web' or 'installed' key");
    return { client_id: body.client_id, client_secret: body.client_secret };
  }

  const envPath = join(__dirname, "..", ".env.local");
  const envText = readFileSync(envPath, "utf8");
  const id = envText.match(/^GOOGLE_OAUTH_CLIENT_ID=(.+)$/m)?.[1]?.trim();
  const secret = envText.match(/^GOOGLE_OAUTH_CLIENT_SECRET=(.+)$/m)?.[1]?.trim();
  if (!id || !secret) {
    throw new Error(
      "Provide credentials via env (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET), a JSON path arg, or .env.local",
    );
  }
  return { client_id: id, client_secret: secret };
}

async function main() {
  const { client_id, client_secret } = loadCreds();
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  const tokenPromise = new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname !== "/oauth2callback") {
          res.writeHead(404).end("Not found");
          return;
        }
        const code = url.searchParams.get("code");
        const err = url.searchParams.get("error");
        if (err) throw new Error(err);
        if (!code) throw new Error("No code in callback");

        const { tokens } = await oauth2.getToken(code);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h2>Authorized. You can close this tab.</h2>");
        server.close();
        resolve(tokens);
      } catch (e) {
        res.writeHead(500).end(String(e));
        server.close();
        reject(e);
      }
    });
    server.listen(PORT, () => {
      console.log(`Listening on ${REDIRECT_URI}`);
    });
  });

  console.log("Opening browser for authorization...");
  console.log(`If it does not open, visit:\n${authUrl}\n`);
  await open(authUrl);

  const tokens = await tokenPromise;
  if (!tokens.refresh_token) {
    console.error("No refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and re-run.");
    process.exit(1);
  }

  console.log("\n=== Add this to .env.local ===");
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${client_id}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${client_secret}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("==============================\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
