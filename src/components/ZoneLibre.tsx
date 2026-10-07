interface Props {
  valeur: string;
  onChange: (v: string) => void;
}

export default function ZoneLibre({ valeur, onChange }: Props) {
  return (
    <textarea
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Rédige ta réponse ici..."
      rows={6}
      className="mt-3 w-full rounded-md border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink"
    />
  );
}