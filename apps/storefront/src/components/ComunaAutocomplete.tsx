import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const MAX_SUGGESTIONS = 8;

export function ComunaAutocomplete({
  value,
  onChange,
  onBlur,
  comunas,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  comunas: string[];
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const suggestions = useMemo(() => {
    const query = normalize(value.trim());
    if (!query) return comunas.slice(0, MAX_SUGGESTIONS);
    return comunas.filter((c) => normalize(c).includes(query)).slice(0, MAX_SUGGESTIONS);
  }, [value, comunas]);

  const selectComuna = (comuna: string) => {
    onChange(comuna);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectComuna(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // comunas.length === 0 means /store/comunas came back empty (Chilexpress
  // not configured yet, or the fetch failed) — fall back to a plain text
  // input rather than showing a dropdown with nothing in it.
  if (comunas.length === 0) {
    return (
      <div>
        <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
          Ciudad / Comuna
        </label>
        <input
          required
          type="text"
          autoComplete="address-level2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Ej: Las Condes"
          className={`w-full px-3 py-2.5 bg-neutral-900 border rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 ${
            error ? 'border-rose-500' : 'border-neutral-700'
          }`}
        />
        {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
        Ciudad / Comuna
      </label>
      <div className="relative">
        <input
          required
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="address-level2"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion (onMouseDown selects it first)
            // isn't lost to the input's blur closing the list first.
            setTimeout(() => setIsOpen(false), 100);
            onBlur();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe para buscar tu comuna..."
          className={`w-full px-3 py-2.5 pr-8 bg-neutral-900 border rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 ${
            error ? 'border-rose-500' : 'border-neutral-700'
          }`}
        />
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl">
          {suggestions.map((comuna, i) => (
            <li key={comuna}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectComuna(comuna);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs ${
                  i === highlighted ? 'bg-neutral-800 text-lime-400' : 'text-neutral-200'
                }`}
              >
                {comuna}
                {normalize(comuna) === normalize(value.trim()) && <Check className="w-3.5 h-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
