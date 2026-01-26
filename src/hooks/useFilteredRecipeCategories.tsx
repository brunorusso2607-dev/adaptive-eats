import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { filterCategoriesForProfile, type CategoryConfig, type UserProfile } from "@/config/recipeCategoryRules";

/**
 * Hook que busca o perfil do usuário e retorna as categorias filtradas
 */
export function useFilteredRecipeCategories() {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfileAndFilterCategories() {
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Se não há usuário logado, mostra todas as categorias
          const allCategories = filterCategoriesForProfile(null);
          setCategories(allCategories);
          setProfile(null);
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("goal, dietary_preference, intolerances, excluded_ingredients")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar perfil:", error);
          const allCategories = filterCategoriesForProfile(null);
          setCategories(allCategories);
          return;
        }

        setProfile(profileData);
        const filteredCategories = filterCategoriesForProfile(profileData);
        setCategories(filteredCategories);
        
      } catch (error) {
        console.error("Erro ao filtrar categorias:", error);
        const allCategories = filterCategoriesForProfile(null);
        setCategories(allCategories);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileAndFilterCategories();
  }, []);

  /**
   * Função para recarregar as categorias (útil quando perfil é atualizado)
   */
  const refetch = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const allCategories = filterCategoriesForProfile(null);
        setCategories(allCategories);
        setProfile(null);
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("goal, dietary_preference, intolerances, excluded_ingredients")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return;
      }

      setProfile(profileData);
      const filteredCategories = filterCategoriesForProfile(profileData);
      setCategories(filteredCategories);
      
    } catch (error) {
      console.error("Erro ao refetch categorias:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { categories, isLoading, profile, refetch };
}
