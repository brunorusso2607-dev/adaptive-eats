import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingCountry {
  id: string;
  country_code: string;
  country_name: string;
  flag_emoji: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all countries (for admin)
export const useOnboardingCountriesAdmin = () => {
  return useQuery({
    queryKey: ["onboarding-countries-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_countries")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as OnboardingCountry[];
    },
  });
};

// Fetch only active countries (for user-facing)
export const useActiveOnboardingCountries = () => {
  return useQuery({
    queryKey: ["onboarding-countries-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_countries")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as OnboardingCountry[];
    },
  });
};

// Toggle country active status
export const useToggleCountryActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("onboarding_countries")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-active"] });
    },
  });
};

// Reorder countries
export const useReorderCountries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("onboarding_countries")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-active"] });
    },
  });
};

// Create country
export const useCreateCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      country_code: string; 
      country_name: string; 
      flag_emoji: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { error } = await supabase
        .from("onboarding_countries")
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-active"] });
    },
  });
};

// Update country
export const useUpdateCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string;
      country_code?: string; 
      country_name?: string; 
      flag_emoji?: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { error } = await supabase
        .from("onboarding_countries")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-active"] });
    },
  });
};

// Delete country
export const useDeleteCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_countries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-countries-active"] });
    },
  });
};
