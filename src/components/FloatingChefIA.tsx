import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, User, Send, Loader2, Sparkles, Trash2, Mic, MicOff, 
  Paperclip, X, MapPin, History, Plus, ChevronDown, Search,
  Minimize2, Maximize2, GripVertical, Square, ArrowDown
} from "lucide-react";
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
  // ============ PÁGINAS DO USUÁRIO ============
  "/dashboard": {
    name: "Página Inicial",
    description: "Dashboard principal com próxima refeição, progresso diário e acompanhamento de metas",
    quickActions: ["O que devo comer agora?", "Como está meu progresso?", "Dicas para hoje"]
  },
  "/settings": {
    name: "Configurações",
    description: "Configurações do app, notificações e preferências",
    quickActions: ["Como mudar minhas notificações?", "Como funciona o lembrete de água?"]
  },
  "/perfil": {
    name: "Meu Perfil",
    description: "Dados pessoais, objetivo, restrições alimentares e preferências",
    quickActions: ["Como atualizar meu peso?", "Posso mudar minhas intolerâncias?", "Como funciona a estratégia nutricional?"]
  },
  "/historico": {
    name: "Histórico de Refeições",
    description: "Todas as refeições consumidas, sintomas registrados e progresso",
    quickActions: ["Mostre meu histórico de hoje", "Quais sintomas registrei?", "Exportar meus dados"]
  },
  "/plano": {
    name: "Plano Alimentar",
    description: "Calendário do plano de refeições semanal/mensal",
    quickActions: ["Como gerar um novo plano?", "Posso trocar uma refeição?", "O que é o Surpreenda-me?"]
  },
  "/receitas": {
    name: "Receitas",
    description: "Biblioteca de receitas salvas e favoritas",
    quickActions: ["Sugira uma receita rápida", "Receitas para meu perfil", "Como adicionar favoritos?"]
  },
  "/agua": {
    name: "Controle de Água",
    description: "Acompanhamento de consumo de água diário",
    quickActions: ["Quanto devo beber por dia?", "Como configurar lembretes?"]
  },
  "/scanner": {
    name: "Scanner de Alimentos",
    description: "Análise de fotos de alimentos, geladeira e rótulos",
    quickActions: ["Como analisar um alimento?", "O que o scanner detecta?", "Como funciona a análise de rótulo?"]
  },
  
  // ============ PÁGINAS DO ADMIN ============
  "/admin": {
    name: "Dashboard Admin",
    description: "Visão geral do painel administrativo",
    quickActions: ["O que posso fazer aqui?", "Mostre as estatísticas principais"]
  },
  "/admin/users": {
    name: "Gerenciar Usuários",
    description: "Lista de usuários do app, suas assinaturas e perfis",
    quickActions: ["Como filtrar usuários?", "Como exportar dados?"]
  },
  "/admin/analytics": {
    name: "Analytics",
    description: "Métricas de uso, retenção e engajamento do app",
    quickActions: ["O que cada métrica significa?", "Como melhorar a retenção?"]
  },
  "/admin/ai-error-logs": {
    name: "Logs de Erros de IA",
    description: "Erros das funções de IA",
    quickActions: ["Como debugar erros?", "O que causa erros frequentes?"]
  },
  "/admin/plans": {
    name: "Planos de Assinatura",
    description: "Gerenciamento de planos Stripe",
    quickActions: ["Como criar um novo plano?", "Como configurar trial?"]
  },
  "/admin/prompt-simulator": {
    name: "Simulador de Prompts",
    description: "Teste as funções de IA",
    quickActions: ["Como testar uma receita?", "Me dê um payload de exemplo"]
  },
  "/admin/pixels": {
    name: "Pixels de Tracking",
    description: "Configuração de pixels Meta, Google, TikTok",
    quickActions: ["Como adicionar um pixel?", "Quais eventos são disparados?"]
  },
  "/admin/appearance": {
    name: "Aparência",
    description: "Personalização visual: logo, cores, CSS customizado",
    quickActions: ["Como mudar as cores?", "Como adicionar logo?"]
  },
  "/admin/webhooks": {
    name: "Webhooks",
    description: "Configuração de webhooks para integrações externas",
    quickActions: ["Como configurar um webhook?"]
  },
  "/admin/system-users": {
    name: "Usuários do Sistema",
    description: "Gerenciamento de administradores",
    quickActions: ["Como adicionar admin?"]
  },
  "/admin/gemini": {
    name: "Configurar Gemini",
    description: "Configuração da chave de API do Google Gemini e prompts",
    quickActions: ["Revise o prompt de analyze-food-photo", "Como funciona cada módulo?"]
  },
  "/admin/onboarding": {
    name: "Opções de Onboarding",
    description: "Customização das opções do fluxo de onboarding",
    quickActions: ["Como adicionar nova opção?"]
  },
  "/admin/meal-times": {
    name: "Horários de Refeições",
    description: "Configuração dos horários de cada tipo de refeição",
    quickActions: ["Como alterar horários?"]
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

export default function FloatingChefIA() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  // Drag state
  const [position, setPosition] = useState({ x: 16, y: 110 }); // Distance from bottom-right, above mobile nav
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detecta a página atual
  const currentPath = location.pathname;
  const pageContext = PAGE_CONTEXT_MAP[currentPath] || {
    name: "Página Atual",
    description: "Estou aqui para ajudar com qualquer dúvida",
    quickActions: ["Como posso ajudar?", "Tire uma dúvida"]
  };

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

  // Fetch user's first name for personalized greeting
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", userId)
        .single();
      
      if (data?.first_name) {
        setUserName(data.first_name);
      }
    };
    
    fetchUserName();
  }, [userId]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Permite gravação contínua
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        recognition.maxAlternatives = 1;

        let fullTranscript = '';

        recognition.onstart = () => {
          fullTranscript = '';
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript = transcript;
            }
          }

          if (finalTranscript) {
            fullTranscript += finalTranscript;
            setInput(fullTranscript.trim());
          } else if (interimTranscript) {
            setInput((fullTranscript + interimTranscript).trim());
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
          } else if (event.error === 'no-speech') {
            toast.error("Nenhuma fala detectada");
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

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartRef.current.x - e.clientX;
      const deltaY = dragStartRef.current.y - e.clientY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 420, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 620, dragStartRef.current.posY + deltaY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Clear new message indicator when opening chat
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        setShowScrollToBottom(false);
      }
    }
  }, [messages]);

  // Scroll container ref for direct access
  const scrollContainerRef = useRef<Element | null>(null);

  // Detect scroll position to show/hide "scroll to bottom" button
  useEffect(() => {
    if (!isOpen || isMinimized) {
      setShowScrollToBottom(false);
      return;
    }

    // Small delay to ensure ScrollArea is mounted
    const timer = setTimeout(() => {
      const container = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      scrollContainerRef.current = container;
      
      if (!container) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollToBottom(!isNearBottom);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial check
      handleScroll();
      
      return () => container.removeEventListener('scroll', handleScroll);
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, isMinimized, messages.length]);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current || scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollToBottom(false);
    }
  }, []);

  // Initial greeting - personalized with user name
  useEffect(() => {
    if (!isLoadingHistory && !conversationId && messages.length === 0 && conversations.length === 0) {
      const greeting = userName 
        ? `Oi, ${userName}! 👋 Sou o Chef IA. Como posso ajudar?`
        : `Oi! 👋 Sou o Chef IA. Como posso ajudar?`;
      
      setMessages([{
        role: "assistant",
        content: greeting,
        timestamp: new Date()
      }]);
    }
  }, [isLoadingHistory, conversationId, conversations.length, userName]);

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
      const imageContents: string[] = [];
      for (const att of attachments) {
        if (att.type === 'image') {
          const base64 = await fileToBase64(att.file);
          imageContents.push(base64);
        }
      }

      // Check if this is the first user message in the conversation (no previous assistant responses)
      const hasAssistantResponse = messages.some(m => m.role === "assistant");
      
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
          },
          isFirstMessage: !hasAssistantResponse
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

        if (activeConvId && userId) {
          await saveMessage(assistantMessage, activeConvId);
        }

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

        // Show notification if chat is closed
        if (!isOpen) {
          setHasNewMessage(true);
        }
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao enviar mensagem");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Tente novamente.",
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
      content: `Nova conversa! 👋\n\nVocê está em **${pageContext.name}**. Como posso ajudar?`,
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

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
        className={cn(
          "fixed z-[60] w-14 h-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "flex items-center justify-center transition-all duration-300",
          "hover:scale-110 hover:shadow-xl active:scale-95",
          hasNewMessage && "animate-bounce"
        )}
      >
        <Sparkles className="w-6 h-6" />
        {hasNewMessage && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
            <span className="text-[10px] text-destructive-foreground font-bold">!</span>
          </span>
        )}
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div 
        style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
        className="fixed z-[60] flex items-center gap-2 bg-card border border-border rounded-full shadow-lg px-4 py-2"
      >
        <div 
          onMouseDown={handleMouseDown}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-muted/50 transition-colors",
            isDragging && "cursor-grabbing"
          )}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium">Chef IA</span>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => setIsMinimized(false)}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Full chat window
  return (
    <div 
      ref={chatRef}
      style={isMaximized ? { inset: '1rem' } : { right: `${position.x}px`, bottom: `${position.y}px` }}
      className={cn(
        "fixed z-[60] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
        isMaximized 
          ? "w-auto h-auto" 
          : "w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)]",
        !isDragging && !isMaximized && "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div 
            onMouseDown={handleMouseDown}
            className={cn(
              "cursor-grab active:cursor-grabbing p-1.5 -ml-2 rounded-lg hover:bg-muted/80 transition-colors",
              isDragging && "cursor-grabbing bg-muted"
            )}
            title="Arraste para mover"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Chef IA</h3>
            <div className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">{pageContext.name}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* History Dropdown */}
          {userId && conversations.length > 0 && (
            <DropdownMenu onOpenChange={(open) => { if (!open) setHistorySearch(""); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <History className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar..."
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
                          <span className="text-xs truncate w-full">
                            {conv.title || "Conversa sem título"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short"
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
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Maximize/Restore Button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
          >
            {isMaximized ? <Square className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setIsOpen(false)}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
        <div className="space-y-3">
          {isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Carregando...</span>
            </div>
          )}

          {!isLoadingHistory && messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {message.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              <div className={cn(
                "rounded-xl px-3 py-2 max-w-[80%]",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {message.attachments.map((att, i) => (
                      att.type === 'image' && att.preview ? (
                        <img 
                          key={i}
                          src={att.preview} 
                          alt={att.name}
                          className="max-w-[100px] max-h-[60px] rounded object-cover"
                        />
                      ) : (
                        <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-background/20 rounded text-[10px]">
                          <Paperclip className="w-2.5 h-2.5" />
                          {att.name}
                        </div>
                      )
                    ))}
                  </div>
                )}
                
                <div 
                  className="text-xs whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                />
                <div className={cn(
                  "text-[9px] mt-0.5 opacity-50",
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
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pensando...
                </div>
              </div>
            </div>
          )}
        </div>
        </ScrollArea>

        {/* Scroll to bottom button - subtle grey transparent */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 w-7 h-7 bg-foreground/20 backdrop-blur-sm text-foreground/60 rounded-full flex items-center justify-center hover:bg-foreground/30 hover:text-foreground/80 transition-all z-10"
            title="Ir para o fim"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-muted/50 border-t border-border">
          {attachments.map((att) => (
            <div key={att.id} className="relative group">
              {att.type === 'image' ? (
                <img 
                  src={att.preview} 
                  alt={att.file.name}
                  className="w-12 h-12 object-cover rounded border border-border"
                />
              ) : (
                <div className="w-12 h-12 flex flex-col items-center justify-center bg-muted rounded border border-border">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio Wave Animation - Expanded when listening */}
      {isListening && (
        <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 bg-gradient-to-b from-primary/5 to-primary/15 border-t border-primary/30">
          <div className="flex items-center gap-1 h-12">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full"
                style={{
                  animation: `audioWave 0.6s ease-in-out infinite`,
                  animationDelay: `${i * 0.08}s`,
                  height: '100%',
                }}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-primary font-semibold">Gravando...</span>
            <span className="text-xs text-muted-foreground">Fale sua mensagem. Clique no microfone para parar.</span>
          </div>
          <Button
            onClick={toggleListening}
            variant="destructive"
            size="lg"
            className="mt-2 gap-2"
          >
            <MicOff className="w-5 h-5" />
            Parar Gravação
          </Button>
        </div>
      )}

      {/* Input - Hidden when listening */}
      {!isListening && (
        <div className="p-3 border-t border-border bg-background">
          <div className="flex gap-1.5">
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
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0"
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pergunte algo..."
              disabled={isLoading}
              className="flex-1 h-8 text-sm"
            />
            <Button 
              onClick={toggleListening}
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0"
              disabled={isLoading}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              size="icon"
              className="w-8 h-8 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1 mt-2">
            {pageContext.quickActions.slice(0, 2).map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2"
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
        </div>
      )}
    </div>
  );
}
