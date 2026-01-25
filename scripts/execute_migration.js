// Script para executar migration no Supabase
const fs = require('fs');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

async function executeMigration() {
  const migrationPath = process.argv[2] || './supabase/migrations/20260117010700_dynamic_country_system.sql';
  
  console.log('Reading migration file:', migrationPath);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Split SQL into statements and execute each one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length < 5) continue;
    
    const shortStmt = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`\n[${i + 1}/${statements.length}] Executing: ${shortStmt}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        // Try direct query for some statements
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          console.log('  Using direct approach...');
          const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          });
        }
        console.log(`  Warning: ${error.message}`);
        errorCount++;
      } else {
        console.log('  ✓ Success');
        successCount++;
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Migration complete: ${successCount} success, ${errorCount} warnings/errors`);
  console.log(`========================================`);
}

executeMigration().catch(console.error);
