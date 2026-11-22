import { Component, Fragment, type ReactNode } from 'react';
import { MapPinOff } from 'lucide-react';
import { dictFor, type Lang } from '../i18n';

/** Can this browser draw the 3D map at all? (very old phones, WebGL turned off, some locked-down browsers) */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Friendly message where the map would be; search, rooms and directions text still work around it. */
export function MapUnavailable({ lang }: { lang: Lang }) {
  const t = dictFor(lang);
  return (
    <div className="absolute inset-0 grid place-items-center p-8 text-center">
      <div className="max-w-xs">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-solid text-muted shadow-md"><MapPinOff size={22} /></span>
        <p className="text-sm font-semibold text-text">{t.mapUnavailableTitle}</p>
        <p className="mt-1 text-xs text-muted">{t.mapUnavailable}</p>
      </div>
    </div>
  );
}

const MAX_RETRIES = 3; // per minute, then the message is shown
const RETRY_MS = 1000; // also gives the browser time to restore a lost context by itself

/**
 * The 3D map can fail while opening (graphics context refused, or lost and not given back): it is rebuilt by itself,
 * so no refresh is needed. The message only shows when that keeps failing.
 */
export class MapErrorBoundary extends Component<{ lang: Lang; children: ReactNode }, { failed: boolean; gaveUp: boolean; build: number }> {
  state = { failed: false, gaveUp: false, build: 0 };
  private retries: number[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private lost: HTMLCanvasElement | null = null;

  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidMount() {
    // context events don't bubble, so listen while they travel down
    document.addEventListener('webglcontextlost', this.onLost, true);
    document.addEventListener('visibilitychange', this.checkSoon);
  }
  componentWillUnmount() {
    document.removeEventListener('webglcontextlost', this.onLost, true);
    document.removeEventListener('visibilitychange', this.checkSoon);
    clearTimeout(this.timer);
  }
  componentDidCatch() {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.rebuild, RETRY_MS);
  }
  private onLost = (e: Event) => {
    this.lost = e.target as HTMLCanvasElement;
    this.checkSoon();
  };
  private checkSoon = () => {
    if (!this.lost || document.hidden) return; // in the background: checked again when the app is back on screen
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const canvas = this.lost;
      if (!canvas || document.hidden) return;
      this.lost = null;
      if (canvas.isConnected && canvas.getContext('webgl2')?.isContextLost() !== false) this.rebuild();
    }, RETRY_MS);
  };
  private rebuild = () => {
    const now = Date.now();
    this.retries = this.retries.filter((at) => now - at < 60_000);
    if (this.retries.length >= MAX_RETRIES) return this.setState({ failed: true, gaveUp: true });
    this.retries.push(now);
    this.setState((s) => ({ failed: false, build: s.build + 1 }));
  };
  render() {
    const { failed, gaveUp, build } = this.state;
    if (gaveUp) return <MapUnavailable lang={this.props.lang} />;
    return failed ? null : <Fragment key={build}>{this.props.children}</Fragment>;
  }
}
