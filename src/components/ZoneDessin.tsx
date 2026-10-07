import { useEffect, useRef } from "react";

interface Props {
  onChange: (dataUrl: string | null) => void;
}

export default function ZoneDessin({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dessineRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1B1D22";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  function position(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function commencer(e: React.MouseEvent | React.TouchEvent) {
    dessineRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function dessiner(e: React.MouseEvent | React.TouchEvent) {
    if (!dessineRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = position(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function terminer() {
    if (!dessineRef.current) return;
    dessineRef.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function effacer() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div className="mt-3">
      <canvas
        ref={canvasRef}
        width={600}
        height={360}
        onMouseDown={commencer}
        onMouseMove={dessiner}
        onMouseUp={terminer}
        onMouseLeave={terminer}
        onTouchStart={commencer}
        onTouchMove={dessiner}
        onTouchEnd={terminer}
        className="w-full touch-none rounded-md border border-line bg-white"
      />
      <button type="button" onClick={effacer} className="mt-2 text-xs text-inkmuted hover:text-ink transition-colors">
        Effacer le dessin
      </button>
    </div>
  );
}