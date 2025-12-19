-- Add week_number column to meal_plan_items
ALTER TABLE public.meal_plan_items 
ADD COLUMN week_number INTEGER NOT NULL DEFAULT 1;