import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function TestEdgeFunction() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('🚀 Iniciando teste da Edge Function...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado para testar a Edge Function');
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-ai-meal-plan', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: {
          daysCount: 7,
          planName: 'Teste Semana Completa',
          optionsPerMeal: 1,
        }
      });

      if (fnError) {
        console.error('❌ Erro completo:', fnError);
        const errorMsg = JSON.stringify(fnError, null, 2);
        setError(errorMsg);
      } else {
        console.log('✅ Sucesso:', data);
        setResult(data);
      }
    } catch (err) {
      console.error('❌ Erro ao chamar Edge Function:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste da Edge Function</CardTitle>
          <CardDescription>
            Testar geração de 7 dias (semana completa: seg-dom)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTest} 
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              '🚀 Executar Teste (7 dias - Seg a Dom)'
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">❌ Erro:</h3>
              <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✅ Resultado:</h3>
              <pre className="text-sm text-green-700 whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.mealPlan && (
                <div className="mt-4 p-3 bg-white rounded border border-green-300">
                  <p className="text-sm">
                    <strong>Plano ID:</strong> {result.mealPlan.id}
                  </p>
                  <p className="text-sm">
                    <strong>Nome:</strong> {result.mealPlan.name}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>O que este teste faz:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chama generate-ai-meal-plan com daysCount=7</li>
              <li>Gera semana completa: 19/01 (seg) até 25/01 (dom)</li>
              <li>Deveria criar ~35 meal_plan_items (7 dias × 5 refeições)</li>
              <li>Testa se quinta, sexta, sábado e domingo são gerados</li>
            </ul>
            <p className="mt-4"><strong>Depois de executar:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verifique se TODOS os 7 dias aparecem no calendário</li>
              <li>Especialmente quinta (23), sexta (24), sábado (25) e domingo (26)</li>
              <li>Vá para os logs do Supabase se houver problema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
