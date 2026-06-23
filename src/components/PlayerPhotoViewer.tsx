import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";

export type ViewerPhoto = {
  id: string;
  display: string;
  avatarUrl: string;
};

type Props = {
  open: boolean;
  players: ViewerPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 60;

const PlayerPhotoViewer = ({ open, players, index, onIndexChange, onClose }: Props) => {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startRef = useRef<{
    tx: number;
    ty: number;
    scale: number;
    midX: number;
    midY: number;
    dist: number;
  } | null>(null);
  const swipeRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastTapRef = useRef<number>(0);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Reset zoom when image changes or modal opens/closes
  useEffect(() => {
    reset();
  }, [index, open, reset]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < players.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, players.length, onIndexChange, onClose]);

  if (!open || !players[index]) return null;
  const current = players[index];

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      startRef.current = {
        tx,
        ty,
        scale,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
        dist: Math.hypot(dx, dy) || 1,
      };
      swipeRef.current = null;
    } else if (pts.length === 1) {
      startRef.current = { tx, ty, scale, midX: pts[0].x, midY: pts[0].y, dist: 0 };
      if (scale === 1) {
        swipeRef.current = { x: pts[0].x, y: pts[0].y, moved: false };
      } else {
        swipeRef.current = null;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    const start = startRef.current;
    if (!start) return;

    if (pts.length === 2) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const newScale = clampScale((dist / start.dist) * start.scale);
      setScale(newScale);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      setTx(start.tx + (midX - start.midX));
      setTy(start.ty + (midY - start.midY));
    } else if (pts.length === 1) {
      const dx = pts[0].x - start.midX;
      const dy = pts[0].y - start.midY;
      if (scale > 1) {
        setTx(start.tx + dx);
        setTy(start.ty + dy);
      } else if (swipeRef.current) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) swipeRef.current.moved = true;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const pt = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);

    // Swipe detection on last finger up at scale 1
    if (pointersRef.current.size === 0 && scale === 1 && swipeRef.current && pt) {
      const dx = pt.x - swipeRef.current.x;
      const dy = pt.y - swipeRef.current.y;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0 && index < players.length - 1) onIndexChange(index + 1);
        else if (dx > 0 && index > 0) onIndexChange(index - 1);
      } else if (!swipeRef.current.moved) {
        // Tap — handle double-tap
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          if (scale === 1) setScale(DOUBLE_TAP_SCALE);
          else reset();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    }
    if (pointersRef.current.size === 0) {
      startRef.current = null;
      swipeRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      startRef.current = { tx, ty, scale, midX: remaining.x, midY: remaining.y, dist: 0 };
      swipeRef.current = null;
    }
  };

  const zoomIn = () => setScale((s) => clampScale(s + 0.5));
  const zoomOut = () =>
    setScale((s) => {
      const ns = clampScale(s - 0.5);
      if (ns === 1) {
        setTx(0);
        setTy(0);
      }
      return ns;
    });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 w-screen h-screen bg-black text-white outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Foto de {current.display}
          </DialogPrimitive.Title>

          {/* Header */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{current.display}</p>
              <p className="text-[11px] text-white/70">{index + 1} / {players.length}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Image area */}
          <div
            className="absolute inset-0 overflow-hidden flex items-center justify-center select-none"
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={() => {
              if (scale === 1) setScale(DOUBLE_TAP_SCALE);
              else reset();
            }}
          >
            <img
              src={current.avatarUrl}
              alt={current.display}
              draggable={false}
              className="max-w-full max-h-full object-contain will-change-transform"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transition: pointersRef.current.size === 0 ? "transform 0.15s ease-out" : "none",
              }}
            />
          </div>

          {/* Prev / Next */}
          {index > 0 && (
            <button
              onClick={() => onIndexChange(index - 1)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {index < players.length - 1 && (
            <button
              onClick={() => onIndexChange(index + 1)}
              aria-label="Próxima"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-[max(env(safe-area-inset-bottom),16px)] inset-x-0 z-20 flex items-center justify-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_SCALE}
              aria-label="Diminuir zoom"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={reset}
              aria-label="Restaurar"
              className="px-3 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center gap-1 text-xs"
            >
              <RotateCcw size={14} /> {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= MAX_SCALE}
              aria-label="Aumentar zoom"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PlayerPhotoViewer;
