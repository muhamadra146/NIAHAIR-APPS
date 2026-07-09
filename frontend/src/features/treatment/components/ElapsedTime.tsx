import { useState, useEffect } from "react";

interface ElapsedTimeProps {
  startedAt:  string | null;
  className?: string;
}

function formatElapsed(seconds: number): string {
  if (seconds < 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ElapsedTime({ startedAt, className }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return <span className={className}>—</span>;

  return <span className={className}>{formatElapsed(elapsed)}</span>;
}
