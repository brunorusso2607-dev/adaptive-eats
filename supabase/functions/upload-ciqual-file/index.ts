import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download from Zenodo with proper headers
    const zenodoUrl = 'https://zenodo.org/api/files/e1a7a1c0-0e1e-4b0e-8f1a-0e1e4b0e8f1a/Table%20Ciqual%202020_FR_2020%2007%2007.xls';
    
    // Try the direct record download
    console.log('Fetching from Zenodo...');
    const response = await fetch('https://zenodo.org/records/8034341/files/Table%20Ciqual%202020_FR_2020%2007%2007.xls?download=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // Try alternative ANSES URL
      console.log('Zenodo failed, trying ANSES...');
      const ansesResponse = await fetch('https://ciqual.anses.fr/cms/sites/default/files/inline-files/Table%20Ciqual%202020_FR_2020%2007%2007.xls', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)',
          'Accept': '*/*',
        },
      });
      
      if (!ansesResponse.ok) {
        throw new Error(`Failed to fetch from any source: Zenodo=${response.status}, ANSES=${ansesResponse.status}`);
      }
      
      const data = await ansesResponse.arrayBuffer();
      console.log('Downloaded from ANSES:', data.byteLength, 'bytes');
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload('data/ciqual_france_2020.xls', data, {
          contentType: 'application/vnd.ms-excel',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      return new Response(
        JSON.stringify({ success: true, source: 'ANSES', size: data.byteLength }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.arrayBuffer();
    console.log('Downloaded from Zenodo:', data.byteLength, 'bytes');

    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload('data/ciqual_france_2020.xls', data, {
        contentType: 'application/vnd.ms-excel',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, source: 'Zenodo', size: data.byteLength }),
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

