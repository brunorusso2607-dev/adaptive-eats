CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: calorie_goal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calorie_goal AS ENUM (
    'reduzir',
    'manter',
    'aumentar',
    'definir_depois'
);


--
-- Name: dietary_preference; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dietary_preference AS ENUM (
    'omnivore',
    'vegetarian',
    'vegan',
    'low_carb',
    'pescatarian',
    'ketogenic',
    'flexitarian'
);


--
-- Name: recipe_complexity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recipe_complexity AS ENUM (
    'rapida',
    'equilibrada',
    'elaborada'
);


--
-- Name: user_context; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_context AS ENUM (
    'individual',
    'familia',
    'modo_kids'
);


--
-- Name: user_goal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_goal AS ENUM (
    'lose_weight',
    'maintain',
    'gain_weight'
);


--
-- Name: audit_dietary_forbidden_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_dietary_forbidden_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_dietary_profiles_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_dietary_profiles_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('dietary_profiles', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('dietary_profiles', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('dietary_profiles', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_intolerance_mappings_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_intolerance_mappings_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('intolerance_mappings', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('intolerance_mappings', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('intolerance_mappings', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_meal_time_settings_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_meal_time_settings_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('meal_time_settings', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('meal_time_settings', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('meal_time_settings', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_nutritional_strategies_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_nutritional_strategies_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('nutritional_strategies', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('nutritional_strategies', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('nutritional_strategies', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_onboarding_options_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_onboarding_options_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('onboarding_options', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('onboarding_options', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('onboarding_options', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: audit_safe_keywords_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_safe_keywords_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: auto_assign_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Se o email for brunorusso212@gmail.com, atribui role admin
  IF NEW.email = 'brunorusso212@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: normalize_ingredient_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_ingredient_name(input_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT LOWER(
    TRANSLATE(
      input_text,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
    )
  );
$$;


--
-- Name: update_profile_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_profile_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_dietary_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_dietary_key() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  valid_key BOOLEAN := FALSE;
BEGIN
  -- Verifica se a chave existe na tabela dietary_profiles
  SELECT EXISTS(
    SELECT 1 FROM dietary_profiles 
    WHERE key = NEW.dietary_key
  ) INTO valid_key;
  
  -- Se não é válida, rejeita a inserção/atualização
  IF NOT valid_key THEN
    RAISE EXCEPTION 'Dietary key "%" is not authorized. Valid keys must exist in dietary_profiles table.', NEW.dietary_key;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: validate_intolerance_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_intolerance_key() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  valid_key BOOLEAN := FALSE;
BEGIN
  -- Verifica se a chave existe no onboarding_options (fonte primária)
  SELECT EXISTS(
    SELECT 1 FROM onboarding_options 
    WHERE option_id = NEW.intolerance_key 
    AND category IN ('intolerances', 'allergies', 'sensitivities')
  ) INTO valid_key;
  
  -- Se não encontrou, verifica na tabela de normalização (database_key)
  IF NOT valid_key THEN
    SELECT EXISTS(
      SELECT 1 FROM intolerance_key_normalization 
      WHERE database_key = NEW.intolerance_key
    ) INTO valid_key;
  END IF;
  
  -- Se ainda não é válida, rejeita a inserção
  IF NOT valid_key THEN
    RAISE EXCEPTION 'Intolerance key "%" is not authorized. Valid keys must exist in onboarding_options or intolerance_key_normalization.', NEW.intolerance_key;
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    performed_by uuid NOT NULL,
    action_type text NOT NULL,
    action_description text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    log_source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT activity_logs_log_source_check CHECK ((log_source = ANY (ARRAY['admin'::text, 'user'::text])))
);


--
-- Name: ai_analysis_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_analysis_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_type text NOT NULL,
    feedback_type text NOT NULL,
    description text,
    analysis_data jsonb,
    image_reference text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    function_name text NOT NULL,
    error_message text NOT NULL,
    error_details jsonb,
    request_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    model text DEFAULT 'gemini-2.5-flash-lite'::text NOT NULL,
    system_prompt text NOT NULL,
    user_prompt_example text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    function_name text NOT NULL,
    model_used text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(10,6) DEFAULT 0,
    items_generated integer DEFAULT 1,
    metadata jsonb DEFAULT '{}'::jsonb,
    execution_time_ms integer DEFAULT 0,
    user_id uuid
);


--
-- Name: api_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    api_key_masked text,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    api_key_encrypted text
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    primary_color text DEFAULT '#22c55e'::text NOT NULL,
    secondary_color text DEFAULT '#16a34a'::text NOT NULL,
    accent_color text DEFAULT '#4ade80'::text NOT NULL,
    background_color text DEFAULT '#ffffff'::text NOT NULL,
    foreground_color text DEFAULT '#0a0a0a'::text NOT NULL,
    logo_url text,
    topbar_text text,
    custom_css text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auto_skip_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_skip_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    meal_plan_item_id uuid NOT NULL,
    skipped_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blocked_ingredients_review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_ingredients_review (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ingredient text NOT NULL,
    blocked_reason text NOT NULL,
    intolerance_or_diet text NOT NULL,
    recipe_context text,
    user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    ai_analysis text,
    ai_decision text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    page_context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: consumption_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumption_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_consumption_id uuid NOT NULL,
    food_id uuid,
    food_name text NOT NULL,
    quantity_grams numeric NOT NULL,
    calories numeric DEFAULT 0 NOT NULL,
    protein numeric DEFAULT 0 NOT NULL,
    carbs numeric DEFAULT 0 NOT NULL,
    fat numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: critical_changes_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.critical_changes_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    operation text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    was_authorized boolean DEFAULT false,
    authorization_note text
);


--
-- Name: dietary_forbidden_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dietary_forbidden_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dietary_key text NOT NULL,
    ingredient text NOT NULL,
    language text DEFAULT 'pt'::text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dietary_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dietary_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT '🍽️'::text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dynamic_safe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_safe_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ingredient text NOT NULL,
    safe_for text NOT NULL,
    reason text NOT NULL,
    source text DEFAULT 'ai_review'::text NOT NULL,
    confidence text DEFAULT 'high'::text,
    review_id uuid,
    approved_by text DEFAULT 'ai'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: food_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.food_corrections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    original_item text NOT NULL,
    original_porcao text,
    original_calorias integer,
    original_proteinas numeric,
    original_carboidratos numeric,
    original_gorduras numeric,
    original_confianca text,
    original_culinaria text,
    corrected_item text NOT NULL,
    corrected_porcao text,
    corrected_calorias integer,
    corrected_proteinas numeric,
    corrected_carboidratos numeric,
    corrected_gorduras numeric,
    correction_type text DEFAULT 'manual'::text NOT NULL,
    alternative_selected text,
    image_hash text,
    dish_context text,
    cuisine_origin text
);


--
-- Name: food_decomposition_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.food_decomposition_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    food_name text NOT NULL,
    base_ingredients text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    language text DEFAULT 'pt'::text NOT NULL
);


--
-- Name: foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_normalized text NOT NULL,
    calories_per_100g numeric DEFAULT 0 NOT NULL,
    protein_per_100g numeric DEFAULT 0 NOT NULL,
    carbs_per_100g numeric DEFAULT 0 NOT NULL,
    fat_per_100g numeric DEFAULT 0 NOT NULL,
    fiber_per_100g numeric DEFAULT 0,
    sodium_per_100g numeric DEFAULT 0,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    aliases text[] DEFAULT '{}'::text[],
    cuisine_origin text,
    source text DEFAULT 'manual'::text,
    confidence numeric DEFAULT 1.0,
    verified boolean DEFAULT false,
    search_count integer DEFAULT 0,
    is_recipe boolean DEFAULT false NOT NULL,
    serving_unit text DEFAULT 'g'::text,
    default_serving_size numeric DEFAULT 100,
    is_verified boolean DEFAULT false
);


--
-- Name: frontend_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frontend_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    error_type text NOT NULL,
    error_message text NOT NULL,
    error_stack text,
    component_name text,
    page_url text,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ingredient_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    food_id uuid,
    alias text NOT NULL,
    language text DEFAULT 'pt-BR'::text,
    region text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ingredient_validation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_validation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ingredients text[] NOT NULL,
    is_valid boolean NOT NULL,
    confidence text,
    message text,
    problematic_pair text[],
    suggestions text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_feedback text,
    feedback_at timestamp with time zone,
    CONSTRAINT ingredient_validation_history_user_feedback_check CHECK ((user_feedback = ANY (ARRAY['helpful'::text, 'not_helpful'::text])))
);


--
-- Name: intolerance_key_normalization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intolerance_key_normalization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    onboarding_key text NOT NULL,
    database_key text NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intolerance_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intolerance_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    intolerance_key text NOT NULL,
    ingredient text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    severity_level text DEFAULT 'unknown'::text,
    labels text[] DEFAULT '{}'::text[],
    safe_portion_grams integer,
    language text DEFAULT 'pt'::text NOT NULL
);


--
-- Name: intolerance_safe_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intolerance_safe_keywords (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    intolerance_key text NOT NULL,
    keyword text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meal_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_consumption (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    meal_plan_item_id uuid,
    consumed_at timestamp with time zone DEFAULT now() NOT NULL,
    followed_plan boolean DEFAULT true NOT NULL,
    total_calories numeric DEFAULT 0 NOT NULL,
    total_protein numeric DEFAULT 0 NOT NULL,
    total_carbs numeric DEFAULT 0 NOT NULL,
    total_fat numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    feedback_status text DEFAULT 'pending'::text NOT NULL,
    source_type text DEFAULT 'plan'::text,
    custom_meal_name text,
    meal_time time without time zone,
    detected_meal_type text,
    CONSTRAINT meal_consumption_feedback_status_check CHECK ((feedback_status = ANY (ARRAY['pending'::text, 'well'::text, 'symptoms'::text, 'auto_well'::text])))
);


--
-- Name: meal_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_plan_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    meal_type text NOT NULL,
    recipe_name text NOT NULL,
    recipe_calories integer DEFAULT 0 NOT NULL,
    recipe_protein numeric DEFAULT 0 NOT NULL,
    recipe_carbs numeric DEFAULT 0 NOT NULL,
    recipe_fat numeric DEFAULT 0 NOT NULL,
    recipe_prep_time integer DEFAULT 30 NOT NULL,
    recipe_ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    recipe_instructions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    week_number integer DEFAULT 1 NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: meal_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text,
    completion_percentage integer DEFAULT 0,
    custom_meal_times jsonb,
    unlocks_at timestamp with time zone,
    source_plan_id uuid,
    CONSTRAINT meal_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text])))
);


--
-- Name: meal_reminder_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_reminder_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    reminder_minutes_before integer DEFAULT 0 NOT NULL,
    enabled_meals text[] DEFAULT '{cafe_manha,almoco,lanche_tarde,jantar,ceia}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meal_status_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_status_colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status_key text NOT NULL,
    label text NOT NULL,
    background_color text DEFAULT 'rgba(34, 197, 94, 0.1)'::text NOT NULL,
    text_color text DEFAULT 'rgba(34, 197, 94, 1)'::text NOT NULL,
    border_color text DEFAULT 'rgba(34, 197, 94, 0.3)'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meal_time_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_time_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_type text NOT NULL,
    label text NOT NULL,
    start_hour numeric NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nutritional_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutritional_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    calorie_modifier integer,
    protein_per_kg numeric,
    carb_ratio numeric,
    fat_ratio numeric,
    is_flexible boolean DEFAULT false NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nutritionist_foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutritionist_foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    calories_per_100g numeric DEFAULT 0 NOT NULL,
    protein_per_100g numeric DEFAULT 0 NOT NULL,
    carbs_per_100g numeric DEFAULT 0 NOT NULL,
    fat_per_100g numeric DEFAULT 0 NOT NULL,
    fiber_per_100g numeric DEFAULT 0,
    default_portion_grams numeric DEFAULT 100 NOT NULL,
    compatible_meals text[] DEFAULT '{}'::text[] NOT NULL,
    dietary_tags text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    portion_label text,
    component_type text
);


--
-- Name: onboarding_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_key text NOT NULL,
    label text NOT NULL,
    icon_name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    country_name text NOT NULL,
    flag_emoji text DEFAULT '🏳️'::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    option_id text NOT NULL,
    label text NOT NULL,
    description text,
    emoji text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    icon_name text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    intolerances text[] DEFAULT '{}'::text[],
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    weight_current numeric(5,2),
    weight_goal numeric(5,2),
    height integer,
    age integer,
    sex text,
    activity_level text DEFAULT 'moderate'::text,
    first_name text,
    last_name text,
    kids_mode boolean DEFAULT false,
    excluded_ingredients text[] DEFAULT '{}'::text[],
    country text DEFAULT 'BR'::text,
    timezone text DEFAULT 'America/Sao_Paulo'::text,
    default_meal_times jsonb,
    enabled_meals text[],
    strategy_id uuid,
    goal public.user_goal DEFAULT 'maintain'::public.user_goal,
    dietary_preference public.dietary_preference DEFAULT 'omnivore'::public.dietary_preference,
    CONSTRAINT profiles_activity_level_check CHECK ((activity_level = ANY (ARRAY['sedentary'::text, 'light'::text, 'moderate'::text, 'active'::text, 'very_active'::text]))),
    CONSTRAINT profiles_sex_check CHECK ((sex = ANY (ARRAY['male'::text, 'female'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    instructions jsonb DEFAULT '[]'::jsonb NOT NULL,
    prep_time integer DEFAULT 30 NOT NULL,
    complexity public.recipe_complexity DEFAULT 'equilibrada'::public.recipe_complexity NOT NULL,
    calories integer DEFAULT 0 NOT NULL,
    protein numeric(6,2) DEFAULT 0 NOT NULL,
    carbs numeric(6,2) DEFAULT 0 NOT NULL,
    fat numeric(6,2) DEFAULT 0 NOT NULL,
    servings integer DEFAULT 2 NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    input_ingredients text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: simple_meal_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simple_meal_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simple_meal_id uuid NOT NULL,
    dietary_profile_id uuid NOT NULL,
    compatibility text DEFAULT 'good'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: simple_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simple_meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    meal_type text NOT NULL,
    description text,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    calories integer DEFAULT 0 NOT NULL,
    protein numeric DEFAULT 0 NOT NULL,
    carbs numeric DEFAULT 0 NOT NULL,
    fat numeric DEFAULT 0 NOT NULL,
    prep_time integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating numeric(2,1) DEFAULT NULL::numeric,
    rating_count integer DEFAULT 0,
    source_url text,
    source_name text,
    country_code text DEFAULT 'BR'::text,
    language_code text DEFAULT 'pt-BR'::text,
    image_url text,
    ai_generated boolean DEFAULT false,
    component_type text DEFAULT 'main'::text,
    compatible_meal_times text[] DEFAULT '{}'::text[],
    source_module text DEFAULT 'admin'::text,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    instructions jsonb DEFAULT '[]'::jsonb
);


--
-- Name: spoonacular_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spoonacular_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_key_masked text,
    api_key_encrypted text,
    daily_limit integer DEFAULT 15 NOT NULL,
    is_auto_enabled boolean DEFAULT false NOT NULL,
    auto_run_hour integer DEFAULT 3 NOT NULL,
    current_region_index integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: spoonacular_import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spoonacular_import_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region text NOT NULL,
    cuisine text NOT NULL,
    recipes_imported integer DEFAULT 0 NOT NULL,
    recipes_failed integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: spoonacular_region_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spoonacular_region_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_name text NOT NULL,
    region_code text NOT NULL,
    cuisines text[] DEFAULT '{}'::text[] NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    total_imported integer DEFAULT 0 NOT NULL,
    last_import_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    use_ai_fallback boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supported_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supported_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    native_name text NOT NULL,
    is_base_language boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expansion_status text DEFAULT 'pending'::text NOT NULL,
    last_expansion_at timestamp with time zone,
    total_terms integer DEFAULT 0,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: symptom_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.symptom_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    meal_consumption_id uuid,
    symptoms text[] DEFAULT '{}'::text[] NOT NULL,
    severity text DEFAULT 'leve'::text NOT NULL,
    notes text,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT symptom_logs_severity_check CHECK ((severity = ANY (ARRAY['leve'::text, 'moderado'::text, 'severo'::text])))
);


--
-- Name: symptom_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.symptom_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text DEFAULT '😣'::text NOT NULL,
    category text DEFAULT 'digestivo'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_health_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_type text NOT NULL,
    target_name text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    response_time_ms integer,
    error_message text,
    error_details jsonb,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tracking_pixels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracking_pixels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    pixel_id text NOT NULL,
    api_token text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: usda_import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usda_import_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    items_processed integer DEFAULT 0 NOT NULL,
    items_success integer DEFAULT 0 NOT NULL,
    items_failed integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usda_import_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usda_import_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    search_term text NOT NULL,
    category text DEFAULT 'foundation'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    usda_fdc_id text,
    error_message text,
    attempts integer DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usda_import_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_key text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_gamification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_gamification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_xp integer DEFAULT 0 NOT NULL,
    current_level integer DEFAULT 1 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    total_meals_completed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_name text DEFAULT 'free'::text NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: water_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_consumption (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount_ml integer DEFAULT 250 NOT NULL,
    consumed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: water_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_goal_ml integer DEFAULT 2000 NOT NULL,
    reminder_enabled boolean DEFAULT true NOT NULL,
    reminder_interval_minutes integer DEFAULT 60 NOT NULL,
    reminder_start_hour integer DEFAULT 8 NOT NULL,
    reminder_end_hour integer DEFAULT 22 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weight_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    weight numeric NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    goal_weight numeric,
    notes text
);


--
-- Name: workout_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_plan_id uuid NOT NULL,
    exercise_id text NOT NULL,
    exercise_name text NOT NULL,
    body_part text NOT NULL,
    target_muscle text NOT NULL,
    equipment text,
    gif_url text,
    sets integer DEFAULT 3 NOT NULL,
    reps integer DEFAULT 12 NOT NULL,
    rest_seconds integer DEFAULT 60 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workout_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    target_muscle_group text,
    difficulty text DEFAULT 'intermediate'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_analysis_feedback ai_analysis_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analysis_feedback
    ADD CONSTRAINT ai_analysis_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_error_logs ai_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_error_logs
    ADD CONSTRAINT ai_error_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_prompts ai_prompts_function_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_function_id_key UNIQUE (function_id);


--
-- Name: ai_prompts ai_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: api_integrations api_integrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_integrations
    ADD CONSTRAINT api_integrations_name_key UNIQUE (name);


--
-- Name: api_integrations api_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_integrations
    ADD CONSTRAINT api_integrations_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: auto_skip_notifications auto_skip_notifications_meal_plan_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_skip_notifications
    ADD CONSTRAINT auto_skip_notifications_meal_plan_item_id_key UNIQUE (meal_plan_item_id);


--
-- Name: auto_skip_notifications auto_skip_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_skip_notifications
    ADD CONSTRAINT auto_skip_notifications_pkey PRIMARY KEY (id);


--
-- Name: blocked_ingredients_review blocked_ingredients_review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_ingredients_review
    ADD CONSTRAINT blocked_ingredients_review_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: consumption_items consumption_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_items
    ADD CONSTRAINT consumption_items_pkey PRIMARY KEY (id);


--
-- Name: critical_changes_audit critical_changes_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critical_changes_audit
    ADD CONSTRAINT critical_changes_audit_pkey PRIMARY KEY (id);


--
-- Name: dietary_forbidden_ingredients dietary_forbidden_ingredients_dietary_key_ingredient_langua_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dietary_forbidden_ingredients
    ADD CONSTRAINT dietary_forbidden_ingredients_dietary_key_ingredient_langua_key UNIQUE (dietary_key, ingredient, language);


--
-- Name: dietary_forbidden_ingredients dietary_forbidden_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dietary_forbidden_ingredients
    ADD CONSTRAINT dietary_forbidden_ingredients_pkey PRIMARY KEY (id);


--
-- Name: dietary_profiles dietary_profiles_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dietary_profiles
    ADD CONSTRAINT dietary_profiles_key_key UNIQUE (key);


--
-- Name: dietary_profiles dietary_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dietary_profiles
    ADD CONSTRAINT dietary_profiles_pkey PRIMARY KEY (id);


--
-- Name: dynamic_safe_ingredients dynamic_safe_ingredients_ingredient_safe_for_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_safe_ingredients
    ADD CONSTRAINT dynamic_safe_ingredients_ingredient_safe_for_key UNIQUE (ingredient, safe_for);


--
-- Name: dynamic_safe_ingredients dynamic_safe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_safe_ingredients
    ADD CONSTRAINT dynamic_safe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: food_corrections food_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_corrections
    ADD CONSTRAINT food_corrections_pkey PRIMARY KEY (id);


--
-- Name: food_decomposition_mappings food_decomposition_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_decomposition_mappings
    ADD CONSTRAINT food_decomposition_mappings_pkey PRIMARY KEY (id);


--
-- Name: foods foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_pkey PRIMARY KEY (id);


--
-- Name: frontend_error_logs frontend_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frontend_error_logs
    ADD CONSTRAINT frontend_error_logs_pkey PRIMARY KEY (id);


--
-- Name: ingredient_aliases ingredient_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_aliases
    ADD CONSTRAINT ingredient_aliases_pkey PRIMARY KEY (id);


--
-- Name: ingredient_validation_history ingredient_validation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_validation_history
    ADD CONSTRAINT ingredient_validation_history_pkey PRIMARY KEY (id);


--
-- Name: intolerance_key_normalization intolerance_key_normalization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_key_normalization
    ADD CONSTRAINT intolerance_key_normalization_pkey PRIMARY KEY (id);


--
-- Name: intolerance_key_normalization intolerance_key_normalization_unique_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_key_normalization
    ADD CONSTRAINT intolerance_key_normalization_unique_pair UNIQUE (onboarding_key, database_key);


--
-- Name: intolerance_mappings intolerance_mappings_intolerance_key_ingredient_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_mappings
    ADD CONSTRAINT intolerance_mappings_intolerance_key_ingredient_key UNIQUE (intolerance_key, ingredient);


--
-- Name: intolerance_mappings intolerance_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_mappings
    ADD CONSTRAINT intolerance_mappings_pkey PRIMARY KEY (id);


--
-- Name: intolerance_safe_keywords intolerance_safe_keywords_intolerance_key_keyword_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_safe_keywords
    ADD CONSTRAINT intolerance_safe_keywords_intolerance_key_keyword_key UNIQUE (intolerance_key, keyword);


--
-- Name: intolerance_safe_keywords intolerance_safe_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intolerance_safe_keywords
    ADD CONSTRAINT intolerance_safe_keywords_pkey PRIMARY KEY (id);


--
-- Name: meal_consumption meal_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_consumption
    ADD CONSTRAINT meal_consumption_pkey PRIMARY KEY (id);


--
-- Name: meal_plan_items meal_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plan_items
    ADD CONSTRAINT meal_plan_items_pkey PRIMARY KEY (id);


--
-- Name: meal_plans meal_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_pkey PRIMARY KEY (id);


--
-- Name: meal_reminder_settings meal_reminder_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_reminder_settings
    ADD CONSTRAINT meal_reminder_settings_pkey PRIMARY KEY (id);


--
-- Name: meal_reminder_settings meal_reminder_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_reminder_settings
    ADD CONSTRAINT meal_reminder_settings_user_id_key UNIQUE (user_id);


--
-- Name: meal_status_colors meal_status_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_status_colors
    ADD CONSTRAINT meal_status_colors_pkey PRIMARY KEY (id);


--
-- Name: meal_status_colors meal_status_colors_status_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_status_colors
    ADD CONSTRAINT meal_status_colors_status_key_key UNIQUE (status_key);


--
-- Name: meal_time_settings meal_time_settings_meal_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_time_settings
    ADD CONSTRAINT meal_time_settings_meal_type_key UNIQUE (meal_type);


--
-- Name: meal_time_settings meal_time_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_time_settings
    ADD CONSTRAINT meal_time_settings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nutritional_strategies nutritional_strategies_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritional_strategies
    ADD CONSTRAINT nutritional_strategies_key_key UNIQUE (key);


--
-- Name: nutritional_strategies nutritional_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritional_strategies
    ADD CONSTRAINT nutritional_strategies_pkey PRIMARY KEY (id);


--
-- Name: nutritionist_foods nutritionist_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritionist_foods
    ADD CONSTRAINT nutritionist_foods_pkey PRIMARY KEY (id);


--
-- Name: onboarding_categories onboarding_categories_category_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_categories
    ADD CONSTRAINT onboarding_categories_category_key_key UNIQUE (category_key);


--
-- Name: onboarding_categories onboarding_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_categories
    ADD CONSTRAINT onboarding_categories_pkey PRIMARY KEY (id);


--
-- Name: onboarding_countries onboarding_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_countries
    ADD CONSTRAINT onboarding_countries_country_code_key UNIQUE (country_code);


--
-- Name: onboarding_countries onboarding_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_countries
    ADD CONSTRAINT onboarding_countries_pkey PRIMARY KEY (id);


--
-- Name: onboarding_options onboarding_options_category_option_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_options
    ADD CONSTRAINT onboarding_options_category_option_id_key UNIQUE (category, option_id);


--
-- Name: onboarding_options onboarding_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_options
    ADD CONSTRAINT onboarding_options_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: simple_meal_profiles simple_meal_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simple_meal_profiles
    ADD CONSTRAINT simple_meal_profiles_pkey PRIMARY KEY (id);


--
-- Name: simple_meal_profiles simple_meal_profiles_simple_meal_id_dietary_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simple_meal_profiles
    ADD CONSTRAINT simple_meal_profiles_simple_meal_id_dietary_profile_id_key UNIQUE (simple_meal_id, dietary_profile_id);


--
-- Name: simple_meals simple_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simple_meals
    ADD CONSTRAINT simple_meals_pkey PRIMARY KEY (id);


--
-- Name: spoonacular_config spoonacular_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spoonacular_config
    ADD CONSTRAINT spoonacular_config_pkey PRIMARY KEY (id);


--
-- Name: spoonacular_import_logs spoonacular_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spoonacular_import_logs
    ADD CONSTRAINT spoonacular_import_logs_pkey PRIMARY KEY (id);


--
-- Name: spoonacular_region_queue spoonacular_region_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spoonacular_region_queue
    ADD CONSTRAINT spoonacular_region_queue_pkey PRIMARY KEY (id);


--
-- Name: supported_languages supported_languages_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supported_languages
    ADD CONSTRAINT supported_languages_code_key UNIQUE (code);


--
-- Name: supported_languages supported_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supported_languages
    ADD CONSTRAINT supported_languages_pkey PRIMARY KEY (id);


--
-- Name: symptom_logs symptom_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_logs
    ADD CONSTRAINT symptom_logs_pkey PRIMARY KEY (id);


--
-- Name: symptom_types symptom_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_types
    ADD CONSTRAINT symptom_types_pkey PRIMARY KEY (id);


--
-- Name: system_health_logs system_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_pkey PRIMARY KEY (id);


--
-- Name: tracking_pixels tracking_pixels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_pixels
    ADD CONSTRAINT tracking_pixels_pkey PRIMARY KEY (id);


--
-- Name: usda_import_logs usda_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usda_import_logs
    ADD CONSTRAINT usda_import_logs_pkey PRIMARY KEY (id);


--
-- Name: usda_import_queue usda_import_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usda_import_queue
    ADD CONSTRAINT usda_import_queue_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_key_key UNIQUE (user_id, achievement_key);


--
-- Name: user_gamification user_gamification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gamification
    ADD CONSTRAINT user_gamification_pkey PRIMARY KEY (id);


--
-- Name: user_gamification user_gamification_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gamification
    ADD CONSTRAINT user_gamification_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: water_consumption water_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_consumption
    ADD CONSTRAINT water_consumption_pkey PRIMARY KEY (id);


--
-- Name: water_settings water_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_settings
    ADD CONSTRAINT water_settings_pkey PRIMARY KEY (id);


--
-- Name: water_settings water_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_settings
    ADD CONSTRAINT water_settings_user_id_key UNIQUE (user_id);


--
-- Name: weight_history weight_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_history
    ADD CONSTRAINT weight_history_pkey PRIMARY KEY (id);


--
-- Name: workout_exercises workout_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_pkey PRIMARY KEY (id);


--
-- Name: workout_plans workout_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_log_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_log_source ON public.activity_logs USING btree (log_source);


--
-- Name: idx_activity_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_performed_by ON public.activity_logs USING btree (performed_by);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_ai_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_error_logs_created_at ON public.ai_error_logs USING btree (created_at DESC);


--
-- Name: idx_ai_error_logs_function_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_error_logs_function_name ON public.ai_error_logs USING btree (function_name);


--
-- Name: idx_ai_error_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_error_logs_user_id ON public.ai_error_logs USING btree (user_id);


--
-- Name: idx_ai_usage_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs USING btree (created_at DESC);


--
-- Name: idx_ai_usage_logs_function_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_function_name ON public.ai_usage_logs USING btree (function_name);


--
-- Name: idx_ai_usage_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id);


--
-- Name: idx_auto_skip_notifications_user_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_skip_notifications_user_pending ON public.auto_skip_notifications USING btree (user_id, notified_at) WHERE (notified_at IS NULL);


--
-- Name: idx_blocked_ingredients_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_ingredients_ingredient ON public.blocked_ingredients_review USING btree (ingredient);


--
-- Name: idx_blocked_ingredients_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_ingredients_status ON public.blocked_ingredients_review USING btree (status);


--
-- Name: idx_chat_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);


--
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- Name: idx_dietary_forbidden_dietary_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dietary_forbidden_dietary_key ON public.dietary_forbidden_ingredients USING btree (dietary_key);


--
-- Name: idx_dietary_forbidden_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dietary_forbidden_ingredient ON public.dietary_forbidden_ingredients USING btree (ingredient);


--
-- Name: idx_dietary_forbidden_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dietary_forbidden_language ON public.dietary_forbidden_ingredients USING btree (language);


--
-- Name: idx_dietary_profiles_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dietary_profiles_key ON public.dietary_profiles USING btree (key);


--
-- Name: idx_dynamic_safe_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_safe_active ON public.dynamic_safe_ingredients USING btree (is_active, safe_for);


--
-- Name: idx_food_corrections_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_food_corrections_created_at ON public.food_corrections USING btree (created_at DESC);


--
-- Name: idx_food_corrections_original_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_food_corrections_original_item ON public.food_corrections USING btree (original_item);


--
-- Name: idx_food_corrections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_food_corrections_user_id ON public.food_corrections USING btree (user_id);


--
-- Name: idx_food_decomposition_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_food_decomposition_language ON public.food_decomposition_mappings USING btree (language);


--
-- Name: idx_food_decomposition_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_food_decomposition_name ON public.food_decomposition_mappings USING btree (lower(food_name));


--
-- Name: idx_foods_aliases; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_aliases ON public.foods USING gin (aliases);


--
-- Name: idx_foods_cuisine_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_cuisine_origin ON public.foods USING btree (cuisine_origin);


--
-- Name: idx_foods_is_recipe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_is_recipe ON public.foods USING btree (is_recipe);


--
-- Name: idx_foods_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_name ON public.foods USING btree (name);


--
-- Name: idx_foods_name_normalized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_name_normalized ON public.foods USING gin (to_tsvector('portuguese'::regconfig, name_normalized));


--
-- Name: idx_foods_name_normalized_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_name_normalized_lower ON public.foods USING btree (lower(name_normalized));


--
-- Name: idx_foods_name_normalized_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_foods_name_normalized_unique ON public.foods USING btree (name_normalized);


--
-- Name: idx_foods_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foods_verified ON public.foods USING btree (is_verified) WHERE (is_verified = true);


--
-- Name: idx_frontend_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frontend_error_logs_created_at ON public.frontend_error_logs USING btree (created_at DESC);


--
-- Name: idx_frontend_error_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frontend_error_logs_type ON public.frontend_error_logs USING btree (error_type);


--
-- Name: idx_ingredient_aliases_alias; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredient_aliases_alias ON public.ingredient_aliases USING btree (lower(alias));


--
-- Name: idx_ingredient_aliases_food_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredient_aliases_food_id ON public.ingredient_aliases USING btree (food_id);


--
-- Name: idx_ingredient_validation_feedback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredient_validation_feedback ON public.ingredient_validation_history USING btree (user_feedback) WHERE (user_feedback IS NOT NULL);


--
-- Name: idx_intolerance_mappings_labels; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intolerance_mappings_labels ON public.intolerance_mappings USING gin (labels);


--
-- Name: idx_intolerance_mappings_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intolerance_mappings_language ON public.intolerance_mappings USING btree (language);


--
-- Name: idx_intolerance_mappings_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intolerance_mappings_severity ON public.intolerance_mappings USING btree (intolerance_key, severity_level);


--
-- Name: idx_intolerance_normalization_database; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intolerance_normalization_database ON public.intolerance_key_normalization USING btree (database_key);


--
-- Name: idx_intolerance_normalization_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intolerance_normalization_onboarding ON public.intolerance_key_normalization USING btree (onboarding_key);


--
-- Name: idx_meal_consumption_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_consumption_feedback_status ON public.meal_consumption USING btree (user_id, feedback_status, consumed_at);


--
-- Name: idx_meal_plans_unlocks_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_plans_unlocks_at ON public.meal_plans USING btree (unlocks_at) WHERE (unlocks_at IS NOT NULL);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_nutritionist_foods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nutritionist_foods_active ON public.nutritionist_foods USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_nutritionist_foods_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nutritionist_foods_category ON public.nutritionist_foods USING btree (category);


--
-- Name: idx_nutritionist_foods_meals; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nutritionist_foods_meals ON public.nutritionist_foods USING gin (compatible_meals);


--
-- Name: idx_recipes_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_favorite ON public.recipes USING btree (user_id, is_favorite) WHERE (is_favorite = true);


--
-- Name: idx_recipes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_user_id ON public.recipes USING btree (user_id);


--
-- Name: idx_simple_meal_profiles_compatibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meal_profiles_compatibility ON public.simple_meal_profiles USING btree (compatibility);


--
-- Name: idx_simple_meal_profiles_meal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meal_profiles_meal ON public.simple_meal_profiles USING btree (simple_meal_id);


--
-- Name: idx_simple_meal_profiles_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meal_profiles_profile ON public.simple_meal_profiles USING btree (dietary_profile_id);


--
-- Name: idx_simple_meals_component_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_component_type ON public.simple_meals USING btree (component_type);


--
-- Name: idx_simple_meals_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_country_code ON public.simple_meals USING btree (country_code);


--
-- Name: idx_simple_meals_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_is_active ON public.simple_meals USING btree (is_active);


--
-- Name: idx_simple_meals_meal_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_meal_type ON public.simple_meals USING btree (meal_type);


--
-- Name: idx_simple_meals_meal_type_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_meal_type_country ON public.simple_meals USING btree (meal_type, country_code);


--
-- Name: idx_simple_meals_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_rating ON public.simple_meals USING btree (rating DESC NULLS LAST);


--
-- Name: idx_simple_meals_source_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_source_module ON public.simple_meals USING btree (source_module);


--
-- Name: idx_simple_meals_usage_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simple_meals_usage_count ON public.simple_meals USING btree (usage_count DESC);


--
-- Name: idx_symptom_logs_logged_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_symptom_logs_logged_at ON public.symptom_logs USING btree (logged_at);


--
-- Name: idx_symptom_logs_meal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_symptom_logs_meal ON public.symptom_logs USING btree (meal_consumption_id);


--
-- Name: idx_symptom_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_symptom_logs_user_id ON public.symptom_logs USING btree (user_id);


--
-- Name: idx_system_health_logs_checked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_health_logs_checked_at ON public.system_health_logs USING btree (checked_at DESC);


--
-- Name: idx_system_health_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_health_logs_status ON public.system_health_logs USING btree (status);


--
-- Name: idx_system_health_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_health_logs_target ON public.system_health_logs USING btree (target_name);


--
-- Name: idx_tracking_pixels_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_pixels_is_active ON public.tracking_pixels USING btree (is_active);


--
-- Name: idx_tracking_pixels_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_pixels_platform ON public.tracking_pixels USING btree (platform);


--
-- Name: idx_usda_import_queue_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usda_import_queue_category ON public.usda_import_queue USING btree (category);


--
-- Name: idx_usda_import_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usda_import_queue_priority ON public.usda_import_queue USING btree (priority DESC);


--
-- Name: idx_usda_import_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usda_import_queue_status ON public.usda_import_queue USING btree (status);


--
-- Name: idx_validation_ingredients; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_ingredients ON public.ingredient_validation_history USING gin (ingredients);


--
-- Name: idx_validation_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_user ON public.ingredient_validation_history USING btree (user_id);


--
-- Name: idx_water_consumption_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_consumption_user_date ON public.water_consumption USING btree (user_id, consumed_at);


--
-- Name: idx_water_settings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_settings_user ON public.water_settings USING btree (user_id);


--
-- Name: idx_weight_history_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weight_history_user_date ON public.weight_history USING btree (user_id, recorded_at DESC);


--
-- Name: dietary_forbidden_ingredients audit_dietary_forbidden; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_dietary_forbidden AFTER INSERT OR DELETE OR UPDATE ON public.dietary_forbidden_ingredients FOR EACH ROW EXECUTE FUNCTION public.audit_dietary_forbidden_changes();


--
-- Name: dietary_profiles audit_dietary_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_dietary_profiles AFTER INSERT OR DELETE OR UPDATE ON public.dietary_profiles FOR EACH ROW EXECUTE FUNCTION public.audit_dietary_profiles_changes();


--
-- Name: intolerance_mappings audit_intolerance_mappings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_intolerance_mappings AFTER INSERT OR DELETE OR UPDATE ON public.intolerance_mappings FOR EACH ROW EXECUTE FUNCTION public.audit_intolerance_mappings_changes();


--
-- Name: meal_time_settings audit_meal_time_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_meal_time_settings AFTER INSERT OR DELETE OR UPDATE ON public.meal_time_settings FOR EACH ROW EXECUTE FUNCTION public.audit_meal_time_settings_changes();


--
-- Name: nutritional_strategies audit_nutritional_strategies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_nutritional_strategies AFTER INSERT OR DELETE OR UPDATE ON public.nutritional_strategies FOR EACH ROW EXECUTE FUNCTION public.audit_nutritional_strategies_changes();


--
-- Name: onboarding_options audit_onboarding_options; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_onboarding_options AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_options FOR EACH ROW EXECUTE FUNCTION public.audit_onboarding_options_changes();


--
-- Name: intolerance_safe_keywords audit_safe_keywords; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_safe_keywords AFTER INSERT OR DELETE OR UPDATE ON public.intolerance_safe_keywords FOR EACH ROW EXECUTE FUNCTION public.audit_safe_keywords_changes();


--
-- Name: ai_prompts update_ai_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON public.ai_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_integrations update_api_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_integrations_updated_at BEFORE UPDATE ON public.api_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: app_settings update_app_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_conversations update_chat_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dietary_profiles update_dietary_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dietary_profiles_updated_at BEFORE UPDATE ON public.dietary_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_safe_ingredients update_dynamic_safe_ingredients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_safe_ingredients_updated_at BEFORE UPDATE ON public.dynamic_safe_ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_flags update_feature_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: food_decomposition_mappings update_food_decomposition_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_food_decomposition_mappings_updated_at BEFORE UPDATE ON public.food_decomposition_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meal_plans update_meal_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();


--
-- Name: meal_reminder_settings update_meal_reminder_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_reminder_settings_updated_at BEFORE UPDATE ON public.meal_reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meal_status_colors update_meal_status_colors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_status_colors_updated_at BEFORE UPDATE ON public.meal_status_colors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meal_time_settings update_meal_time_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_time_settings_updated_at BEFORE UPDATE ON public.meal_time_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nutritional_strategies update_nutritional_strategies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nutritional_strategies_updated_at BEFORE UPDATE ON public.nutritional_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nutritionist_foods update_nutritionist_foods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nutritionist_foods_updated_at BEFORE UPDATE ON public.nutritionist_foods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_categories update_onboarding_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_categories_updated_at BEFORE UPDATE ON public.onboarding_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_countries update_onboarding_countries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_countries_updated_at BEFORE UPDATE ON public.onboarding_countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_options update_onboarding_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_options_updated_at BEFORE UPDATE ON public.onboarding_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: simple_meals update_simple_meals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_simple_meals_updated_at BEFORE UPDATE ON public.simple_meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: spoonacular_config update_spoonacular_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_spoonacular_config_updated_at BEFORE UPDATE ON public.spoonacular_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: spoonacular_region_queue update_spoonacular_region_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_spoonacular_region_queue_updated_at BEFORE UPDATE ON public.spoonacular_region_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supported_languages update_supported_languages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supported_languages_updated_at BEFORE UPDATE ON public.supported_languages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tracking_pixels update_tracking_pixels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tracking_pixels_updated_at BEFORE UPDATE ON public.tracking_pixels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usda_import_queue update_usda_import_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usda_import_queue_updated_at BEFORE UPDATE ON public.usda_import_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_gamification update_user_gamification_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON public.user_gamification FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subscriptions update_user_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workout_plans update_workout_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dietary_forbidden_ingredients validate_dietary_key_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_dietary_key_trigger BEFORE INSERT OR UPDATE ON public.dietary_forbidden_ingredients FOR EACH ROW EXECUTE FUNCTION public.validate_dietary_key();


--
-- Name: intolerance_mappings validate_intolerance_key_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_intolerance_key_trigger BEFORE INSERT OR UPDATE ON public.intolerance_mappings FOR EACH ROW EXECUTE FUNCTION public.validate_intolerance_key();


--
-- Name: intolerance_safe_keywords validate_safe_keyword_intolerance_key_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_safe_keyword_intolerance_key_trigger BEFORE INSERT OR UPDATE ON public.intolerance_safe_keywords FOR EACH ROW EXECUTE FUNCTION public.validate_intolerance_key();


--
-- Name: ai_error_logs ai_error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_error_logs
    ADD CONSTRAINT ai_error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_usage_logs ai_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: api_integrations api_integrations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_integrations
    ADD CONSTRAINT api_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: auto_skip_notifications auto_skip_notifications_meal_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_skip_notifications
    ADD CONSTRAINT auto_skip_notifications_meal_plan_item_id_fkey FOREIGN KEY (meal_plan_item_id) REFERENCES public.meal_plan_items(id) ON DELETE CASCADE;


--
-- Name: auto_skip_notifications auto_skip_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_skip_notifications
    ADD CONSTRAINT auto_skip_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: consumption_items consumption_items_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_items
    ADD CONSTRAINT consumption_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE SET NULL;


--
-- Name: consumption_items consumption_items_meal_consumption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_items
    ADD CONSTRAINT consumption_items_meal_consumption_id_fkey FOREIGN KEY (meal_consumption_id) REFERENCES public.meal_consumption(id) ON DELETE CASCADE;


--
-- Name: dynamic_safe_ingredients dynamic_safe_ingredients_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_safe_ingredients
    ADD CONSTRAINT dynamic_safe_ingredients_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.blocked_ingredients_review(id);


--
-- Name: ingredient_aliases ingredient_aliases_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_aliases
    ADD CONSTRAINT ingredient_aliases_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;


--
-- Name: meal_consumption meal_consumption_meal_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_consumption
    ADD CONSTRAINT meal_consumption_meal_plan_item_id_fkey FOREIGN KEY (meal_plan_item_id) REFERENCES public.meal_plan_items(id) ON DELETE SET NULL;


--
-- Name: meal_plan_items meal_plan_items_meal_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plan_items
    ADD CONSTRAINT meal_plan_items_meal_plan_id_fkey FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plans(id) ON DELETE CASCADE;


--
-- Name: meal_plans meal_plans_source_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_source_plan_id_fkey FOREIGN KEY (source_plan_id) REFERENCES public.meal_plans(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.nutritional_strategies(id) ON DELETE SET NULL;


--
-- Name: recipes recipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: simple_meal_profiles simple_meal_profiles_dietary_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simple_meal_profiles
    ADD CONSTRAINT simple_meal_profiles_dietary_profile_id_fkey FOREIGN KEY (dietary_profile_id) REFERENCES public.dietary_profiles(id) ON DELETE CASCADE;


--
-- Name: simple_meal_profiles simple_meal_profiles_simple_meal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simple_meal_profiles
    ADD CONSTRAINT simple_meal_profiles_simple_meal_id_fkey FOREIGN KEY (simple_meal_id) REFERENCES public.simple_meals(id) ON DELETE CASCADE;


--
-- Name: symptom_logs symptom_logs_meal_consumption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_logs
    ADD CONSTRAINT symptom_logs_meal_consumption_id_fkey FOREIGN KEY (meal_consumption_id) REFERENCES public.meal_consumption(id) ON DELETE SET NULL;


--
-- Name: tracking_pixels tracking_pixels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_pixels
    ADD CONSTRAINT tracking_pixels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_gamification user_gamification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gamification
    ADD CONSTRAINT user_gamification_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workout_exercises workout_exercises_workout_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_workout_plan_id_fkey FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id) ON DELETE CASCADE;


--
-- Name: ai_prompts Admins can delete AI prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete AI prompts" ON public.ai_prompts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blocked_ingredients_review Admins can delete blocked ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete blocked ingredients" ON public.blocked_ingredients_review FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: food_corrections Admins can delete corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete corrections" ON public.food_corrections FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_countries Admins can delete countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete countries" ON public.onboarding_countries FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dietary_profiles Admins can delete dietary profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete dietary profiles" ON public.dietary_profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_flags Admins can delete feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete feature flags" ON public.feature_flags FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: food_decomposition_mappings Admins can delete food decomposition mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete food decomposition mappings" ON public.food_decomposition_mappings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usda_import_queue Admins can delete import queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete import queue" ON public.usda_import_queue FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ingredient_aliases Admins can delete ingredient aliases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete ingredient aliases" ON public.ingredient_aliases FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_integrations Admins can delete integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete integrations" ON public.api_integrations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_mappings Admins can delete intolerance mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete intolerance mappings" ON public.intolerance_mappings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_status_colors Admins can delete meal status colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete meal status colors" ON public.meal_status_colors FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_time_settings Admins can delete meal time settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete meal time settings" ON public.meal_time_settings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritional_strategies Admins can delete nutritional strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete nutritional strategies" ON public.nutritional_strategies FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritionist_foods Admins can delete nutritionist foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete nutritionist foods" ON public.nutritionist_foods FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: frontend_error_logs Admins can delete old frontend errors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete old frontend errors" ON public.frontend_error_logs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_options Admins can delete onboarding options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete onboarding options" ON public.onboarding_options FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tracking_pixels Admins can delete pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete pixels" ON public.tracking_pixels FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_region_queue Admins can delete region queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete region queue" ON public.spoonacular_region_queue FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dynamic_safe_ingredients Admins can delete safe ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete safe ingredients" ON public.dynamic_safe_ingredients FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_safe_keywords Admins can delete safe keywords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete safe keywords" ON public.intolerance_safe_keywords FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meal_profiles Admins can delete simple meal profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete simple meal profiles" ON public.simple_meal_profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meals Admins can delete simple meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete simple meals" ON public.simple_meals FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_config Admins can delete spoonacular config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete spoonacular config" ON public.spoonacular_config FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can insert AI prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert AI prompts" ON public.ai_prompts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can insert activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can insert app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_countries Admins can insert countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert countries" ON public.onboarding_countries FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dietary_profiles Admins can insert dietary profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert dietary profiles" ON public.dietary_profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_flags Admins can insert feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert feature flags" ON public.feature_flags FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: food_decomposition_mappings Admins can insert food decomposition mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert food decomposition mappings" ON public.food_decomposition_mappings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: foods Admins can insert foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert foods" ON public.foods FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usda_import_queue Admins can insert import queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert import queue" ON public.usda_import_queue FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ingredient_aliases Admins can insert ingredient aliases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert ingredient aliases" ON public.ingredient_aliases FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_integrations Admins can insert integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert integrations" ON public.api_integrations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_mappings Admins can insert intolerance mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert intolerance mappings" ON public.intolerance_mappings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_status_colors Admins can insert meal status colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert meal status colors" ON public.meal_status_colors FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_time_settings Admins can insert meal time settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert meal time settings" ON public.meal_time_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritional_strategies Admins can insert nutritional strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert nutritional strategies" ON public.nutritional_strategies FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritionist_foods Admins can insert nutritionist foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert nutritionist foods" ON public.nutritionist_foods FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_options Admins can insert onboarding options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert onboarding options" ON public.onboarding_options FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tracking_pixels Admins can insert pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert pixels" ON public.tracking_pixels FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_region_queue Admins can insert region queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert region queue" ON public.spoonacular_region_queue FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_safe_keywords Admins can insert safe keywords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert safe keywords" ON public.intolerance_safe_keywords FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meal_profiles Admins can insert simple meal profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert simple meal profiles" ON public.simple_meal_profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meals Admins can insert simple meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert simple meals" ON public.simple_meals FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_config Admins can insert spoonacular config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert spoonacular config" ON public.spoonacular_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_subscriptions Admins can insert subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert subscriptions" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dietary_forbidden_ingredients Admins can manage dietary forbidden ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dietary forbidden ingredients" ON public.dietary_forbidden_ingredients USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_key_normalization Admins can manage intolerance key normalization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage intolerance key normalization" ON public.intolerance_key_normalization USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_categories Admins can manage onboarding categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage onboarding categories" ON public.onboarding_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: supported_languages Admins can manage supported languages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage supported languages" ON public.supported_languages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: symptom_types Admins can manage symptom types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage symptom types" ON public.symptom_types USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can update AI prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update AI prompts" ON public.ai_prompts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can update app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_countries Admins can update countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update countries" ON public.onboarding_countries FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dietary_profiles Admins can update dietary profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update dietary profiles" ON public.dietary_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_flags Admins can update feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update feature flags" ON public.feature_flags FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_analysis_feedback Admins can update feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update feedback" ON public.ai_analysis_feedback FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: food_decomposition_mappings Admins can update food decomposition mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update food decomposition mappings" ON public.food_decomposition_mappings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: foods Admins can update foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update foods" ON public.foods FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usda_import_queue Admins can update import queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update import queue" ON public.usda_import_queue FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ingredient_aliases Admins can update ingredient aliases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update ingredient aliases" ON public.ingredient_aliases FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_integrations Admins can update integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update integrations" ON public.api_integrations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_mappings Admins can update intolerance mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update intolerance mappings" ON public.intolerance_mappings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_status_colors Admins can update meal status colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update meal status colors" ON public.meal_status_colors FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: meal_time_settings Admins can update meal time settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update meal time settings" ON public.meal_time_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritional_strategies Admins can update nutritional strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update nutritional strategies" ON public.nutritional_strategies FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritionist_foods Admins can update nutritionist foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update nutritionist foods" ON public.nutritionist_foods FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_options Admins can update onboarding options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update onboarding options" ON public.onboarding_options FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tracking_pixels Admins can update pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update pixels" ON public.tracking_pixels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_region_queue Admins can update region queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update region queue" ON public.spoonacular_region_queue FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dynamic_safe_ingredients Admins can update safe ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update safe ingredients" ON public.dynamic_safe_ingredients FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intolerance_safe_keywords Admins can update safe keywords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update safe keywords" ON public.intolerance_safe_keywords FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meal_profiles Admins can update simple meal profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update simple meal profiles" ON public.simple_meal_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meals Admins can update simple meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update simple meals" ON public.simple_meals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_config Admins can update spoonacular config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update spoonacular config" ON public.spoonacular_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_subscriptions Admins can update subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subscriptions" ON public.user_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can view AI prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view AI prompts" ON public.ai_prompts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_error_logs Admins can view all AI error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all AI error logs" ON public.ai_error_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_usage_logs Admins can view all AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all AI usage logs" ON public.ai_usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blocked_ingredients_review Admins can view all blocked ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all blocked ingredients" ON public.blocked_ingredients_review FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: food_corrections Admins can view all corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all corrections" ON public.food_corrections FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_countries Admins can view all countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all countries" ON public.onboarding_countries FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dietary_profiles Admins can view all dietary profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all dietary profiles" ON public.dietary_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_analysis_feedback Admins can view all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all feedback" ON public.ai_analysis_feedback FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: frontend_error_logs Admins can view all frontend errors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all frontend errors" ON public.frontend_error_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_health_logs Admins can view all health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all health logs" ON public.system_health_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritional_strategies Admins can view all nutritional strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all nutritional strategies" ON public.nutritional_strategies FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutritionist_foods Admins can view all nutritionist foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all nutritionist foods" ON public.nutritionist_foods FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_options Admins can view all onboarding options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all onboarding options" ON public.onboarding_options FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tracking_pixels Admins can view all pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all pixels" ON public.tracking_pixels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dynamic_safe_ingredients Admins can view all safe ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all safe ingredients" ON public.dynamic_safe_ingredients FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: simple_meals Admins can view all simple meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all simple meals" ON public.simple_meals FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can view app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view app settings" ON public.app_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_import_logs Admins can view import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view import logs" ON public.spoonacular_import_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usda_import_logs Admins can view import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view import logs" ON public.usda_import_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usda_import_queue Admins can view import queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view import queue" ON public.usda_import_queue FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_integrations Admins can view integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view integrations" ON public.api_integrations FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_region_queue Admins can view region queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view region queue" ON public.spoonacular_region_queue FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: spoonacular_config Admins can view spoonacular config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view spoonacular config" ON public.spoonacular_config FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_error_logs Allow insert from service role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert from service role" ON public.ai_error_logs FOR INSERT TO anon WITH CHECK (true);


--
-- Name: frontend_error_logs Anyone can insert frontend errors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert frontend errors" ON public.frontend_error_logs FOR INSERT WITH CHECK (true);


--
-- Name: app_settings Anyone can read app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);


--
-- Name: feature_flags Anyone can read feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read feature flags" ON public.feature_flags FOR SELECT USING (true);


--
-- Name: onboarding_countries Anyone can view active countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active countries" ON public.onboarding_countries FOR SELECT USING ((is_active = true));


--
-- Name: dietary_profiles Anyone can view active dietary profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active dietary profiles" ON public.dietary_profiles FOR SELECT USING ((is_active = true));


--
-- Name: nutritional_strategies Anyone can view active nutritional strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active nutritional strategies" ON public.nutritional_strategies FOR SELECT USING ((is_active = true));


--
-- Name: nutritionist_foods Anyone can view active nutritionist foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active nutritionist foods" ON public.nutritionist_foods FOR SELECT USING ((is_active = true));


--
-- Name: onboarding_options Anyone can view active onboarding options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active onboarding options" ON public.onboarding_options FOR SELECT USING ((is_active = true));


--
-- Name: dynamic_safe_ingredients Anyone can view active safe ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active safe ingredients" ON public.dynamic_safe_ingredients FOR SELECT USING ((is_active = true));


--
-- Name: simple_meals Anyone can view active simple meals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active simple meals" ON public.simple_meals FOR SELECT USING ((is_active = true));


--
-- Name: symptom_types Anyone can view active symptom types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active symptom types" ON public.symptom_types FOR SELECT USING ((is_active = true));


--
-- Name: dietary_forbidden_ingredients Anyone can view dietary forbidden ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view dietary forbidden ingredients" ON public.dietary_forbidden_ingredients FOR SELECT USING (true);


--
-- Name: food_decomposition_mappings Anyone can view food decomposition mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view food decomposition mappings" ON public.food_decomposition_mappings FOR SELECT USING (true);


--
-- Name: foods Anyone can view foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view foods" ON public.foods FOR SELECT USING (true);


--
-- Name: ingredient_aliases Anyone can view ingredient aliases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view ingredient aliases" ON public.ingredient_aliases FOR SELECT USING (true);


--
-- Name: intolerance_key_normalization Anyone can view intolerance key normalization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view intolerance key normalization" ON public.intolerance_key_normalization FOR SELECT USING (true);


--
-- Name: intolerance_mappings Anyone can view intolerance mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view intolerance mappings" ON public.intolerance_mappings FOR SELECT USING (true);


--
-- Name: meal_status_colors Anyone can view meal status colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view meal status colors" ON public.meal_status_colors FOR SELECT USING (true);


--
-- Name: meal_time_settings Anyone can view meal time settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view meal time settings" ON public.meal_time_settings FOR SELECT USING (true);


--
-- Name: onboarding_categories Anyone can view onboarding categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view onboarding categories" ON public.onboarding_categories FOR SELECT USING (true);


--
-- Name: intolerance_safe_keywords Anyone can view safe keywords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view safe keywords" ON public.intolerance_safe_keywords FOR SELECT USING (true);


--
-- Name: simple_meal_profiles Anyone can view simple meal profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view simple meal profiles" ON public.simple_meal_profiles FOR SELECT USING (true);


--
-- Name: supported_languages Anyone can view supported languages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view supported languages" ON public.supported_languages FOR SELECT USING (true);


--
-- Name: critical_changes_audit Only admins can view critical changes audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view critical changes audit" ON public.critical_changes_audit FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: auto_skip_notifications Service can delete auto-skip notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can delete auto-skip notifications" ON public.auto_skip_notifications FOR DELETE USING (true);


--
-- Name: ai_usage_logs Service can insert AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert AI usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);


--
-- Name: auto_skip_notifications Service can insert auto-skip notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert auto-skip notifications" ON public.auto_skip_notifications FOR INSERT WITH CHECK (true);


--
-- Name: blocked_ingredients_review Service can insert blocked ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert blocked ingredients" ON public.blocked_ingredients_review FOR INSERT WITH CHECK (true);


--
-- Name: system_health_logs Service can insert health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert health logs" ON public.system_health_logs FOR INSERT WITH CHECK (true);


--
-- Name: spoonacular_import_logs Service can insert import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert import logs" ON public.spoonacular_import_logs FOR INSERT WITH CHECK (true);


--
-- Name: usda_import_logs Service can insert import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert import logs" ON public.usda_import_logs FOR INSERT WITH CHECK (true);


--
-- Name: notifications Service can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: dynamic_safe_ingredients Service can insert safe ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert safe ingredients" ON public.dynamic_safe_ingredients FOR INSERT WITH CHECK (true);


--
-- Name: ingredient_validation_history Service can insert validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert validations" ON public.ingredient_validation_history FOR INSERT WITH CHECK (true);


--
-- Name: usda_import_queue Service can manage import queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage import queue" ON public.usda_import_queue USING (true) WITH CHECK (true);


--
-- Name: meal_reminder_settings Service can read all meal reminder settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can read all meal reminder settings" ON public.meal_reminder_settings FOR SELECT USING (true);


--
-- Name: blocked_ingredients_review Service can update blocked ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update blocked ingredients" ON public.blocked_ingredients_review FOR UPDATE USING (true);


--
-- Name: spoonacular_import_logs Service can update import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update import logs" ON public.spoonacular_import_logs FOR UPDATE USING (true);


--
-- Name: ai_error_logs Service role can insert AI error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert AI error logs" ON public.ai_error_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: meal_plan_items Users can create meal plan items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create meal plan items" ON public.meal_plan_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meal_plans
  WHERE ((meal_plans.id = meal_plan_items.meal_plan_id) AND (meal_plans.user_id = auth.uid())))));


--
-- Name: chat_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.chat_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: meal_plans Users can create their own meal plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own meal plans" ON public.meal_plans FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workout_plans Users can create their own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own workout plans" ON public.workout_plans FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workout_exercises Users can create workout exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workout exercises" ON public.workout_exercises FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workout_plans
  WHERE ((workout_plans.id = workout_exercises.workout_plan_id) AND (workout_plans.user_id = auth.uid())))));


--
-- Name: consumption_items Users can delete their consumption items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their consumption items" ON public.consumption_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.meal_consumption mc
  WHERE ((mc.id = consumption_items.meal_consumption_id) AND (mc.user_id = auth.uid())))));


--
-- Name: chat_messages Users can delete their conversation messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their conversation messages" ON public.chat_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));


--
-- Name: meal_plan_items Users can delete their meal plan items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their meal plan items" ON public.meal_plan_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.meal_plans
  WHERE ((meal_plans.id = meal_plan_items.meal_plan_id) AND (meal_plans.user_id = auth.uid())))));


--
-- Name: meal_consumption Users can delete their own consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own consumption" ON public.meal_consumption FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: meal_plans Users can delete their own meal plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own meal plans" ON public.meal_plans FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: meal_reminder_settings Users can delete their own meal reminder settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own meal reminder settings" ON public.meal_reminder_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: recipes Users can delete their own recipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: symptom_logs Users can delete their own symptom logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own symptom logs" ON public.symptom_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: water_consumption Users can delete their own water consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own water consumption" ON public.water_consumption FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: weight_history Users can delete their own weight records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own weight records" ON public.weight_history FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: workout_plans Users can delete their own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own workout plans" ON public.workout_plans FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: workout_exercises Users can delete their workout exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their workout exercises" ON public.workout_exercises FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.workout_plans
  WHERE ((workout_plans.id = workout_exercises.workout_plan_id) AND (workout_plans.user_id = auth.uid())))));


--
-- Name: consumption_items Users can insert their consumption items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their consumption items" ON public.consumption_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meal_consumption mc
  WHERE ((mc.id = consumption_items.meal_consumption_id) AND (mc.user_id = auth.uid())))));


--
-- Name: chat_messages Users can insert their conversation messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their conversation messages" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));


--
-- Name: user_achievements Users can insert their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: activity_logs Users can insert their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (log_source = 'user'::text)));


--
-- Name: meal_consumption Users can insert their own consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own consumption" ON public.meal_consumption FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: food_corrections Users can insert their own corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own corrections" ON public.food_corrections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_gamification Users can insert their own gamification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own gamification" ON public.user_gamification FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: meal_reminder_settings Users can insert their own meal reminder settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own meal reminder settings" ON public.meal_reminder_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: recipes Users can insert their own recipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own recipes" ON public.recipes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: symptom_logs Users can insert their own symptom logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own symptom logs" ON public.symptom_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ingredient_validation_history Users can insert their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own validations" ON public.ingredient_validation_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: water_consumption Users can insert their own water consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own water consumption" ON public.water_consumption FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: water_settings Users can insert their own water settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own water settings" ON public.water_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: weight_history Users can insert their own weight records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own weight records" ON public.weight_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_analysis_feedback Users can submit their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can submit their own feedback" ON public.ai_analysis_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: meal_plan_items Users can update their meal plan items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their meal plan items" ON public.meal_plan_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.meal_plans
  WHERE ((meal_plans.id = meal_plan_items.meal_plan_id) AND (meal_plans.user_id = auth.uid())))));


--
-- Name: auto_skip_notifications Users can update their own auto-skip notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own auto-skip notifications" ON public.auto_skip_notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: meal_consumption Users can update their own consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own consumption" ON public.meal_consumption FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_gamification Users can update their own gamification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own gamification" ON public.user_gamification FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: meal_plans Users can update their own meal plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own meal plans" ON public.meal_plans FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: meal_reminder_settings Users can update their own meal reminder settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own meal reminder settings" ON public.meal_reminder_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: recipes Users can update their own recipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: symptom_logs Users can update their own symptom logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own symptom logs" ON public.symptom_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ingredient_validation_history Users can update their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own validations" ON public.ingredient_validation_history FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: water_settings Users can update their own water settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own water settings" ON public.water_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workout_plans Users can update their own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own workout plans" ON public.workout_plans FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workout_exercises Users can update their workout exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their workout exercises" ON public.workout_exercises FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.workout_plans
  WHERE ((workout_plans.id = workout_exercises.workout_plan_id) AND (workout_plans.user_id = auth.uid())))));


--
-- Name: consumption_items Users can view their consumption items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their consumption items" ON public.consumption_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meal_consumption mc
  WHERE ((mc.id = consumption_items.meal_consumption_id) AND (mc.user_id = auth.uid())))));


--
-- Name: chat_messages Users can view their conversation messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their conversation messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));


--
-- Name: meal_plan_items Users can view their meal plan items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their meal plan items" ON public.meal_plan_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meal_plans
  WHERE ((meal_plans.id = meal_plan_items.meal_plan_id) AND (meal_plans.user_id = auth.uid())))));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs Users can view their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: auto_skip_notifications Users can view their own auto-skip notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own auto-skip notifications" ON public.auto_skip_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: meal_consumption Users can view their own consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own consumption" ON public.meal_consumption FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: food_corrections Users can view their own corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own corrections" ON public.food_corrections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_analysis_feedback Users can view their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own feedback" ON public.ai_analysis_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_gamification Users can view their own gamification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own gamification" ON public.user_gamification FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: meal_plans Users can view their own meal plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own meal plans" ON public.meal_plans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: meal_reminder_settings Users can view their own meal reminder settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own meal reminder settings" ON public.meal_reminder_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: recipes Users can view their own recipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recipes" ON public.recipes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: symptom_logs Users can view their own symptom logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own symptom logs" ON public.symptom_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ingredient_validation_history Users can view their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own validations" ON public.ingredient_validation_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: water_consumption Users can view their own water consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own water consumption" ON public.water_consumption FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: water_settings Users can view their own water settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own water settings" ON public.water_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: weight_history Users can view their own weight history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own weight history" ON public.weight_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workout_plans Users can view their own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workout plans" ON public.workout_plans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workout_exercises Users can view their workout exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workout exercises" ON public.workout_exercises FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.workout_plans
  WHERE ((workout_plans.id = workout_exercises.workout_plan_id) AND (workout_plans.user_id = auth.uid())))));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_analysis_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: api_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: auto_skip_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auto_skip_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_ingredients_review; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_ingredients_review ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: consumption_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consumption_items ENABLE ROW LEVEL SECURITY;

--
-- Name: critical_changes_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.critical_changes_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: dietary_forbidden_ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dietary_forbidden_ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: dietary_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dietary_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_safe_ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_safe_ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: food_corrections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.food_corrections ENABLE ROW LEVEL SECURITY;

--
-- Name: food_decomposition_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.food_decomposition_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: foods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

--
-- Name: frontend_error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frontend_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ingredient_aliases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;

--
-- Name: ingredient_validation_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingredient_validation_history ENABLE ROW LEVEL SECURITY;

--
-- Name: intolerance_key_normalization; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intolerance_key_normalization ENABLE ROW LEVEL SECURITY;

--
-- Name: intolerance_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intolerance_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: intolerance_safe_keywords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intolerance_safe_keywords ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_consumption; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_consumption ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_plan_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_reminder_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_reminder_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_status_colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_status_colors ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_time_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_time_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: nutritional_strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutritional_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: nutritionist_foods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutritionist_foods ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_options ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: simple_meal_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simple_meal_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: simple_meals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simple_meals ENABLE ROW LEVEL SECURITY;

--
-- Name: spoonacular_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spoonacular_config ENABLE ROW LEVEL SECURITY;

--
-- Name: spoonacular_import_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spoonacular_import_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: spoonacular_region_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spoonacular_region_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: supported_languages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

--
-- Name: symptom_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: symptom_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.symptom_types ENABLE ROW LEVEL SECURITY;

--
-- Name: system_health_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: tracking_pixels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

--
-- Name: usda_import_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usda_import_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: usda_import_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usda_import_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_gamification; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: water_consumption; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.water_consumption ENABLE ROW LEVEL SECURITY;

--
-- Name: water_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: weight_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;