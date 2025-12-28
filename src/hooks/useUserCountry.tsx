import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserCountry() {
  const [country, setCountry] = useState<string | undefined>(undefined);
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
      } catch (error) {
        console.error("Error fetching user country:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountry();
  }, []);

  return { country, isLoading };
}
