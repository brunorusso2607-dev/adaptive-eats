-- Adicionar novos valores ao ENUM dietary_preference
ALTER TYPE dietary_preference ADD VALUE IF NOT EXISTS 'pescetariana';
ALTER TYPE dietary_preference ADD VALUE IF NOT EXISTS 'cetogenica';
ALTER TYPE dietary_preference ADD VALUE IF NOT EXISTS 'flexitariana';