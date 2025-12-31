import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, Play, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SupportedLanguage {
  id: string;
  code: string;
  name: string;
  native_name: string;
  is_base_language: boolean;
  is_active: boolean;
  expansion_status: string;
  last_expansion_at: string | null;
  total_terms: number;
  sort_order: number;
}

const AdminLanguages = () => {
  const queryClient = useQueryClient();
  const [expandingLanguage, setExpandingLanguage] = useState<string | null>(null);

  const { data: languages, isLoading } = useQuery({
    queryKey: ["supported-languages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supported_languages")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as SupportedLanguage[];
    },
  });

  const { data: termStats } = useQuery({
    queryKey: ["intolerance-term-stats"],
    queryFn: async () => {
      const { count } = await supabase
        .from("intolerance_mappings")
        .select("*", { count: "exact", head: true });

      return { totalTerms: count || 0 };
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("supported_languages")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supported-languages"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const expandLanguageMutation = useMutation({
    mutationFn: async (languageCode: string) => {
      setExpandingLanguage(languageCode);
      
      const { data, error } = await supabase.functions.invoke("expand-language-terms", {
        body: { language_code: languageCode, batch_size: 50 },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supported-languages"] });
      queryClient.invalidateQueries({ queryKey: ["intolerance-term-stats"] });
      toast.success(`Expansão concluída! ${data.total_inserted} novos termos adicionados.`);
      setExpandingLanguage(null);
    },
    onError: (error) => {
      console.error("Expansion error:", error);
      toast.error("Erro na expansão de termos");
      setExpandingLanguage(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-blue-500 text-white">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Em progresso
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const baseLanguage = languages?.find(l => l.is_base_language);
  const otherLanguages = languages?.filter(l => !l.is_base_language) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Idiomas Suportados
          </h1>
          <p className="text-muted-foreground">
            Gerencie os idiomas do sistema e expanda termos de intolerância
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total de termos mapeados</p>
          <p className="text-2xl font-bold text-primary">{termStats?.totalTerms?.toLocaleString()}</p>
        </div>
      </div>

      {/* Idioma Base */}
      {baseLanguage && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {baseLanguage.native_name}
                  <Badge variant="secondary">Idioma Base</Badge>
                </CardTitle>
                <CardDescription>
                  Código: {baseLanguage.code.toUpperCase()} • Todos os outros idiomas são traduzidos a partir deste
                </CardDescription>
              </div>
              {getStatusBadge(baseLanguage.expansion_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {baseLanguage.last_expansion_at 
                  ? `Última expansão: ${new Date(baseLanguage.last_expansion_at).toLocaleDateString('pt-BR')}`
                  : "Nunca expandido automaticamente"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => expandLanguageMutation.mutate(baseLanguage.code)}
                disabled={expandingLanguage === baseLanguage.code}
              >
                {expandingLanguage === baseLanguage.code ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Expandindo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Expandir PT
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outros Idiomas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {otherLanguages.map((lang) => (
          <Card key={lang.id} className={!lang.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{lang.native_name}</CardTitle>
                <Switch
                  checked={lang.is_active}
                  onCheckedChange={(checked) => 
                    toggleActiveMutation.mutate({ id: lang.id, isActive: checked })
                  }
                />
              </div>
              <CardDescription>
                {lang.name} ({lang.code.toUpperCase()})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(lang.expansion_status)}
              </div>
              
              {lang.last_expansion_at && (
                <div className="text-xs text-muted-foreground">
                  Última expansão: {new Date(lang.last_expansion_at).toLocaleDateString('pt-BR')}
                </div>
              )}

              <Button
                className="w-full"
                size="sm"
                onClick={() => expandLanguageMutation.mutate(lang.code)}
                disabled={!lang.is_active || expandingLanguage === lang.code}
              >
                {expandingLanguage === lang.code ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Expandindo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Expandir Termos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Idioma Base (PT):</strong> Contém os termos originais que servem de referência.
          </p>
          <p>
            <strong>2. Expansão automática:</strong> Ao clicar em "Expandir Termos", a IA gera traduções e derivados para cada intolerância no idioma selecionado.
          </p>
          <p>
            <strong>3. Ativação:</strong> Idiomas inativos não serão usados para validação, mas seus termos permanecem no banco.
          </p>
          <p>
            <strong>4. Novos países:</strong> Quando um novo país for adicionado, basta ativar o idioma correspondente e executar a expansão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLanguages;
