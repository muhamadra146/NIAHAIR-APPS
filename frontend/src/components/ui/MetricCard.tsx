import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon:      LucideIcon;
  label:     string;
  value:     string;
  sub:       string;
  href:      string;
  progress?: number;
  delay:     string;
}

export function MetricCard({ icon: Icon, label, value, sub, href, progress, delay }: MetricCardProps) {
  return (
    <Link
      to={href}
      className={`animate-fade-up ${delay} group block rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary/30 to-primary/60" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-semibold tracking-tight truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
        {progress !== undefined && (
          <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
