import { useRef } from "react";
import { Flame, ScanBarcode, Refrigerator, ArrowLeft, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type PhotoMode = "food" | "label" | "fridge";

interface PhotoModeSelectorProps {
  onSelectMode: (mode: PhotoMode, imageBase64?: string) => void;
  onBack?: () => void;
}

const modes = [
  {
    id: "food" as PhotoMode,
    title: "Analisar Prato",
    description: "Verifique suas restrições + calorias e macros",
    icon: Flame,
    iconBg: "bg-gradient-to-br from-orange-400 to-red-500",
    emoji: "🍽️",
    usesCamera: true,
  },
  {
    id: "label" as PhotoMode,
    title: "Verificar Rótulo",
    description: "Analise se o produto é seguro para suas intolerâncias",
    icon: ScanBarcode,
    iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500",
    emoji: "🏷️",
    usesCamera: true,
  },
  {
    id: "fridge" as PhotoMode,
    title: "Escanear Geladeira",
    description: "Tire foto dos ingredientes e receba receitas personalizadas",
    icon: Refrigerator,
    iconBg: "bg-gradient-to-br from-cyan-400 to-teal-500",
    emoji: "🧊",
    usesCamera: false,
  },
];

export default function PhotoModeSelector({ onSelectMode, onBack }: PhotoModeSelectorProps) {
  const foodInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (mode: PhotoMode, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
    
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onSelectMode(mode, base64);
    };
    reader.onerror = () => {
      toast.error("Erro ao ler a imagem");
    };
    reader.readAsDataURL(file);
  };

  const handleCardClick = (mode: PhotoMode) => {
    if (mode === "food") {
      foodInputRef.current?.click();
    } else if (mode === "label") {
      labelInputRef.current?.click();
    } else {
      onSelectMode(mode);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden camera inputs - must be in DOM for click to work */}
      <input
        ref={foodInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange("food", e)}
      />
      <input
        ref={labelInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange("label", e)}
      />

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">O que deseja analisar?</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Escolha o tipo de análise para começar
        </p>
      </div>

      {/* Mode Cards */}
      <div className="space-y-3">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-border/50 overflow-hidden"
            onClick={() => handleCardClick(mode.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${mode.iconBg} flex items-center justify-center shadow-lg`}>
                  <mode.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                    <span>{mode.emoji}</span>
                    <span>{mode.title}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {mode.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back button for desktop or if onBack is provided */}
      {onBack && (
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}
