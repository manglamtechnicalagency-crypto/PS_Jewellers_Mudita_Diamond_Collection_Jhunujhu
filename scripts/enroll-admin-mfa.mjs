#!/usr/bin/env node
/**
 * Enroll a TOTP factor for an admin account.
 *
 * WHY THIS EXISTS: production requires AAL2 (see src/lib/admin-auth.ts), and an
 * account with no verified TOTP factor is blocked at sign-in with "This account
 * must complete TOTP enrollment". Supabase gives project owners no way to enroll
 * a factor for a user from its dashboard — `mfa.enroll()` must run as that
 * signed-in user — so enrollment has to happen through code.
 *
 * SECURITY: this needs only the account password. Anyone who can run it with a
 * valid password can bind THEIR authenticator to the account. Rotate the
 * password before running it, run it yourself, and never paste the secret or
 * the QR anywhere.
 *
 * Usage (from the project root):
 *   node scripts/enroll-admin-mfa.mjs
 *
 * It reads Supabase config from .env.local, then .env, then the real
 * environment — the same NEXT_PUBLIC_* variables the browser client uses.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Minimal .env parser. Avoids adding a dependency for six lines of work. */
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue; // real env wins
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    "\nMissing Supabase config.\n" +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local,\n" +
      "or export them in your shell. See .env.example.\n",
  );
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

/** Read a line without echoing it to the terminal. */
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const onData = (char) => {
      const s = String(char);
      if (s === "\n" || s === "\r" || s === "") {
        process.stdin.removeListener("data", onData);
        return;
      }
      // Repaint the prompt so the typed characters never appear.
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      process.stdout.write(question);
    };
    process.stdin.on("data", onData);
    rl.question("", (value) => {
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    });
  });
}

async function main() {
  console.log("\n  Admin TOTP enrollment");
  console.log(`  Project: ${url}\n`);

  const email = (await ask("  Admin email: ")).trim();
  const password = await askHidden("  Password: ");

  // No session persistence: this is a one-shot CLI, and writing auth tokens to
  // disk beside the project would be a needless secret at rest.
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error(`\n  Sign-in failed: ${signInError.message}\n`);
    process.exit(1);
  }

  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error(`\n  Could not list existing factors: ${listError.message}\n`);
    process.exit(1);
  }

  if (existing?.totp?.some((factor) => factor.status === "verified")) {
    console.log(
      "\n  This account ALREADY has a verified TOTP factor.\n" +
        "  Nothing to do — sign in normally. If you lost the authenticator,\n" +
        "  remove the factor in the Supabase dashboard first, then re-run this.\n",
    );
    process.exit(0);
  }

  // A half-finished previous attempt leaves an unverified factor behind, and
  // Supabase rejects a second enrollment with the same friendly name. Clear
  // them so this script is safe to re-run.
  for (const stale of existing?.totp?.filter((factor) => factor.status !== "verified") ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id });
    console.log(`  Removed a stale unverified factor (${stale.id}).`);
  }

  const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `admin-${Date.now()}`,
  });
  if (enrollError || !enrolled) {
    console.error(`\n  Enrollment failed: ${enrollError?.message ?? "unknown error"}\n`);
    process.exit(1);
  }

  // The QR encodes the shared secret. Written to the OS temp directory, never
  // into the repo, so it cannot be committed by accident.
  const qrPath = join(tmpdir(), `ps-admin-totp-${Date.now()}.svg`);
  writeFileSync(qrPath, enrolled.totp.qr_code, "utf8");

  console.log("\n  Scan this QR in Google Authenticator, Authy or 1Password:");
  console.log(`    ${qrPath}`);
  console.log("\n  Or type the secret in manually:");
  console.log(`    ${enrolled.totp.secret}`);
  console.log("\n  DELETE that QR file once you have scanned it — it is the secret.\n");

  const code = (await ask("  6-digit code from the app: ")).trim();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrolled.id,
  });
  if (challengeError || !challenge) {
    console.error(`\n  Could not start the challenge: ${challengeError?.message ?? "unknown"}\n`);
    process.exit(1);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: enrolled.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) {
    console.error(
      `\n  Verification failed: ${verifyError.message}\n` +
        "  The factor is left unverified. Re-run this script to try again —\n" +
        "  check your device clock if codes keep being rejected.\n",
    );
    process.exit(1);
  }

  console.log(
    "\n  Done. The factor is verified.\n" +
      "  You can now sign in at /admin/login on production: password, then the code.\n" +
      `  Remember to delete ${qrPath}\n`,
  );
}

main()
  .catch((error) => {
    console.error(`\n  Unexpected failure: ${error?.message ?? error}\n`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
