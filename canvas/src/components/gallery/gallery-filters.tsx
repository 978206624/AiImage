"use client";

interface Category {
  id: number;
  name: string;
}

interface GalleryFiltersProps {
  selectedModel: string | null;
  selectedStyle: string | null;
  selectedCategoryId: number | null;
  categories: Category[];
  onModelChange: (model: string | null) => void;
  onStyleChange: (style: string | null) => void;
  onCategoryChange: (id: number | null) => void;
}

const MODEL_FILTERS = [
  { label: "全部", value: null },
  { label: "GPT-4o Image", value: "GPT-4o Image" },
  { label: "Imagen 3", value: "Google Imagen 3" },
];

const STYLE_FILTERS = [
  { label: "全部", value: null },
  { label: "写实", value: "写实" },
  { label: "动漫", value: "动漫" },
  { label: "油画", value: "油画" },
  { label: "赛博朋克", value: "赛博朋克" },
  { label: "水墨", value: "水墨" },
  { label: "极简", value: "极简" },
];

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-mono uppercase tracking-[.08em] text-muted w-10">
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

export function GalleryFilters({
  selectedModel,
  selectedStyle,
  selectedCategoryId,
  categories,
  onModelChange,
  onStyleChange,
  onCategoryChange,
}: GalleryFiltersProps) {
  const chipClass = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-full border transition-colors ${
      active
        ? "bg-accent text-bg border-accent"
        : "border-border text-muted hover:text-fg hover:border-fg/30"
    }`;

  return (
    <div className="sticky top-[var(--nav)] z-30 bg-bg/80 backdrop-blur-md border-b border-border py-3 px-8">
      <div className="flex flex-col gap-2.5">
        <ChipRow label="模型">
          {MODEL_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => onModelChange(f.value)}
              className={chipClass(selectedModel === f.value)}
            >
              {f.label}
            </button>
          ))}
        </ChipRow>

        <ChipRow label="风格">
          {STYLE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => onStyleChange(f.value)}
              className={chipClass(selectedStyle === f.value)}
            >
              {f.label}
            </button>
          ))}
        </ChipRow>

        <ChipRow label="分类">
          <button
            onClick={() => onCategoryChange(null)}
            className={chipClass(selectedCategoryId === null)}
          >
            全部
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={chipClass(selectedCategoryId === c.id)}
            >
              {c.name}
            </button>
          ))}
        </ChipRow>
      </div>
    </div>
  );
}
