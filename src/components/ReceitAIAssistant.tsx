import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, Sparkles, Trash2, Mic, MicOff, Paperclip, X, Image as ImageIcon, MapPin, History, Plus, ChevronDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatMemory } from "@/hooks/useChatMemory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Mapeamento de rotas para contexto amigável
const PAGE_CONTEXT_MAP: Record<string, { name: string; description: string; quickActions: string[] }> = {
  "/admin": {
    name: "Dashboard Admin",
    description: "Visão geral do painel administrativo",
    quickActions: ["O que posso fazer aqui?", "Mostre as estatísticas principais"]
  },
  "/admin/users": {
    name: "Gerenciar Usuários",
    description: "Lista de usuários do app, suas assinaturas e perfis",
    quickActions: ["Como filtrar usuários?", "Como exportar dados?", "Sugestões de melhoria"]
  },
  "/admin/analytics": {
    name: "Analytics",
    description: "Métricas de uso, retenção e engajamento do app",
    quickActions: ["O que cada métrica significa?", "Como melhorar a retenção?"]
  },
  "/admin/ai-error-logs": {
    name: "Logs de Erros de IA",
    description: "Erros das funções de IA (analyze-food-photo, generate-recipe, etc.)",
    quickActions: ["Como debugar erros?", "O que causa erros frequentes?"]
  },
  "/admin/plans": {
    name: "Planos de Assinatura",
    description: "Gerenciamento de planos Stripe (Essencial, Premium)",
    quickActions: ["Como criar um novo plano?", "Como configurar trial?"]
  },
  "/admin/prompt-simulator": {
    name: "Simulador de Prompts",
    description: "Teste as funções de IA sem precisar usar o app como usuário",
    quickActions: ["Como testar uma receita?", "Me dê um payload de exemplo", "Como funciona cada função?"]
  },
  "/admin/pixels": {
    name: "Pixels de Tracking",
    description: "Configuração de pixels Meta, Google, TikTok",
    quickActions: ["Como adicionar um pixel?", "Quais eventos são disparados?"]
  },
  "/admin/appearance": {
    name: "Aparência",
    description: "Personalização visual: logo, cores, CSS customizado",
    quickActions: ["Como mudar as cores?", "Como adicionar logo?", "Sugestões de paleta"]
  },
  "/admin/webhooks": {
    name: "Webhooks",
    description: "Configuração de webhooks para integrações externas",
    quickActions: ["Como configurar um webhook?", "Quais eventos posso usar?"]
  },
  "/admin/system-users": {
    name: "Usuários do Sistema",
    description: "Gerenciamento de administradores",
    quickActions: ["Como adicionar admin?", "Como funciona o sistema de roles?"]
  },
  "/admin/gemini": {
    name: "Configurar Gemini",
    description: "Configuração da chave de API do Google Gemini",
    quickActions: ["Como obter uma API key?", "Como testar a conexão?"]
  },
  "/admin/onboarding": {
    name: "Opções de Onboarding",
    description: "Customização das opções do fluxo de onboarding",
    quickActions: ["Como adicionar nova opção?", "Como reordenar?"]
  },
  "/admin/meal-times": {
    name: "Horários de Refeições",
    description: "Configuração dos horários de cada tipo de refeição",
    quickActions: ["Como alterar horários?", "Quais são os tipos de refeição?"]
  }
};

interface Attachment {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'file';
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: { name: string; preview?: string; type: 'image' | 'file' }[];
}

export default function ReceitAIAssistant() {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detecta a página atual
  const currentPath = location.pathname;
  const pageContext = PAGE_CONTEXT_MAP[currentPath] || PAGE_CONTEXT_MAP["/admin"];

  // Callback para quando mensagens são carregadas do histórico
  const handleMessagesLoaded = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  }, []);

  // Hook de memória persistente
  const {
    conversationId,
    conversations,
    isLoadingHistory,
    userId,
    createConversation,
    saveMessage,
    switchConversation,
    startNewChat,
    deleteConversation
  } = useChatMemory(handleMessagesLoaded);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        // Keep track of the base input before interim results
        let baseInput = '';
        
        recognition.onstart = () => {
          baseInput = input; // Capture current input when recording starts
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Show interim results while speaking
          if (interimTranscript && !finalTranscript) {
            setInput(interimTranscript);
          }
          
          // When final, set only the final transcript (not cumulative)
          if (finalTranscript) {
            setInput(finalTranscript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            toast.error("Permissão de microfone negada");
          } else if (event.error !== 'aborted') {
            toast.error("Erro no reconhecimento de voz");
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Handle paste event for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            addAttachment(file);
            toast.success("Imagem colada!");
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const addAttachment = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : '';
    
    const newAttachment: Attachment = {
      id: crypto.randomUUID(),
      file,
      preview,
      type: isImage ? 'image' : 'file'
    };

    setAttachments(prev => [...prev, newAttachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      addAttachment(files[i]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de voz não suportado neste navegador");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Initial greeting - only for truly new users with no history
  useEffect(() => {
    // Only show greeting if: not loading, no conversation loaded, no messages, AND no previous conversations exist
    if (!isLoadingHistory && !conversationId && messages.length === 0 && conversations.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Olá! Sou o Chef IA, seu assistente. Como posso ajudar?`,
        timestamp: new Date()
      }]);
    }
  }, [isLoadingHistory, conversationId, conversations.length]);

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const messageAttachments = attachments.map(a => ({
      name: a.file.name,
      preview: a.preview,
      type: a.type
    }));

    const userMessage: Message = {
      role: "user",
      content: input.trim() || (attachments.length > 0 ? `[${attachments.length} arquivo(s) anexado(s)]` : ''),
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    // Create conversation if needed and save user message
    let activeConvId = conversationId;
    if (!activeConvId && userId) {
      activeConvId = await createConversation(userMessage.content);
    }

    if (activeConvId && userId) {
      await saveMessage(userMessage, activeConvId, {
        path: currentPath,
        name: pageContext.name,
        description: pageContext.description
      });
    }

    try {
      // Convert images to base64 for the API
      const imageContents: string[] = [];
      for (const att of attachments) {
        if (att.type === 'image') {
          const base64 = await fileToBase64(att.file);
          imageContents.push(base64);
        }
      }

      const { data, error } = await supabase.functions.invoke("chat-assistant", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          images: imageContents.length > 0 ? imageContents : undefined,
          currentPage: {
            path: currentPath,
            name: pageContext.name,
            description: pageContext.description
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        // Show toast if profile was updated with new restriction
        if (data.profileUpdated && data.addedRestriction) {
          toast.success(`${data.addedRestriction} adicionado ao seu perfil!`, {
            description: "Suas recomendações agora consideram essa restrição."
          });
        }

        // Show toast if goal was updated
        if (data.profileUpdated && data.updatedGoal) {
          toast.success(`Objetivo atualizado para: ${data.updatedGoal}`, {
            description: "Suas recomendações agora focam nesse objetivo."
          });
        }

        // Save assistant message
        if (activeConvId && userId) {
          await saveMessage(assistantMessage, activeConvId);
        }
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao enviar mensagem");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    startNewChat();
    setMessages([{
      role: "assistant",
      content: "Chat limpo! Como posso ajudar?",
      timestamp: new Date()
    }]);
    setAttachments([]);
  };

  const handleLoadConversation = async (convId: string) => {
    const loadedMessages = await switchConversation(convId);
    if (loadedMessages.length > 0) {
      setMessages(loadedMessages);
      toast.success("Conversa carregada!");
    }
  };

  const handleNewChat = () => {
    startNewChat();
    setMessages([{
      role: "assistant",
      content: `Opa! 👋 Nova conversa iniciada!\n\nVocê está na página **${pageContext.name}**. No que posso te ajudar?`,
      timestamp: new Date()
    }]);
  };

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return `<li key="${i}" class="ml-4">${line.substring(2)}</li>`;
        }
        line = line.replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');
        return line;
      })
      .join('<br/>');
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Chef IA</CardTitle>
              <CardDescription>
                {conversationId ? "Conversa salva" : "Seu assistente amigo"}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* History Dropdown */}
            {userId && conversations.length > 0 && (
              <DropdownMenu onOpenChange={(open) => { if (!open) setHistorySearch(""); }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Histórico</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  {/* Search Input */}
                  <div className="px-2 py-1.5">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar conversas..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleNewChat} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova conversa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ScrollArea className="max-h-[200px]">
                    {conversations
                      .filter(conv => 
                        !historySearch || 
                        (conv.title?.toLowerCase().includes(historySearch.toLowerCase()))
                      )
                      .map((conv) => (
                        <div
                          key={conv.id}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm group"
                        >
                          <button
                            onClick={() => handleLoadConversation(conv.id)}
                            className="flex flex-col items-start gap-0.5 flex-1 text-left min-w-0"
                          >
                            <span className="text-sm truncate w-full">
                              {conv.title || "Conversa sem título"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Excluir esta conversa?")) {
                                deleteConversation(conv.id);
                              }
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-opacity"
                            title="Excluir conversa"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      ))}
                    {conversations.filter(conv => 
                      !historySearch || 
                      (conv.title?.toLowerCase().includes(historySearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        Nenhuma conversa encontrada
                      </div>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Current Page Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{pageContext.name}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Area - Increased height */}
        <ScrollArea ref={scrollAreaRef} className="h-[600px] pr-4">
          <div className="space-y-4">
            {/* Loading History Indicator */}
            {isLoadingHistory && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Carregando conversa...</p>
                  <p className="text-xs text-muted-foreground mt-1">Recuperando seu histórico</p>
                </div>
              </div>
            )}

            {!isLoadingHistory && messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                <div className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map((att, i) => (
                        att.type === 'image' && att.preview ? (
                          <img 
                            key={i}
                            src={att.preview} 
                            alt={att.name}
                            className="max-w-[150px] max-h-[100px] rounded-lg object-cover"
                          />
                        ) : (
                          <div key={i} className="flex items-center gap-1 px-2 py-1 bg-background/20 rounded text-xs">
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  
                  <div 
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                  <div className={cn(
                    "text-[10px] mt-1 opacity-60",
                    message.role === "user" ? "text-right" : "text-left"
                  )}>
                    {message.timestamp.toLocaleTimeString("pt-BR", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && !isLoadingHistory && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pensando...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
            {attachments.map((att) => (
              <div key={att.id} className="relative group">
                {att.type === 'image' ? (
                  <img 
                    src={att.preview} 
                    alt={att.file.name}
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 flex flex-col items-center justify-center bg-muted rounded-lg border border-border">
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-[60px]">
                      {att.file.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Audio Wave Animation */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 py-3 px-4 bg-primary/10 rounded-xl border border-primary/30">
            <div className="flex items-center gap-1 h-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  style={{
                    animation: `audioWave 0.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                    height: '100%',
                  }}
                />
              ))}
            </div>
            <span className="ml-3 text-sm text-primary font-medium">Ouvindo...</span>
          </div>
        )}

        {/* Input Area with Microphone and File Upload */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="icon"
            disabled={isLoading}
            title="Anexar arquivo (ou Ctrl+V para colar)"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Fale agora..." : "Pergunte ou cole uma imagem (Ctrl+V)..."}
            disabled={isLoading}
            className={cn("flex-1", isListening && "border-primary")}
          />
          <Button 
            onClick={toggleListening}
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            disabled={isLoading}
            title={isListening ? "Parar de ouvir" : "Falar"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions - Dynamic based on current page */}
        <div className="flex flex-wrap gap-2">
          {pageContext.quickActions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
              disabled={isLoading}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
