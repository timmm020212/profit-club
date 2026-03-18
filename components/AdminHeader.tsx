"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { Master } from "@/db/schema";

interface Props {
  masters: Master[];
}

const navItems = [
  { href: "/admin", label: "Расписание" },
  { href: "/admin/services", label: "Услуги" },
];

export default function AdminHeader({ masters }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const displayName = session?.user?.name || "Администратор";
  const initials = displayName
    .split(" ")
    .filter((p) => p.trim().length > 0)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090B]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-6">
        <div className="flex h-14 items-center gap-4">
          {/* Logo */}
          <Link href="/admin" className="flex-shrink-0">
            <Image
              src="/logo/logo1.png"
              alt="Profit Club"
              width={110}
              height={36}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          <div className="h-5 w-px bg-white/10 flex-shrink-0" />

          {/* Nav */}
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            {/* User + logout */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/[0.07] px-3 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/30 text-violet-300 text-[10px] font-semibold">
                  {initials}
                </div>
                <span className="text-sm text-zinc-300 max-w-[120px] truncate hidden md:block">
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
                title="Выйти"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
