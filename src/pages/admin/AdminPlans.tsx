import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, CreditCard, RefreshCw, Copy, Settings, Key, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";
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

type StripePrice = {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
};

type StripePlan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: StripePrice[];
};

export default function AdminPlans() {
  const { logAdminAction } = useActivityLog();
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<"checking" | "connected" | "error">("checking");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showUpdateKeyInput, setShowUpdateKeyInput] = useState(false);
  const [newStripeKey, setNewStripeKey] = useState("");
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("brl");
  const [interval, setInterval] = useState("month");

  const testStripeConnection = async () => {
    setIsTestingConnection(true);
    setStripeStatus("checking");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStripeStatus("error");
        return;
      }

      const { error } = await supabase.functions.invoke("list-stripe-plans", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setStripeStatus("error");
      } else {
        setStripeStatus("connected");
      }
    } catch {
      setStripeStatus("error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    testStripeConnection();
  }, []);

  const handleUpdateStripeKey = async () => {
    if (!newStripeKey.trim()) {
      toast.error("Digite a nova chave Stripe");
      return;
    }

    if (!newStripeKey.startsWith("sk_")) {
      toast.error("A chave deve começar com 'sk_live_' ou 'sk_test_'");
      return;
    }

    setIsUpdatingKey(true);
    try {
      // Note: In a real implementation, this would call an edge function
      // to update the secret securely. For now, we show guidance.
      toast.info("Para atualizar a chave, acesse Settings → Cloud → Secrets no Lovable");
      setShowUpdateKeyInput(false);
      setNewStripeKey("");
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const handleRemoveStripeKey = async () => {
    // Note: Secrets managed by Lovable cannot be removed via the app
    toast.info("Para remover a chave, acesse Settings → Cloud → Secrets no Lovable");
    setShowRemoveConfirm(false);
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const { data, error } = await supabase.functions.invoke("list-stripe-plans", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setPlans(data.plans || []);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Preço inválido");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-stripe-plan", {
        body: {
          name: name.trim(),
          description: description.trim() || null,
          price: priceValue,
          currency,
          interval,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("Plano criado com sucesso!");
      
      // Log admin action
      await logAdminAction(
        session.user.id,
        "stripe_plan_created",
        `Plano "${name}" criado no Stripe`,
        null,
        { 
          product_id: data.product.id, 
          price_id: data.price.id,
          name,
          price: priceValue,
          currency,
          interval,
        }
      );

      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setCurrency("brl");
      setInterval("month");
      setDialogOpen(false);
      
      // Refresh plans list
      fetchPlans();
    } catch (error: any) {
      console.error("Error creating plan:", error);
      toast.error(error.message || "Erro ao criar plano");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formatPrice = (amount: number | null, currency: string) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getIntervalLabel = (interval: string | null) => {
    if (!interval) return "Único";
    const labels: Record<string, string> = {
      day: "Diário",
      week: "Semanal",
      month: "Mensal",
      year: "Anual",
    };
    return labels[interval] || interval;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Planos Stripe
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os planos de assinatura do Stripe
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configuração
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Configuração do Stripe
                </DialogTitle>
                <DialogDescription>
                  Gerencie a integração com o Stripe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status da Conexão */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status da Conexão</Label>
                  <div className={`rounded-lg p-3 border ${
                    stripeStatus === "connected" 
                      ? "bg-green-500/10 border-green-500/30" 
                      : stripeStatus === "error" 
                        ? "bg-destructive/10 border-destructive/30" 
                        : "bg-muted border-border"
                  }`}>
                    <div className="flex items-center gap-2">
                      {stripeStatus === "checking" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Verificando conexão...</span>
                        </>
                      )}
                      {stripeStatus === "connected" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">Conectado ao Stripe</span>
                        </>
                      )}
                      {stripeStatus === "error" && (
                        <>
                          <XCircle className="w-4 h-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">Erro na conexão</span>
                        </>
                      )}
                    </div>
                    {stripeStatus === "connected" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        A integração está ativa e funcionando corretamente.
                      </p>
                    )}
                    {stripeStatus === "error" && (
                      <p className="text-xs text-destructive/80 mt-1">
                        Verifique se a chave Stripe está correta.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={testStripeConnection}
                    disabled={isTestingConnection}
                    className="w-full"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>

                {/* Chave Atual */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Chave Secreta</Label>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                    <span className="text-muted-foreground">sk_live_••••••••••••••••••••••••</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A chave está armazenada de forma segura e não pode ser visualizada.
                  </p>
                </div>

                {/* Formulário para Atualizar Chave */}
                {showUpdateKeyInput ? (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                    <Label htmlFor="newKey">Nova Chave Stripe</Label>
                    <Input
                      id="newKey"
                      type="password"
                      value={newStripeKey}
                      onChange={(e) => setNewStripeKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowUpdateKeyInput(false);
                          setNewStripeKey("");
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateStripeKey}
                        disabled={isUpdatingKey || !newStripeKey.trim()}
                        className="flex-1"
                      >
                        {isUpdatingKey && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Para alterar secrets, acesse Settings → Cloud → Secrets no painel do Lovable.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ações</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUpdateKeyInput(true)}
                        className="w-full"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Atualizar Chave
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRemoveConfirm(true)}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  </div>
                )}

                {/* Links Úteis */}
                <div className="pt-2 border-t space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Links Úteis</Label>
                  <div className="grid gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open("https://dashboard.stripe.com/apikeys", "_blank", "noopener,noreferrer")}
                      className="w-full justify-start"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Chaves de API do Stripe
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open("https://dashboard.stripe.com", "_blank", "noopener,noreferrer")}
                      className="w-full justify-start"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Dashboard Stripe
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Alert Dialog para Confirmar Remoção */}
          <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover chave Stripe?</AlertDialogTitle>
                <AlertDialogDescription>
                  Para remover a chave Stripe, você precisa acessar as configurações do projeto no Lovable (Settings → Cloud → Secrets) e excluir o secret STRIPE_SECRET_KEY.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveStripeKey}>
                  Entendi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlans}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Plano</DialogTitle>
                <DialogDescription>
                  O plano será criado diretamente no Stripe
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Plano Premium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do plano..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="29.90"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moeda</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brl">BRL (R$)</SelectItem>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo de Cobrança</Label>
                  <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mensal</SelectItem>
                      <SelectItem value="year">Anual</SelectItem>
                      <SelectItem value="week">Semanal</SelectItem>
                      <SelectItem value="day">Diário</SelectItem>
                      <SelectItem value="one_time">Pagamento Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Plano
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum plano encontrado no Stripe
            </p>
            <Button
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-1">
                        {plan.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Product ID:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 font-mono text-xs"
                      onClick={() => copyToClipboard(plan.id, "Product ID")}
                    >
                      {plan.id.slice(0, 18)}...
                      <Copy className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>

                {plan.prices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preços:</p>
                    {plan.prices.map((price) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                      >
                        <div>
                          <p className="font-semibold">
                            {formatPrice(price.unit_amount, price.currency)}
                            <span className="text-xs text-muted-foreground ml-1">
                              / {getIntervalLabel(price.recurring?.interval || null)}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1"
                          onClick={() => copyToClipboard(price.id, "Price ID")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
