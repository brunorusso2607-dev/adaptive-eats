import { useState } from "react";
import { useMealTimeSettingsAdmin, MealTimeSetting } from "@/hooks/useMealTimeSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Pencil, Clock, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMealTimes() {
  const { settings, isLoading, isSaving, updateSetting } = useMealTimeSettingsAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MealTimeSetting>>({});

  const formatHour = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour % 1) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleEdit = (setting: MealTimeSetting) => {
    setEditingId(setting.id);
    setEditForm({
      label: setting.label,
      start_hour: setting.start_hour,
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Horário das Refeições
        </h1>
        <p className="text-muted-foreground">
          Configure o horário de início de cada refeição do dia
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refeições Configuradas</CardTitle>
          <CardDescription>
            Clique em editar para modificar os horários. A refeição é considerada atrasada 1 hora após o início.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Horário de Início</TableHead>
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
                  <TableCell className="font-mono text-sm text-muted-foreground">{setting.meal_type}</TableCell>
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
                        step={0.25}
                        className="w-20"
                        value={editForm.start_hour ?? setting.start_hour}
                        onChange={(e) => setEditForm({ ...editForm, start_hour: parseFloat(e.target.value) })}
                      />
                    ) : (
                      formatHour(setting.start_hour)
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(setting)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Configure apenas o <strong>horário de início</strong> de cada refeição</p>
          <p>• A refeição é considerada <strong>atrasada após 1 hora</strong> do início, se não for completada</p>
          <p>• Use valores decimais para horários com minutos (ex: 12.5 = 12:30)</p>
          <p>• A <strong>ordem</strong> define a sequência das refeições no dia</p>
          <p>• Alterações são aplicadas imediatamente para novos acessos</p>
        </CardContent>
      </Card>
    </div>
  );
}
