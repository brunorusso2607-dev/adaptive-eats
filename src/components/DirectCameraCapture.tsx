import { useRef, useEffect } from "react";
import { toast } from "sonner";

interface DirectCameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export default function DirectCameraCapture({ onCapture, onCancel }: DirectCameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Trigger camera immediately on mount, but only once
    if (!hasTriggeredRef.current && cameraInputRef.current) {
      hasTriggeredRef.current = true;
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        cameraInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
    
    if (!file) {
      // User cancelled the camera - go back to mode selector
      onCancel();
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      onCancel();
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      onCancel();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onCapture(base64);
    };
    reader.onerror = () => {
      toast.error("Erro ao ler a imagem");
      onCancel();
    };
    reader.readAsDataURL(file);
  };

  // Handle when user cancels the camera dialog
  const handleCancel = () => {
    onCancel();
  };

  return (
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={handleFileSelect}
      onBlur={handleCancel}
    />
  );
}
