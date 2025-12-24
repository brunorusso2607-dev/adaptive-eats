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
      activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          log_source: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string
          user_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          log_source: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by: string
          user_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          log_source?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis_feedback: {
        Row: {
          analysis_data: Json | null
          analysis_type: string
          created_at: string
          description: string | null
          feedback_type: string
          id: string
          image_reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          analysis_type: string
          created_at?: string
          description?: string | null
          feedback_type: string
          id?: string
          image_reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          analysis_type?: string
          created_at?: string
          description?: string | null
          feedback_type?: string
          id?: string
          image_reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_error_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          function_name: string
          id: string
          request_payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          function_name: string
          id?: string
          request_payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          function_name?: string
          id?: string
          request_payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string
          function_id: string
          id: string
          is_active: boolean
          model: string
          name: string
          system_prompt: string
          updated_at: string
          user_prompt_example: string | null
        }
        Insert: {
          created_at?: string
          description: string
          function_id: string
          id?: string
          is_active?: boolean
          model?: string
          name: string
          system_prompt: string
          updated_at?: string
          user_prompt_example?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          function_id?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          system_prompt?: string
          updated_at?: string
          user_prompt_example?: string | null
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          api_key_encrypted: string | null
          api_key_masked: string | null
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string
          background_color: string
          created_at: string
          custom_css: string | null
          foreground_color: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          topbar_text: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          created_at?: string
          custom_css?: string | null
          foreground_color?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          topbar_text?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          created_at?: string
          custom_css?: string | null
          foreground_color?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          topbar_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          page_context: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          page_context?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          page_context?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_items: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          food_id: string | null
          food_name: string
          id: string
          meal_consumption_id: string
          protein: number
          quantity_grams: number
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          food_id?: string | null
          food_name: string
          id?: string
          meal_consumption_id: string
          protein?: number
          quantity_grams: number
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          food_id?: string | null
          food_name?: string
          id?: string
          meal_consumption_id?: string
          protein?: number
          quantity_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "consumption_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_items_meal_consumption_id_fkey"
            columns: ["meal_consumption_id"]
            isOneToOne: false
            referencedRelation: "meal_consumption"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number
          category: string | null
          created_at: string
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          name: string
          name_normalized: string
          protein_per_100g: number
          sodium_per_100g: number | null
        }
        Insert: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          name: string
          name_normalized: string
          protein_per_100g?: number
          sodium_per_100g?: number | null
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          name?: string
          name_normalized?: string
          protein_per_100g?: number
          sodium_per_100g?: number | null
        }
        Relationships: []
      }
      meal_consumption: {
        Row: {
          consumed_at: string
          created_at: string
          followed_plan: boolean
          id: string
          meal_plan_item_id: string | null
          notes: string | null
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          user_id: string
        }
        Insert: {
          consumed_at?: string
          created_at?: string
          followed_plan?: boolean
          id?: string
          meal_plan_item_id?: string | null
          notes?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id: string
        }
        Update: {
          consumed_at?: string
          created_at?: string
          followed_plan?: boolean
          id?: string
          meal_plan_item_id?: string | null
          notes?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_consumption_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      meal_status_colors: {
        Row: {
          background_color: string
          border_color: string | null
          created_at: string
          id: string
          label: string
          sort_order: number
          status_key: string
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          border_color?: string | null
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status_key: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          border_color?: string | null
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status_key?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_time_settings: {
        Row: {
          created_at: string
          end_hour: number
          id: string
          label: string
          meal_type: string
          sort_order: number
          start_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_hour: number
          id?: string
          label: string
          meal_type: string
          sort_order?: number
          start_hour: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_hour?: number
          id?: string
          label?: string
          meal_type?: string
          sort_order?: number
          start_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_options: {
        Row: {
          category: string
          created_at: string
          description: string | null
          emoji: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          label: string
          option_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          label: string
          option_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          label?: string
          option_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string | null
          dietary_preference:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email: string | null
          excluded_ingredients: string[] | null
          first_name: string | null
          goal: Database["public"]["Enums"]["user_goal"] | null
          height: number | null
          id: string
          intolerances: string[] | null
          kids_mode: boolean | null
          last_name: string | null
          onboarding_completed: boolean | null
          sex: string | null
          updated_at: string | null
          weight_current: number | null
          weight_goal: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          excluded_ingredients?: string[] | null
          first_name?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          height?: number | null
          id: string
          intolerances?: string[] | null
          kids_mode?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          sex?: string | null
          updated_at?: string | null
          weight_current?: number | null
          weight_goal?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          excluded_ingredients?: string[] | null
          first_name?: string | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          height?: number | null
          id?: string
          intolerances?: string[] | null
          kids_mode?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
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
      tracking_pixels: {
        Row: {
          api_token: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          pixel_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pixel_id: string
          platform: string
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pixel_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          id: string
          longest_streak: number
          total_meals_completed: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          longest_streak?: number
          total_meals_completed?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          longest_streak?: number
          total_meals_completed?: number
          total_xp?: number
          updated_at?: string
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
      dietary_preference:
        | "comum"
        | "vegetariana"
        | "vegana"
        | "low_carb"
        | "pescetariana"
        | "cetogenica"
        | "flexitariana"
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
      dietary_preference: [
        "comum",
        "vegetariana",
        "vegana",
        "low_carb",
        "pescetariana",
        "cetogenica",
        "flexitariana",
      ],
      recipe_complexity: ["rapida", "equilibrada", "elaborada"],
      user_context: ["individual", "familia", "modo_kids"],
      user_goal: ["emagrecer", "manter", "ganhar_peso"],
    },
  },
} as const
