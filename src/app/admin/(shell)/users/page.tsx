import { headers } from "next/headers";
import { listUsers, type AdminUserPublic } from "@/lib/adminUsers";
import { getSessionFromRequest } from "@/lib/adminSession";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const h = await headers();
  const fakeReq = new Request("http://localhost", {
    headers: { cookie: h.get("cookie") ?? "" },
  });
  const session = await getSessionFromRequest(fakeReq);
  const users: AdminUserPublic[] = await listUsers();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Admin users</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Stored bcrypt-hashed in the
        <code className="mx-1 px-1 bg-neutral-100 rounded text-xs">admin-users</code>
        collection.
      </p>
      <UsersClient initial={users} currentUsername={session?.username ?? ""} />
    </div>
  );
}
