import { supabase } from "@/integrations/supabase/client";

type LogSource = "admin" | "user";

interface LogActivityParams {
  userId: string;
  actionType: string;
  actionDescription: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  logSource: LogSource;
}

export async function logActivity({
  userId,
  actionType,
  actionDescription,
  oldValues = null,
  newValues = null,
  logSource,
}: LogActivityParams) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error("No authenticated user for logging activity");
    return { success: false, error: "No authenticated user" };
  }

  // Use type assertion since the table was just created
  const { error } = await (supabase.from("activity_logs") as any).insert({
    user_id: userId,
    performed_by: user.id,
    action_type: actionType,
    action_description: actionDescription,
    old_values: oldValues,
    new_values: newValues,
    log_source: logSource,
  });

  if (error) {
    console.error("Error logging activity:", error);
    return { success: false, error };
  }

  return { success: true };
}

export function useActivityLog() {
  const logAdminAction = async (
    userId: string,
    actionType: string,
    actionDescription: string,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null
  ) => {
    return logActivity({
      userId,
      actionType,
      actionDescription,
      oldValues,
      newValues,
      logSource: "admin",
    });
  };

  const logUserAction = async (
    actionType: string,
    actionDescription: string,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No authenticated user" };

    return logActivity({
      userId: user.id,
      actionType,
      actionDescription,
      oldValues,
      newValues,
      logSource: "user",
    });
  };

  return { logAdminAction, logUserAction };
}
