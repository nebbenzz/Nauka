import { useEffect, useRef, useState } from "react";
import { FORMATIONS, type Formation } from "../data/formations";

interface Props {
  value: string;
  onSelect: (formation: Formation) => void;
}

export default function FormationCombobox({ value, onSelect }: Props) {
  const [saisie, setSaisie] = useState(value);
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const resultats =
    saisie.trim().length === 0
      ? FORMATIONS.slice(0, 8)
      : FORMATIONS.filter((f) => f.label.toLowerCase().startsWith(saisie.trim().toLowerCase())).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={conteneurRef} className="relative">
      <input
        type="text"
        placeholder="Ex. BTS SIO, BUT Informatique, CPGE MPSI..."
        value={saisie}
        onChange={(e) => {
          setSaisie(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
      />
      {ouvert && resultats.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white shadow-md">
          {resultats.map((f) => (
            <li key={f.label}>
              <button
                type="button"
                onClick={() => {
                  setSaisie(f.label);
                  setOuvert(false);
                  onSelect(f);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-paper"
              >
                <span>{f.label}</span>
                <span className="shrink-0 text-xs text-inkmuted">
                  {f.domaine} · {f.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}