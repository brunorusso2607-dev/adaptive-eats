import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  ShieldOff
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
import { toast } from "sonner";

type UserProfile = {
  id: string;
  email: string | null;
  created_at: string | null;
  onboarding_completed: boolean | null;
  dietary_preference: string | null;
  goal: string | null;
  context: string | null;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight_current: number | null;
  weight_goal: number | null;
  activity_level: string | null;
  intolerances: string[] | null;
  isAdmin?: boolean;
};

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, email, created_at, onboarding_completed, dietary_preference, goal, context, age, sex, height, weight_current, weight_goal, activity_level, intolerances", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (searchTerm) {
        query = query.ilike("email", `%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // Check admin status for each user
      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();
          
          return { ...user, isAdmin: !!roleData };
        })
      );

      setUsers(usersWithRoles);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getGoalLabel = (goal: string | null) => {
    switch (goal) {
      case "emagrecer": return "Emagrecer";
      case "ganhar_peso": return "Ganhar Peso";
      case "manter": return "Manter";
      default: return "N/A";
    }
  };

  const getDietLabel = (diet: string | null) => {
    switch (diet) {
      case "comum": return "Comum";
      case "vegetariana": return "Vegetariana";
      case "vegana": return "Vegana";
      case "low_carb": return "Low Carb";
      default: return "N/A";
    }
  };

  const getContextLabel = (context: string | null) => {
    switch (context) {
      case "individual": return "Individual";
      case "familia": return "Família";
      case "modo_kids": return "Modo Kids";
      default: return "N/A";
    }
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

  const handleViewDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // Delete profile (this will cascade to related data)
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
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (error) throw error;
        toast.success("Permissão de admin removida");
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "admin" });

        if (error) throw error;
        toast.success("Permissão de admin concedida");
      }
      fetchUsers();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Erro ao alterar permissão");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Gerenciar Usuários</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} usuários cadastrados
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
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.email || "Email não informado"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
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
                  <Badge variant="outline">{getContextLabel(selectedUser.context)}</Badge>
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