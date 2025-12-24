import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ReceitAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Olá! 👋 Sou o **Assistente ReceitAI**. Conheço toda a estrutura do nosso aplicativo - banco de dados, fluxos, cálculos nutricionais, edge functions, e muito mais.\n\nPode me perguntar qualquer coisa sobre o ReceitAI! Por exemplo:\n\n• Como funciona o cálculo de calorias?\n• Quais tabelas existem no banco?\n• Explique o fluxo de análise de rótulos\n• Sugestões para melhorar o app",
        timestamp: new Date()
      }]);
    }
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-assistant", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      if (data.success) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message,
          timestamp: new Date()
        }]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat limpo! Como posso ajudar?",
      timestamp: new Date()
    }]);
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return `<li key="${i}" class="ml-4">${line.substring(2)}</li>`;
        }
        // Code blocks
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
              <CardTitle className="text-lg font-display">Assistente ReceitAI</CardTitle>
              <CardDescription>Pergunte qualquer coisa sobre o sistema</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar chat">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
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

                {/* Message Bubble */}
                <div className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
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

            {/* Loading Indicator */}
            {isLoading && (
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

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte sobre o ReceitAI..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {[
            "Como funciona o cálculo de calorias?",
            "Quais são as intolerâncias suportadas?",
            "Explique a análise de rótulos",
          ].map((suggestion) => (
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
