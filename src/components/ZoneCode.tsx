interface Props {
  valeur: string;
  onChange: (v: string) => void;
}

export default function ZoneCode({ valeur, onChange }: Props) {
  return (
    <textarea
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder="// Écris ton code ici"
      rows={8}
      className="mt-3 w-full rounded-md border border-line bg-ink px-4 py-3 font-mono text-sm text-paper outline-none focus:border-navy"
    />
  );
}