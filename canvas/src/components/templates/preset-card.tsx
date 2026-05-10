"use client";

interface PresetCardProps {
  preset: {
    id: number;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
  };
  selected: boolean;
  onToggle: (id: number) => void;
}

export function PresetCard({ preset, selected, onToggle }: PresetCardProps) {
  return (
    <button
      onClick={() => onToggle(preset.id)}
      className={`relative rounded-lg border overflow-hidden text-left transition-colors ${
        selected
          ? "border-accent ring-1 ring-accent/50"
          : "border-border hover:border-fg/30"
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
          <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {preset.coverImageUrl && (
        <div className="aspect-square overflow-hidden">
          <img
            src={preset.coverImageUrl}
            alt={preset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {!preset.coverImageUrl && (
        <div className="aspect-square bg-surface2 flex items-center justify-center">
          <span className="text-2xl text-muted">{preset.name[0]}</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-medium text-fg truncate">{preset.name}</h3>
        {preset.description && (
          <p className="text-[11px] text-muted mt-1 line-clamp-2">{preset.description}</p>
        )}
      </div>
    </button>
  );
}
