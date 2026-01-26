import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-success" />,
        error: <XCircle className="w-5 h-5 text-destructive" />,
        warning: <AlertTriangle className="w-5 h-5 text-warning" />,
        info: <Info className="w-5 h-5 text-info" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success: "group-[.toaster]:!border-success/30 group-[.toaster]:!bg-success/5",
          error: "group-[.toaster]:!border-destructive/30 group-[.toaster]:!bg-destructive/5",
          warning: "group-[.toaster]:!border-warning/30 group-[.toaster]:!bg-warning/5",
          info: "group-[.toaster]:!border-info/30 group-[.toaster]:!bg-info/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
