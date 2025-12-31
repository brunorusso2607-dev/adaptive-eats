import { useRef, useEffect, useState } from "react";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DirectCameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  mode: "food" | "label";
}

export default function DirectCameraCapture({ onCapture, onCancel, mode }: DirectCameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isWaitingForCamera, setIsWaitingForCamera] = useState(true);
  const hasTriggeredRef = useRef(false);
  const didSelectFileRef = useRef(false);

  useEffect(() => {
    // Trigger camera immediately on mount, but only once
    if (!hasTriggeredRef.current && cameraInputRef.current) {
      hasTriggeredRef.current = true;
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        cameraInputRef.current?.click();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Detect when camera dialog is closed without selection (mobile workaround)
  useEffect(() => {
    const handleFocus = () => {
      // When window regains focus after camera closes
      // Wait a bit to see if a file was selected
      setTimeout(() => {
        if (!didSelectFileRef.current) {
          // No file was selected, user cancelled
          setIsWaitingForCamera(false);
        }
      }, 500);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    didSelectFileRef.current = true;
    
    // Reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
    
    if (!file) {
      setIsWaitingForCamera(false);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      setIsWaitingForCamera(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      setIsWaitingForCamera(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onCapture(base64);
    };
    reader.onerror = () => {
      toast.error("Erro ao ler a imagem");
      setIsWaitingForCamera(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRetryCamera = () => {
    didSelectFileRef.current = false;
    setIsWaitingForCamera(true);
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 100);
  };

  const modeLabels = {
    food: "Analisar Prato",
    label: "Verificar Rótulo"
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-6">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {isWaitingForCamera ? (
        <>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Abrindo câmera...
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === "food" 
                ? "Tire uma foto do seu prato" 
                : "Tire uma foto da frente do produto"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Camera className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {modeLabels[mode]}
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === "food" 
                ? "Tire uma foto para analisar as calorias" 
                : "Tire uma foto para verificar ingredientes"}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button onClick={handleRetryCamera} className="w-full">
              <Camera className="w-4 h-4 mr-2" />
              Abrir Câmera
            </Button>
            <Button variant="ghost" onClick={onCancel} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
