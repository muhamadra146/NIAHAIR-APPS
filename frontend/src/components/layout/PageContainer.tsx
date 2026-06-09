import { cn } from "@/lib/utils";

interface PageContainerProps {
  children:   React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("w-full px-4 py-4 sm:px-6 sm:py-6", className)}>
      {children}
    </div>
  );
}
