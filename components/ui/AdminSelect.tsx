"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface Props {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AdminSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const close = useCallback(() => { setOpen(false); setFocused(-1); }, []);

  // Calculate dropdown position when opening
  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const dropH = Math.min(options.length * 40 + 8, 240);
    const openUpward = spaceBelow < dropH && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(openUpward
        ? { bottom: viewportH - rect.top + 5 }
        : { top: rect.bottom + 5 }),
    });
  }, [options.length]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        !(document.getElementById("admin-select-portal")?.contains(target))
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => calcPosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, calcPosition]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        calcPosition();
        setOpen(true);
        setFocused(options.findIndex((o) => String(o.value) === String(value)));
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); triggerRef.current?.focus(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, options.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); return; }
    if (e.key === "Enter" && focused >= 0) {
      e.preventDefault();
      onChange(options[focused].value);
      close();
      triggerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!open || focused < 0) return;
    const el = listRef.current?.children[focused + (placeholder ? 1 : 0)] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focused, open, placeholder]);

  const dropdown = open && typeof document !== "undefined" ? createPortal(
    <div id="admin-select-portal" style={dropdownStyle}>
      <div className="rounded-xl border border-white/[0.09] bg-[#111114] shadow-2xl shadow-black/70 overflow-hidden">
        <ul ref={listRef} className="max-h-60 overflow-y-auto overscroll-contain py-1">
          {placeholder && (
            <li
              onMouseEnter={() => setFocused(-1)}
              onClick={() => { onChange(""); close(); }}
              className={[
                "flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-colors text-sm",
                !value ? "bg-violet-600/10 text-violet-300" : "text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-400",
              ].join(" ")}
            >
              <span className="truncate">{placeholder}</span>
              {!value && <CheckIcon />}
            </li>
          )}
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            const isFocused = focused === idx;
            return (
              <li
                key={opt.value}
                onMouseEnter={() => setFocused(idx)}
                onClick={() => { onChange(opt.value); close(); triggerRef.current?.focus(); }}
                className={[
                  "flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-colors text-sm",
                  isSelected
                    ? "bg-violet-600/10 text-violet-300"
                    : isFocused
                    ? "bg-white/[0.07] text-zinc-100"
                    : "text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100",
                ].join(" ")}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <CheckIcon />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            calcPosition();
            setOpen(true);
            setFocused(options.findIndex((o) => String(o.value) === String(value)));
          } else {
            close();
          }
        }}
        className={[
          "w-full flex items-center justify-between gap-2",
          "rounded-lg border px-3 py-2 text-sm text-left outline-none",
          "transition-all duration-150",
          open
            ? "bg-[#1C1C22] border-violet-500/50 ring-1 ring-violet-500/25"
            : "bg-[#1C1C22] border-white/[0.08] hover:border-white/[0.16] hover:bg-[#1E1E25]",
          "focus-visible:border-violet-500/50 focus-visible:ring-1 focus-visible:ring-violet-500/25",
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <span className={selected ? "text-zinc-100 truncate" : "text-zinc-500"}>
          {selected ? selected.label : (placeholder ?? "Выберите...")}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-violet-400" : "text-zinc-600"
          }`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {dropdown}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400 flex-shrink-0">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </svg>
  );
}
