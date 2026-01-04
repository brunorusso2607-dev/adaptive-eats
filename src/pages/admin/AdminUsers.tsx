import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  MoreVertical,
  Eye,
  Trash2,
  Shield,
  ShieldOff,
  Pencil,
  Save,
  X,
  CreditCard,
  Clock,
  FileText,
  UserCog
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  email: string | null;
  created_at: string | null;
  onboarding_completed: boolean | null;
  dietary_preference: string | null;
  goal: string | null;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight_current: number | null;
  weight_goal: number | null;
  activity_level: string | null;
  intolerances: string[] | null;
  isAdmin?: boolean;
};

type UserSubscription = {
  id: string;
  user_id: string;
  plan_name: string;
  expires_at: string | null;
  is_active: boolean;
};

type ActivityLog = {
  id: string;
  user_id: string;
  performed_by: string;
  action_type: string;
  action_description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  log_source: "admin" | "user";
  created_at: string;
};

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { logAdminAction } = useActivityLog();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan_name: "free",
    expires_at: "",
    is_active: false,
  });
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "admin" | "user">("all");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Primeiro, buscar todos os user_ids que são admin
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = (adminRoles || []).map((r) => r.user_id);

      let query = supabase
        .from("profiles")
        .select("id, email, created_at, onboarding_completed, dietary_preference, goal, age, sex, height, weight_current, weight_goal, activity_level, intolerances", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      // Excluir admins da listagem de clientes
      if (adminUserIds.length > 0) {
        query = query.not("id", "in", `(${adminUserIds.join(",")})`);
      }

      if (searchTerm) {
        query = query.ilike("email", `%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // Clientes não são admins, então isAdmin é sempre false
      const usersWithRoles = (data || []).map((user) => ({
        ...user,
        isAdmin: false,
      }));

      setUsers(usersWithRoles);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSubscription = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching subscription:", error);
      return;
    }

    setSubscription(data);
    if (data) {
      setSubscriptionForm({
        plan_name: data.plan_name,
        expires_at: data.expires_at ? data.expires_at.split("T")[0] : "",
        is_active: data.is_active,
      });
    } else {
      setSubscriptionForm({
        plan_name: "free",
        expires_at: "",
        is_active: false,
      });
    }
  };

  const fetchActivityLogs = async (userId: string) => {
    const { data, error } = await (supabase.from("activity_logs") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching activity logs:", error);
      return;
    }

    setActivityLogs(data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getGoalLabel = (goal: string | null) => {
    switch (goal) {
      case "lose_weight": return "Emagrecer";
      case "gain_weight": return "Ganhar Peso";
      case "maintain": return "Manter";
      default: return "N/A";
    }
  };

  // Hook para labels do banco de dados
  const { getDietaryLabel } = useSafetyLabels();
  
  const getDietLabel = (diet: string | null) => {
    if (!diet) return "N/A";
    return getDietaryLabel(diet);
  };

  const getActivityLabel = (activity: string | null) => {
    switch (activity) {
      case "sedentary": return "Sedentário";
      case "light": return "Leve";
      case "moderate": return "Moderado";
      case "active": return "Ativo";
      case "very_active": return "Muito Ativo";
      default: return "N/A";
    }
  };

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case "male": return "Masculino";
      case "female": return "Feminino";
      default: return "N/A";
    }
  };

  const handleViewDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsEditingSubscription(false);
    setIsDetailOpen(true);
    await Promise.all([
      fetchUserSubscription(user.id),
      fetchActivityLogs(user.id),
    ]);
  };

  const handleStartEdit = () => {
    if (selectedUser) {
      setEditForm({
        age: selectedUser.age,
        sex: selectedUser.sex,
        height: selectedUser.height,
        weight_current: selectedUser.weight_current,
        weight_goal: selectedUser.weight_goal,
        activity_level: selectedUser.activity_level,
        dietary_preference: selectedUser.dietary_preference,
        goal: selectedUser.goal,
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const oldValues = {
        age: selectedUser.age,
        sex: selectedUser.sex,
        height: selectedUser.height,
        weight_current: selectedUser.weight_current,
        weight_goal: selectedUser.weight_goal,
        activity_level: selectedUser.activity_level,
        dietary_preference: selectedUser.dietary_preference,
        goal: selectedUser.goal,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          age: editForm.age,
          sex: editForm.sex,
          height: editForm.height,
          weight_current: editForm.weight_current,
          weight_goal: editForm.weight_goal,
          activity_level: editForm.activity_level,
          dietary_preference: editForm.dietary_preference as any,
          goal: editForm.goal as any,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Log the action automatically
      await logAdminAction(
        selectedUser.id,
        "profile_update",
        "Dados do perfil atualizados",
        oldValues,
        editForm
      );

      toast.success("Dados atualizados com sucesso");
      setIsEditing(false);
      fetchUsers();
      fetchActivityLogs(selectedUser.id);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const oldValues = subscription ? {
        plan_name: subscription.plan_name,
        expires_at: subscription.expires_at,
        is_active: subscription.is_active,
      } : null;

      const subscriptionData = {
        user_id: selectedUser.id,
        plan_name: subscriptionForm.plan_name,
        expires_at: subscriptionForm.expires_at ? new Date(subscriptionForm.expires_at).toISOString() : null,
        is_active: subscriptionForm.is_active,
      };

      if (subscription) {
        const { error } = await supabase
          .from("user_subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_subscriptions")
          .insert(subscriptionData);

        if (error) throw error;
      }

      // Log the action automatically
      await logAdminAction(
        selectedUser.id,
        "subscription_update",
        `Assinatura atualizada: ${subscriptionForm.plan_name} - ${subscriptionForm.is_active ? "Ativa" : "Inativa"}`,
        oldValues,
        subscriptionForm
      );

      toast.success("Assinatura atualizada com sucesso");
      setIsEditingSubscription(false);
      fetchUserSubscription(selectedUser.id);
      fetchActivityLogs(selectedUser.id);
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Erro ao atualizar assinatura");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      toast.success("Usuário removido com sucesso");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao remover usuário");
    } finally {
      setIsDeleteOpen(false);
      setUserToDelete(null);
    }
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    try {
      if (user.isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (error) throw error;

        // Log the action
        await logAdminAction(
          user.id,
          "role_change",
          "Permissão de admin removida",
          { role: "admin" },
          { role: "user" }
        );

        toast.success("Permissão de admin removida");
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "admin" });

        if (error) throw error;

        // Log the action
        await logAdminAction(
          user.id,
          "role_change",
          "Permissão de admin concedida",
          { role: "user" },
          { role: "admin" }
        );

        toast.success("Permissão de admin concedida");
      }
      fetchUsers();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Erro ao alterar permissão");
    }
  };

  const filteredLogs = activityLogs.filter((log) => {
    if (logFilter === "all") return true;
    return log.log_source === logFilter;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Gerenciar Clientes</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} clientes cadastrados
          </p>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="glass-card border-border/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {user.email || "Email não informado"}
                        </p>
                        {user.isAdmin && (
                          <Badge variant="default" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {user.created_at
                            ? format(new Date(user.created_at), "dd MMM yyyy", { locale: ptBR })
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-13 sm:ml-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={user.onboarding_completed ? "default" : "secondary"}>
                        {user.onboarding_completed ? "Onboarding ✓" : "Pendente"}
                      </Badge>
                      <Badge variant="outline">{getGoalLabel(user.goal)}</Badge>
                      <Badge variant="outline">{getDietLabel(user.dietary_preference)}</Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                          {user.isAdmin ? (
                            <>
                              <ShieldOff className="w-4 h-4 mr-2" />
                              Remover admin
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Tornar admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open);
        if (!open) {
          setIsEditing(false);
          setEditForm({});
          setIsEditingSubscription(false);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>{isEditing ? "Editar Usuário" : "Detalhes do Usuário"}</span>
              {!isEditing && !isEditingSubscription && (
                <Button variant="outline" size="sm" onClick={handleStartEdit} className="mr-2">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.email || "Email não informado"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && !isEditing && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <User className="w-4 h-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="subscription">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Assinatura
                </TabsTrigger>
                <TabsTrigger value="logs">
                  <FileText className="w-4 h-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Idade</p>
                    <p className="font-medium">{selectedUser.age || "N/A"} anos</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sexo</p>
                    <p className="font-medium">{getSexLabel(selectedUser.sex)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Altura</p>
                    <p className="font-medium">{selectedUser.height || "N/A"} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peso Atual</p>
                    <p className="font-medium">{selectedUser.weight_current || "N/A"} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peso Meta</p>
                    <p className="font-medium">{selectedUser.weight_goal || "N/A"} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atividade</p>
                    <p className="font-medium">{getActivityLabel(selectedUser.activity_level)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Preferências</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getGoalLabel(selectedUser.goal)}</Badge>
                    <Badge variant="outline">{getDietLabel(selectedUser.dietary_preference)}</Badge>
                  </div>
                </div>

                {selectedUser.intolerances && selectedUser.intolerances.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Intolerâncias</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.intolerances.map((intolerance) => (
                        <Badge key={intolerance} variant="secondary">
                          {intolerance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="font-medium">
                    {selectedUser.created_at
                      ? format(new Date(selectedUser.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                      : "N/A"}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4 mt-4">
                {!isEditingSubscription ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Plano</p>
                          <p className="font-medium capitalize">{subscription?.plan_name || "Free"}</p>
                        </div>
                        <Badge variant={subscription?.is_active ? "default" : "secondary"}>
                          {subscription?.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Expira em</p>
                        <p className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {subscription?.expires_at
                            ? format(new Date(subscription.expires_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : "Sem data de expiração"}
                        </p>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsEditingSubscription(true)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar Assinatura
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Plano</Label>
                      <Select
                        value={subscriptionForm.plan_name}
                        onValueChange={(value) => setSubscriptionForm({ ...subscriptionForm, plan_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Expiração</Label>
                      <Input
                        type="date"
                        value={subscriptionForm.expires_at}
                        onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expires_at: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Assinatura Ativa</Label>
                      <Switch
                        checked={subscriptionForm.is_active}
                        onCheckedChange={(checked) => setSubscriptionForm({ ...subscriptionForm, is_active: checked })}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditingSubscription(false)} 
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveSubscription} disabled={isSaving} className="flex-1">
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="logs" className="space-y-4 mt-4">
                {/* Filter */}
                <div className="flex gap-2">
                  <Button
                    variant={logFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogFilter("all")}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={logFilter === "admin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogFilter("admin")}
                  >
                    <UserCog className="w-3 h-3 mr-1" />
                    Admin
                  </Button>
                  <Button
                    variant={logFilter === "user" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogFilter("user")}
                  >
                    <User className="w-3 h-3 mr-1" />
                    Usuário
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-3 max-h-60 overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum registro encontrado
                    </p>
                  ) : (
                    filteredLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="outline" 
                                className={log.log_source === "admin" 
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30" 
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                }
                              >
                                {log.log_source === "admin" ? (
                                  <><UserCog className="w-3 h-3 mr-1" /> Admin</>
                                ) : (
                                  <><User className="w-3 h-3 mr-1" /> Usuário</>
                                )}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {log.action_type}
                              </Badge>
                            </div>
                            <p className="text-sm">{log.action_description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {selectedUser && isEditing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    value={editForm.age || ""}
                    onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo</Label>
                  <Select
                    value={editForm.sex || ""}
                    onValueChange={(value) => setEditForm({ ...editForm, sex: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editForm.height || ""}
                    onChange={(e) => setEditForm({ ...editForm, height: parseInt(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_current">Peso Atual (kg)</Label>
                  <Input
                    id="weight_current"
                    type="number"
                    step="0.1"
                    value={editForm.weight_current || ""}
                    onChange={(e) => setEditForm({ ...editForm, weight_current: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_goal">Peso Meta (kg)</Label>
                  <Input
                    id="weight_goal"
                    type="number"
                    step="0.1"
                    value={editForm.weight_goal || ""}
                    onChange={(e) => setEditForm({ ...editForm, weight_goal: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity_level">Nível de Atividade</Label>
                  <Select
                    value={editForm.activity_level || ""}
                    onValueChange={(value) => setEditForm({ ...editForm, activity_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentário</SelectItem>
                      <SelectItem value="light">Leve</SelectItem>
                      <SelectItem value="moderate">Moderado</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="very_active">Muito Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select
                    value={editForm.goal || ""}
                    onValueChange={(value) => setEditForm({ ...editForm, goal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose_weight">Emagrecer</SelectItem>
                      <SelectItem value="maintain">Manter</SelectItem>
                      <SelectItem value="gain_weight">Ganhar Peso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preferência Alimentar</Label>
                  <Select
                    value={editForm.dietary_preference || ""}
                    onValueChange={(value) => setEditForm({ ...editForm, dietary_preference: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comum">Comum</SelectItem>
                      <SelectItem value="vegetariana">Vegetariana</SelectItem>
                      <SelectItem value="vegana">Vegana</SelectItem>
                      <SelectItem value="low_carb">Low Carb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário <strong>{userToDelete?.email}</strong> e todos os seus dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
