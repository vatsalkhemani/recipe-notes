"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  allTags,
  activeTags,
  onToggleTag,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search recipes, people, ingredients…"
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 outline-none focus:border-primary"
        />
      </div>
      {allTags.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {allTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted ring-1 ring-border hover:bg-surface-muted"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
