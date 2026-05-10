"use client";

interface CategoryFilterProps {
  categories: { id: number; name: string }[];
  selected: number | null;
  onChange: (id: number | null) => void;
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
          selected === null
            ? "bg-accent text-bg border-accent"
            : "border-border text-muted hover:text-fg hover:border-fg/30"
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            selected === cat.id
              ? "bg-accent text-bg border-accent"
              : "border-border text-muted hover:text-fg hover:border-fg/30"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
