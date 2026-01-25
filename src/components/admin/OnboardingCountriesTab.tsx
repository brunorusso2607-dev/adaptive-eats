import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  Globe,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  useOnboardingCountriesAdmin, 
  useToggleCountryActive,
  useReorderCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
  type OnboardingCountry 
} from "@/hooks/useOnboardingCountries";
import { useFeatureFlag, useUpdateFeatureFlag } from "@/hooks/useFeatureFlags";

// Sortable Country Item
function SortableCountryItem({ 
  country, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  country: OnboardingCountry; 
  onEdit: (country: OnboardingCountry) => void;
  onDelete: (country: OnboardingCountry) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: country.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="w-12 h-12 flex items-center justify-center text-3xl">
        {country.flag_emoji}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{country.country_name}</span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-mono">
            {country.country_code}
          </span>
          {!country.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inativo
            </Badge>
          )}
        </div>
      </div>

      <Switch
        checked={country.is_active}
        onCheckedChange={(checked) => onToggleActive(country.id, checked)}
        className="data-[state=checked]:bg-foreground"
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(country)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(country)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function OnboardingCountriesTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<OnboardingCountry | null>(null);
  const [deleteCountry, setDeleteCountry] = useState<OnboardingCountry | null>(null);
  const [formData, setFormData] = useState({
    country_code: "",
    country_name: "",
    flag_emoji: "",
    is_active: false,
    sort_order: 0,
  });

  // Queries & Mutations
  const { data: countries, isLoading } = useOnboardingCountriesAdmin();
  const { flag: countrySelectionFlag, isLoading: isLoadingFlag } = useFeatureFlag("show_country_selection");
  const updateFeatureFlag = useUpdateFeatureFlag();
  const toggleActiveMutation = useToggleCountryActive();
  const reorderMutation = useReorderCountries();
  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();
  const deleteMutation = useDeleteCountry();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && countries) {
      const oldIndex = countries.findIndex((item) => item.id === active.id);
      const newIndex = countries.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(countries, oldIndex, newIndex);
      
      const updates = reordered.map((item, index) => ({
        id: item.id,
        sort_order: index + 1,
      }));

      reorderMutation.mutate(updates, {
        onSuccess: () => toast.success("Ordem atualizada!"),
        onError: () => toast.error("Erro ao reordenar"),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      country_code: "",
      country_name: "",
      flag_emoji: "",
      is_active: false,
      sort_order: countries?.length ? countries.length + 1 : 1,
    });
  };

  const openEditDialog = (country: OnboardingCountry) => {
    setEditingCountry(country);
    setFormData({
      country_code: country.country_code,
      country_name: country.country_name,
      flag_emoji: country.flag_emoji,
      is_active: country.is_active,
      sort_order: country.sort_order,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.country_code || !formData.country_name) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (editingCountry) {
      updateMutation.mutate({
        id: editingCountry.id,
        ...formData,
      }, {
        onSuccess: () => {
          toast.success("País atualizado!");
          setEditingCountry(null);
          resetForm();
        },
        onError: (error) => toast.error(`Erro: ${error.message}`),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("País criado!");
          setIsCreateDialogOpen(false);
          resetForm();
        },
        onError: (error) => toast.error(`Erro: ${error.message}`),
      });
    }
  };

  const handleTogglePageVisibility = (enabled: boolean) => {
    if (!countrySelectionFlag) return;
    
    updateFeatureFlag.mutate(
      { id: countrySelectionFlag.id, is_enabled: enabled },
      {
        onSuccess: () => {
          toast.success(enabled 
            ? "Página de seleção de país ativada" 
            : "Página de seleção de país desativada - usuários serão definidos como BR"
          );
        },
        onError: () => toast.error("Erro ao atualizar configuração"),
      }
    );
  };

  if (isLoading || isLoadingFlag) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = countries?.filter(c => c.is_active).length || 0;

  return (
    <div className="space-y-6">
      {/* Global Toggle Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {countrySelectionFlag?.is_enabled ? (
              <Eye className="w-5 h-5 text-primary" />
            ) : (
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            )}
            Visibilidade da Página de Região
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {countrySelectionFlag?.is_enabled 
                  ? "A página de seleção de país está visível no onboarding"
                  : "A página está oculta - novos usuários serão definidos automaticamente como BR"
                }
              </p>
              {countrySelectionFlag?.is_enabled && (
                <p className="text-xs text-primary font-medium">
                  {activeCount} país{activeCount !== 1 ? "es" : ""} ativo{activeCount !== 1 ? "s" : ""} para seleção
                </p>
              )}
            </div>
            <Switch
              checked={countrySelectionFlag?.is_enabled || false}
              onCheckedChange={handleTogglePageVisibility}
              disabled={updateFeatureFlag.isPending}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Countries List */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              Países Disponíveis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os países que aparecem na seleção do onboarding (arraste para reordenar)
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
            <Plus className="w-4 h-4" />
            Novo País
          </Button>
        </CardHeader>
        <CardContent>
          {!countries || countries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum país cadastrado</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={countries.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {countries.map((country) => (
                    <SortableCountryItem
                      key={country.id}
                      country={country}
                      onEdit={openEditDialog}
                      onDelete={setDeleteCountry}
                      onToggleActive={(id, is_active) =>
                        toggleActiveMutation.mutate({ id, is_active }, {
                          onSuccess: () => toast.success(is_active ? "País ativado" : "País desativado"),
                          onError: () => toast.error("Erro ao atualizar"),
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingCountry}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingCountry(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCountry ? "Editar País" : "Novo País"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country_code">Código *</Label>
                <Input
                  id="country_code"
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  placeholder="BR"
                  maxLength={2}
                  disabled={!!editingCountry}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag_emoji">Bandeira</Label>
                <Input
                  id="flag_emoji"
                  value={formData.flag_emoji}
                  onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })}
                  placeholder="🇧🇷"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_name">Nome do País *</Label>
              <Input
                id="country_name"
                value={formData.country_name}
                onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                placeholder="Brasil"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                className="data-[state=checked]:bg-foreground"
              />
              <Label htmlFor="is_active">Ativo para seleção</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingCountry(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingCountry ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCountry} onOpenChange={() => setDeleteCountry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir país?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteCountry?.country_name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCountry && deleteMutation.mutate(deleteCountry.id, {
                onSuccess: () => {
                  toast.success("País excluído!");
                  setDeleteCountry(null);
                },
                onError: (error) => toast.error(`Erro: ${error.message}`),
              })}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
