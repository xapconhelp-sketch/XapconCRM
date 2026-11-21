import { useState } from "react";

type Props = {
  label: string;
  value: string | number;
  onChange?: (value: string) => void;
  type?: "text" | "number" | "date";
  min?: number;
  accessibleLabel?: string;
};

export default function ClaimFinanceField({
  label, value, onChange, type = "text", min, accessibleLabel,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const numeric = type === "number";

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      {label}
      <input
        aria-label={accessibleLabel}
        type={type}
        min={min}
        step={numeric ? "any" : undefined}
        value={numeric && draft !== null ? draft : value}
        onFocus={() => {
          if (numeric) setDraft(value !== "" && Number(value) === 0 ? "" : String(value));
        }}
        onBlur={() => setDraft(null)}
        onChange={event => {
          const input = event.currentTarget;
          if (input.validity.badInput) return;
          if (numeric) setDraft(input.value);
          onChange?.(input.value);
        }}
        className="mt-1 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#8C6A22]"
      />
    </label>
  );
}
