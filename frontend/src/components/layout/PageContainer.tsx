import { cn } from "@/lib/utils";

interface PageContainerProps {
  children:   React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-xl px-5 py-6 sm:px-8 sm:py-8", className)}>
      <div className="animate-fade-up delay-0">
        {children}
      </div>
    </div>
  );
}
