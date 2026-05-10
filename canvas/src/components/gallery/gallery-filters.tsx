"use client";

interface GalleryFiltersProps {
  selectedModel: string | null;
  selectedStyle: string | null;
  onModelChange: (model: string | null) => void;
  onStyleChange: (style: string | null) => void;
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

export function GalleryFilters({
  selectedModel,
  selectedStyle,
  onModelChange,
  onStyleChange,
}: GalleryFiltersProps) {
  return (
    <div className="sticky top-[var(--nav)] z-30 bg-bg/80 backdrop-blur-md border-b border-border py-3 px-8">
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
        {MODEL_FILTERS.map((f) => (
    <button
            key={f.label}
            onClick={() => onModelChange(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedModel === f.value
                ? "bg-accent text-bg border-accent"
                : "border-border text-muted hover:text-fg hover:border-fg/30"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {STYLE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => onStyleChange(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedStyle === f.value
                ? "bg-accent text-bg border-accent"
                : "border-border text-muted hover:text-fg hover:border-fg/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
