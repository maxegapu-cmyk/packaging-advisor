import { ensureAdmin } from "./auth";
import { getDb } from "./db";
import { ensureDemoProvider } from "./llm/providers";

let done = false;

/** Create tables, the first admin invite and the demo platform. Safe to call many times. */
export function initApp() {
  if (done) return;
  getDb();
  ensureDemoProvider();
  const adminCode = ensureAdmin();
  if (adminCode) {
    console.log("\n================================================================");
    console.log(" 管理员邀请码 Admin invite code (shown once, keep it safe):");
    console.log(`   ${adminCode}`);
    console.log("================================================================\n");
  }
  done = true;
}
