import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";
import type { ActivityLevel, Sex, DietaryPreference } from "@/types/common";

// Helper function to convert database goal to UI mode
const goalToMode = (goal: string): "lose" | "gain" | "maintain" | null => {
  if (goal === "lose_weight") return "lose";
  if (goal === "gain_weight") return "gain";
  if (goal === "maintain") return "maintain";
  return null;
};

export interface WeightData {
  weight_current: number | null;
  weight_goal: number | null;
  height: number | null;
  age: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel;
  goal_mode: "lose" | "gain" | "maintain" | null;
  strategy_id?: string | null;
}

export interface UserProfileData {
  intolerances?: string[] | null;
  excluded_ingredients?: string[] | null;
  dietary_preference?: DietaryPreference | string | null;
}

interface UseDashboardProfileReturn {
  // State
  onboardingCompleted: boolean | null;
  userContext: string | null;
  kidsMode: boolean;
  userGoal: string | null;
  weightData: WeightData | null;
  userProfile: UserProfileData | null;
  
  // Actions
  checkOnboarding: (userId: string) => Promise<void>;
  refetchUserProfile: () => Promise<void>;
  toggleWeightLossMode: () => Promise<void>;
  toggleKidsMode: () => Promise<void>;
  setUserGoal: (goal: string | null) => void;
  setWeightData: (data: WeightData | null) => void;
  setKidsMode: (value: boolean) => void;
}

export function useDashboardProfile(): UseDashboardProfileReturn {
  const navigate = useNavigate();
  const { logUserAction } = useActivityLog();
  
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [userContext, setUserContext] = useState<string | null>(null);
  const [kidsMode, setKidsMode] = useState(false);
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const [weightData, setWeightData] = useState<WeightData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const checkOnboarding = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, goal, weight_current, weight_goal, height, age, sex, activity_level, intolerances, excluded_ingredients, dietary_preference, kids_mode, strategy_id")
      .eq("id", userId)
      .maybeSingle();
    
    if (data && !data.onboarding_completed) {
      navigate("/onboarding");
    } else {
      setOnboardingCompleted(true);
      setUserContext("individual");
      setKidsMode(data?.kids_mode || false);
      setUserGoal(data?.goal || "maintain");
      
      setUserProfile({
        intolerances: data?.intolerances,
        excluded_ingredients: data?.excluded_ingredients,
        dietary_preference: data?.dietary_preference,
      });
      
      if (data?.weight_current) {
        setWeightData({
          weight_current: data.weight_current,
          weight_goal: data.weight_goal,
          height: data.height,
          age: data.age,
          sex: data.sex as Sex | null,
          activity_level: (data.activity_level as ActivityLevel) || "moderate",
          goal_mode: goalToMode(data.goal || "maintain"),
          strategy_id: data.strategy_id,
        });
      }
    }
  }, [navigate]);

  const refetchUserProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("intolerances, excluded_ingredients, dietary_preference, goal, weight_current, weight_goal, height, age, sex, activity_level, strategy_id")
      .eq("id", currentUser.id)
      .maybeSingle();
    
    if (data) {
      setUserProfile({
        intolerances: data.intolerances,
        excluded_ingredients: data.excluded_ingredients,
        dietary_preference: data.dietary_preference,
      });
      
      setUserGoal(data.goal || "maintain");
      
      setWeightData({
        weight_current: data.weight_current,
        weight_goal: data.weight_goal,
        height: data.height,
        age: data.age,
        sex: data.sex as Sex | null,
        activity_level: (data.activity_level as ActivityLevel) || "moderate",
        goal_mode: goalToMode(data.goal || "maintain"),
        strategy_id: data.strategy_id,
      });
    }
  }, []);

  const toggleWeightLossMode = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({ goal: "maintain" })
      .eq("id", session.user.id);
    
    if (!error) {
      const previousGoal = userGoal;
      setUserGoal("maintain");
      toast.success("Meta de peso desativada");
      
      await logUserAction(
        "weight_goal_toggle",
        "Meta de peso desativada",
        { goal: previousGoal },
        { goal: "maintain" }
      );
    }
  }, [userGoal, logUserAction]);

  const toggleKidsMode = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const newKidsMode = !kidsMode;
    const { error } = await supabase
      .from("profiles")
      .update({ kids_mode: newKidsMode })
      .eq("id", session.user.id);
    
    if (!error) {
      setKidsMode(newKidsMode);
      toast.success(newKidsMode ? "Modo Kids ativado" : "Modo Kids desativado");
      
      await logUserAction(
        "kids_mode_toggle",
        newKidsMode ? "Modo Kids ativado" : "Modo Kids desativado",
        { kids_mode: kidsMode },
        { kids_mode: newKidsMode }
      );
    }
  }, [kidsMode, logUserAction]);

  return {
    onboardingCompleted,
    userContext,
    kidsMode,
    userGoal,
    weightData,
    userProfile,
    checkOnboarding,
    refetchUserProfile,
    toggleWeightLossMode,
    toggleKidsMode,
    setUserGoal,
    setWeightData,
    setKidsMode,
  };
}
