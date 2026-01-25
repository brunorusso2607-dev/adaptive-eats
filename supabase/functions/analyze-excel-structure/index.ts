import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath, fileUrl } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let arrayBuffer: ArrayBuffer;

    if (storagePath) {
      const { data, error } = await supabase.storage.from('app-assets').download(storagePath);
      if (error) throw new Error(`Storage error: ${error.message}`);
      arrayBuffer = await data.arrayBuffer();
    } else if (fileUrl) {
      const response = await fetch(fileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)' }
      });
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error('storagePath or fileUrl required');
    }

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    const analysis: any = {
      sheets: [],
      totalSize: arrayBuffer.byteLength,
    };

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, header: 1 });
      
      const columns = jsonData.length > 0 ? jsonData[0] : [];
      const sampleRows = jsonData.slice(1, 6);
      
      analysis.sheets.push({
        name: sheetName,
        totalRows: jsonData.length - 1,
        columns: columns,
        sampleData: sampleRows,
      });
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

