import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Fallback de timezone por país (IANA)
const COUNTRY_TIMEZONE_FALLBACK: Record<string, string> = {
  BR: "America/Sao_Paulo",
  US: "America/New_York",
  PT: "Europe/Lisbon",
  ES: "Europe/Madrid",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
  CO: "America/Bogota",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  IT: "Europe/Rome",
  GB: "Europe/London",
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Detecta o timezone do navegador usando a API Intl
 * Retorna o timezone IANA (ex: "America/New_York", "America/Los_Angeles")
 */
function detectBrowserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("[useUserTimezone] Timezone detectado do navegador:", timezone);
    return timezone || DEFAULT_TIMEZONE;
  } catch (error) {
    console.warn("[useUserTimezone] Erro ao detectar timezone:", error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Obtém o timezone de fallback baseado no país
 */
function getCountryFallbackTimezone(countryCode: string | null): string {
  if (!countryCode) return DEFAULT_TIMEZONE;
  return COUNTRY_TIMEZONE_FALLBACK[countryCode] || DEFAULT_TIMEZONE;
}

/**
 * Hook que gerencia o timezone do usuário de forma dinâmica.
 * 
 * Comportamento:
 * 1. Detecta automaticamente o timezone do navegador
 * 2. Atualiza o profile.timezone se diferente do salvo
 * 3. Retorna o timezone para uso em toda a aplicação
 * 
 * Isso permite que usuários que viajam tenham horários corretos automaticamente.
 */
export function useUserTimezone() {
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Detectar e sincronizar timezone
  const syncTimezone = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Usuário não logado - usar timezone do navegador
        const browserTimezone = detectBrowserTimezone();
        setTimezone(browserTimezone);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Detectar timezone atual do navegador
      const browserTimezone = detectBrowserTimezone();

      // Buscar timezone e country do perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("timezone, country")
        .eq("id", user.id)
        .single();

      const savedTimezone = profile?.timezone;
      const country = profile?.country;

      // Se o timezone do navegador é diferente do salvo, atualizar
      if (savedTimezone !== browserTimezone) {
        console.log("[useUserTimezone] Atualizando timezone:", savedTimezone, "->", browserTimezone);
        
        const { error } = await supabase
          .from("profiles")
          .update({ timezone: browserTimezone })
          .eq("id", user.id);

        if (error) {
          console.error("[useUserTimezone] Erro ao atualizar timezone:", error);
          // Se falhar, usar o que temos
          setTimezone(savedTimezone || getCountryFallbackTimezone(country) || browserTimezone);
        } else {
          setTimezone(browserTimezone);
          
          // Notificar o usuário sobre a mudança de timezone (apenas se havia um timezone anterior)
          if (savedTimezone) {
            const cityName = browserTimezone.split('/').pop()?.replace(/_/g, ' ') || browserTimezone;
            toast({
              title: "📍 Fuso horário atualizado",
              description: `Seus horários foram ajustados para ${cityName}`,
              duration: 5000,
            });
          }
        }
      } else if (savedTimezone) {
        // Timezone já está correto
        setTimezone(savedTimezone);
      } else {
        // Não tem timezone salvo - usar navegador e salvar
        console.log("[useUserTimezone] Primeiro acesso, salvando timezone:", browserTimezone);
        
        await supabase
          .from("profiles")
          .update({ timezone: browserTimezone })
          .eq("id", user.id);
        
        setTimezone(browserTimezone);
      }
    } catch (error) {
      console.error("[useUserTimezone] Erro geral:", error);
      // Fallback para timezone do navegador em caso de erro
      setTimezone(detectBrowserTimezone());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncTimezone();
  }, [syncTimezone]);

  /**
   * Obtém a data/hora atual no timezone do usuário
   */
  const getCurrentTime = useCallback((): Date => {
    // Retorna Date padrão - a conversão para timezone específico
    // deve ser feita com date-fns-tz nas funções que precisam
    return new Date();
  }, []);

  /**
   * Força uma re-sincronização do timezone (útil após mudanças no perfil)
   */
  const resync = useCallback(() => {
    setIsLoading(true);
    syncTimezone();
  }, [syncTimezone]);

  return {
    timezone,
    isLoading,
    userId,
    getCurrentTime,
    resync,
    // Helpers para uso com date-fns-tz
    browserTimezone: detectBrowserTimezone(),
  };
}

/**
 * Utilitário para obter a hora atual no timezone especificado
 * Retorna { hours, minutes, date }
 */
export function getCurrentTimeInTimezone(timezone: string): { 
  hours: number; 
  minutes: number; 
  date: Date;
  dayOfWeek: number;
} {
  const now = new Date();
  
  try {
    // Usar toLocaleString para obter a hora no timezone correto
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    // Parse hora
    const timeStr = formatter.format(now);
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Parse dia da semana
    const dateStr = dateFormatter.format(now);
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayPart = dateStr.split(',')[0];
    const dayOfWeek = dayMap[dayPart] ?? now.getDay();
    
    return { hours, minutes, date: now, dayOfWeek };
  } catch (error) {
    console.warn("[getCurrentTimeInTimezone] Erro:", error);
    return { 
      hours: now.getHours(), 
      minutes: now.getMinutes(), 
      date: now,
      dayOfWeek: now.getDay()
    };
  }
}

/**
 * Converte uma data para o timezone especificado e retorna como string legível
 */
export function formatDateInTimezone(date: Date, timezone: string, format: 'date' | 'time' | 'datetime' = 'datetime'): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };
    
    if (format === 'date' || format === 'datetime') {
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
    }
    
    if (format === 'time' || format === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  } catch (error) {
    console.warn("[formatDateInTimezone] Erro:", error);
    return date.toLocaleString('pt-BR');
  }
}

/**
 * Verifica se duas datas são do mesmo dia no timezone especificado
 */
export function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    return formatter.format(date1) === formatter.format(date2);
  } catch (error) {
    console.warn("[isSameDayInTimezone] Erro:", error);
    return date1.toDateString() === date2.toDateString();
  }
}

/**
 * Obtém o início do dia (meia-noite) no timezone especificado
 */
export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const dateStr = formatter.format(date);
    const [month, day, year] = dateStr.split('/');
    
    // Criar uma nova data no timezone local (será ajustada pelo navegador)
    return new Date(`${year}-${month}-${day}T00:00:00`);
  } catch (error) {
    console.warn("[getStartOfDayInTimezone] Erro:", error);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
