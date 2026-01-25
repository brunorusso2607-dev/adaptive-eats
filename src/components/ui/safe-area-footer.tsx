import * as React from "react";
import { cn } from "@/lib/utils";

interface SafeAreaFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Se true, usa position sticky ao invés de absolute */
  sticky?: boolean;
  /** Se true, não aplica borda superior */
  noBorder?: boolean;
  /** Se true, não aplica background */
  transparent?: boolean;
}

/**
 * Footer com safe-area para dispositivos móveis (iOS).
 * Automaticamente adiciona padding inferior para evitar sobreposição
 * com a barra de gestos do iPhone.
 */
const SafeAreaFooter = React.forwardRef<HTMLDivElement, SafeAreaFooterProps>(
  ({ className, sticky = false, noBorder = false, transparent = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "left-0 right-0 bottom-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          sticky ? "sticky" : "absolute",
          !noBorder && "border-t",
          !transparent && "bg-background",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SafeAreaFooter.displayName = "SafeAreaFooter";

export { SafeAreaFooter };
