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
      profiles: {
        Row: {
          calorie_goal: Database["public"]["Enums"]["calorie_goal"] | null
          context: Database["public"]["Enums"]["user_context"] | null
          created_at: string | null
          dietary_preference:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email: string | null
          goal: Database["public"]["Enums"]["user_goal"] | null
          id: string
          intolerances: string[] | null
          onboarding_completed: boolean | null
          recipe_complexity:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          updated_at: string | null
        }
        Insert: {
          calorie_goal?: Database["public"]["Enums"]["calorie_goal"] | null
          context?: Database["public"]["Enums"]["user_context"] | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          id: string
          intolerances?: string[] | null
          onboarding_completed?: boolean | null
          recipe_complexity?:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          updated_at?: string | null
        }
        Update: {
          calorie_goal?: Database["public"]["Enums"]["calorie_goal"] | null
          context?: Database["public"]["Enums"]["user_context"] | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          id?: string
          intolerances?: string[] | null
          onboarding_completed?: boolean | null
          recipe_complexity?:
            | Database["public"]["Enums"]["recipe_complexity"]
            | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      calorie_goal: ["reduzir", "manter", "aumentar", "definir_depois"],
      dietary_preference: ["comum", "vegetariana", "vegana", "low_carb"],
      recipe_complexity: ["rapida", "equilibrada", "elaborada"],
      user_context: ["individual", "familia", "modo_kids"],
      user_goal: ["emagrecer", "manter", "ganhar_peso"],
    },
  },
} as const
