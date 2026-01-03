import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, Loader2, CheckCircle, Info } from "lucide-react";

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
            Gerencie os idiomas do sistema
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
                  Código: {baseLanguage.code.toUpperCase()} • Todos os outros idiomas herdam a segurança deste
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </div>
          </CardHeader>
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
            <CardContent>
              <Badge variant={lang.is_active ? "default" : "outline"} className={lang.is_active ? "bg-green-500" : ""}>
                {lang.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Idioma Base (EN):</strong> Inglês é o padrão universal. Termos de segurança são cadastrados em inglês.
          </p>
          <p>
            <strong>2. Herança automática:</strong> O globalSafetyEngine carrega todos os idiomas simultaneamente para validação.
          </p>
          <p>
            <strong>3. Novos termos:</strong> Adicione via Admin → Intolerance Mappings (cadastro manual para garantir qualidade).
          </p>
          <p>
            <strong>4. Novos países:</strong> Herdam automaticamente a configuração base (US/EN) via countryConfig.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLanguages;
