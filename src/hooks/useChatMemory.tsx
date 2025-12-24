import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: { name: string; preview?: string; type: 'image' | 'file' }[];
}

interface ChatConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function useChatMemory(onMessagesLoaded?: (messages: ChatMessage[]) => void) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const onMessagesLoadedRef = useRef(onMessagesLoaded);

  // Keep ref updated
  useEffect(() => {
    onMessagesLoadedRef.current = onMessagesLoaded;
  }, [onMessagesLoaded]);

  // Check auth and get user id
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load messages from a conversation
  const loadMessages = useCallback(async (convId: string): Promise<ChatMessage[]> => {
    if (!userId) return [];

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
      return data || [];
    } catch (error) {
      console.error("Error loading conversations:", error);
      return [];
    }
  }, [userId]);

  // Initial load - auto-load last conversation
  useEffect(() => {
    const initializeChat = async () => {
      if (!userId || hasInitializedRef.current) return;
      
      hasInitializedRef.current = true;
      setIsLoadingHistory(true);

      try {
        const { data, error } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setConversations(data || []);

        // Auto-load last conversation
        if (data && data.length > 0) {
          const lastConv = data[0];
          setConversationId(lastConv.id);
          
          const { data: messagesData, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", lastConv.id)
            .order("created_at", { ascending: true });

          if (!messagesError && messagesData && messagesData.length > 0) {
            const messages = messagesData.map(msg => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }));
            
            if (onMessagesLoadedRef.current) {
              onMessagesLoadedRef.current(messages);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initializeChat();
  }, [userId]);

  // Create a new conversation
  const createConversation = useCallback(async (firstMessage?: string): Promise<string | null> => {
    if (!userId) return null;

    try {
      const title = firstMessage 
        ? firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "")
        : "Nova conversa";

      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: userId,
          title
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversationId(data.id);
      await loadConversations();
      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erro ao criar conversa");
      return null;
    }
  }, [userId, loadConversations]);

  // Save a message to the current conversation
  const saveMessage = useCallback(async (
    message: ChatMessage,
    convId: string,
    pageContext?: { path: string; name: string; description: string }
  ): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: convId,
          role: message.role,
          content: message.content,
          page_context: pageContext ? pageContext : null
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

    } catch (error) {
      console.error("Error saving message:", error);
    }
  }, [userId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId: string): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", convId);

      if (error) throw error;

      if (conversationId === convId) {
        setConversationId(null);
      }
      
      await loadConversations();
      toast.success("Conversa excluída!");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Erro ao excluir conversa");
    }
  }, [userId, conversationId, loadConversations]);

  // Switch to a different conversation
  const switchConversation = useCallback(async (convId: string): Promise<ChatMessage[]> => {
    setConversationId(convId);
    return loadMessages(convId);
  }, [loadMessages]);

  // Start a new chat (clear current conversation)
  const startNewChat = useCallback(() => {
    setConversationId(null);
  }, []);

  return {
    conversationId,
    conversations,
    isLoadingHistory,
    userId,
    createConversation,
    saveMessage,
    loadMessages,
    deleteConversation,
    switchConversation,
    startNewChat,
    loadConversations
  };
}
