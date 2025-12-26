import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type DietaryProfile = {
  id: string;
  key: string;
  name: string;
};

type MealCompatibility = {
  simple_meal_id: string;
  dietary_profile_id: string;
  compatibility: 'good' | 'moderate' | 'incompatible';
  notes: string | null;
};

type CompatibilityMap = Map<string, { compatibility: 'good' | 'moderate' | 'incompatible'; notes: string | null }>;

export function useDietaryCompatibility(userDietaryPreference?: string | null) {
  const [compatibilityMap, setCompatibilityMap] = useState<CompatibilityMap>(new Map());
  const [profiles, setProfiles] = useState<DietaryProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map dietary_preference enum to dietary_profiles key
  const getProfileKey = useCallback((preference: string | null | undefined): string => {
    if (!preference) return 'comum';
    
    const mapping: Record<string, string> = {
      'comum': 'comum',
      'vegetariana': 'vegetariano',
      'vegana': 'vegano',
      'low_carb': 'low_carb',
      'pescetariana': 'comum', // fallback
      'cetogenica': 'low_carb', // similar to low_carb
      'flexitariana': 'comum', // mostly common with some restrictions
    };
    
    return mapping[preference] || 'comum';
  }, []);

  useEffect(() => {
    const fetchCompatibility = async () => {
      setIsLoading(true);
      
      try {
        // Get the profile key based on user preference
        const profileKey = getProfileKey(userDietaryPreference);
        
        // Fetch the dietary profile for this key
        const { data: profileData, error: profileError } = await supabase
          .from('dietary_profiles')
          .select('id, key, name')
          .eq('key', profileKey)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching dietary profile:', profileError);
          return;
        }

        if (!profileData) {
          console.log('No dietary profile found for key:', profileKey);
          return;
        }

        // Fetch all compatibility mappings for this profile
        const { data: mappings, error: mappingsError } = await supabase
          .from('simple_meal_profiles')
          .select(`
            simple_meal_id,
            dietary_profile_id,
            compatibility,
            notes,
            simple_meals!inner(name)
          `)
          .eq('dietary_profile_id', profileData.id);

        if (mappingsError) {
          console.error('Error fetching compatibility mappings:', mappingsError);
          return;
        }

        // Build a map keyed by meal name (normalized) for easy lookup
        const newMap = new Map<string, { compatibility: 'good' | 'moderate' | 'incompatible'; notes: string | null }>();
        
        mappings?.forEach((mapping) => {
          const mealName = (mapping.simple_meals as { name: string })?.name;
          if (mealName) {
            newMap.set(mealName.toLowerCase().trim(), {
              compatibility: mapping.compatibility as 'good' | 'moderate' | 'incompatible',
              notes: mapping.notes,
            });
          }
        });

        setCompatibilityMap(newMap);
        setProfiles(profileData ? [profileData] : []);
      } catch (error) {
        console.error('Error in fetchCompatibility:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompatibility();
  }, [userDietaryPreference, getProfileKey]);

  const getCompatibility = useCallback((mealName: string): { compatibility: 'good' | 'moderate' | 'incompatible' | 'unknown'; notes: string | null } => {
    const normalizedName = mealName.toLowerCase().trim();
    const result = compatibilityMap.get(normalizedName);
    
    if (result) {
      return result;
    }
    
    // If not found, return unknown
    return { compatibility: 'unknown', notes: null };
  }, [compatibilityMap]);

  return {
    getCompatibility,
    isLoading,
    profiles,
    hasProfile: profiles.length > 0,
  };
}
