import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Calendar, User } from "lucide-react";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    email: string | null;
    age: number | null;
    sex: string | null;
    height: number | null;
    weight_current: number | null;
  };
}

export default function AdminSystemUsers() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      // Buscar usuários com role admin
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Para cada admin, buscar o perfil
      const adminsWithProfiles = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, age, sex, height, weight_current")
            .eq("id", role.user_id)
            .single();

          return {
            ...role,
            profile: profileData || undefined,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getSexLabel = (sex: string | null) => {
    if (sex === "male") return "Masculino";
    if (sex === "female") return "Feminino";
    return "Não informado";
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
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
                        {formatDate(admin.created_at)}
                      </span>
                      
                      {admin.profile?.age && (
                        <span>{admin.profile.age} anos</span>
                      )}
                      
                      {admin.profile?.sex && (
                        <span>{getSexLabel(admin.profile.sex)}</span>
                      )}
                      
                      {admin.profile?.height && (
                        <span>{admin.profile.height} cm</span>
                      )}
                      
                      {admin.profile?.weight_current && (
                        <span>{admin.profile.weight_current} kg</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
