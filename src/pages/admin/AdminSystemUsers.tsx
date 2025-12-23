import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Calendar, User, Pencil, Trash2, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    email: string | null;
  };
  actionsCount: number;
}

export default function AdminSystemUsers() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminsWithProfiles = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", role.user_id)
            .single();

          // Contar ações realizadas pelo admin
          const { count } = await supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("performed_by", role.user_id);

          return {
            ...role,
            profile: profileData || undefined,
            actionsCount: count || 0,
          };
        })
      );

      setAdmins(adminsWithProfiles);
    } catch (error) {
      console.error("Erro ao buscar admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminActions = async (userId: string) => {
    setIsLoadingActions(true);
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("performed_by", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAdminActions(data || []);
    } catch (error) {
      console.error("Erro ao buscar ações:", error);
    } finally {
      setIsLoadingActions(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDetailOpen(true);
    await fetchAdminActions(admin.user_id);
  };

  const handleRemoveAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", selectedAdmin.id);

      if (error) throw error;

      toast.success("Permissão de admin removida");
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error("Erro ao remover admin:", error);
      toast.error("Erro ao remover permissão");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Usuários do Sistema</h2>
          <p className="text-muted-foreground text-sm mt-1">Administradores</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Usuários do Sistema</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {admins.length} {admins.length === 1 ? "administrador" : "administradores"}
        </p>
      </div>

      <div className="space-y-4">
        {admins.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum administrador encontrado.
            </CardContent>
          </Card>
        ) : (
          admins.map((admin) => (
            <Card key={admin.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {admin.profile?.email || "Usuário"}
                      </span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Admin desde {formatDate(admin.created_at)}
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {admin.actionsCount} {admin.actionsCount === 1 ? "ação" : "ações"} realizadas
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDetails(admin)}
                    className="shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Administrador</DialogTitle>
          </DialogHeader>
          
          {selectedAdmin && (
            <div className="space-y-6 py-4">
              {/* Info básica */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-lg">
                    {selectedAdmin.profile?.email || "Usuário"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Admin desde {formatDate(selectedAdmin.created_at)}
                  </p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedAdmin.actionsCount}</p>
                    <p className="text-xs text-muted-foreground">Ações realizadas</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center">
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                      Ativo
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Status</p>
                  </CardContent>
                </Card>
              </div>

              {/* Últimas ações */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Últimas Ações</h4>
                {isLoadingActions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : adminActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma ação registrada.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {adminActions.map((action) => (
                      <div
                        key={action.id}
                        className="p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        <p className="font-medium text-foreground">{action.action_description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(action.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Admin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a permissão de administrador de{" "}
              <strong>{selectedAdmin?.profile?.email}</strong>. O usuário ainda terá acesso como cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
