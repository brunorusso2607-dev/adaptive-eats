-- TEST: Verify sync triggers are working
-- Run this to check if everything was created successfully

-- 1. Check if functions were created
SELECT 
  'Functions Created' as test_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname IN (
  'notify_new_ingredient',
  'update_updated_at_column',
  'notify_new_meal_combination',
  'increment_meal_pool_cache_version',
  'check_ingredient_exists',
  'sync_ingredient_to_pool'
);

-- 2. Check if triggers were created
SELECT 
  'Triggers Created' as test_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_trigger 
WHERE tgname IN (
  'trigger_notify_new_ingredient',
  'trigger_update_ingredient_pool_timestamp',
  'trigger_notify_new_meal_combination',
  'trigger_invalidate_meal_pool_cache'
);

-- 3. Check if cache version table exists
SELECT 
  'Cache Table Created' as test_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables 
WHERE table_name = 'meal_pool_cache_version';

-- 4. Check if view was created
SELECT 
  'Sync View Created' as test_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.views 
WHERE table_name = 'ingredients_sync_status';

-- 5. Check current cache version
SELECT 
  'Current Cache Version' as test_type,
  version as count,
  '✅ READY' as status
FROM meal_pool_cache_version
WHERE id = 1;
