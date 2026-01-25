import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Shield, Calendar, User, Pencil, Trash2, Activity, Loader2, Save, X, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  actionsCount: number;
}

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface CreateForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export default function AdminSystemUsers() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    first_name: "",
    last_name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [createForm, setCreateForm] = useState<CreateForm>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

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
            .select("email, first_name, last_name")
            .eq("id", role.user_id)
            .single();

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

  const getDisplayName = (admin: AdminUser) => {
    if (admin.profile?.first_name || admin.profile?.last_name) {
      return `${admin.profile.first_name || ""} ${admin.profile.last_name || ""}`.trim();
    }
    return admin.profile?.email || "Usuário";
  };

  const handleViewDetails = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDetailOpen(true);
    await fetchAdminActions(admin.user_id);
  };

  const handleEditClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm({
      first_name: admin.profile?.first_name || "",
      last_name: admin.profile?.last_name || "",
      email: admin.profile?.email || "",
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setIsEditOpen(true);
    setIsDetailOpen(false);
  };

  const handleCreateClick = () => {
    setCreateForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirm_password: "",
    });
    setIsCreateOpen(true);
  };

  const handleSave = async () => {
    if (!selectedAdmin) return;

    if (editForm.new_password) {
      if (editForm.new_password.length < 6) {
        toast.error("A nova senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (editForm.new_password !== editForm.confirm_password) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
        })
        .eq("id", selectedAdmin.user_id);

      if (profileError) throw profileError;

      if (editForm.new_password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: editForm.new_password,
        });

        if (passwordError) {
          toast.error("Erro ao atualizar senha: " + passwordError.message);
        } else {
          toast.success("Senha atualizada com sucesso");
        }
      }

      toast.success("Dados atualizados com sucesso");
      setIsEditOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    // Validações
    const trimmedFirstName = createForm.first_name.trim();
    const trimmedLastName = createForm.last_name.trim();
    const trimmedEmail = createForm.email.trim().toLowerCase();
    
    if (!trimmedFirstName) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (!trimmedLastName) {
      toast.error("O sobrenome é obrigatório");
      return;
    }
    if (!trimmedEmail) {
      toast.error("O e-mail é obrigatório");
      return;
    }
    
    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Formato de e-mail inválido");
      return;
    }
    
    if (!createForm.password) {
      toast.error("A senha é obrigatória");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (createForm.password !== createForm.confirm_password) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsSaving(true);
    try {
      // Usar Edge Function para criar admin de forma segura
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          email: trimmedEmail,
          password: createForm.password,
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
        },
      });

      if (error) {
        toast.error("Erro ao criar administrador: " + error.message);
        return;
      }

      if (data?.error) {
        if (data.error.includes("already") || data.error.includes("exists")) {
          toast.error("Este e-mail já está cadastrado");
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success("Administrador criado com sucesso");
      setIsCreateOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      toast.error("Erro ao criar administrador");
    } finally {
      setIsSaving(false);
    }
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
      setIsEditOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error("Erro ao remover admin:", error);
      toast.error("Erro ao remover permissão");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Usuários do Sistema</h2>
            <p className="text-muted-foreground text-sm mt-1">Administradores</p>
          </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Usuários do Sistema</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {admins.length} {admins.length === 1 ? "administrador" : "administradores"}
          </p>
        </div>
        
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar novo
        </Button>
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
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {getDisplayName(admin)}
                      </span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      {admin.profile?.email && (
                        <span>{admin.profile.email}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Admin desde {formatDate(admin.created_at)}
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {admin.actionsCount} {admin.actionsCount === 1 ? "ação" : "ações"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(admin)}
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

      {/* Modal de Criar Novo Admin */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Adicionar Novo Administrador
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Dados da conta</h3>
              
              <div className="space-y-2">
                <Label htmlFor="create_first_name">Nome *</Label>
                <Input
                  id="create_first_name"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  placeholder="Nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create_last_name">Sobrenome *</Label>
                <Input
                  id="create_last_name"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  placeholder="Sobrenome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create_email">E-mail da conta *</Label>
                <Input
                  id="create_email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-foreground">Criar senha</h3>
              
              <div className="space-y-2">
                <Label htmlFor="create_password">Senha *</Label>
                <Input
                  id="create_password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create_confirm_password">Confirmar senha *</Label>
                <Input
                  id="create_confirm_password"
                  type="password"
                  value={createForm.confirm_password}
                  onChange={(e) => setCreateForm({ ...createForm, confirm_password: e.target.value })}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Criar Administrador
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Dados da conta</h3>
              
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome (opcional)</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="Nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome (opcional)</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Sobrenome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail da conta</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-foreground">Alterar senha</h3>
              
              <div className="space-y-2">
                <Label htmlFor="current_password">Senha atual</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={editForm.current_password}
                  onChange={(e) => setEditForm({ ...editForm, current_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nova senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Repetir nova senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={editForm.confirm_password}
                  onChange={(e) => setEditForm({ ...editForm, confirm_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setIsEditOpen(false);
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover Admin
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Administrador</DialogTitle>
          </DialogHeader>
          
          {selectedAdmin && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-lg">
                    {getDisplayName(selectedAdmin)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAdmin.profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Admin desde {formatDate(selectedAdmin.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{selectedAdmin.actionsCount}</p>
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

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Admin
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleEditClick(selectedAdmin)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
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
