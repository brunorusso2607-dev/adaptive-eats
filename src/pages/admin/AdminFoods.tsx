import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Globe, RefreshCw, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface FoodStats {
  total: number;
  bySource: { source: string; count: number; country: string; flag: string }[];
  byVerified: { verified: boolean; count: number }[];
}

const SOURCE_CONFIG: Record<string, { country: string; flag: string; name: string }> = {
  taco: { country: "Brasil", flag: "🇧🇷", name: "TACO" },
  TACO: { country: "Brasil", flag: "🇧🇷", name: "TACO" },
  tbca: { country: "Brasil", flag: "🇧🇷", name: "TBCA" },
  TBCA: { country: "Brasil", flag: "🇧🇷", name: "TBCA" },
  brasileira: { country: "Brasil", flag: "🇧🇷", name: "Manual/AI" },
  ciqual: { country: "França", flag: "🇫🇷", name: "CIQUAL" },
  francesa: { country: "França", flag: "🇫🇷", name: "Manual" },
  mccance: { country: "Reino Unido", flag: "🇬🇧", name: "McCance" },
  britanica: { country: "Reino Unido", flag: "🇬🇧", name: "Manual" },
  bam: { country: "México", flag: "🇲🇽", name: "BAM" },
  mexicana: { country: "México", flag: "🇲🇽", name: "Manual" },
  aesan: { country: "Espanha", flag: "🇪🇸", name: "AESAN" },
  bls: { country: "Alemanha", flag: "🇩🇪", name: "BLS" },
  crea: { country: "Itália", flag: "🇮🇹", name: "CREA" },
  usda: { country: "Estados Unidos", flag: "🇺🇸", name: "USDA" },
  insa: { country: "Portugal", flag: "🇵🇹", name: "INSA" },
  manual: { country: "Geral", flag: "🌍", name: "Manual" },
  ai: { country: "Geral", flag: "🤖", name: "IA" },
};

const ORIGIN_CONFIG: Record<string, { country: string; flag: string }> = {
  brasileira: { country: "Brasil", flag: "🇧🇷" },
  francesa: { country: "França", flag: "🇫🇷" },
  britanica: { country: "Reino Unido", flag: "🇬🇧" },
  mexicana: { country: "México", flag: "🇲🇽" },
  ES: { country: "Espanha", flag: "🇪🇸" },
  DE: { country: "Alemanha", flag: "🇩🇪" },
  italiana: { country: "Itália", flag: "🇮🇹" },
  portuguesa: { country: "Portugal", flag: "🇵🇹" },
  americana: { country: "Estados Unidos", flag: "🇺🇸" },
  internacional: { country: "Internacional", flag: "🌍" },
};

export default function AdminFoods() {
  const [stats, setStats] = useState<FoodStats | null>(null);
  const [originStats, setOriginStats] = useState<{ origin: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Total count
      const { count: total } = await supabase
        .from("foods")
        .select("*", { count: "exact", head: true });

      // Usar RPC ou query direta para obter contagens por source
      // Como não temos RPC, vamos buscar todos os sources únicos e contar
      const allSources: Record<string, number> = {};
      const allOrigins: Record<string, number> = {};
      let verifiedCount = 0;
      let unverifiedCount = 0;

      // Paginar para obter todos os registros
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("foods")
          .select("source, cuisine_origin, is_verified")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (!data || data.length < pageSize) {
          hasMore = false;
        }

        data?.forEach((item) => {
          // Count sources
          const source = item.source || "unknown";
          allSources[source] = (allSources[source] || 0) + 1;

          // Count origins
          const origin = item.cuisine_origin || "unknown";
          allOrigins[origin] = (allOrigins[origin] || 0) + 1;

          // Count verified
          if (item.is_verified) {
            verifiedCount++;
          } else {
            unverifiedCount++;
          }
        });

        page++;
      }

      const bySource = Object.entries(allSources)
        .map(([source, count]) => {
          const config = SOURCE_CONFIG[source] || SOURCE_CONFIG[source.toLowerCase()] || { country: "Outro", flag: "❓", name: source };
          return { source, count, country: config.country, flag: config.flag };
        })
        .sort((a, b) => b.count - a.count);

      const origins = Object.entries(allOrigins)
        .map(([origin, count]) => ({ origin, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        total: total || 0,
        bySource,
        byVerified: [
          { verified: true, count: verifiedCount },
          { verified: false, count: unverifiedCount },
        ],
      });
      setOriginStats(origins);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const runImport = async (functionName: string, label: string) => {
    setImporting(functionName);
    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;
      
      toast.success(`${label}: ${data.inserted || 0} alimentos importados`);
      fetchStats();
    } catch (error: any) {
      console.error(`Error running ${functionName}:`, error);
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setImporting(null);
    }
  };

  const importFunctions = [
    { id: "import-taco-foods", label: "TACO (Brasil)", flag: "🇧🇷" },
    { id: "import-tbca-foods", label: "TBCA (Brasil)", flag: "🇧🇷" },
    { id: "import-ciqual-foods", label: "CIQUAL (França)", flag: "🇫🇷" },
    { id: "import-mccance-foods", label: "McCance (UK)", flag: "🇬🇧" },
    { id: "import-bls-foods", label: "BLS (Alemanha)", flag: "🇩🇪" },
    { id: "import-aesan-foods", label: "AESAN (Espanha)", flag: "🇪🇸" },
    { id: "import-crea-foods", label: "CREA (Itália)", flag: "🇮🇹" },
    { id: "import-bam-foods", label: "BAM (México)", flag: "🇲🇽" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const verifiedPercentage = stats
    ? Math.round((stats.byVerified.find((v) => v.verified)?.count || 0) / stats.total * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6" />
            Base de Alimentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie e importe dados nutricionais de diferentes fontes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.total.toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fontes Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.bySource.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">bases de dados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {verifiedPercentage}%
            </div>
            <Progress value={verifiedPercentage} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Foods by Origin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Alimentos por Origem Culinária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {originStats.map((item) => {
              const config = ORIGIN_CONFIG[item.origin] || { country: item.origin, flag: "🌍" };
              const percentage = stats ? Math.round((item.count / stats.total) * 100) : 0;
              
              return (
                <div
                  key={item.origin}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.flag}</span>
                    <div>
                      <p className="font-medium text-sm">{config.country}</p>
                      <p className="text-xs text-muted-foreground">{item.origin}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {item.count.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Foods by Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Alimentos por Fonte de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats?.bySource.map((item) => {
              const config = SOURCE_CONFIG[item.source] || { name: item.source, country: "Outro", flag: "❓" };
              const percentage = Math.round((item.count / (stats?.total || 1)) * 100);
              
              return (
                <div
                  key={item.source}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.flag}</span>
                    <div>
                      <p className="font-medium text-sm">{config.name}</p>
                      <p className="text-xs text-muted-foreground">{config.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {item.count.toLocaleString("pt-BR")}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Import Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Importar Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Execute as funções de importação para adicionar ou atualizar alimentos de fontes oficiais.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {importFunctions.map((fn) => (
              <Button
                key={fn.id}
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                onClick={() => runImport(fn.id, fn.label)}
                disabled={importing !== null}
              >
                {importing === fn.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-lg">{fn.flag}</span>
                )}
                <span className="text-sm">{fn.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
