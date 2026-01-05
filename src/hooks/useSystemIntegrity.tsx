import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para monitorar a integridade do sistema em runtime
 * Verifica se módulos críticos estão funcionando corretamente
 */

interface IntegrityCheck {
  module: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  count?: number;
}

interface SystemIntegrityResult {
  checks: IntegrityCheck[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  lastChecked: Date;
  totalPassed: number;
  totalFailed: number;
}

// Contadores esperados mínimos para cada módulo crítico
const EXPECTED_MINIMUMS = {
  intolerance_mappings: 1000,
  dietary_forbidden_ingredients: 100,
  intolerance_safe_keywords: 50,
  onboarding_options: 15,
  meal_time_settings: 5,
  dietary_profiles: 5,
  nutritional_strategies: 3,
};

export function useSystemIntegrity(enabled = true) {
  return useQuery({
    queryKey: ['system-integrity'],
    queryFn: async (): Promise<SystemIntegrityResult> => {
      const checks: IntegrityCheck[] = [];
      
      // 1. Verificar intolerance_mappings
      try {
        const { count, error } = await supabase
          .from('intolerance_mappings')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.intolerance_mappings;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Mapeamentos de Intolerância',
          status: passed ? 'ok' : 'error',
          message: passed 
            ? `${count} mapeamentos ativos` 
            : `Apenas ${count} mapeamentos (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Mapeamentos de Intolerância',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 2. Verificar dietary_forbidden_ingredients
      try {
        const { count, error } = await supabase
          .from('dietary_forbidden_ingredients')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.dietary_forbidden_ingredients;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Ingredientes Proibidos Dietéticos',
          status: passed ? 'ok' : 'warning',
          message: passed 
            ? `${count} ingredientes configurados` 
            : `Apenas ${count} ingredientes (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Ingredientes Proibidos Dietéticos',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 3. Verificar intolerance_safe_keywords
      try {
        const { count, error } = await supabase
          .from('intolerance_safe_keywords')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.intolerance_safe_keywords;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Palavras Seguras (Neutralizadores)',
          status: passed ? 'ok' : 'warning',
          message: passed 
            ? `${count} neutralizadores ativos` 
            : `Apenas ${count} neutralizadores (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Palavras Seguras (Neutralizadores)',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 4. Verificar onboarding_options
      try {
        const { count, error } = await supabase
          .from('onboarding_options')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.onboarding_options;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Opções de Onboarding',
          status: passed ? 'ok' : 'error',
          message: passed 
            ? `${count} opções ativas` 
            : `Apenas ${count} opções (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Opções de Onboarding',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 5. Verificar meal_time_settings
      try {
        const { count, error } = await supabase
          .from('meal_time_settings')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.meal_time_settings;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Configurações de Horário de Refeições',
          status: passed ? 'ok' : 'error',
          message: passed 
            ? `${count} horários configurados` 
            : `Apenas ${count} horários (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Configurações de Horário de Refeições',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 6. Verificar dietary_profiles
      try {
        const { count, error } = await supabase
          .from('dietary_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.dietary_profiles;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Perfis Dietéticos',
          status: passed ? 'ok' : 'error',
          message: passed 
            ? `${count} perfis ativos` 
            : `Apenas ${count} perfis (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Perfis Dietéticos',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 7. Verificar nutritional_strategies
      try {
        const { count, error } = await supabase
          .from('nutritional_strategies')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) throw error;
        
        const expected = EXPECTED_MINIMUMS.nutritional_strategies;
        const passed = (count || 0) >= expected;
        
        checks.push({
          module: 'Estratégias Nutricionais',
          status: passed ? 'ok' : 'error',
          message: passed 
            ? `${count} estratégias ativas` 
            : `Apenas ${count} estratégias (esperado: ${expected}+)`,
          count: count || 0
        });
      } catch (e) {
        checks.push({
          module: 'Estratégias Nutricionais',
          status: 'error',
          message: `Erro ao verificar: ${e}`
        });
      }

      // 8. Verificar mudanças recentes não autorizadas
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from('critical_changes_audit')
          .select('*', { count: 'exact', head: true })
          .gte('changed_at', oneDayAgo);
        
        if (error) throw error;
        
        checks.push({
          module: 'Mudanças Críticas (24h)',
          status: (count || 0) > 10 ? 'warning' : 'ok',
          message: `${count || 0} alterações nas últimas 24h`,
          count: count || 0
        });
      } catch (e) {
        // Se a tabela não existe ainda, ignorar
        checks.push({
          module: 'Mudanças Críticas (24h)',
          status: 'ok',
          message: 'Auditoria não disponível'
        });
      }

      // Calcular status geral
      const errors = checks.filter(c => c.status === 'error').length;
      const warnings = checks.filter(c => c.status === 'warning').length;
      
      let overallStatus: 'healthy' | 'degraded' | 'critical';
      if (errors > 0) {
        overallStatus = 'critical';
      } else if (warnings > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      return {
        checks,
        overallStatus,
        lastChecked: new Date(),
        totalPassed: checks.filter(c => c.status === 'ok').length,
        totalFailed: errors + warnings
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000 // Atualiza a cada 10 minutos
  });
}

export function useRecentCriticalChanges() {
  return useQuery({
    queryKey: ['recent-critical-changes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('critical_changes_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000 // 1 minuto
  });
}
