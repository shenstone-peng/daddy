import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import { formatLongDate, formatRelativeLabel } from '../lib/date';
import type { TaskItem } from '../types';

type CatchUpDeckProps = {
  task: TaskItem;
  remainingCount: number;
  categoryLabel: string;
  categoryTone: string;
  onMarkDone: () => void;
  onMarkRescue: () => void;
};

export function CatchUpDeck({
  task,
  remainingCount,
  categoryLabel,
  categoryTone,
  onMarkDone,
  onMarkRescue,
}: CatchUpDeckProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0, dragging: false });
  const [showDownHint, setShowDownHint] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setOffset({ x: 0, y: 0, dragging: false });
    setShowDownHint(false);
  }, [task.id]);

  function finishSwipe(direction: 'done' | 'rescue') {
    const targetX = direction === 'done' ? -560 : 560;
    setOffset({ x: targetX, y: 0, dragging: false });
    window.setTimeout(() => {
      if (direction === 'done') {
        onMarkDone();
      } else {
        onMarkRescue();
      }
      setOffset({ x: 0, y: 0, dragging: false });
    }, 220);
  }

  function resetCard() {
    setOffset({ x: 0, y: 0, dragging: false });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    startRef.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => ({ ...current, dragging: true }));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!offset.dragging || !startRef.current) {
      return;
    }

    const nextX = event.clientX - startRef.current.x;
    const nextY = event.clientY - startRef.current.y;
    setOffset({ x: nextX, y: nextY, dragging: true });
  }

  function handlePointerUp() {
    if (!offset.dragging) {
      return;
    }

    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    if (absX > 110 && absX > absY) {
      finishSwipe(offset.x < 0 ? 'done' : 'rescue');
      return;
    }

    if (offset.y > 110 && absY > absX) {
      setShowDownHint(true);
      window.setTimeout(() => setShowDownHint(false), 1400);
    }

    resetCard();
  }

  const doneOpacity = Math.min(Math.max(-offset.x / 120, 0), 1);
  const rescueOpacity = Math.min(Math.max(offset.x / 120, 0), 1);
  const tilt = offset.x / 18;

  return (
    <div className="modal-backdrop">
      <div className="catch-up-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">中途开始也能接上</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">先把之前的事项过一遍</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              左划表示已经做过，右划表示后面要补救。下滑先预留，后面再接“稍后处理”。
            </p>
          </div>
          <span className="category-badge bg-indigo-100 text-indigo-700">还剩 {remainingCount} 项</span>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            已完成
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDown className="h-3.5 w-3.5" />
            下滑预留
          </span>
          <span className="inline-flex items-center gap-1 text-amber-500">
            之后补救
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="swipe-stage mt-6">
          <div className="swipe-card-ghost swipe-card-ghost-back" />
          <div className="swipe-card-ghost swipe-card-ghost-front" />
          <div
            className="swipe-card"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${tilt}deg)`,
              transition: offset.dragging ? 'none' : 'transform 220ms ease, opacity 220ms ease',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`category-badge ${categoryTone}`}>{categoryLabel}</span>
              <div className="flex gap-2">
                <span className="swipe-badge swipe-badge-done" style={{ opacity: doneOpacity }}>
                  已完成
                </span>
                <span className="swipe-badge swipe-badge-rescue" style={{ opacity: rescueOpacity }}>
                  补救
                </span>
              </div>
            </div>
            <h3 className="mt-5 text-[24px] font-semibold leading-tight text-slate-900">{task.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{task.notes}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
              <span>{formatLongDate(task.dueDate)}</span>
              <span>{formatRelativeLabel(task.dueDate)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="secondary-button" type="button" onClick={onMarkDone}>
            <CheckCircle2 className="h-4 w-4" />
            算已完成
          </button>
          <button className="primary-button" type="button" onClick={onMarkRescue}>
            <RotateCw className="h-4 w-4" />
            之后补救
          </button>
        </div>

        <p className={`mt-4 text-center text-xs font-medium ${showDownHint ? 'text-slate-600' : 'text-slate-400'}`}>
          {showDownHint ? '下滑动作已预留，后续会接“稍后再看”。' : '拖卡片试试：向左或向右都可以。'}
        </p>
      </div>
    </div>
  );
}
