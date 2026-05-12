"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (option: SelectOption | null) => void;
};

export default function SearchableSelect({ label, value, options, placeholder = "Buscar...", onChange }: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLLabelElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    setQuery(selected?.label || "");
  }, [selected?.label]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selected?.label || "");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selected?.label]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || term === selected?.label.toLowerCase()) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query, selected?.label]);

  return (
    <label ref={containerRef} className="relative grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className={inputClass}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(false);
            }}
          >
            Sin seleccionar
          </button>
          {filteredOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#E6F8F9] ${
                option.value === value ? "font-bold text-[#173C61]" : "font-semibold text-slate-700"
              }`}
              onClick={() => {
                onChange(option);
                setQuery(option.label);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="px-4 py-2 text-sm font-semibold text-slate-500">Sin resultados</p>
          )}
        </div>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
