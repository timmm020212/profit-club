"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  {
    label: "Расписание",
    href: "/master",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="2" x2="9" y2="6" />
        <line x1="15" y1="2" x2="15" y2="6" />
      </svg>
    ),
  },
  {
    label: "Статистика",
    href: "/master/stats",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Финансы",
    href: "/master/finance",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9.5c0-1 1.5-2 3-2s3 1 3 2-1.5 1.5-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2" />
      </svg>
    ),
  },
  {
    label: "Портфолио",
    href: "/master/portfolio",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    label: "Клиенты",
    href: "/master/clients",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function MasterTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50 pb-2">
      {tabs.map((tab) => {
        const active = tab.href === "/master"
          ? pathname === "/master"
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center pt-1.5 pb-1"
          >
            {tab.icon(active)}
            <span
              className="text-[9px] mt-0.5 tracking-wide"
              style={{
                color: active ? "#B2223C" : "#999",
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
