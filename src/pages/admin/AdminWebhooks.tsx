import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Webhook, 
  Plus, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Info,
  Shield,
  Zap
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type WebhookEndpoint = {
  id: string;
  url: string;
  enabled_events: string[];
  status: "enabled" | "disabled";
  created: number;
  livemode: boolean;
  secret?: string;
};

type WebhookEvent = {
  id: string;
  type: string;
  created: number;
  pending_webhooks: number;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
};

const STRIPE_WEBHOOK_EVENTS = [
  { category: "Checkout", events: [
    "checkout.session.completed",
    "checkout.session.expired",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
  ]},
  { category: "Assinaturas", events: [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",
    "customer.subscription.paused",
    "customer.subscription.resumed",
  ]},
  { category: "Pagamentos", events: [
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "payment_intent.created",
  ]},
  { category: "Invoices", events: [
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.upcoming",
    "invoice.finalized",
  ]},
  { category: "Clientes", events: [
    "customer.created",
    "customer.updated",
    "customer.deleted",
  ]},
];

export default function AdminWebhooks() {
  const [activeTab, setActiveTab] = useState("overview");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<"checking" | "configured" | "not_configured">("checking");
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [secretStatus, setSecretStatus] = useState<"idle" | "saving" | "saved" | "configured">("idle");
  const [isSecretConfigured, setIsSecretConfigured] = useState(false);
  const [showSecretInput, setShowSecretInput] = useState(false);

  // Get the project webhook URL
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "upnqkxrvtimtlqsuuvci";
  const stripeWebhookUrl = `https://${projectId}.supabase.co/functions/v1/stripe-webhook`;

  // Check webhook status
  const checkWebhookStatus = async () => {
    setWebhookStatus("checking");
    try {
      // Test the webhook endpoint with a ping request
      const response = await fetch(stripeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: true }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      // If we get a 200 with status: "ok", the function is working
      if (response.ok && data.status === "ok") {
        setWebhookStatus("configured");
        setIsSecretConfigured(true);
        setSecretStatus("configured");
      } else if (response.status === 400 || response.status === 500) {
        // Function exists but returned an error (still configured, just needs secret)
        setWebhookStatus("configured");
        setIsSecretConfigured(false);
      } else {
        setWebhookStatus("not_configured");
      }
      
      setLastCheck(new Date());
    } catch (error) {
      // Network error - function might not exist or CORS issue
      // Try OPTIONS as fallback
      try {
        const optionsResponse = await fetch(stripeWebhookUrl, { method: "OPTIONS" });
        if (optionsResponse.ok) {
          setWebhookStatus("configured");
        } else {
          setWebhookStatus("not_configured");
        }
      } catch {
        setWebhookStatus("not_configured");
      }
      setLastCheck(new Date());
    }
  };

  // Save webhook secret
  const saveWebhookSecret = async () => {
    if (!webhookSecret.trim() || !webhookSecret.startsWith("whsec_")) {
      toast.error("O secret deve começar com 'whsec_'");
      return;
    }

    setSecretStatus("saving");
    try {
      // Call an edge function to save the secret
      const { error } = await supabase.functions.invoke("stripe-webhook", {
        body: { 
          action: "save_secret",
          secret: webhookSecret.trim()
        }
      });

      if (error) throw error;

      setSecretStatus("saved");
      setIsSecretConfigured(true);
      setWebhookSecret("");
      toast.success("Webhook secret salvo com sucesso!");
      
      // Recheck status
      setTimeout(() => {
        checkWebhookStatus();
        setSecretStatus("configured");
      }, 1000);
    } catch (error: any) {
      console.error("Error saving webhook secret:", error);
      // Even if the edge function doesn't support this, mark as saved locally
      // The secret needs to be added via Lovable Cloud
      toast.info("Para salvar o secret, adicione-o nas variáveis de ambiente do projeto como STRIPE_WEBHOOK_SECRET");
      setSecretStatus("idle");
    }
  };

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Webhooks
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure webhooks para integrar com serviços externos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            Stripe
          </TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            Personalizados
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M13.976 13.268c0-.804.66-1.108 1.752-1.108 1.568 0 3.548.476 5.116 1.324V8.748a13.158 13.158 0 00-5.116-.94c-4.18 0-6.96 2.184-6.96 5.832 0 5.688 7.828 4.78 7.828 7.232 0 .952-.828 1.26-1.984 1.26-1.716 0-3.912-.708-5.648-1.66v4.788a14.36 14.36 0 005.648 1.2c4.284 0 7.228-2.12 7.228-5.82-.016-6.14-7.864-5.044-7.864-7.372z" fill="#635BFF"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stripe</CardTitle>
                    <CardDescription>Pagamentos e assinaturas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {webhookStatus === "checking" ? (
                    <Badge variant="outline" className="bg-muted">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Verificando...
                    </Badge>
                  ) : webhookStatus === "configured" ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Não configurado
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={checkWebhookStatus}
                      disabled={webhookStatus === "checking"}
                    >
                      <RefreshCw className={`w-4 h-4 ${webhookStatus === "checking" ? "animate-spin" : ""}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab("stripe")}
                    >
                      {webhookStatus === "configured" ? "Ver" : "Configurar"}
                    </Button>
                  </div>
                </div>
                {lastCheck && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Última verificação: {lastCheck.toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Zapier</CardTitle>
                    <CardDescription>Em breve</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  Em desenvolvimento
                </Badge>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Webhook className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Webhook Genérico</CardTitle>
                    <CardDescription>Em breve</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  Em desenvolvimento
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* What are webhooks */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                <CardTitle>O que são Webhooks?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Webhooks são notificações automáticas enviadas por serviços externos quando um evento acontece. 
                Por exemplo, quando um cliente faz um pagamento no Stripe, o Stripe envia uma notificação para o seu app.
              </p>
              <p>
                Isso permite que seu aplicativo:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ative assinaturas automaticamente após pagamento</li>
                <li>Envie emails de confirmação</li>
                <li>Atualize o status do usuário em tempo real</li>
                <li>Registre eventos para análise</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="space-y-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
                  <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.976 13.268c0-.804.66-1.108 1.752-1.108 1.568 0 3.548.476 5.116 1.324V8.748a13.158 13.158 0 00-5.116-.94c-4.18 0-6.96 2.184-6.96 5.832 0 5.688 7.828 4.78 7.828 7.232 0 .952-.828 1.26-1.984 1.26-1.716 0-3.912-.708-5.648-1.66v4.788a14.36 14.36 0 005.648 1.2c4.284 0 7.228-2.12 7.228-5.82-.016-6.14-7.864-5.044-7.864-7.372z" fill="#635BFF"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Configurar Webhook do Stripe</CardTitle>
                  <CardDescription>
                    Receba notificações em tempo real sobre pagamentos e assinaturas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: URL do Webhook */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                    1
                  </div>
                  <Label className="font-semibold">URL do Endpoint</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Copie esta URL e adicione no painel do Stripe em Developers → Webhooks
                </p>
                <div className="ml-8 flex items-center gap-2">
                  <Input 
                    value={stripeWebhookUrl} 
                    readOnly 
                    className="font-mono text-sm bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(stripeWebhookUrl, "URL do webhook")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Step 2: Eventos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                    2
                  </div>
                  <Label className="font-semibold">Selecionar Eventos</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Configure os eventos que você deseja receber no Stripe Dashboard
                </p>
                <div className="ml-8">
                  <Accordion type="multiple" className="w-full">
                    {STRIPE_WEBHOOK_EVENTS.map((category) => (
                      <AccordionItem key={category.category} value={category.category}>
                        <AccordionTrigger className="text-sm font-medium">
                          {category.category}
                          <Badge variant="secondary" className="ml-2">
                            {category.events.length}
                          </Badge>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1">
                            {category.events.map((event) => (
                              <div 
                                key={event}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 group"
                              >
                                <code className="text-xs font-mono text-muted-foreground">
                                  {event}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => copyToClipboard(event, "Evento")}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>

              {/* Step 3: Secret */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                    3
                  </div>
                  <Label className="font-semibold">Webhook Secret</Label>
                  {isSecretConfigured && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Após criar o webhook no Stripe, copie o "Signing secret" (começa com <code className="bg-muted px-1 rounded">whsec_</code>)
                  e cole abaixo:
                </p>
                
                {!isSecretConfigured ? (
                  <div className="ml-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder="whsec_..."
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={saveWebhookSecret}
                        disabled={secretStatus === "saving" || !webhookSecret.startsWith("whsec_")}
                      >
                        {secretStatus === "saving" ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Salvar Secret
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-700 dark:text-amber-500">
                          <strong>Importante:</strong> O webhook secret é necessário para validar que as requisições 
                          realmente vieram do Stripe e não de um atacante.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ml-8 space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <div className="text-sm text-green-700 dark:text-green-500">
                            <strong>Webhook Secret configurado!</strong> Seu webhook está pronto para receber eventos do Stripe.
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSecretInput(!showSecretInput)}
                        >
                          {showSecretInput ? "Cancelar" : "Alterar"}
                        </Button>
                      </div>
                    </div>
                    
                    {showSecretInput && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="password"
                            placeholder="whsec_..."
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            onClick={saveWebhookSecret}
                            disabled={secretStatus === "saving" || !webhookSecret.startsWith("whsec_")}
                          >
                            {secretStatus === "saving" ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Atualizar Secret
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* External Links */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href="https://dashboard.stripe.com/webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Stripe Dashboard
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href="https://docs.stripe.com/webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Documentação Stripe
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Handler Info */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Edge Function Handler</CardTitle>
              </div>
              <CardDescription>
                Você precisa criar uma Edge Function para processar os webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A Edge Function <code className="bg-muted px-1.5 py-0.5 rounded text-xs">stripe-webhook</code> deve:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Validar a assinatura do webhook usando o secret</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Processar eventos de checkout e subscription</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Atualizar o banco de dados com o status da assinatura</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Retornar status 200 para confirmar recebimento</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Badge variant="secondary">
                    Peça ao Lovable para criar a edge function se ainda não existir
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Webhooks Tab */}
        <TabsContent value="custom" className="space-y-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Webhooks Personalizados</CardTitle>
              <CardDescription>
                Configure endpoints personalizados para enviar notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Webhook className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Em Desenvolvimento</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Em breve você poderá configurar webhooks personalizados para enviar 
                  notificações para URLs externas quando eventos acontecerem no seu app.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline">Novo usuário</Badge>
                  <Badge variant="outline">Receita favorita</Badge>
                  <Badge variant="outline">Plano gerado</Badge>
                  <Badge variant="outline">Meta atingida</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
