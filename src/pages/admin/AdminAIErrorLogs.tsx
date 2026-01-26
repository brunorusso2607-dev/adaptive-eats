import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, AlertTriangle, Clock, User, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AIErrorLog {
  id: string;
  user_id: string | null;
  function_name: string;
  error_message: string;
  error_details: Record<string, unknown> | null;
  request_payload: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminAIErrorLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ai-error-logs", functionFilter],
    queryFn: async () => {
      let query = supabase
        .from("ai_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (functionFilter !== "all") {
        query = query.eq("function_name", functionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AIErrorLog[];
    },
  });

  const { data: functionNames } = useQuery({
    queryKey: ["ai-error-function-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_error_logs")
        .select("function_name")
        .limit(1000);

      if (error) throw error;
      
      const uniqueNames = [...new Set(data?.map((d) => d.function_name) || [])];
      return uniqueNames;
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.function_name.toLowerCase().includes(search) ||
      log.error_message.toLowerCase().includes(search) ||
      log.user_id?.toLowerCase().includes(search)
    );
  });

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Log de Erros de IA
              </CardTitle>
              <CardDescription>
                Monitore falhas nas funções de IA e identifique problemas
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por função, erro ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {functionNames?.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Summary */}
          {logs && logs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Total de erros</p>
              </div>
              <div className="bg-card/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {logs.filter((l) => {
                    const date = new Date(l.created_at);
                    const now = new Date();
                    return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Últimas 24h</p>
              </div>
              <div className="bg-card/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {new Set(logs.map((l) => l.function_name)).size}
                </p>
                <p className="text-xs text-muted-foreground">Funções afetadas</p>
              </div>
              <div className="bg-card/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {new Set(logs.filter((l) => l.user_id).map((l) => l.user_id)).size}
                </p>
                <p className="text-xs text-muted-foreground">Usuários afetados</p>
              </div>
            </div>
          )}

          {/* Logs List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Dialog key={log.id}>
                  <DialogTrigger asChild>
                    <div className="bg-card/30 hover:bg-card/50 rounded-lg p-4 cursor-pointer transition-colors border border-destructive/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive" className="text-xs">
                              <Code className="w-3 h-3 mr-1" />
                              {log.function_name}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeSince(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">
                            {log.error_message}
                          </p>
                          {log.user_id && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user_id.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Detalhes do Erro
                      </DialogTitle>
                      <DialogDescription>
                        {format(new Date(log.created_at), "PPpp", { locale: ptBR })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Função</h4>
                        <Badge variant="outline">{log.function_name}</Badge>
                      </div>
                      {log.user_id && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">ID do Usuário</h4>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{log.user_id}</code>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium mb-1">Mensagem de Erro</h4>
                        <p className="text-sm text-muted-foreground bg-destructive/10 rounded-lg p-3">
                          {log.error_message}
                        </p>
                      </div>
                      {log.error_details && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Detalhes do Erro</h4>
                          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-[200px]">
                            {JSON.stringify(log.error_details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.request_payload && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Payload da Requisição</h4>
                          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-[200px]">
                            {JSON.stringify(log.request_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || functionFilter !== "all" 
                  ? "Nenhum erro encontrado com os filtros aplicados" 
                  : "Nenhum erro de IA registrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
