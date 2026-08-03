import { useRef, useState } from 'react';
import { Button } from '@dq/ui';

export function SignaturePad({ onConfirm, onCancel }: { onConfirm: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'var(--color-viz-1)';
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setDirty(true);
  };
  const end = () => (drawing.current = false);

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={440}
        height={160}
        className="w-full touch-none rounded-[--radius-card] border border-ink-300 bg-ink-0"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <p className="mt-1 text-[--text-caption] text-ink-500">وقّع داخل الإطار بالإصبع أو الفأرة</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button variant="outline" onClick={clear}>مسح</Button>
        <Button disabled={!dirty} onClick={() => onConfirm(canvasRef.current!.toDataURL('image/png'))}>
          اعتماد التوقيع
        </Button>
      </div>
    </div>
  );
}
