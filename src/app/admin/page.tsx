import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "./AdminLogin";
import { AdminTool } from "./AdminTool";

export const dynamic = "force-dynamic";

/** /admin — the protected, standalone sync tool (separate from the public site).
 * Random visitors get the login form; the owner (after entering the password)
 * gets the scan → review → update interface. */
export default async function AdminPage() {
  const authed = await isAdmin();
  return authed ? <AdminTool /> : <AdminLogin />;
}
