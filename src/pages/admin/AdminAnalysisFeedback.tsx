import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Search, MessageSquareWarning, AlertTriangle, CheckCircle2, Clock, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnalysisFeedback {
  id: string;
  user_id: string;
  analysis_type: string;
  feedback_type: string;
  description: string | null;
  analysis_data: Record<string, unknown> | null;
  image_reference: string | null;
  status: string;
  created_at: string;
}

const feedbackTypeLabels: Record<string, string> = {
  wrong_ingredient: "Ingrediente incorreto",
  missed_allergen: "Alérgeno não detectado",
  false_alert: "Alerta falso",
  other: "Outro",
};

const analysisTypeLabels: Record<string, string> = {
  food_photo: "Foto de Alimento",
  label_photo: "Foto de Rótulo",
  fridge_photo: "Foto de Geladeira",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  reviewed: { label: "Analisado", variant: "default", icon: Eye },
  resolved: { label: "Resolvido", variant: "outline", icon: CheckCircle2 },
};

export default function AdminAnalysisFeedback() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<AnalysisFeedback | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: feedbacks, isLoading, refetch } = useQuery({
    queryKey: ["admin-analysis-feedback", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("ai_analysis_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("analysis_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AnalysisFeedback[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("ai_analysis_feedback")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analysis-feedback"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const filteredFeedbacks = feedbacks?.filter((feedback) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      feedback.description?.toLowerCase().includes(search) ||
      feedback.user_id.toLowerCase().includes(search) ||
      feedbackTypeLabels[feedback.feedback_type]?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: feedbacks?.length || 0,
    pending: feedbacks?.filter((f) => f.status === "pending").length || 0,
    reviewed: feedbacks?.filter((f) => f.status === "reviewed").length || 0,
    resolved: feedbacks?.filter((f) => f.status === "resolved").length || 0,
    missedAllergen: feedbacks?.filter((f) => f.feedback_type === "missed_allergen").length || 0,
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5" />
                Feedbacks de Análise
              </CardTitle>
              <CardDescription>
                Reportes de usuários sobre erros nas análises de IA
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.reviewed}</p>
              <p className="text-xs text-muted-foreground">Analisados</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.missedAllergen}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Alérgenos
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou ID do usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="reviewed">Analisados</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tipo de análise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="food_photo">Foto de Alimento</SelectItem>
                <SelectItem value="label_photo">Foto de Rótulo</SelectItem>
                <SelectItem value="fridge_photo">Foto de Geladeira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredFeedbacks?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquareWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum feedback encontrado</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback) => {
                    const StatusIcon = statusConfig[feedback.status]?.icon || Clock;
                    return (
                      <TableRow key={feedback.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {analysisTypeLabels[feedback.analysis_type] || feedback.analysis_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {feedback.feedback_type === "missed_allergen" && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">
                              {feedbackTypeLabels[feedback.feedback_type] || feedback.feedback_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">
                          {feedback.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[feedback.status]?.variant || "secondary"}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[feedback.status]?.label || feedback.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {getTimeSince(feedback.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFeedback(feedback)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <MessageSquareWarning className="h-5 w-5" />
                                  Detalhes do Feedback
                                </DialogTitle>
                                <DialogDescription>
                                  Enviado em {format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tipo de Análise</p>
                                    <p>{analysisTypeLabels[feedback.analysis_type] || feedback.analysis_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tipo de Problema</p>
                                    <div className="flex items-center gap-2">
                                      {feedback.feedback_type === "missed_allergen" && (
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                      )}
                                      <span>{feedbackTypeLabels[feedback.feedback_type] || feedback.feedback_type}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">ID do Usuário</p>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">{feedback.user_id}</code>
                                </div>

                                {feedback.description && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
                                    <p className="bg-muted/50 rounded-lg p-3 text-sm">{feedback.description}</p>
                                  </div>
                                )}

                                {feedback.analysis_data && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Dados da Análise</p>
                                    <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto max-h-48">
                                      {JSON.stringify(feedback.analysis_data, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Atualizar Status</p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={feedback.status === "pending" ? "default" : "outline"}
                                      onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: "pending" })}
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pendente
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={feedback.status === "reviewed" ? "default" : "outline"}
                                      onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: "reviewed" })}
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Analisado
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={feedback.status === "resolved" ? "default" : "outline"}
                                      onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: "resolved" })}
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Resolvido
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
