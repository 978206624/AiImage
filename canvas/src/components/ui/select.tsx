"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  panelClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "请选择",
  className = "",
  panelClassName = "",
  disabled = false,
  ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  const selectedIdx = options.findIndex((o) => o.value === value);
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
    }
  }, [open, selectedIdx]);

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = panelRef.current?.children[activeIdx] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const moveActive = useCallback(
    (delta: number) => {
      if (options.length === 0) return;
      let next = activeIdx;
      for (let i = 0; i < options.length; i++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next].disabled) break;
      }
      setActiveIdx(next);
    },
    [activeIdx, options]
  );

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveActive(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (activeIdx >= 0 && !options[activeIdx]?.disabled) {
        onChange(options[activeIdx].value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      if (open) setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={`flex items-center justify-between gap-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:border-accent/60 ${
          className || "w-full px-3 py-2"
        }`}
      >
        <span
          className={`truncate text-left ${
            selected ? "text-fg" : "text-muted"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={panelRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 top-full mt-1 z-50 w-full min-w-[8rem] max-h-60 overflow-auto bg-surface border border-border rounded shadow-lg py-1 ${panelClassName}`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">无选项</li>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    opt.disabled
                      ? "text-muted opacity-50 cursor-not-allowed"
                      : isActive
                        ? "bg-surface2 text-fg"
                        : "text-fg"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 text-accent"
                      aria-hidden
                    >
                      <path
                        d="M3 8l3.5 3.5L13 5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
