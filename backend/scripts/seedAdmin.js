// One-time migration: creates (or updates) the Admin document in MongoDB
// from your existing ADMIN_EMAIL / ADMIN_PASSWORD_HASH env vars.
//
// Run once after deploying the forgot-password feature:
//   node scripts/seedAdmin.js
//
// After this runs successfully, login and password reset both read/write
// the database — ADMIN_PASSWORD_HASH in your .env is no longer read at
// runtime and can be removed (ADMIN_EMAIL and ADMIN_JWT_SECRET are still
// used — ADMIN_EMAIL only by this script, ADMIN_JWT_SECRET for signing
// tokens).

import "dotenv/config";
import dns from "node:dns";
// Same fix as server.js: some networks/ISPs don't resolve MongoDB Atlas's
// mongodb+srv:// SRV records against the default DNS servers, causing
// "querySrv ECONNREFUSED". Forcing public resolvers fixes it.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { connectDB } from "../config/db.js";
import Admin from "../models/adminModel.js";

async function main() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error("Set ADMIN_EMAIL in your .env before running this script.");
    process.exit(1);
  }

  let passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    // No hash on hand — prompt for the plaintext password and hash it here
    // so it's never typed into a shell history or committed anywhere.
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const plaintext = await rl.question(
      "No ADMIN_PASSWORD_HASH found. Enter the admin password to hash and store: ",
    );
    rl.close();
    if (!plaintext) {
      console.error("No password entered. Aborting.");
      process.exit(1);
    }
    passwordHash = await bcrypt.hash(plaintext, 10);
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = passwordHash;
    existing.failedLoginAttempts = 0;
    existing.lockUntil = null;
    await existing.save();
    console.log(`Updated existing admin record for ${email}.`);
  } else {
    await Admin.create({ email, password: passwordHash });
    console.log(`Created admin record for ${email}.`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exit(1);
});