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
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number | null
          execution_time_ms: number | null
          function_name: string
          id: string
          items_generated: number | null
          metadata: Json | null
          model_used: string
          prompt_tokens: number
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          items_generated?: number | null
          metadata?: Json | null
          model_used: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          items_generated?: number | null
          metadata?: Json | null
          model_used?: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
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
      auto_skip_notifications: {
        Row: {
          created_at: string
          id: string
          meal_plan_item_id: string
          notified_at: string | null
          skipped_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_item_id: string
          notified_at?: string | null
          skipped_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_item_id?: string
          notified_at?: string | null
          skipped_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_skip_notifications_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: true
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ingredients_review: {
        Row: {
          ai_analysis: string | null
          ai_decision: string | null
          blocked_reason: string
          created_at: string
          id: string
          ingredient: string
          intolerance_or_diet: string
          recipe_context: string | null
          reviewed_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_decision?: string | null
          blocked_reason: string
          created_at?: string
          id?: string
          ingredient: string
          intolerance_or_diet: string
          recipe_context?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_decision?: string | null
          blocked_reason?: string
          created_at?: string
          id?: string
          ingredient?: string
          intolerance_or_diet?: string
          recipe_context?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      canonical_ingredients: {
        Row: {
          calories_per_100g: number | null
          carbs_per_100g: number | null
          category: string
          country_specific: string[] | null
          created_at: string | null
          default_portion_grams: number | null
          dietary_flags: string[] | null
          fat_per_100g: number | null
          fiber_per_100g: number | null
          id: string
          intolerance_flags: string[] | null
          is_active: boolean | null
          name_en: string
          name_es: string | null
          name_pt: string
          portion_label_en: string | null
          portion_label_pt: string | null
          protein_per_100g: number | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category: string
          country_specific?: string[] | null
          created_at?: string | null
          default_portion_grams?: number | null
          dietary_flags?: string[] | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id: string
          intolerance_flags?: string[] | null
          is_active?: boolean | null
          name_en: string
          name_es?: string | null
          name_pt: string
          portion_label_en?: string | null
          portion_label_pt?: string | null
          protein_per_100g?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category?: string
          country_specific?: string[] | null
          created_at?: string | null
          default_portion_grams?: number | null
          dietary_flags?: string[] | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id?: string
          intolerance_flags?: string[] | null
          is_active?: boolean | null
          name_en?: string
          name_es?: string | null
          name_pt?: string
          portion_label_en?: string | null
          portion_label_pt?: string | null
          protein_per_100g?: number | null
          subcategory?: string | null
          updated_at?: string | null
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
      critical_changes_audit: {
        Row: {
          authorization_note: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          was_authorized: boolean | null
        }
        Insert: {
          authorization_note?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          was_authorized?: boolean | null
        }
        Update: {
          authorization_note?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          was_authorized?: boolean | null
        }
        Relationships: []
      }
      dietary_forbidden_ingredients: {
        Row: {
          category: string | null
          created_at: string
          dietary_key: string
          id: string
          ingredient: string
          language: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dietary_key: string
          id?: string
          ingredient: string
          language?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dietary_key?: string
          id?: string
          ingredient?: string
          language?: string
        }
        Relationships: []
      }
      dietary_profiles: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      dynamic_safe_ingredients: {
        Row: {
          approved_by: string | null
          confidence: string | null
          created_at: string
          id: string
          ingredient: string
          is_active: boolean
          reason: string
          review_id: string | null
          safe_for: string
          source: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          ingredient: string
          is_active?: boolean
          reason: string
          review_id?: string | null
          safe_for: string
          source?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          ingredient?: string
          is_active?: boolean
          reason?: string
          review_id?: string | null
          safe_for?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_safe_ingredients_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "blocked_ingredients_review"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          feature_key: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      food_corrections: {
        Row: {
          alternative_selected: string | null
          corrected_calorias: number | null
          corrected_carboidratos: number | null
          corrected_gorduras: number | null
          corrected_item: string
          corrected_porcao: string | null
          corrected_proteinas: number | null
          correction_type: string
          created_at: string
          cuisine_origin: string | null
          dish_context: string | null
          id: string
          image_hash: string | null
          original_calorias: number | null
          original_carboidratos: number | null
          original_confianca: string | null
          original_culinaria: string | null
          original_gorduras: number | null
          original_item: string
          original_porcao: string | null
          original_proteinas: number | null
          user_id: string
        }
        Insert: {
          alternative_selected?: string | null
          corrected_calorias?: number | null
          corrected_carboidratos?: number | null
          corrected_gorduras?: number | null
          corrected_item: string
          corrected_porcao?: string | null
          corrected_proteinas?: number | null
          correction_type?: string
          created_at?: string
          cuisine_origin?: string | null
          dish_context?: string | null
          id?: string
          image_hash?: string | null
          original_calorias?: number | null
          original_carboidratos?: number | null
          original_confianca?: string | null
          original_culinaria?: string | null
          original_gorduras?: number | null
          original_item: string
          original_porcao?: string | null
          original_proteinas?: number | null
          user_id: string
        }
        Update: {
          alternative_selected?: string | null
          corrected_calorias?: number | null
          corrected_carboidratos?: number | null
          corrected_gorduras?: number | null
          corrected_item?: string
          corrected_porcao?: string | null
          corrected_proteinas?: number | null
          correction_type?: string
          created_at?: string
          cuisine_origin?: string | null
          dish_context?: string | null
          id?: string
          image_hash?: string | null
          original_calorias?: number | null
          original_carboidratos?: number | null
          original_confianca?: string | null
          original_culinaria?: string | null
          original_gorduras?: number | null
          original_item?: string
          original_porcao?: string | null
          original_proteinas?: number | null
          user_id?: string
        }
        Relationships: []
      }
      food_decomposition_mappings: {
        Row: {
          base_ingredients: string[]
          created_at: string
          food_name: string
          id: string
          is_active: boolean
          language: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          base_ingredients?: string[]
          created_at?: string
          food_name: string
          id?: string
          is_active?: boolean
          language?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          base_ingredients?: string[]
          created_at?: string
          food_name?: string
          id?: string
          is_active?: boolean
          language?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          aliases: string[] | null
          calories_per_100g: number
          carbs_per_100g: number
          category: string | null
          confidence: number | null
          created_at: string
          cuisine_origin: string | null
          default_serving_size: number | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          is_recipe: boolean
          is_verified: boolean | null
          name: string
          name_normalized: string
          protein_per_100g: number
          search_count: number | null
          serving_unit: string | null
          sodium_per_100g: number | null
          source: string | null
          verified: boolean | null
        }
        Insert: {
          aliases?: string[] | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          confidence?: number | null
          created_at?: string
          cuisine_origin?: string | null
          default_serving_size?: number | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          is_recipe?: boolean
          is_verified?: boolean | null
          name: string
          name_normalized: string
          protein_per_100g?: number
          search_count?: number | null
          serving_unit?: string | null
          sodium_per_100g?: number | null
          source?: string | null
          verified?: boolean | null
        }
        Update: {
          aliases?: string[] | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          confidence?: number | null
          created_at?: string
          cuisine_origin?: string | null
          default_serving_size?: number | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          is_recipe?: boolean
          is_verified?: boolean | null
          name?: string
          name_normalized?: string
          protein_per_100g?: number
          search_count?: number | null
          serving_unit?: string | null
          sodium_per_100g?: number | null
          source?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      frontend_error_logs: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ingredient_aliases: {
        Row: {
          alias: string
          created_at: string
          food_id: string | null
          id: string
          language: string | null
          region: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          food_id?: string | null
          id?: string
          language?: string | null
          region?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          food_id?: string | null
          id?: string
          language?: string | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_aliases_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_validation_history: {
        Row: {
          confidence: string | null
          created_at: string
          feedback_at: string | null
          id: string
          ingredients: string[]
          is_valid: boolean
          message: string | null
          problematic_pair: string[] | null
          suggestions: string[] | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          feedback_at?: string | null
          id?: string
          ingredients: string[]
          is_valid: boolean
          message?: string | null
          problematic_pair?: string[] | null
          suggestions?: string[] | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          feedback_at?: string | null
          id?: string
          ingredients?: string[]
          is_valid?: boolean
          message?: string | null
          problematic_pair?: string[] | null
          suggestions?: string[] | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      intolerance_key_normalization: {
        Row: {
          created_at: string
          database_key: string
          id: string
          label: string
          onboarding_key: string
        }
        Insert: {
          created_at?: string
          database_key: string
          id?: string
          label: string
          onboarding_key: string
        }
        Update: {
          created_at?: string
          database_key?: string
          id?: string
          label?: string
          onboarding_key?: string
        }
        Relationships: []
      }
      intolerance_mappings: {
        Row: {
          created_at: string
          id: string
          ingredient: string
          intolerance_key: string
          labels: string[] | null
          language: string
          safe_portion_grams: number | null
          severity_level: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient: string
          intolerance_key: string
          labels?: string[] | null
          language?: string
          safe_portion_grams?: number | null
          severity_level?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient?: string
          intolerance_key?: string
          labels?: string[] | null
          language?: string
          safe_portion_grams?: number | null
          severity_level?: string | null
        }
        Relationships: []
      }
      intolerance_safe_keywords: {
        Row: {
          created_at: string
          id: string
          intolerance_key: string
          keyword: string
        }
        Insert: {
          created_at?: string
          id?: string
          intolerance_key: string
          keyword: string
        }
        Update: {
          created_at?: string
          id?: string
          intolerance_key?: string
          keyword?: string
        }
        Relationships: []
      }
      meal_combinations: {
        Row: {
          approval_status: string
          blocked_for_intolerances: string[] | null
          components: Json
          country_codes: string[]
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          flexible_options: Json | null
          generated_by: string | null
          id: string
          instructions: Json | null
          is_active: boolean
          language_code: string
          last_used_at: string | null
          macro_confidence: string | null
          macro_source: string | null
          meal_type: string
          name: string
          prep_time_minutes: number | null
          source: string | null
          total_calories: number
          total_carbs: number
          total_fat: number
          total_fiber: number | null
          total_protein: number
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          approval_status?: string
          blocked_for_intolerances?: string[] | null
          components?: Json
          country_codes?: string[]
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          flexible_options?: Json | null
          generated_by?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          language_code?: string
          last_used_at?: string | null
          macro_confidence?: string | null
          macro_source?: string | null
          meal_type: string
          name: string
          prep_time_minutes?: number | null
          source?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_fiber?: number | null
          total_protein?: number
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          approval_status?: string
          blocked_for_intolerances?: string[] | null
          components?: Json
          country_codes?: string[]
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          flexible_options?: Json | null
          generated_by?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          language_code?: string
          last_used_at?: string | null
          macro_confidence?: string | null
          macro_source?: string | null
          meal_type?: string
          name?: string
          prep_time_minutes?: number | null
          source?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_fiber?: number | null
          total_protein?: number
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      meal_consumption: {
        Row: {
          consumed_at: string
          created_at: string
          custom_meal_name: string | null
          detected_meal_type: string | null
          feedback_status: string
          followed_plan: boolean
          id: string
          meal_plan_item_id: string | null
          meal_time: string | null
          notes: string | null
          source_type: string | null
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          user_id: string
        }
        Insert: {
          consumed_at?: string
          created_at?: string
          custom_meal_name?: string | null
          detected_meal_type?: string | null
          feedback_status?: string
          followed_plan?: boolean
          id?: string
          meal_plan_item_id?: string | null
          meal_time?: string | null
          notes?: string | null
          source_type?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id: string
        }
        Update: {
          consumed_at?: string
          created_at?: string
          custom_meal_name?: string | null
          detected_meal_type?: string | null
          feedback_status?: string
          followed_plan?: boolean
          id?: string
          meal_plan_item_id?: string | null
          meal_time?: string | null
          notes?: string | null
          source_type?: string | null
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
          custom_meal_times: Json | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          source_plan_id: string | null
          start_date: string
          status: string | null
          unlocks_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          custom_meal_times?: Json | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          source_plan_id?: string | null
          start_date: string
          status?: string | null
          unlocks_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          custom_meal_times?: Json | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          source_plan_id?: string | null
          start_date?: string
          status?: string | null
          unlocks_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean
          enabled_meals: string[]
          id: string
          reminder_minutes_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          enabled_meals?: string[]
          id?: string
          reminder_minutes_before?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          enabled_meals?: string[]
          id?: string
          reminder_minutes_before?: number
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
          id: string
          label: string
          meal_type: string
          sort_order: number
          start_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          meal_type: string
          sort_order?: number
          start_hour: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          meal_type?: string
          sort_order?: number
          start_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutritional_strategies: {
        Row: {
          calorie_modifier: number | null
          carb_ratio: number | null
          created_at: string
          description: string | null
          fat_ratio: number | null
          icon: string | null
          id: string
          is_active: boolean
          is_flexible: boolean
          key: string
          label: string
          protein_per_kg: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          calorie_modifier?: number | null
          carb_ratio?: number | null
          created_at?: string
          description?: string | null
          fat_ratio?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_flexible?: boolean
          key: string
          label: string
          protein_per_kg?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          calorie_modifier?: number | null
          carb_ratio?: number | null
          created_at?: string
          description?: string | null
          fat_ratio?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_flexible?: boolean
          key?: string
          label?: string
          protein_per_kg?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      nutritionist_foods: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number
          category: string
          compatible_meals: string[]
          component_type: string | null
          created_at: string
          default_portion_grams: number
          dietary_tags: string[] | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          is_active: boolean
          name: string
          portion_label: string | null
          protein_per_100g: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category: string
          compatible_meals?: string[]
          component_type?: string | null
          created_at?: string
          default_portion_grams?: number
          dietary_tags?: string[] | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          is_active?: boolean
          name: string
          portion_label?: string | null
          protein_per_100g?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string
          compatible_meals?: string[]
          component_type?: string | null
          created_at?: string
          default_portion_grams?: number
          dietary_tags?: string[] | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          is_active?: boolean
          name?: string
          portion_label?: string | null
          protein_per_100g?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_categories: {
        Row: {
          category_key: string
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_key: string
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_key?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          flag_emoji: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          flag_emoji?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          flag_emoji?: string
          id?: string
          is_active?: boolean
          sort_order?: number
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
          country: string | null
          created_at: string | null
          default_meal_times: Json | null
          dietary_preference:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email: string | null
          enabled_meals: string[] | null
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
          strategy_id: string | null
          timezone: string | null
          updated_at: string | null
          weight_current: number | null
          weight_goal: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          country?: string | null
          created_at?: string | null
          default_meal_times?: Json | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          enabled_meals?: string[] | null
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
          strategy_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          weight_current?: number | null
          weight_goal?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          country?: string | null
          created_at?: string | null
          default_meal_times?: Json | null
          dietary_preference?:
            | Database["public"]["Enums"]["dietary_preference"]
            | null
          email?: string | null
          enabled_meals?: string[] | null
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
          strategy_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          weight_current?: number | null
          weight_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "nutritional_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
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
      simple_meal_profiles: {
        Row: {
          compatibility: string
          created_at: string
          dietary_profile_id: string
          id: string
          notes: string | null
          simple_meal_id: string
        }
        Insert: {
          compatibility?: string
          created_at?: string
          dietary_profile_id: string
          id?: string
          notes?: string | null
          simple_meal_id: string
        }
        Update: {
          compatibility?: string
          created_at?: string
          dietary_profile_id?: string
          id?: string
          notes?: string | null
          simple_meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simple_meal_profiles_dietary_profile_id_fkey"
            columns: ["dietary_profile_id"]
            isOneToOne: false
            referencedRelation: "dietary_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simple_meal_profiles_simple_meal_id_fkey"
            columns: ["simple_meal_id"]
            isOneToOne: false
            referencedRelation: "simple_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      simple_meals: {
        Row: {
          ai_generated: boolean | null
          calories: number
          carbs: number
          compatible_meal_times: string[] | null
          component_type: string | null
          country_code: string | null
          created_at: string
          description: string | null
          fat: number
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json | null
          is_active: boolean
          language_code: string | null
          last_used_at: string | null
          meal_type: string
          name: string
          prep_time: number
          protein: number
          rating: number | null
          rating_count: number | null
          sort_order: number
          source_module: string | null
          source_name: string | null
          source_url: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          calories?: number
          carbs?: number
          compatible_meal_times?: string[] | null
          component_type?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          fat?: number
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json | null
          is_active?: boolean
          language_code?: string | null
          last_used_at?: string | null
          meal_type: string
          name: string
          prep_time?: number
          protein?: number
          rating?: number | null
          rating_count?: number | null
          sort_order?: number
          source_module?: string | null
          source_name?: string | null
          source_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          calories?: number
          carbs?: number
          compatible_meal_times?: string[] | null
          component_type?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          fat?: number
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json | null
          is_active?: boolean
          language_code?: string | null
          last_used_at?: string | null
          meal_type?: string
          name?: string
          prep_time?: number
          protein?: number
          rating?: number | null
          rating_count?: number | null
          sort_order?: number
          source_module?: string | null
          source_name?: string | null
          source_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      spoonacular_config: {
        Row: {
          api_key_encrypted: string | null
          api_key_masked: string | null
          auto_run_hour: number
          created_at: string
          current_region_index: number
          daily_limit: number
          id: string
          is_active: boolean
          is_auto_enabled: boolean
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          auto_run_hour?: number
          created_at?: string
          current_region_index?: number
          daily_limit?: number
          id?: string
          is_active?: boolean
          is_auto_enabled?: boolean
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          auto_run_hour?: number
          created_at?: string
          current_region_index?: number
          daily_limit?: number
          id?: string
          is_active?: boolean
          is_auto_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      spoonacular_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          cuisine: string
          error_message: string | null
          id: string
          recipes_failed: number
          recipes_imported: number
          region: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cuisine: string
          error_message?: string | null
          id?: string
          recipes_failed?: number
          recipes_imported?: number
          region: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cuisine?: string
          error_message?: string | null
          id?: string
          recipes_failed?: number
          recipes_imported?: number
          region?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      spoonacular_region_queue: {
        Row: {
          created_at: string
          cuisines: string[]
          id: string
          is_active: boolean
          last_import_at: string | null
          priority: number
          region_code: string
          region_name: string
          total_imported: number
          updated_at: string
          use_ai_fallback: boolean
        }
        Insert: {
          created_at?: string
          cuisines?: string[]
          id?: string
          is_active?: boolean
          last_import_at?: string | null
          priority?: number
          region_code: string
          region_name: string
          total_imported?: number
          updated_at?: string
          use_ai_fallback?: boolean
        }
        Update: {
          created_at?: string
          cuisines?: string[]
          id?: string
          is_active?: boolean
          last_import_at?: string | null
          priority?: number
          region_code?: string
          region_name?: string
          total_imported?: number
          updated_at?: string
          use_ai_fallback?: boolean
        }
        Relationships: []
      }
      supported_languages: {
        Row: {
          code: string
          created_at: string
          expansion_status: string
          id: string
          is_active: boolean
          is_base_language: boolean
          last_expansion_at: string | null
          name: string
          native_name: string
          sort_order: number
          total_terms: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          expansion_status?: string
          id?: string
          is_active?: boolean
          is_base_language?: boolean
          last_expansion_at?: string | null
          name: string
          native_name: string
          sort_order?: number
          total_terms?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          expansion_status?: string
          id?: string
          is_active?: boolean
          is_base_language?: boolean
          last_expansion_at?: string | null
          name?: string
          native_name?: string
          sort_order?: number
          total_terms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      symptom_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          meal_consumption_id: string | null
          notes: string | null
          severity: string
          symptoms: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          meal_consumption_id?: string | null
          notes?: string | null
          severity?: string
          symptoms?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          meal_consumption_id?: string | null
          notes?: string | null
          severity?: string
          symptoms?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_logs_meal_consumption_id_fkey"
            columns: ["meal_consumption_id"]
            isOneToOne: false
            referencedRelation: "meal_consumption"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_types: {
        Row: {
          category: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          check_type: string
          checked_at: string
          created_at: string
          error_details: Json | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          status: string
          target_name: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
          target_name: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
          target_name?: string
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
      usda_import_logs: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          items_failed: number
          items_processed: number
          items_success: number
          started_at: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_success?: number
          started_at?: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_success?: number
          started_at?: string
        }
        Relationships: []
      }
      usda_import_queue: {
        Row: {
          attempts: number
          category: string
          created_at: string
          error_message: string | null
          id: string
          priority: number
          processed_at: string | null
          search_term: string
          status: string
          updated_at: string
          usda_fdc_id: string | null
        }
        Insert: {
          attempts?: number
          category?: string
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: number
          processed_at?: string | null
          search_term: string
          status?: string
          updated_at?: string
          usda_fdc_id?: string | null
        }
        Update: {
          attempts?: number
          category?: string
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: number
          processed_at?: string | null
          search_term?: string
          status?: string
          updated_at?: string
          usda_fdc_id?: string | null
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
      water_consumption: {
        Row: {
          amount_ml: number
          consumed_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          consumed_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          consumed_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      water_settings: {
        Row: {
          created_at: string
          daily_goal_ml: number
          id: string
          reminder_enabled: boolean
          reminder_end_hour: number
          reminder_interval_minutes: number
          reminder_start_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal_ml?: number
          id?: string
          reminder_enabled?: boolean
          reminder_end_hour?: number
          reminder_interval_minutes?: number
          reminder_start_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal_ml?: number
          id?: string
          reminder_enabled?: boolean
          reminder_end_hour?: number
          reminder_interval_minutes?: number
          reminder_start_hour?: number
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
      normalize_ingredient_name: {
        Args: { input_text: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      calorie_goal: "reduzir" | "manter" | "aumentar" | "definir_depois"
      dietary_preference:
        | "omnivore"
        | "vegetarian"
        | "vegan"
        | "low_carb"
        | "pescatarian"
        | "ketogenic"
        | "flexitarian"
      recipe_complexity: "rapida" | "equilibrada" | "elaborada"
      user_context: "individual" | "familia" | "modo_kids"
      user_goal: "lose_weight" | "maintain" | "gain_weight"
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
        "omnivore",
        "vegetarian",
        "vegan",
        "low_carb",
        "pescatarian",
        "ketogenic",
        "flexitarian",
      ],
      recipe_complexity: ["rapida", "equilibrada", "elaborada"],
      user_context: ["individual", "familia", "modo_kids"],
      user_goal: ["lose_weight", "maintain", "gain_weight"],
    },
  },
} as const
