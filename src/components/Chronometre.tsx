import { useEffect, useState } from "react";

interface Props {
  dureeSecondes: number;
  onExpire: () => void;
}

export default function Chronometre({ dureeSecondes, onExpire }: Props) {
  const [tempsRestant, setTempsRestant] = useState(dureeSecondes);

  useEffect(() => {
    if (tempsRestant <= 0) {
      onExpire();
      return;
    }
    const timeout = setTimeout(() => setTempsRestant((t) => t - 1), 1000);
    return () => clearTimeout(timeout);
  }, [tempsRestant, onExpire]);

  const minutes = Math.floor(tempsRestant / 60);
  const secondes = tempsRestant % 60;
  const urgence = tempsRestant <= 60;

  return (
    <span className={urgence ? "font-mono text-lg font-bold text-red-600" : "font-mono text-lg font-bold text-ink"}>
      {minutes}:{secondes.toString().padStart(2, "0")}
    </span>
  );
}