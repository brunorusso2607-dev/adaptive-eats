import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Países suportados pelo sistema
export const SUPPORTED_COUNTRY_CODES = [
  'BR', 'US', 'PT', 'MX', 'ES', 'AR', 'CO', 'FR', 'DE', 'IT', 'GB', 'AU', 'CA', 'CL', 'PE'
] as const;

export type SupportedCountryCode = typeof SUPPORTED_COUNTRY_CODES[number];

// Fallback padrão consistente em todo o sistema
export const DEFAULT_COUNTRY: SupportedCountryCode = 'BR';

export function useUserCountry() {
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("country")
          .eq("id", user.id)
          .maybeSingle();

        if (data?.country) {
          setCountry(data.country);
        }
        // Se não tem country no perfil, mantém o fallback DEFAULT_COUNTRY ('BR')
      } catch (error) {
        console.error("Error fetching user country:", error);
        // Em caso de erro, mantém o fallback DEFAULT_COUNTRY ('BR')
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountry();
  }, []);

  return { country, isLoading };
}
