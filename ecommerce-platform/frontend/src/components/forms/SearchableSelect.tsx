import { useEffect, useMemo, useRef, useState } from "react";
import { getMatchingLocationOptions } from "../../utils/locationSearch";

type SearchableSelectProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  loading?: boolean;
  noOptionsLabel?: string;
};

function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled = false,
  loading = false,
  noOptionsLabel = "No options found.",
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = useMemo(() => [...new Set(options.map((option) => option.trim()).filter(Boolean))], [options]);
  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return normalizedOptions.slice(0, 50);
    }
    return getMatchingLocationOptions(normalizedOptions, query, 50);
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !searchInputRef.current) {
      return;
    }
    searchInputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const openDropdown = () => {
    if (disabled) {
      return;
    }
    setQuery("");
    setIsOpen(true);
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={`${id}-options`}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        id={id}
        onClick={openDropdown}
        type="button"
      >
        <span className={value ? "text-slate-700" : "text-slate-400"}>{value || placeholder}</span>
        <span aria-hidden="true" className="ml-3 text-xs text-slate-400">
          v
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <input
            className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            ref={searchInputRef}
            type="text"
            value={query}
          />

          <div className="max-h-60 overflow-y-auto" id={`${id}-options`}>
            {loading ? (
              <p className="px-3 py-2 text-sm text-slate-500">Loading...</p>
            ) : filteredOptions.length > 0 ? (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <button
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      option === value ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    key={option}
                    onClick={() => handleSelect(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">{noOptionsLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
