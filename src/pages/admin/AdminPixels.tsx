import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  Save, 
  X,
  Code2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrackingPixel {
  id: string;
  platform: string;
  pixel_id: string;
  api_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

type Platform = "facebook" | "google" | "tiktok" | "pinterest" | "snapchat" | "twitter";

const platformOptions: { value: Platform; label: string; color: string }[] = [
  { value: "facebook", label: "Meta (Facebook/Instagram)", color: "bg-blue-500" },
  { value: "google", label: "Google Ads", color: "bg-red-500" },
  { value: "tiktok", label: "TikTok", color: "bg-black" },
  { value: "pinterest", label: "Pinterest", color: "bg-red-600" },
  { value: "snapchat", label: "Snapchat", color: "bg-yellow-400" },
  { value: "twitter", label: "Twitter/X", color: "bg-gray-800" },
];

export default function AdminPixels() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<TrackingPixel | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    platform: "facebook" as Platform,
    pixel_id: "",
    api_token: "",
    is_active: true,
  });

  const { data: pixels, isLoading } = useQuery({
    queryKey: ["tracking-pixels"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("tracking_pixels") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TrackingPixel[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<TrackingPixel, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("tracking_pixels") as any).insert({
        ...data,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-pixels"] });
      toast.success("Pixel criado com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar pixel: " + (error as Error).message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TrackingPixel> }) => {
      const { error } = await (supabase.from("tracking_pixels") as any)
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-pixels"] });
      toast.success("Pixel atualizado com sucesso!");
      resetForm();
      setEditingPixel(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pixel: " + (error as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("tracking_pixels") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-pixels"] });
      toast.success("Pixel excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir pixel: " + (error as Error).message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("tracking_pixels") as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-pixels"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + (error as Error).message);
    },
  });

  const resetForm = () => {
    setFormData({
      platform: "facebook",
      pixel_id: "",
      api_token: "",
      is_active: true,
    });
    setEditingPixel(null);
  };

  const handleEdit = (pixel: TrackingPixel) => {
    setEditingPixel(pixel);
    setFormData({
      platform: pixel.platform as Platform,
      pixel_id: pixel.pixel_id,
      api_token: pixel.api_token || "",
      is_active: pixel.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.pixel_id.trim()) {
      toast.error("ID do Pixel é obrigatório");
      return;
    }

    if (editingPixel) {
      updateMutation.mutate({
        id: editingPixel.id,
        data: {
          platform: formData.platform,
          pixel_id: formData.pixel_id,
          api_token: formData.api_token || null,
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate({
        platform: formData.platform,
        pixel_id: formData.pixel_id,
        api_token: formData.api_token || null,
        is_active: formData.is_active,
      });
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setShowTokens((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getPlatformInfo = (platform: string) => {
    return platformOptions.find((p) => p.value === platform) || { 
      label: platform, 
      color: "bg-gray-500" 
    };
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return "••••••••";
    return token.slice(0, 4) + "••••••••" + token.slice(-4);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Gerenciamento de Pixels
              </CardTitle>
              <CardDescription>
                Configure pixels de rastreamento e tokens da API de Conversão
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Pixel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPixel ? "Editar Pixel" : "Adicionar Novo Pixel"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure o ID do pixel e o token da API de Conversão
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select 
                      value={formData.platform} 
                      onValueChange={(v) => setFormData({ ...formData, platform: v as Platform })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID do Pixel *</Label>
                    <Input
                      value={formData.pixel_id}
                      onChange={(e) => setFormData({ ...formData, pixel_id: e.target.value })}
                      placeholder="Ex: 123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Token da API de Conversão</Label>
                    <Input
                      type="password"
                      value={formData.api_token}
                      onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                      placeholder="Cole o token aqui..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional para rastreamento avançado server-side
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Pixel ativo</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {editingPixel ? "Salvar Alterações" : "Adicionar Pixel"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : pixels && pixels.length > 0 ? (
            <div className="space-y-4">
              {pixels.map((pixel) => {
                const platformInfo = getPlatformInfo(pixel.platform);
                return (
                  <div 
                    key={pixel.id} 
                    className={`bg-card/30 rounded-lg p-4 border ${
                      pixel.is_active ? 'border-green-500/20' : 'border-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={`${platformInfo.color} text-white`}
                          >
                            {platformInfo.label}
                          </Badge>
                          {pixel.is_active ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">ID do Pixel:</span>
                            <code className="ml-2 text-sm bg-muted px-2 py-0.5 rounded">
                              {pixel.pixel_id}
                            </code>
                          </div>
                          {pixel.api_token && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Token API:</span>
                              <code className="text-sm bg-muted px-2 py-0.5 rounded">
                                {showTokens[pixel.id] ? pixel.api_token : maskToken(pixel.api_token)}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleTokenVisibility(pixel.id)}
                              >
                                {showTokens[pixel.id] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pixel.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: pixel.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pixel)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Pixel?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O pixel será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(pixel.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum pixel configurado ainda
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro pixel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">Como usar os pixels?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>ID do Pixel:</strong> Identificador único fornecido pela plataforma de anúncios.
          </p>
          <p>
            <strong>Token da API de Conversão:</strong> Token para rastreamento server-side, 
            mais preciso e resistente a bloqueadores de anúncios.
          </p>
          <p className="text-xs">
            Os pixels ativos serão automaticamente injetados nas páginas públicas do seu app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
