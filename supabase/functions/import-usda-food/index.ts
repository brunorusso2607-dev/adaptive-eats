import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[USDA-IMPORT] ${step}:`, details ? JSON.stringify(details) : "");
};

// Delay function para respeitar rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Interface para resposta da USDA API
interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>;
  foodCategory?: {
    description: string;
  };
}

// Mapeamento de nutrientes USDA para nosso schema
const NUTRIENT_IDS = {
  ENERGY: [1008, 2048], // Energy (kcal)
  PROTEIN: [1003], // Protein
  CARBS: [1005], // Carbohydrate, by difference
  FAT: [1004], // Total lipid (fat)
  FIBER: [1079], // Fiber, total dietary
  SODIUM: [1093], // Sodium, Na
};

function extractNutrient(nutrients: any[], ids: number[]): number {
  for (const id of ids) {
    // Try different structures - USDA API returns different formats for search vs detail
    const nutrient = nutrients.find(n => {
      // Format 1: nutrientId directly on object
      if (n.nutrientId === id) return true;
      // Format 2: nutrient.id nested
      if (n.nutrient && n.nutrient.id === id) return true;
      // Format 3: number as string
      if (n.nutrientNumber === String(id)) return true;
      return false;
    });
    
    if (nutrient) {
      // Value can be in different places
      const value = nutrient.value ?? nutrient.amount ?? 0;
      if (value !== undefined && value !== null) {
        return Number(value);
      }
    }
  }
  return 0;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Extrai o ingrediente principal de um termo composto
function extractMainIngredient(searchTerm: string): string | null {
  // Palavras a ignorar (preposições, artigos, etc)
  const stopWords = ['with', 'and', 'in', 'on', 'the', 'a', 'an', 'de', 'com', 'e'];
  
  // Dividir e filtrar
  const words = searchTerm.toLowerCase().split(/[\s,]+/).filter(w => 
    w.length > 2 && !stopWords.includes(w)
  );
  
  // Retornar a primeira palavra significativa
  return words.length > 0 ? words[0] : null;
}

async function searchUSDAFood(searchTerm: string, apiKey: string, retryWithSimpleTerm = true): Promise<USDAFood | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}&dataType=Foundation,SR%20Legacy&pageSize=1`;
  
  logStep("Searching USDA API", { searchTerm, url: url.replace(apiKey, "***") });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.foods && data.foods.length > 0) {
    return data.foods[0];
  }
  
  // Se não encontrou e o termo é composto, tentar com ingrediente principal
  if (retryWithSimpleTerm && searchTerm.includes(' ')) {
    const mainIngredient = extractMainIngredient(searchTerm);
    if (mainIngredient && mainIngredient !== searchTerm.toLowerCase()) {
      logStep("Retrying with main ingredient", { original: searchTerm, mainIngredient });
      return searchUSDAFood(mainIngredient, apiKey, false);
    }
  }
  
  return null;
}

async function getFoodDetails(fdcId: number, apiKey: string): Promise<USDAFood | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
  
  logStep("Fetching food details", { fdcId });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const usdaApiKey = Deno.env.get("USDA_API_KEY");

    if (!usdaApiKey) {
      throw new Error("USDA_API_KEY não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parâmetros opcionais
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const delayMs = body.delayMs || 5000; // 5 segundos entre requisições

    logStep("Starting USDA import batch", { batchSize, delayMs });

    // Gerar batch ID para log
    const batchId = crypto.randomUUID();

    // RETRY AUTOMÁTICO: Resetar itens travados em "processing" há mais de 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: stuckItems, error: stuckError } = await supabase
      .from("usda_import_queue")
      .update({ 
        status: "pending",
        error_message: "Auto-retry: item estava travado em processing"
      })
      .eq("status", "processing")
      .lt("updated_at", fifteenMinutesAgo)
      .select("id");
    
    if (!stuckError && stuckItems && stuckItems.length > 0) {
      logStep("Reset stuck items", { count: stuckItems.length });
    }

    // Buscar próximos itens da fila
    const { data: queueItems, error: queueError } = await supabase
      .from("usda_import_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (queueError) {
      throw new Error(`Erro ao buscar fila: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      logStep("No pending items in queue");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum item pendente na fila", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found queue items", { count: queueItems.length });

    // Marcar itens como "processing"
    const itemIds = queueItems.map(item => item.id);
    await supabase
      .from("usda_import_queue")
      .update({ status: "processing" })
      .in("id", itemIds);

    let successCount = 0;
    let failedCount = 0;

    // Processar cada item com delay
    for (const item of queueItems) {
      try {
        logStep("Processing item", { id: item.id, searchTerm: item.search_term });

        // Buscar na API USDA
        const searchResult = await searchUSDAFood(item.search_term, usdaApiKey);

        if (!searchResult) {
          logStep("Food not found", { searchTerm: item.search_term });
          
          await supabase
            .from("usda_import_queue")
            .update({
              status: "skipped",
              error_message: "Alimento não encontrado na USDA",
              attempts: item.attempts + 1,
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          
          failedCount++;
          continue;
        }

        // Buscar detalhes completos
        const foodDetails = await getFoodDetails(searchResult.fdcId, usdaApiKey);

        if (!foodDetails) {
          throw new Error("Falha ao buscar detalhes do alimento");
        }

        // Extrair nutrientes
        const nutrients = foodDetails.foodNutrients || [];
        const calories = extractNutrient(nutrients, NUTRIENT_IDS.ENERGY);
        const protein = extractNutrient(nutrients, NUTRIENT_IDS.PROTEIN);
        const carbs = extractNutrient(nutrients, NUTRIENT_IDS.CARBS);
        const fat = extractNutrient(nutrients, NUTRIENT_IDS.FAT);
        const fiber = extractNutrient(nutrients, NUTRIENT_IDS.FIBER);
        const sodium = extractNutrient(nutrients, NUTRIENT_IDS.SODIUM);

        // Verificar se já existe na tabela foods
        const normalizedName = normalizeText(foodDetails.description);
        
        const { data: existingFood } = await supabase
          .from("foods")
          .select("id")
          .eq("name_normalized", normalizedName)
          .eq("source", "usda")
          .single();

        if (existingFood) {
          logStep("Food already exists", { name: foodDetails.description });
          
          await supabase
            .from("usda_import_queue")
            .update({
              status: "skipped",
              error_message: "Alimento já existe na base",
              usda_fdc_id: String(foodDetails.fdcId),
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          
          continue;
        }

        // Inserir na tabela foods
        const { error: insertError } = await supabase
          .from("foods")
          .insert({
            name: foodDetails.description,
            name_normalized: normalizedName,
            calories_per_100g: calories,
            protein_per_100g: protein,
            carbs_per_100g: carbs,
            fat_per_100g: fat,
            fiber_per_100g: fiber,
            sodium_per_100g: sodium,
            source: "usda",
            category: foodDetails.foodCategory?.description || item.category,
            is_verified: true,
            confidence: 1.0,
          });

        if (insertError) {
          throw new Error(`Erro ao inserir: ${insertError.message}`);
        }

        // Atualizar status na fila
        await supabase
          .from("usda_import_queue")
          .update({
            status: "completed",
            usda_fdc_id: String(foodDetails.fdcId),
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        successCount++;
        logStep("Successfully imported", { name: foodDetails.description, calories, protein, carbs, fat });

      } catch (itemError: any) {
        logStep("Error processing item", { id: item.id, error: itemError.message });
        
        await supabase
          .from("usda_import_queue")
          .update({
            status: item.attempts >= 2 ? "failed" : "pending",
            error_message: itemError.message,
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);
        
        failedCount++;
      }

      // Delay entre requisições para respeitar rate limit
      if (queueItems.indexOf(item) < queueItems.length - 1) {
        logStep("Waiting before next request", { delayMs });
        await delay(delayMs);
      }
    }

    // Registrar log do batch
    await supabase
      .from("usda_import_logs")
      .insert({
        batch_id: batchId,
        items_processed: queueItems.length,
        items_success: successCount,
        items_failed: failedCount,
        completed_at: new Date().toISOString(),
      });

    logStep("Batch completed", { processed: queueItems.length, success: successCount, failed: failedCount });

    return new Response(
      JSON.stringify({
        success: true,
        batchId,
        processed: queueItems.length,
        successCount,
        failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("Error in import", { error: error.message });
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
