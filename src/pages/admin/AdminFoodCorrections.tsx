import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Loader2, 
  TrendingUp, 
  Edit3, 
  RefreshCw, 
  AlertTriangle,
  BarChart3,
  FileText,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminFoodCorrections() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: corrections, isLoading } = useQuery({
    queryKey: ["food-corrections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_corrections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredCorrections = corrections?.filter(
    (c) =>
      c.original_item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.corrected_item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const stats = {
    total: corrections?.length || 0,
    manual: corrections?.filter((c) => c.correction_type === "manual").length || 0,
    alternative: corrections?.filter((c) => c.correction_type === "alternative_selected").length || 0,
    today: corrections?.filter((c) => {
      const today = new Date();
      const correctionDate = new Date(c.created_at);
      return correctionDate.toDateString() === today.toDateString();
    }).length || 0,
  };

  // Most corrected items
  const correctionCounts = corrections?.reduce((acc, c) => {
    acc[c.original_item] = (acc[c.original_item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const topCorrectedItems = Object.entries(correctionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getCorrectionTypeBadge = (type: string) => {
    switch (type) {
      case "manual":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Manual</Badge>;
      case "alternative_selected":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Alternativa</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Correções de Alimentos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Histórico de correções feitas pelos usuários para melhorar a IA
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Manuais</p>
                <p className="text-2xl font-bold text-foreground">{stats.manual}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alternativas</p>
                <p className="text-2xl font-bold text-foreground">{stats.alternative}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-foreground">{stats.today}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Corrected Items */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Alimentos Mais Corrigidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCorrectedItems.length > 0 ? (
              topCorrectedItems.map(([item, count], index) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm text-foreground truncate max-w-[200px]">{item}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{count}x</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma correção ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Correction Types Breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Correções Manuais</span>
                <span className="font-medium text-foreground">{stats.manual}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: stats.total > 0 ? `${(stats.manual / stats.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alternativas Selecionadas</span>
                <span className="font-medium text-foreground">{stats.alternative}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: stats.total > 0 ? `${(stats.alternative / stats.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por alimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Corrections Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Original</TableHead>
                <TableHead>Corrigido</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contexto</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCorrections && filteredCorrections.length > 0 ? (
                filteredCorrections.map((correction) => (
                  <TableRow key={correction.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                      {correction.original_item}
                    </TableCell>
                    <TableCell className="text-foreground max-w-[200px] truncate">
                      {correction.corrected_item}
                    </TableCell>
                    <TableCell>
                      {getCorrectionTypeBadge(correction.correction_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                      {correction.dish_context || correction.cuisine_origin || "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {format(new Date(correction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma correção encontrada</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
