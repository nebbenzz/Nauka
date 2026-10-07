import { useState, type KeyboardEvent } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [saisie, setSaisie] = useState("");

  function ajouterTag() {
    const val = saisie.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setSaisie("");
  }

  function retirerTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      ajouterTag();
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-line px-2 py-2 focus-within:border-ink">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-highlight/25 px-3 py-1 text-xs text-ink">
          {tag}
          <button type="button" onClick={() => retirerTag(tag)} className="text-inkmuted hover:text-ink">
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={ajouterTag}
        placeholder={tags.length === 0 ? "Ajouter une matière..." : ""}
        className="min-w-[100px] flex-1 border-none text-sm outline-none focus:outline-none"
      />
    </div>
  );
}