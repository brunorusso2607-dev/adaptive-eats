-- Adicionar coluna timezone ao perfil do usuário
-- Usado para suporte global de horários e lembretes

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Comentário explicativo
COMMENT ON COLUMN profiles.timezone IS 'Timezone do usuário no formato IANA (ex: America/Sao_Paulo, Europe/Lisbon). Detectado automaticamente no onboarding ou configurado manualmente.';