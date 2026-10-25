/**
 * Create invite codes from the command line during local development:
 *
 *   npm run invites -- 20 "浙江卖家"        # 20 tester codes labelled 浙江卖家 1…20
 *   npm run invites -- 1 "管理员" --admin   # one more admin code
 *
 * On a Docker deployment, create codes in the web admin page instead (管理 → 邀请码).
 * Plain codes are printed once and never stored.
 */
import { createInvites } from "../src/lib/auth";

const args = process.argv.slice(2);
const admin = args.includes("--admin");
const [countArg, label = ""] = args.filter((a) => a !== "--admin");
const count = Math.max(1, Math.min(200, Number(countArg) || 1));

const created = createInvites(count, { label, admin });
console.log(`已生成 ${created.length} 个${admin ? "管理员" : "测试者"}邀请码 Created ${created.length} ${admin ? "admin" : "tester"} code(s):\n`);
for (const c of created) console.log(`${c.code}\t${c.invite.label}`);
console.log("\n请妥善保存，这些邀请码不会再次显示。 Keep these safe; they will not be shown again.");
