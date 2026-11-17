import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/admin/auth";
import { logoutAction } from "./actions";

export const instant = false;

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

async function Gate({ children }: { children: React.ReactNode }) {
  await connection();
  if (!(await isAdmin())) return <LoginForm />;
  return (
    <div>
      <nav className="no-scrollbar mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/60 p-1.5 text-sm whitespace-nowrap">
        <Link href="/admin" className="btn h-9 min-h-9 shrink-0 px-2.5 hover:bg-gold/10">
          Dashboard
        </Link>
        <Link href="/admin/requests" className="btn h-9 min-h-9 shrink-0 px-2.5 hover:bg-gold/10">
          Artist requests
        </Link>
        <Link href="/admin/songs" className="btn h-9 min-h-9 shrink-0 px-2.5 hover:bg-gold/10">
          Songs
        </Link>
        <form action={logoutAction} className="ml-auto">
          <button className="btn h-9 min-h-9 px-3 text-muted hover:text-ivory" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="panel h-64 animate-pulse" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
