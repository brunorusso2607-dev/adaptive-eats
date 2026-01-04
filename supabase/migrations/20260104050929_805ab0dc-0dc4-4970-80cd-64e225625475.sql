-- Migrate cuisine_origin from Portuguese to English

UPDATE foods SET cuisine_origin = 'brazilian' WHERE cuisine_origin = 'brasileira';
UPDATE foods SET cuisine_origin = 'british' WHERE cuisine_origin = 'britanica';
UPDATE foods SET cuisine_origin = 'german' WHERE cuisine_origin = 'DE';
UPDATE foods SET cuisine_origin = 'spanish' WHERE cuisine_origin = 'ES';
UPDATE foods SET cuisine_origin = 'french' WHERE cuisine_origin = 'francesa';
UPDATE foods SET cuisine_origin = 'italian' WHERE cuisine_origin = 'italiana';
UPDATE foods SET cuisine_origin = 'mexican' WHERE cuisine_origin = 'mexicana';
UPDATE foods SET cuisine_origin = 'portuguese' WHERE cuisine_origin = 'portuguesa';
UPDATE foods SET cuisine_origin = 'international' WHERE cuisine_origin = 'internacional';
UPDATE foods SET cuisine_origin = 'not_applicable' WHERE cuisine_origin = 'Não aplicável';
-- 'global' is already English, no change needed