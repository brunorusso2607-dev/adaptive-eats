import { useState } from "react";
import { useMealTimeSettingsAdmin, MealTimeSetting } from "@/hooks/useMealTimeSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Plus, Clock, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMealTimes() {
  const { settings, isLoading, isSaving, updateSetting, createSetting, deleteSetting } = useMealTimeSettingsAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MealTimeSetting>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSetting, setNewSetting] = useState({
    meal_type: "",
    label: "",
    start_hour: 0,
    end_hour: 0,
    sort_order: 0,
  });

  const formatHour = (hour: number) => {
    const h = Math.floor(hour);
    const m = (hour % 1) * 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleEdit = (setting: MealTimeSetting) => {
    setEditingId(setting.id);
    setEditForm({
      label: setting.label,
      start_hour: setting.start_hour,
      end_hour: setting.end_hour,
      sort_order: setting.sort_order,
    });
  };

  const handleSave = async (id: string) => {
    const success = await updateSetting(id, editForm);
    if (success) {
      toast.success("Horário atualizado com sucesso!");
      setEditingId(null);
      setEditForm({});
    } else {
      toast.error("Erro ao atualizar horário");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${label}"?`)) return;
    
    const success = await deleteSetting(id);
    if (success) {
      toast.success("Horário excluído com sucesso!");
    } else {
      toast.error("Erro ao excluir horário");
    }
  };

  const handleAdd = async () => {
    if (!newSetting.meal_type || !newSetting.label) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const success = await createSetting(newSetting);
    if (success) {
      toast.success("Horário adicionado com sucesso!");
      setShowAddDialog(false);
      setNewSetting({
        meal_type: "",
        label: "",
        start_hour: 0,
        end_hour: 0,
        sort_order: settings.length + 1,
      });
    } else {
      toast.error("Erro ao adicionar horário");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Horário das Refeições
          </h1>
          <p className="text-muted-foreground">
            Configure os horários de cada refeição do dia
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Refeição
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Refeição</DialogTitle>
              <DialogDescription>
                Crie um novo tipo de refeição com seus horários
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="meal_type">Identificador (sem espaços)</Label>
                <Input
                  id="meal_type"
                  placeholder="ex: lanche_noite"
                  value={newSetting.meal_type}
                  onChange={(e) => setNewSetting({ ...newSetting, meal_type: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Nome exibido</Label>
                <Input
                  id="label"
                  placeholder="ex: Lanche da Noite"
                  value={newSetting.label}
                  onChange={(e) => setNewSetting({ ...newSetting, label: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_hour">Hora de Início</Label>
                  <Input
                    id="start_hour"
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={newSetting.start_hour}
                    onChange={(e) => setNewSetting({ ...newSetting, start_hour: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_hour">Hora de Fim</Label>
                  <Input
                    id="end_hour"
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={newSetting.end_hour}
                    onChange={(e) => setNewSetting({ ...newSetting, end_hour: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordem de exibição</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={1}
                  value={newSetting.sort_order || settings.length + 1}
                  onChange={(e) => setNewSetting({ ...newSetting, sort_order: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refeições Configuradas</CardTitle>
          <CardDescription>
            Clique em editar para modificar os horários. As alterações são refletidas imediatamente para os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>
                    {editingId === setting.id ? (
                      <Input
                        type="number"
                        min={1}
                        className="w-16"
                        value={editForm.sort_order ?? setting.sort_order}
                        onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) })}
                      />
                    ) : (
                      setting.sort_order
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{setting.meal_type}</TableCell>
                  <TableCell>
                    {editingId === setting.id ? (
                      <Input
                        className="w-40"
                        value={editForm.label ?? setting.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    ) : (
                      setting.label
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === setting.id ? (
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        className="w-20"
                        value={editForm.start_hour ?? setting.start_hour}
                        onChange={(e) => setEditForm({ ...editForm, start_hour: parseFloat(e.target.value) })}
                      />
                    ) : (
                      formatHour(setting.start_hour)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === setting.id ? (
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        className="w-20"
                        value={editForm.end_hour ?? setting.end_hour}
                        onChange={(e) => setEditForm({ ...editForm, end_hour: parseFloat(e.target.value) })}
                      />
                    ) : (
                      formatHour(setting.end_hour)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === setting.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(setting.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(setting)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(setting.id, setting.label)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• O <strong>identificador</strong> é usado internamente e não pode conter espaços (use _ para separar palavras)</p>
          <p>• O <strong>nome</strong> é o que aparece para os usuários</p>
          <p>• Use valores decimais para horários com minutos (ex: 17.5 = 17:30)</p>
          <p>• A <strong>ordem</strong> define a sequência das refeições no dia</p>
          <p>• Alterações são aplicadas imediatamente para novos acessos</p>
        </CardContent>
      </Card>
    </div>
  );
}
