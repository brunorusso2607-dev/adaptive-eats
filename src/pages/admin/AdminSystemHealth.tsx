import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Server,
  Database,
  Zap,
  Monitor
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HealthLog {
  id: string;
  check_type: string;
  target_name: string;
  status: string;
  response_time_ms: number;
  error_message: string | null;
  checked_at: string;
}

interface FrontendError {
  id: string;
  error_type: string;
  error_message: string;
  component_name: string | null;
  page_url: string | null;
  user_id: string | null;
  created_at: string;
}

const statusConfig = {
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100", label: "OK" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-100", label: "Lento" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-100", label: "Erro" },
  timeout: { icon: Clock, color: "text-red-500", bg: "bg-red-100", label: "Timeout" },
};

const typeIcons = {
  edge_function: Zap,
  database: Database,
  api: Server,
  frontend: Monitor,
};

export default function AdminSystemHealth() {
  const queryClient = useQueryClient();
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Buscar últimos health checks
  const { data: healthLogs, isLoading: loadingHealth } = useQuery({
    queryKey: ['system-health-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as HealthLog[];
    },
  });

  // Buscar erros do frontend
  const { data: frontendErrors, isLoading: loadingErrors } = useQuery({
    queryKey: ['frontend-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frontend_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as FrontendError[];
    },
  });

  // Executar health check manual
  const runHealthCheck = useMutation({
    mutationFn: async () => {
      setIsRunningCheck(true);
      const { data, error } = await supabase.functions.invoke('health-check-system');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-health-logs'] });
      toast({
        title: "Health Check Concluído",
        description: `Score: ${data.summary.healthScore}% (${data.summary.success}/${data.summary.totalChecks} OK)`,
      });
      setIsRunningCheck(false);
    },
    onError: (error) => {
      toast({
        title: "Erro no Health Check",
        description: error.message,
        variant: "destructive",
      });
      setIsRunningCheck(false);
    },
  });

  // Agrupar logs por target para mostrar último status
  const latestByTarget = healthLogs?.reduce((acc, log) => {
    if (!acc[log.target_name] || new Date(log.checked_at) > new Date(acc[log.target_name].checked_at)) {
      acc[log.target_name] = log;
    }
    return acc;
  }, {} as Record<string, HealthLog>) || {};

  const latestLogs = Object.values(latestByTarget);
  const healthScore = latestLogs.length > 0
    ? Math.round((latestLogs.filter(l => l.status === 'success').length / latestLogs.length) * 100)
    : 100;

  const errorCount = latestLogs.filter(l => l.status === 'error' || l.status === 'timeout').length;
  const warningCount = latestLogs.filter(l => l.status === 'warning').length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Sistema de Monitoramento
            </h1>
            <p className="text-muted-foreground">
              Monitoramento automático de saúde do sistema
            </p>
          </div>
          <Button 
            onClick={() => runHealthCheck.mutate()}
            disabled={isRunningCheck}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunningCheck ? 'animate-spin' : ''}`} />
            {isRunningCheck ? 'Verificando...' : 'Executar Check'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className={`text-3xl font-bold ${healthScore >= 80 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {healthScore}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Componentes</p>
                  <p className="text-3xl font-bold">{latestLogs.length}</p>
                </div>
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className={`text-3xl font-bold ${errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {errorCount}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avisos</p>
                  <p className={`text-3xl font-bold ${warningCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {warningCount}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">Status dos Componentes</TabsTrigger>
            <TabsTrigger value="frontend">Erros Frontend ({frontendErrors?.length || 0})</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Atual dos Componentes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : latestLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Nenhum health check executado ainda
                    </p>
                    <Button onClick={() => runHealthCheck.mutate()}>
                      Executar Primeiro Check
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestLogs.map((log) => {
                      const config = statusConfig[log.status as keyof typeof statusConfig] || statusConfig.error;
                      const TypeIcon = typeIcons[log.check_type as keyof typeof typeIcons] || Server;
                      const StatusIcon = config.icon;
                      
                      return (
                        <div 
                          key={log.id} 
                          className={`flex items-center justify-between p-3 rounded-lg ${config.bg}/50`}
                        >
                          <div className="flex items-center gap-3">
                            <TypeIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{log.target_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.check_type} • {log.response_time_ms}ms
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.error_message && (
                              <span className="text-xs text-red-500 max-w-[200px] truncate">
                                {log.error_message}
                              </span>
                            )}
                            <Badge variant="outline" className={`${config.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frontend" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Erros Capturados do Frontend</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingErrors ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : frontendErrors?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum erro capturado 🎉
                  </p>
                ) : (
                  <div className="space-y-3">
                    {frontendErrors?.map((error) => (
                      <div key={error.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge variant="destructive" className="mb-2">
                              {error.error_type}
                            </Badge>
                            <p className="font-mono text-sm text-red-700 break-all">
                              {error.error_message}
                            </p>
                            {error.page_url && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Página: {error.page_url}
                              </p>
                            )}
                            {error.component_name && (
                              <p className="text-xs text-muted-foreground">
                                Componente: {error.component_name}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(error.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Checks</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {healthLogs?.slice(0, 50).map((log) => {
                      const config = statusConfig[log.status as keyof typeof statusConfig] || statusConfig.error;
                      const StatusIcon = config.icon;
                      
                      return (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between p-2 text-sm border-b"
                        >
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                            <span>{log.target_name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>{log.response_time_ms}ms</span>
                            <span>
                              {format(new Date(log.checked_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
