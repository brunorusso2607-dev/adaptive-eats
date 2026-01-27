import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Play, RotateCcw, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IntoleraIAssistant from "@/components/IntoleraIAssistant";

type FunctionType = "generate-recipe" | "generate-meal-plan" | "analyze-food-photo" | "analyze-fridge-photo";

interface SimulatorResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}

export default function AdminPromptSimulator() {
  const [selectedFunction, setSelectedFunction] = useState<FunctionType>("generate-recipe");
  const [inputPayload, setInputPayload] = useState<string>('{\n  "ingredients": "frango, arroz, brócolis",\n  "dietaryPreference": "omnivore",\n  "complexity": "balanced"\n}');
  const [response, setResponse] = useState<SimulatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const functionOptions = [
    { value: "generate-recipe", label: "Gerar Receita", defaultPayload: '{\n  "ingredients": "frango, arroz, brócolis",\n  "dietaryPreference": "omnivore",\n  "complexity": "balanced"\n}' },
    { value: "generate-meal-plan", label: "Gerar Plano Alimentar", defaultPayload: '{\n  "dietaryPreference": "omnivore",\n  "calorieGoal": "maintain",\n  "complexity": "balanced",\n  "intolerances": []\n}' },
    { value: "analyze-food-photo", label: "Analisar Foto de Comida", defaultPayload: '{\n  "imageBase64": "BASE64_DA_IMAGEM"\n}' },
    { value: "analyze-fridge-photo", label: "Analisar Foto da Geladeira", defaultPayload: '{\n  "imageBase64": "BASE64_DA_IMAGEM"\n}' },
  ];

  const handleFunctionChange = (value: FunctionType) => {
    setSelectedFunction(value);
    const option = functionOptions.find(o => o.value === value);
    if (option) {
      setInputPayload(option.defaultPayload);
    }
    setResponse(null);
  };

  const executeSimulation = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      let payload;
      try {
        payload = JSON.parse(inputPayload);
      } catch {
        toast.error("JSON inválido no payload");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(selectedFunction, {
        body: payload,
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        setResponse({
          success: false,
          error: error.message,
          executionTime,
        });
        toast.error("Erro na execução");
      } else {
        setResponse({
          success: true,
          data,
          executionTime,
        });
        toast.success("Simulação executada com sucesso!");
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        executionTime,
      });
      toast.error("Erro na simulação");
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Resposta copiada!");
    }
  };

  const resetSimulator = () => {
    setResponse(null);
    const option = functionOptions.find(o => o.value === selectedFunction);
    if (option) {
      setInputPayload(option.defaultPayload);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Simulador de Prompts</CardTitle>
          <CardDescription>
            Teste as funções de IA sem precisar logar como usuário comum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Function Selection */}
          <div className="space-y-2">
            <Label>Função a testar</Label>
            <Select value={selectedFunction} onValueChange={(v) => handleFunctionChange(v as FunctionType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {functionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Payload */}
          <div className="space-y-2">
            <Label>Payload de entrada (JSON)</Label>
            <Textarea
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder="Digite o JSON de entrada..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={executeSimulation} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Executar Simulação
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetSimulator}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Card */}
      {response && (
        <Card className={`glass-card border-2 ${response.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className={`text-lg ${response.success ? 'text-green-500' : 'text-red-500'}`}>
                {response.success ? '✓ Sucesso' : '✗ Erro'}
              </CardTitle>
              <CardDescription>
                Tempo de execução: {response.executionTime}ms
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={copyResponse}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="bg-card/50 rounded-lg p-4 overflow-auto max-h-[400px] text-sm font-mono">
              {JSON.stringify(response.success ? response.data : response.error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* IntoleraI Assistant */}
      <IntoleraIAssistant />
    </div>
  );
}
