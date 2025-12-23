import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Calendar, User, Pencil, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

interface EditForm {
  age: number | null;
  sex: string | null;
  height: number | null;
  weight_current: number | null;
}

export default function AdminSystemUsers() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    age: null,
    sex: null,
    height: null,
    weight_current: null,
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const handleEditClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm({
      age: admin.profile?.age || null,
      sex: admin.profile?.sex || null,
      height: admin.profile?.height || null,
      weight_current: admin.profile?.weight_current || null,
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedAdmin) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          age: editForm.age,
          sex: editForm.sex,
          height: editForm.height,
          weight_current: editForm.weight_current,
        })
        .eq("id", selectedAdmin.user_id);

      if (error) throw error;

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

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                value={editForm.age || ""}
                onChange={(e) => setEditForm({ ...editForm, age: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ex: 30"
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
                onChange={(e) => setEditForm({ ...editForm, height: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ex: 170"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={editForm.weight_current || ""}
                onChange={(e) => setEditForm({ ...editForm, weight_current: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ex: 70"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
