"use client";

import { useState, useRef, useCallback } from "react";

interface Template {
  id: number;
  slug: string;
  name: string;
  messageTemplate: string;
  isEnabled: boolean;
  variables: string[];
}

interface Props {
  template: Template;
  defaultTemplate: string;
  onUpdate: (slug: string, updates: { messageTemplate?: string; isEnabled?: boolean }) => Promise<void>;
}

export default function NotificationCard({ template, defaultTemplate, onUpdate }: Props) {
  const [text, setText] = useState(template.messageTemplate);
  const [enabled, setEnabled] = useState(template.isEnabled);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback((varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const insert = `{{${varName}}}`;
    const newText = text.slice(0, start) + insert + text.slice(end);
    setText(newText);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    }, 0);
  }, [text]);

  async function handleToggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    await onUpdate(template.slug, { isEnabled: newVal });
  }

  async function handleSave() {
    setSaving(true);
    await onUpdate(template.slug, { messageTemplate: text });
    setDirty(false);
    setSaving(false);
  }

  function handleReset() {
    setText(defaultTemplate);
    setDirty(true);
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0D0D10] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">{template.name}</h3>
        <button
          onClick={handleToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-violet-600" : "bg-white/10"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        rows={5}
        className="w-full bg-[#1C1C22] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-violet-500/40 transition-colors resize-y"
        style={{ minHeight: 100 }}
      />

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {template.variables.map((v) => (
          <button
            key={v}
            onClick={() => insertVariable(v)}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold cursor-pointer hover:bg-amber-500/30 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>

      {dirty && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
          >
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}
