import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Database, Globe, RefreshCw, Upload, AlertTriangle, CheckCircle, Clock, PlayCircle, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface USDAQueueItem {
  id: string;
  search_term: string;
  category: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  usda_fdc_id: string | null;
  error_message: string | null;
  attempts: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface USDAStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
  completed: { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  skipped: { label: "Ignorado", color: "bg-gray-100 text-gray-800", icon: PauseCircle },
};

const CATEGORIES = [
  { value: "foundation", label: "Foundation (Dados Brutos)" },
  { value: "sr_legacy", label: "SR Legacy (Dados Históricos)" },
  { value: "survey", label: "Survey (Inquéritos)" },
];

export default function AdminUSDA() {
  const [queueItems, setQueueItems] = useState<USDAQueueItem[]>([]);
  const [stats, setStats] = useState<USDAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("foundation");
  const [priority, setPriority] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("usda_import_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setQueueItems((data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
      })));

      // Calculate stats
      const newStats: USDAStats = {
        total: data?.length || 0,
        pending: data?.filter(item => item.status === 'pending').length || 0,
        processing: data?.filter(item => item.status === 'processing').length || 0,
        completed: data?.filter(item => item.status === 'completed').length || 0,
        failed: data?.filter(item => item.status === 'failed').length || 0,
        skipped: data?.filter(item => item.status === 'skipped').length || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching USDA queue:", error);
      toast.error("Erro ao carregar fila USDA");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const addToQueue = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um termo de busca");
      return;
    }

    try {
      const { error } = await supabase
        .from("usda_import_queue")
        .insert({
          search_term: searchTerm.trim(),
          category,
          priority,
          status: 'pending'
        });

      if (error) throw error;
      
      toast.success("Item adicionado à fila");
      setSearchTerm("");
      setShowAddForm(false);
      fetchQueue();
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error("Erro ao adicionar à fila");
    }
  };

  const runImport = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-usda-food', {
        body: { batchSize: 10, delayMs: 5000 }
      });

      if (error) throw error;
      
      toast.success(`Importação iniciada: ${data.processed || 0} itens processados`);
      fetchQueue();
    } catch (error: any) {
      console.error("Error running import:", error);
      toast.error(error.message || "Erro ao executar importação");
    } finally {
      setIsImporting(false);
    }
  };

  const clearFailed = async () => {
    try {
      const { error } = await supabase
        .from("usda_import_queue")
        .delete()
        .eq("status", "failed");

      if (error) throw error;
      
      toast.success("Itens falhos removidos");
      fetchQueue();
    } catch (error) {
      console.error("Error clearing failed:", error);
      toast.error("Erro ao limpar itens falhos");
    }
  };

  const resetStuck = async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from("usda_import_queue")
        .update({ 
          status: "pending",
          error_message: "Auto-retry: item estava travado em processing"
        })
        .eq("status", "processing")
        .lt("updated_at", fifteenMinutesAgo);

      if (error) throw error;
      
      toast.success("Itens travados resetados");
      fetchQueue();
    } catch (error) {
      console.error("Error resetting stuck items:", error);
      toast.error("Erro ao resetar itens travados");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importação USDA</h1>
          <p className="text-muted-foreground">
            Gerencie a fila de importação de alimentos do USDA FoodData Central
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
          <Button
            onClick={runImport}
            disabled={isImporting || (stats?.pending || 0) === 0}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Processar Fila
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {config.label}
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.[status as keyof USDAStats] || 0}</div>
          </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Item à Fila</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="search-term">Termo de Busca</Label>
                <Input
                  id="search-term"
                  placeholder="Ex: apple, chicken breast, rice"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="priority">Prioridade (0 = normal, 10 = alta)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addToQueue}>
                <Upload className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={resetStuck}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resetar Travados
            </Button>
            <Button variant="outline" onClick={clearFailed}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Limpar Falhos
            </Button>
            <Button variant="outline" onClick={fetchQueue}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Fila de Importação ({queueItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {queueItems.map((item) => {
                const config = STATUS_CONFIG[item.status];
                const Icon = config.icon;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{item.search_term}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category} • Prioridade: {item.priority}
                        </p>
                        {item.error_message && (
                          <p className="text-xs text-red-600 mt-1">{item.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tentativas: {item.attempts}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {queueItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item na fila</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
