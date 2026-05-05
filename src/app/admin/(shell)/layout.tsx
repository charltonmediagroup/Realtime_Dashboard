import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromRequest } from "@/lib/adminSession";
import AdminShellNav from "./AdminShellNav";

export const metadata = { title: "Admin" };

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-braces: middleware also enforces this, but recheck server-side.
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const fakeReq = new Request("http://localhost", { headers: { cookie } });
  const session = await getSessionFromRequest(fakeReq);
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900">
      <AdminShellNav username={session.username} />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
