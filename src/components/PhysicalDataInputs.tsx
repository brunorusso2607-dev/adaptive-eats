import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Ruler, Calendar, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhysicalData = {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: string | null;
  activity_level: string | null;
};

type PhysicalDataInputsProps = {
  data: PhysicalData;
  onChange: (data: PhysicalData) => void;
  showWeightGoal?: boolean;
  className?: string;
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentário",
  light: "Leve",
  moderate: "Moderado",
  active: "Ativo",
  very_active: "Muito ativo",
};

export default function PhysicalDataInputs({ 
  data, 
  onChange, 
  showWeightGoal = true,
  className 
}: PhysicalDataInputsProps) {
  // Estado local para edição livre do campo altura - formato X,XX
  const [heightInput, setHeightInput] = useState(() => {
    if (data.height) {
      const meters = (data.height / 100).toFixed(2);
      return meters.replace('.', ',');
    }
    return "";
  });

  // Sincronizar heightInput quando data.height mudar externamente
  useEffect(() => {
    if (data.height) {
      const meters = (data.height / 100).toFixed(2);
      const formatted = meters.replace('.', ',');
      if (formatted !== heightInput) {
        setHeightInput(formatted);
      }
    } else if (!data.height && heightInput) {
      setHeightInput("");
    }
  }, [data.height]);

  const handleWeightChange = (field: 'weight_current' | 'weight_goal', value: string) => {
    // Remove tudo exceto números e limita a 3 dígitos
    const digits = value.replace(/[^0-9]/g, '').substring(0, 3);
    onChange({ 
      ...data, 
      [field]: digits ? parseFloat(digits) : null 
    });
  };

  const handleHeightChange = (rawValue: string) => {
    const previousValue = heightInput;
    const isDeleting = rawValue.length < previousValue.length;
    
    // Se o usuário apagou tudo, permitir campo vazio
    if (rawValue === '' || rawValue === ',') {
      setHeightInput('');
      onChange({ ...data, height: null });
      return;
    }
    
    // Remove tudo exceto números
    let digits = rawValue.replace(/[^0-9]/g, '');
    
    // Se não há dígitos após limpar, esvaziar
    if (digits.length === 0) {
      setHeightInput('');
      onChange({ ...data, height: null });
      return;
    }
    
    // Limita a 3 dígitos (formato X,XX = altura máxima 2,99m)
    if (digits.length > 3) {
      digits = digits.substring(0, 3);
    }
    
    // Se está deletando e só tem 1 dígito, permitir sem vírgula
    if (isDeleting && digits.length === 1) {
      setHeightInput(digits);
      const numericValue = parseFloat(digits + '.0');
      if (!isNaN(numericValue) && numericValue > 0) {
        onChange({ ...data, height: Math.round(numericValue * 100) });
      }
      return;
    }
    
    // Formata automaticamente com vírgula após primeiro dígito
    let formatted = '';
    if (digits.length === 1) {
      formatted = digits + ',';
    } else {
      formatted = digits[0] + ',' + digits.substring(1);
    }
    
    setHeightInput(formatted);
    
    // Converte para cm para armazenamento
    const numericValue = parseFloat(digits[0] + '.' + (digits.substring(1) || '0'));
    if (!isNaN(numericValue) && numericValue > 0) {
      onChange({ ...data, height: Math.round(numericValue * 100) });
    } else {
      onChange({ ...data, height: null });
    }
  };

  const handleHeightBlur = () => {
    // Completa com zeros se necessário (ex: "1," -> "1,00")
    if (data.height) {
      const meters = (data.height / 100).toFixed(2);
      setHeightInput(meters.replace('.', ','));
    }
  };

  const handleAgeChange = (value: string) => {
    // Remove tudo exceto números e limita a 3 dígitos
    const digits = value.replace(/[^0-9]/g, '').substring(0, 3);
    onChange({ ...data, age: digits ? parseInt(digits) : null });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Peso */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Scale className="w-3 h-3 text-muted-foreground" />
            Peso Atual (kg)
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            value={data.weight_current || ""}
            onChange={(e) => handleWeightChange('weight_current', e.target.value)}
            placeholder="75"
            className="h-10"
          />
        </div>
        {showWeightGoal && (
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Scale className="w-3 h-3 text-muted-foreground" />
              Peso Meta (kg)
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={data.weight_goal || ""}
              onChange={(e) => handleWeightChange('weight_goal', e.target.value)}
              placeholder="70"
              className="h-10"
            />
          </div>
        )}
      </div>

      {/* Altura e Idade */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Ruler className="w-3 h-3 text-muted-foreground" />
            Altura (m)
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="1,75"
            value={heightInput}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={handleHeightBlur}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            Idade
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="30"
            value={data.age || ""}
            onChange={(e) => handleAgeChange(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* Sexo */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <User className="w-3 h-3 text-muted-foreground" />
          Sexo Biológico
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "male", label: "Masculino", color: "text-blue-500" }, 
            { id: "female", label: "Feminino", color: "text-pink-500" }
          ].map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => onChange({ ...data, sex: opt.id })}
              className={cn(
                "p-2 rounded-lg border-2 text-center transition-all text-sm touch-manipulation flex items-center justify-center gap-1.5",
                data.sex === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <User className={cn("w-4 h-4 stroke-[1.5]", opt.color)} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nível de Atividade */}
      <div className="space-y-1">
        <Label className="text-xs">Nível de Atividade</Label>
        <div className="grid grid-cols-1 gap-1">
          {Object.entries(ACTIVITY_LABELS).map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => onChange({ ...data, activity_level: id })}
              className={cn(
                "p-2 rounded-lg border text-left text-sm transition-all flex items-center justify-between touch-manipulation",
                data.activity_level === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <span>{label}</span>
              {data.activity_level === id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
