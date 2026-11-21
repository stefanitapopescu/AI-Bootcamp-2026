import { useEffect, useState, type RefObject } from 'react';

const REDUCED = '(prefers-reduced-motion: reduce)';

/** true când utilizatorul a cerut mai puțină mișcare; se actualizează live. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(REDUCED).matches);
  useEffect(() => {
    const mq = matchMedia(REDUCED);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Starea mișcării pentru un fundal:
 * - 'still': prefers-reduced-motion, rămâne pe primul cadru (animațiile CSS sunt scoase);
 * - 'paused': inactiv, tab ascuns (document.hidden) sau în afara ecranului (IntersectionObserver);
 * - 'running': se mișcă.
 * Se pune pe element ca data-motion, iar backgrounds.css face restul.
 */
export type MotionState = 'running' | 'paused' | 'still';

export function useBackgroundMotion(ref: RefObject<Element>, active: boolean): MotionState {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  if (reduced) return 'still';
  return active && visible && inView ? 'running' : 'paused';
}

/**
 * Pentru fundalurile pe canvas (niciunul dintre cele 3 de acum, dar regula e comună):
 * cel mult 30 fps și devicePixelRatio limitat la 2.
 */
export const CANVAS_MAX_FPS = 30;
export const canvasDpr = () => Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
