export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      meal_plan_items: {
        Row: {
          completed_at: string | null
          created_at: string
          day_of_week: number
          id: string
          is_favorite: boolean
          meal_plan_id: string
          meal_type: string
          recipe_calories: number
          recipe_carbs: number
          recipe_fat: number
          recipe_ingredients: Json
          recipe_instructions: Json
          recipe_name: string
          recipe_prep_time: number
          recipe_protein: number
          week_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_favorite?: boolean
          meal_plan_id: string
          meal_type: string
          recipe_calories?: number
          recipe_carbs?: number
          recipe_fat?: number
          recipe_ingredients?: Json
          recipe_instructions?: Json
          recipe_name: string
          recipe_prep_time?: number
          recipe_protein?: number
          week_number?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_favorite?: boolean
          meal_plan_id?: string
          meal_type?: string
          recipe_calories?: number
          recipe_carbs?: number
          recipe_fat?: number
          recipe_ingredients?: Json
          recipe_instructions?: Json
          recipe_name?: string
          recipe_prep_time?: number
          recipe_protein?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          completion_percentage: number | null
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          calorie_goal: Database["public"]["Enums"]["calorie_goal"] | null
          context: Database["public"]["Enums"]["user_context"] | null
          created_at: string | null
          dietary_preference:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email: string | null
          goal: Database["public"]["Enums"]["user_goal"] | null
          height: number | null
          id: string
          intolerances: string[] | null
          onboarding_completed: boolean | null
          recipe_complexity:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          sex: string | null
          updated_at: string | null
          weight_current: number | null
          weight_goal: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: Database["public"]["Enums"]["calorie_goal"] | null
          context?: Database["public"]["Enums"]["user_context"] | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          height?: number | null
          id: string
          intolerances?: string[] | null
          onboarding_completed?: boolean | null
          recipe_complexity?:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          sex?: string | null
          updated_at?: string | null
          weight_current?: number | null
          weight_goal?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: Database["public"]["Enums"]["calorie_goal"] | null
          context?: Database["public"]["Enums"]["user_context"] | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          height?: number | null
          id?: string
          intolerances?: string[] | null
          onboarding_completed?: boolean | null
          recipe_complexity?:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          sex?: string | null
          updated_at?: string | null
          weight_current?: number | null
          weight_goal?: number | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories: number
          carbs: number
          complexity: Database["public"]["Enums"]["recipe_complexity"]
          created_at: string | null
          description: string | null
          fat: number
          id: string
          ingredients: Json
          input_ingredients: string | null
          instructions: Json
          is_favorite: boolean
          name: string
          prep_time: number
          protein: number
          servings: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          complexity?: Database["public"]["Enums"]["recipe_complexity"]
          created_at?: string | null
          description?: string | null
          fat?: number
          id?: string
          ingredients?: Json
          input_ingredients?: string | null
          instructions?: Json
          is_favorite?: boolean
          name: string
          prep_time?: number
          protein?: number
          servings?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          complexity?: Database["public"]["Enums"]["recipe_complexity"]
          created_at?: string | null
          description?: string | null
          fat?: number
          id?: string
          ingredients?: Json
          input_ingredients?: string | null
          instructions?: Json
          is_favorite?: boolean
          name?: string
          prep_time?: number
          protein?: number
          servings?: number
          user_id?: string
        }
        Relationships: []
      }
      user_occurrences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          goal_weight: number | null
          id: string
          notes: string | null
          recorded_at: string
          user_id: string
          weight: number
        }
        Insert: {
          goal_weight?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          user_id: string
          weight: number
        }
        Update: {
          goal_weight?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          body_part: string
          created_at: string
          equipment: string | null
          exercise_id: string
          exercise_name: string
          gif_url: string | null
          id: string
          notes: string | null
          order_index: number
          reps: number
          rest_seconds: number
          sets: number
          target_muscle: string
          workout_plan_id: string
        }
        Insert: {
          body_part: string
          created_at?: string
          equipment?: string | null
          exercise_id: string
          exercise_name: string
          gif_url?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number
          sets?: number
          target_muscle: string
          workout_plan_id: string
        }
        Update: {
          body_part?: string
          created_at?: string
          equipment?: string | null
          exercise_id?: string
          exercise_name?: string
          gif_url?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number
          sets?: number
          target_muscle?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean
          name: string
          target_muscle_group: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_muscle_group?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_muscle_group?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      calorie_goal: "reduzir" | "manter" | "aumentar" | "definir_depois"
      dietary_preference: "comum" | "vegetariana" | "vegana" | "low_carb"
      recipe_complexity: "rapida" | "equilibrada" | "elaborada"
      user_context: "individual" | "familia" | "modo_kids"
      user_goal: "emagrecer" | "manter" | "ganhar_peso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      calorie_goal: ["reduzir", "manter", "aumentar", "definir_depois"],
      dietary_preference: ["comum", "vegetariana", "vegana", "low_carb"],
      recipe_complexity: ["rapida", "equilibrada", "elaborada"],
      user_context: ["individual", "familia", "modo_kids"],
      user_goal: ["emagrecer", "manter", "ganhar_peso"],
    },
  },
} as const
