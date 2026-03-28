"use client";

import Image from "next/image";

interface MasterHeaderProps {
  fullName: string;
  specialization: string;
  photoUrl?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MasterHeader({ fullName, specialization, photoUrl }: MasterHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
        <Image
          src="/logo/logo1.png"
          alt="Profit Club"
          width={140}
          height={48}
          className="h-7 w-auto object-contain"
          priority
        />
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={fullName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, #B2223C, #e8556e)" }}
          >
            {getInitials(fullName)}
          </div>
        )}
      </div>
      <div
        className="px-5 py-3 border-b"
        style={{
          background: "linear-gradient(135deg, #fdf2f4, #fff5f6)",
          borderColor: "#fce4e8",
        }}
      >
        <div className="text-[16px] font-bold text-gray-900 tracking-wide">
          {fullName}
        </div>
        <div
          className="text-[10px] font-medium uppercase tracking-[1.5px] mt-0.5"
          style={{ color: "#B2223C" }}
        >
          {specialization}
        </div>
      </div>
    </>
  );
}
