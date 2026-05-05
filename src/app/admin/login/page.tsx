import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
