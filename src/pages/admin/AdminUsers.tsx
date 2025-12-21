import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Loader2,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type UserProfile = {
  id: string;
  email: string | null;
  created_at: string | null;
  onboarding_completed: boolean | null;
  dietary_preference: string | null;
  goal: string | null;
  context: string | null;
};

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, email, created_at, onboarding_completed, dietary_preference, goal, context", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (searchTerm) {
        query = query.ilike("email", `%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setUsers(data || []);
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

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Usuários</h2>
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
                      <p className="font-medium text-foreground truncate">
                        {user.email || "Email não informado"}
                      </p>
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

                  <div className="flex flex-wrap gap-2 ml-13 sm:ml-0">
                    <Badge variant={user.onboarding_completed ? "default" : "secondary"}>
                      {user.onboarding_completed ? "Onboarding ✓" : "Pendente"}
                    </Badge>
                    <Badge variant="outline">{getGoalLabel(user.goal)}</Badge>
                    <Badge variant="outline">{getDietLabel(user.dietary_preference)}</Badge>
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
    </div>
  );
}
