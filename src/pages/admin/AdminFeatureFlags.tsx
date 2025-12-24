import { useFeatureFlags, useUpdateFeatureFlag } from "@/hooks/useFeatureFlags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

const AdminFeatureFlags = () => {
  const { data: flags, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();

  const handleToggle = async (id: string, currentValue: boolean) => {
    try {
      await updateFlag.mutateAsync({ id, is_enabled: !currentValue });
      toast.success("Feature flag atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar feature flag");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-6 h-6" />
          Feature Flags
        </h1>
        <p className="text-muted-foreground mt-1">
          Ative ou desative funcionalidades do sistema
        </p>
      </div>

      <div className="grid gap-4">
        {flags?.map((flag) => (
          <Card key={flag.id} className="glass-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{flag.display_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {flag.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={flag.id} className="text-sm text-muted-foreground">
                    {flag.is_enabled ? "Ativo" : "Inativo"}
                  </Label>
                  <Switch
                    id={flag.id}
                    checked={flag.is_enabled}
                    onCheckedChange={() => handleToggle(flag.id, flag.is_enabled)}
                    disabled={updateFlag.isPending}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground/70">
                Chave: <code className="bg-muted px-1.5 py-0.5 rounded">{flag.feature_key}</code>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!flags || flags.length === 0) && (
          <Card className="glass-card border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum feature flag configurado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminFeatureFlags;
