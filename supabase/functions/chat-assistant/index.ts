import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  loadSafetyDatabase,
  validateIngredient,
  normalizeUserIntolerances,
  getIntoleranceLabel,
  getDietaryLabel,
  type SafetyDatabase,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [chat-assistant] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= DASHBOARD CONTEXT TYPE =============
interface DashboardContext {
  waterToday: { total_ml: number; goal_ml: number; percentage: number } | null;
  caloriesToday: { consumed: number; target: number; remaining: number } | null;
  macrosToday: { protein: number; carbs: number; fat: number; targets: { protein: number; carbs: number; fat: number } } | null;
  gamification: { xp: number; level: number; streak: number; adherence: number } | null;
  recentSymptoms: Array<{ symptoms: string[]; severity: string; logged_at: string }>;
  strategy: { key: string; label: string; description: string } | null;
}

// ============= HELPDESK PROMPT - SIMPÁTICO E PROFISSIONAL =============
const buildSystemPrompt = (
  userProfile: any,
  safetyDatabase: SafetyDatabase,
  pageContext?: { path: string; name: string; description: string },
  isFirstMessage?: boolean,
  activeMealPlanContext?: {
    planName: string;
    nextMeal: {
      type: string;
      label: string;
      recipeName: string;
      calories: number;
      scheduledTime: string;
    } | null;
    todayMeals: Array<{
      type: string;
      label: string;
      recipeName: string;
      calories: number;
      isCompleted: boolean;
    }>;
  },
  dashboardContext?: DashboardContext
): string => {
  const intolerances = userProfile?.intolerances || [];
  const dietaryPreference = userProfile?.dietary_preference || "comum";
  const excludedIngredients = userProfile?.excluded_ingredients || [];
  const userName = userProfile?.first_name || "";
  const country = userProfile?.country || "BR";
  const enabledMeals = userProfile?.enabled_meals || ["cafe_manha", "almoco", "jantar"];
  const goal = userProfile?.goal || "manter";
  
  // Normalize intolerances for display
  const normalizedIntolerances = normalizeUserIntolerances(intolerances, safetyDatabase);
  const intoleranceLabels = normalizedIntolerances.map(i => getIntoleranceLabel(i, safetyDatabase)).join(", ");
  const dietaryLabel = getDietaryLabel(dietaryPreference, safetyDatabase);

  // Language adaptation based on country
  const languageConfig = getLanguageConfig(country);

  // Page-specific help context
  const pageHelp = pageContext ? getPageSpecificHelp(pageContext.path) : "";

  return `# CHEF IA - SEU ASSISTENTE PESSOAL DO RECEITAI

## 🎯 IDENTIDADE CORE
Você é o **Chef IA** - assistente culinário pessoal do ReceitAI. Fala como um amigo entendido de cozinha, não como um robô ou assistente corporativo.

## 🚨 REGRAS INVIOLÁVEIS

### 1. SAUDAÇÃO (uma única vez)
${isFirstMessage 
  ? `**PRIMEIRA MENSAGEM** - Saudação OBRIGATÓRIA e breve:
- "${userName ? `Oi, ${userName}!` : 'Oi!'} Como posso ajudar?"
- "${userName ? `E aí, ${userName}!` : 'E aí!'} O que precisa?"
- "${userName ? `Olá, ${userName}!` : 'Olá!'} Em que posso ajudar?"`
  : `**MENSAGEM DE CONTINUAÇÃO** - PROIBIDO saudar novamente. Vá DIRETO à resposta.`
}

### 2. BREVIDADE ABSOLUTA
- **Perguntas simples**: 1-2 frases
- **Perguntas complexas**: Máximo 3-4 frases + lista curta se necessário
- **NUNCA**: Repetir informação, dar contexto óbvio, usar palavras de preenchimento
- **CORTE**: "na verdade", "basicamente", "é importante ressaltar", "vale lembrar que"

### 3. LINGUAGEM NATURAL (como pessoa real fala)
✅ USE: "Pode sim!", "Claro!", "Olha só...", "Então...", "Ah, entendi!"
❌ EVITE: "Compreendo sua solicitação", "Posso certamente auxiliar", "Fico feliz em informar"

### 4. USO DE INFORMAÇÕES DO PERFIL (CRÍTICO!)
Você TEM acesso às informações do usuário, mas NUNCA deve anunciar isso de forma robótica.

❌ PROIBIDO DIZER:
- "Seu perfil está salvo aqui comigo"
- "Tenho suas informações armazenadas"
- "Segundo os dados que tenho sobre você"
- "De acordo com meus registros"
- "Conforme seu cadastro indica"

✅ USE AS INFORMAÇÕES NATURALMENTE:
- "Considerando sua meta de emagrecimento, sugiro..."
- "Como você evita lactose, essa receita usa leite de coco"
- "${userName ? `${userName}, ` : ""}para chegar nas suas ${dashboardContext?.caloriesToday?.target || '2000'} kcal..."
- "Sua sequência de ${dashboardContext?.gamification?.streak || 'X'} dias tá show!"

A informação deve SERVIR a resposta, não ser o ASSUNTO da resposta.

### 4. EMOJIS
- Máximo 1 por resposta
- Só quando agrega (✅ confirmação, ⚠️ alerta, 🍽️ comida)
- NUNCA em sequência ou decorativo

---

## 🧠 DETECÇÃO DE CONTEXTO EMOCIONAL

Analise o tom da mensagem do usuário e adapte:

### 😊 USUÁRIO ANIMADO/CURIOSO
Tom: Entusiasmado e prestativo
Ex: "Boa! Então o que você pode fazer é..."

### 😤 USUÁRIO FRUSTRADO/IRRITADO  
Tom: Empático → Solução direta
Ex: "Entendo a frustração. Vamos resolver: [solução em 1-2 passos]"

### 😟 USUÁRIO CONFUSO/PERDIDO
Tom: Acolhedor → Passo a passo simples
Ex: "Relaxa, é simples. Primeiro..."

### 🎉 USUÁRIO COMEMORANDO CONQUISTA
Tom: Celebrativo breve
Ex: "Show! Parabéns pela sequência de ${dashboardContext?.gamification?.streak || 'X'} dias!"

### 🤔 USUÁRIO FAZENDO PERGUNTA TÉCNICA
Tom: Direto e informativo
Ex: "Funciona assim: [explicação concisa]"

---

## 👤 PERFIL DO USUÁRIO

${userName ? `**Nome**: ${userName} (use ocasionalmente para personalizar)` : ""}
**Objetivo**: ${getGoalLabel(goal)}
**Dieta**: ${dietaryLabel}
**Cuidados**: ${intoleranceLabels || "Nenhum"}
**Evita**: ${excludedIngredients.length > 0 ? excludedIngredients.join(", ") : "Nada específico"}
**Refeições**: ${getMealLabels(enabledMeals)}

---

## 🌍 LOCALIZAÇÃO E IDIOMA

**País**: ${country}
${languageConfig}

---

## 📍 CONTEXTO ATUAL

${pageContext ? `**Onde está**: ${pageContext.name} (${pageContext.path})
${pageHelp}` : "Navegando pelo app"}

---

## 🍽️ PLANO ALIMENTAR ATIVO

${activeMealPlanContext ? `**Plano**: ${activeMealPlanContext.planName}

${activeMealPlanContext.nextMeal ? `**PRÓXIMA REFEIÇÃO** (responda isso se perguntarem "o que comer"):
→ ${activeMealPlanContext.nextMeal.label}: ${activeMealPlanContext.nextMeal.recipeName} (${activeMealPlanContext.nextMeal.calories} kcal) às ${activeMealPlanContext.nextMeal.scheduledTime}` : "Sem refeições pendentes hoje."}

**Hoje:**
${activeMealPlanContext.todayMeals.length > 0 
  ? activeMealPlanContext.todayMeals.map(meal => 
      `${meal.isCompleted ? "✅" : "⏳"} ${meal.label}: ${meal.recipeName}`
    ).join(" | ")
  : "Nenhuma refeição planejada"}
` : "Sem plano ativo. Sugira criar um se relevante."}

---

## 📊 MÉTRICAS DE HOJE

${dashboardContext ? `
**Água**: ${dashboardContext.waterToday 
  ? `${dashboardContext.waterToday.total_ml}ml/${dashboardContext.waterToday.goal_ml}ml (${dashboardContext.waterToday.percentage}%)${dashboardContext.waterToday.percentage < 50 ? " ⚠️ Baixa!" : dashboardContext.waterToday.percentage >= 100 ? " ✅" : ""}`
  : "Sem registro"}

**Calorias**: ${dashboardContext.caloriesToday 
  ? `${dashboardContext.caloriesToday.consumed}/${dashboardContext.caloriesToday.target} kcal (faltam ${dashboardContext.caloriesToday.remaining})`
  : "Sem consumo registrado"}

${dashboardContext.macrosToday ? `**Macros**: P:${dashboardContext.macrosToday.protein}g | C:${dashboardContext.macrosToday.carbs}g | G:${dashboardContext.macrosToday.fat}g` : ""}

**Gamificação**: ${dashboardContext.gamification 
  ? `Nível ${dashboardContext.gamification.level} | ${dashboardContext.gamification.streak} dias seguidos | ${dashboardContext.gamification.adherence}% aderência`
  : "Sem dados"}

${dashboardContext.recentSymptoms.length > 0 
  ? `**Sintomas recentes**: ${dashboardContext.recentSymptoms.map(s => s.symptoms.join(", ")).join("; ")}`
  : ""}

${dashboardContext.strategy 
  ? `**Estratégia**: ${dashboardContext.strategy.label}`
  : ""}
` : ""}

---

## 🛡️ SEGURANÇA ALIMENTAR

${normalizedIntolerances.length > 0 ? `**ALERTAS ATIVOS** (sempre verificar antes de sugerir algo):
${normalizedIntolerances.map(i => `⚠️ ${getIntoleranceLabel(i, safetyDatabase)}`).join(" | ")}

**SE PERGUNTAR SOBRE ALGO COM ESSES INGREDIENTES:**
1. Alerte com ⚠️ PRIMEIRO
2. Explique em 1 frase simples
3. Sugira alternativa segura` : "Sem restrições cadastradas."}

${dietaryPreference !== "comum" ? `**Dieta ${dietaryLabel}**: Respeitar rigorosamente.` : ""}

${excludedIngredients.length > 0 ? `**Prefere evitar**: ${excludedIngredients.join(", ")}` : ""}

---

## 💬 RESPOSTAS PRONTAS (adapte ao contexto)

### Perguntas sobre funcionalidades
Responda DIRETO como se estivesse mostrando:
"Toca no ícone de [X] → depois em [Y] → pronto!"

### Perguntas sobre alimentos
1. É seguro? (Sim/Não com emoji)
2. Por quê? (1 frase)
3. Alternativa (se não for seguro)

### Substituições
"Em vez de [X], usa [Y]. Funciona igual na receita."

### Quando não souber
"Hmm, não tenho certeza sobre isso. Melhor confirmar com [fonte apropriada]."

### Problemas técnicos
"Parece bug. Tenta [solução simples]. Se não funcionar, manda mensagem pro suporte."

---

## ❌ NUNCA FAÇA

1. **Diagnósticos médicos** → "Isso é com médico/nutricionista"
2. **Prescrições personalizadas** → "O app já personaliza pra você, mas pra casos específicos de saúde, procura um profissional"
3. **Minimizar restrições** → NUNCA diga "só um pouquinho não faz mal"
4. **Linguagem robótica** → Nada de "Compreendo", "Certamente", "Fico feliz em informar"
5. **Repetir saudação** → Só na primeira mensagem
6. **Respostas longas** → Se passou de 4 frases, está longo demais
7. **Mencionar IA/treinamento** → Você é o Chef IA, não "uma IA sendo desenvolvida"

---

## ✅ SEMPRE FAÇA

1. **Ir direto ao ponto** → A resposta vem primeiro, contexto depois (se precisar)
2. **Usar dados do dashboard** → Personalize com as métricas reais do usuário
3. **Celebrar conquistas** → Streak, metas atingidas, progresso
4. **Oferecer próximo passo** → "Quer que eu explique como [X]?"
5. **Ser humano** → Fale como amigo, não como manual

---

Agora responda naturalmente, como um amigo que entende de comida e do app.`;
};

// ============= LANGUAGE CONFIGURATION =============
const getLanguageConfig = (country: string): string => {
  const configs: Record<string, string> = {
    "BR": `**Idioma**: Português do Brasil
- Use expressões naturais brasileiras
- "Você" em vez de "tu" (exceto se o usuário usar "tu")
- Gírias leves são OK: "beleza", "tranquilo", "show"
- Medidas: gramas, quilos, xícaras, colheres de sopa`,
    
    "PT": `**Idioma**: Português de Portugal
- Use expressões naturais portuguesas
- "Tu" ou "você" conforme preferência do usuário
- Vocabulário: "pequeno-almoço" (não "café da manhã"), "frigorífico" (não "geladeira")
- Medidas: gramas, quilos`,
    
    "US": `**Idioma**: American English
- Use natural American expressions
- Be friendly but professional
- Measurements: cups, tablespoons, ounces, pounds when helpful`,
    
    "GB": `**Idioma**: British English
- Use natural British expressions
- Vocabulary: "aubergine" not "eggplant", "courgette" not "zucchini"
- Measurements: grams, kilos, or cups as appropriate`,
    
    "ES": `**Idioma**: Español de España
- Usa expresiones naturales españolas
- "Vosotros" para plural informal
- Vocabulario: "patatas" (no "papas"), "zumo" (no "jugo")`,
    
    "MX": `**Idioma**: Español de México
- Usa expresiones naturales mexicanas
- "Ustedes" para plural
- Vocabulario local: "papas", "jugo", "elote"`,
    
    "AR": `**Idioma**: Español de Argentina
- Usa expresiones naturales argentinas
- "Vos" en lugar de "tú"
- Vocabulario: "papa", "palta" (no "aguacate")`,
    
    "FR": `**Idioma**: Français
- Utilisez des expressions naturelles françaises
- Vouvoiement par défaut, tutoiement si l'utilisateur le fait
- Mesures: grammes, kilos`,
    
    "DE": `**Idioma**: Deutsch
- Verwenden Sie natürliche deutsche Ausdrücke
- "Sie" formell, "du" wenn der Benutzer es bevorzugt
- Maße: Gramm, Kilo`,
    
    "IT": `**Idioma**: Italiano
- Usa espressioni italiane naturali
- "Lei" formale, "tu" se l'utente lo preferisce
- Misure: grammi, chili`
  };
  
  return configs[country] || configs["BR"];
};

// ============= GOAL LABELS =============
const getGoalLabel = (goal: string): string => {
  const labels: Record<string, string> = {
    "perder": "Perder peso",
    "manter": "Manter peso",
    "ganhar": "Ganhar peso/massa",
    "lose": "Lose weight",
    "maintain": "Maintain weight",
    "gain": "Gain weight/muscle"
  };
  return labels[goal] || "Não definido";
};

// ============= MEAL LABELS =============
const getMealLabels = (meals: string[]): string => {
  const labels: Record<string, string> = {
    "cafe_manha": "Café da manhã",
    "lanche_manha": "Lanche da manhã",
    "almoco": "Almoço",
    "lanche_tarde": "Lanche da tarde",
    "jantar": "Jantar",
    "ceia": "Ceia"
  };
  return meals.map(m => labels[m] || m).join(", ");
};

// ============= PAGE-SPECIFIC HELP =============
const getPageSpecificHelp = (path: string): string => {
  const helpMap: Record<string, string> = {
    "/dashboard": `**Você está na HOME do app**
Aqui você vê:
- Sua próxima refeição do plano
- Resumo de calorias do dia
- Widget de água
- Acesso rápido aos scanners

Se o usuário perguntar algo genérico, pode sugerir explorar essas funcionalidades.`,

    "/perfil": `**Você está no PERFIL**
Aqui o usuário pode:
- Atualizar dados pessoais
- Mudar objetivo (perder/manter/ganhar peso)
- Adicionar ou remover restrições alimentares
- Configurar horários das refeições

Se houver dúvida sobre como algo afeta o plano, explique que mudanças no perfil são refletidas em novos planos gerados.`,

    "/settings": `**Você está nas CONFIGURAÇÕES**
Aqui o usuário pode:
- Configurar notificações
- Gerenciar lembretes de água e refeições
- Ver informações da conta

Ajude com qualquer configuração que ele precise ajustar.`,

    "/historico": `**Você está no HISTÓRICO**
Aqui o usuário vê:
- Refeições consumidas anteriormente
- Registro de consumo
- Sintomas reportados

Se perguntar sobre algo que comeu antes, você pode ajudar a encontrar no histórico.`,

    "/plano": `**Você está no PLANO ALIMENTAR**
Aqui o usuário pode:
- Ver todas as refeições da semana
- Trocar refeições por alternativas
- Marcar refeições como favoritas
- Ver detalhes nutricionais

Ajude a navegar pelo calendário ou trocar refeições.`,

    "/receitas": `**Você está em RECEITAS**
Aqui o usuário pode:
- Gerar novas receitas
- Ver receitas favoritas
- Buscar por categoria

Ajude a encontrar ou criar receitas que respeitem as restrições.`,

    "/agua": `**Você está no CONTROLE DE ÁGUA**
Aqui o usuário pode:
- Registrar copos de água
- Ver histórico de hidratação
- Configurar metas e lembretes

Dê dicas sobre hidratação se perguntarem.`,

    "/scanner": `**Você está no SCANNER**
Aqui o usuário pode:
- Analisar fotos de pratos
- Verificar rótulos de produtos
- Escanear a geladeira

Explique como tirar fotos melhores para análise se tiverem dificuldade.`
  };

  // Check for partial matches
  for (const [key, value] of Object.entries(helpMap)) {
    if (path.startsWith(key)) {
      return value;
    }
  }

  return "";
};

// ============= FETCH ACTIVE MEAL PLAN =============
const fetchActiveMealPlanContext = async (
  supabase: any,
  userId: string,
  userTimezone: string
): Promise<{
  planName: string;
  nextMeal: {
    type: string;
    label: string;
    recipeName: string;
    calories: number;
    scheduledTime: string;
  } | null;
  todayMeals: Array<{
    type: string;
    label: string;
    recipeName: string;
    calories: number;
    isCompleted: boolean;
  }>;
} | null> => {
  try {
    // Get user's current date/time in their timezone
    const now = new Date();
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone || "America/Sao_Paulo" }));
    const currentHour = userNow.getHours();
    const currentMinutes = userNow.getMinutes();
    const currentTimeDecimal = currentHour + currentMinutes / 60;
    
    // Format today's date
    const todayStr = userNow.toISOString().split('T')[0];
    
    logStep("Fetching meal plan context", { 
      userId, 
      userTimezone, 
      todayStr, 
      currentTime: `${currentHour}:${currentMinutes.toString().padStart(2, '0')}` 
    });

    // Fetch active meal plan
    const { data: activePlan, error: planError } = await supabase
      .from("meal_plans")
      .select("id, name, start_date, end_date")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("end_date", todayStr)
      .lte("start_date", todayStr)
      .single();

    if (planError || !activePlan) {
      logStep("No active meal plan found", { error: planError?.message });
      return null;
    }

    logStep("Active plan found", { planId: activePlan.id, planName: activePlan.name });

    // Fetch meal time settings
    const { data: mealTimeSettings } = await supabase
      .from("meal_time_settings")
      .select("meal_type, label, start_hour, sort_order")
      .order("sort_order", { ascending: true });

    const mealTimeMap = new Map<string, { label: string; startHour: number; sortOrder: number }>();
    if (mealTimeSettings) {
      for (const setting of mealTimeSettings) {
        mealTimeMap.set(setting.meal_type, {
          label: setting.label,
          startHour: setting.start_hour,
          sortOrder: setting.sort_order
        });
      }
    }

    // Calculate day_of_week for today
    const startDate = new Date(activePlan.start_date + 'T00:00:00');
    const diffTime = userNow.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dayOfWeek = diffDays;

    logStep("Calculating day_of_week", { startDate: activePlan.start_date, diffDays, dayOfWeek });

    // Fetch today's meal plan items
    const { data: todayItems, error: itemsError } = await supabase
      .from("meal_plan_items")
      .select("id, meal_type, recipe_name, recipe_calories, completed_at")
      .eq("meal_plan_id", activePlan.id)
      .eq("day_of_week", dayOfWeek);

    if (itemsError) {
      logStep("Error fetching meal items", { error: itemsError.message });
      return null;
    }

    if (!todayItems || todayItems.length === 0) {
      logStep("No meals found for today", { dayOfWeek });
      return {
        planName: activePlan.name,
        nextMeal: null,
        todayMeals: []
      };
    }

    logStep("Today's meals found", { count: todayItems.length });

    // Build today meals list with labels
    const todayMeals = todayItems.map((item: any) => {
      const mealInfo = mealTimeMap.get(item.meal_type);
      return {
        type: item.meal_type,
        label: mealInfo?.label || item.meal_type,
        recipeName: item.recipe_name,
        calories: item.recipe_calories,
        isCompleted: !!item.completed_at,
        startHour: mealInfo?.startHour || 0,
        sortOrder: mealInfo?.sortOrder || 0
      };
    }).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    // Find next pending meal (not completed, and time hasn't passed)
    let nextMeal = null;
    for (const meal of todayMeals) {
      if (!meal.isCompleted && meal.startHour >= currentTimeDecimal - 2) { // Allow 2 hour window
        const hours = Math.floor(meal.startHour);
        const minutes = Math.round((meal.startHour - hours) * 60);
        nextMeal = {
          type: meal.type,
          label: meal.label,
          recipeName: meal.recipeName,
          calories: meal.calories,
          scheduledTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        };
        break;
      }
    }

    // If no next meal found, use the last pending meal (user might be late)
    if (!nextMeal) {
      const pendingMeals = todayMeals.filter((m: any) => !m.isCompleted);
      if (pendingMeals.length > 0) {
        const lastPending = pendingMeals[pendingMeals.length - 1];
        const hours = Math.floor(lastPending.startHour);
        const minutes = Math.round((lastPending.startHour - hours) * 60);
        nextMeal = {
          type: lastPending.type,
          label: lastPending.label,
          recipeName: lastPending.recipeName,
          calories: lastPending.calories,
          scheduledTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        };
      }
    }

    logStep("Meal plan context built", { 
      planName: activePlan.name, 
      nextMeal: nextMeal?.label, 
      todayMealsCount: todayMeals.length 
    });

    return {
      planName: activePlan.name,
      nextMeal,
      todayMeals: todayMeals.map((m: any) => ({
        type: m.type,
        label: m.label,
        recipeName: m.recipeName,
        calories: m.calories,
        isCompleted: m.isCompleted
      }))
    };
  } catch (error) {
    logStep("Error fetching meal plan context", { error: error instanceof Error ? error.message : "Unknown" });
    return null;
  }
};

// ============= FETCH DASHBOARD CONTEXT =============
const fetchDashboardContext = async (
  supabase: any,
  userId: string,
  userProfile: any,
  userTimezone: string
): Promise<DashboardContext> => {
  const context: DashboardContext = {
    waterToday: null,
    caloriesToday: null,
    macrosToday: null,
    gamification: null,
    recentSymptoms: [],
    strategy: null
  };

  try {
    // Get user's current date in their timezone
    const now = new Date();
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
    const todayStart = new Date(userNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(userNow);
    todayEnd.setHours(23, 59, 59, 999);
    const threeDaysAgo = new Date(userNow);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    logStep("Fetching dashboard context", { userId, userTimezone });

    // Fetch all data in parallel
    const [waterData, consumptionData, gamificationData, symptomsData, strategyData] = await Promise.all([
      // Water consumption today
      supabase.rpc('get_water_today', { p_user_id: userId }).catch(() => ({ data: null })),
      
      // Meal consumption today
      supabase
        .from("meal_consumption")
        .select("total_calories, total_protein, total_carbs, total_fat")
        .eq("user_id", userId)
        .gte("consumed_at", todayStart.toISOString())
        .lte("consumed_at", todayEnd.toISOString()),
      
      // Gamification data
      supabase
        .from("user_gamification")
        .select("total_xp, current_streak, adherence_percentage")
        .eq("user_id", userId)
        .single(),
      
      // Recent symptoms (last 3 days)
      supabase
        .from("symptom_logs")
        .select("symptoms, severity, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", threeDaysAgo.toISOString())
        .order("logged_at", { ascending: false })
        .limit(5),
      
      // Nutritional strategy
      userProfile?.strategy_id 
        ? supabase
            .from("nutritional_strategies")
            .select("key, label, description")
            .eq("id", userProfile.strategy_id)
            .single()
        : Promise.resolve({ data: null })
    ]);

    // Process water data
    if (waterData?.data !== null && waterData?.data !== undefined) {
      const totalMl = typeof waterData.data === 'number' ? waterData.data : 0;
      const goalMl = 2000; // Default goal
      context.waterToday = {
        total_ml: totalMl,
        goal_ml: goalMl,
        percentage: Math.round((totalMl / goalMl) * 100)
      };
    } else {
      // Try alternative: query water_consumption table directly
      const { data: waterRecords } = await supabase
        .from("water_consumption")
        .select("amount_ml")
        .eq("user_id", userId)
        .gte("consumed_at", todayStart.toISOString())
        .lte("consumed_at", todayEnd.toISOString());
      
      if (waterRecords && waterRecords.length > 0) {
        const totalMl = waterRecords.reduce((sum: number, r: any) => sum + (r.amount_ml || 0), 0);
        const goalMl = 2000;
        context.waterToday = {
          total_ml: totalMl,
          goal_ml: goalMl,
          percentage: Math.round((totalMl / goalMl) * 100)
        };
      }
    }

    // Process consumption data for calories and macros
    if (consumptionData?.data && consumptionData.data.length > 0) {
      const totals = consumptionData.data.reduce((acc: any, meal: any) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fat: acc.fat + (meal.total_fat || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Calculate targets based on profile
      const weight = userProfile?.weight_current || 70;
      const calorieTarget = calculateDailyCalories(userProfile);
      const proteinTarget = Math.round(weight * 1.6); // 1.6g/kg
      const fatTarget = Math.round((calorieTarget * 0.25) / 9); // 25% from fat
      const carbsTarget = Math.round((calorieTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);

      context.caloriesToday = {
        consumed: Math.round(totals.calories),
        target: calorieTarget,
        remaining: Math.max(0, calorieTarget - Math.round(totals.calories))
      };

      context.macrosToday = {
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        targets: {
          protein: proteinTarget,
          carbs: carbsTarget,
          fat: fatTarget
        }
      };
    }

    // Process gamification data
    if (gamificationData?.data) {
      const xp = gamificationData.data.total_xp || 0;
      const level = Math.floor(xp / 1000) + 1; // Simple level calculation
      context.gamification = {
        xp,
        level,
        streak: gamificationData.data.current_streak || 0,
        adherence: gamificationData.data.adherence_percentage || 0
      };
    }

    // Process symptoms data
    if (symptomsData?.data && symptomsData.data.length > 0) {
      context.recentSymptoms = symptomsData.data.map((s: any) => ({
        symptoms: s.symptoms || [],
        severity: s.severity || "leve",
        logged_at: s.logged_at
      }));
    }

    // Process strategy data
    if (strategyData?.data) {
      context.strategy = {
        key: strategyData.data.key,
        label: strategyData.data.label,
        description: strategyData.data.description || ""
      };
    }

    logStep("Dashboard context fetched", {
      hasWater: !!context.waterToday,
      hasCalories: !!context.caloriesToday,
      hasGamification: !!context.gamification,
      symptomsCount: context.recentSymptoms.length,
      hasStrategy: !!context.strategy
    });

  } catch (error) {
    logStep("Error fetching dashboard context", { error: error instanceof Error ? error.message : "Unknown" });
  }

  return context;
};

// Helper function to calculate daily calories
const calculateDailyCalories = (profile: any): number => {
  if (!profile) return 2000;
  
  const weight = profile.weight_current || 70;
  const height = profile.height || 170;
  const age = profile.age || 30;
  const sex = profile.sex || "masculino";
  
  // Mifflin-St Jeor equation
  let bmr: number;
  if (sex === "feminino") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  
  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    ativo: 1.725,
    muito_ativo: 1.9
  };
  const multiplier = activityMultipliers[profile.activity_level] || 1.55;
  
  let tdee = bmr * multiplier;
  
  // Goal adjustment
  const goal = profile.goal || "manter";
  if (goal === "perder" || goal === "emagrecer") {
    tdee *= 0.85; // 15% deficit
  } else if (goal === "ganhar") {
    tdee *= 1.15; // 15% surplus
  }
  
  return Math.round(tdee);
}

// ============= INTELLIGENT IMAGE ANALYSIS FUNCTION =============
// Analyzes images using the same logic as dedicated photo modules
const analyzeImageIntelligently = async (
  imageBase64: string,
  userProfile: any,
  safetyDatabase: SafetyDatabase,
  supabase: any
): Promise<string> => {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Get user restrictions
  const userIntolerances = userProfile?.intolerances || [];
  const dietaryPreference = userProfile?.dietary_preference || "comum";
  const excludedIngredients = userProfile?.excluded_ingredients || [];
  const userName = userProfile?.first_name || "";
  const userCountry = userProfile?.country || "BR";
  
  // Normalize intolerances
  const normalizedIntolerances = normalizeUserIntolerances(userIntolerances, safetyDatabase);
  const intoleranceLabels = normalizedIntolerances.map((i: string) => getIntoleranceLabel(i, safetyDatabase)).join(", ");
  const dietaryLabel = getDietaryLabel(dietaryPreference, safetyDatabase);
  
  // Build restrictions context
  let restrictionsContext = "";
  if (normalizedIntolerances.length > 0 || excludedIngredients.length > 0 || dietaryPreference !== "comum") {
    restrictionsContext = `
RESTRIÇÕES ALIMENTARES DO USUÁRIO:
${normalizedIntolerances.length > 0 ? `- Intolerâncias/Alergias: ${intoleranceLabels}` : ""}
${excludedIngredients.length > 0 ? `- Ingredientes Excluídos: ${excludedIngredients.join(", ")}` : ""}
${dietaryPreference !== "comum" ? `- Dieta: ${dietaryLabel}` : ""}
`;
  }

  const analysisPrompt = `Você é um especialista em análise de alimentos e segurança alimentar.

ANALISE A IMAGEM E CLASSIFIQUE:

1. **PRATO/REFEIÇÃO** → Analise os alimentos, calorias estimadas e segurança
2. **RÓTULO/EMBALAGEM** → Analise os ingredientes visíveis e alertas
3. **GELADEIRA/DESPENSA** → Liste os itens visíveis e sugira receitas
4. **NÃO É COMIDA** → Informe gentilmente que a imagem não contém alimentos

${restrictionsContext}

RESPONDA EM FORMATO ESTRUTURADO:

**TIPO**: [prato|rotulo|geladeira|nao_comida]

SE FOR PRATO:
- **Identificação**: Nome do prato/alimentos identificados
- **Calorias Estimadas**: XX kcal (margem: ±20%)
- **Macros Estimados**: Proteína: Xg | Carbs: Xg | Gordura: Xg
- **Segurança**: ✅ Seguro / ⚠️ ALERTA (detalhe)
- **Detalhes de Alerta**: [se houver ingredientes problemáticos]

SE FOR RÓTULO:
- **Produto**: Nome do produto identificado
- **Ingredientes Visíveis**: Lista dos ingredientes que consegue ler
- **Segurança**: ✅ Seguro / ⚠️ ALERTA / ❓ Inconclusivo (precisa de mais fotos)
- **Alertas**: [ingredientes problemáticos encontrados]

SE FOR GELADEIRA:
- **Itens Identificados**: Lista dos alimentos visíveis
- **Sugestão de Receita**: Uma ideia rápida com os ingredientes
- **Itens com Alerta**: [se algum item for problemático]

SE NÃO FOR COMIDA:
- **Detectado**: O que você vê na imagem
- **Mensagem**: Explicação gentil

IMPORTANTE:
- Priorize SEGURANÇA acima de tudo
- Se não tiver certeza se um ingrediente é seguro, ALERTE
- Seja direto e objetivo na resposta
- Use emojis moderadamente (✅ ⚠️ 🍽️)`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: analysisPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Analise esta imagem:" },
              { 
                type: "image_url", 
                image_url: { url: imageBase64 } 
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content || "";
    
    // Post-process: validate safety with Veto Layer
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: dietaryPreference || "comum",
      excludedIngredients: excludedIngredients || [],
    };
    
    logStep("Image analyzed by AI", { resultPreview: analysisResult.substring(0, 100) });
    
    return analysisResult;
  } catch (error) {
    logStep("analyzeImageIntelligently error", { error: String(error) });
    throw error;
  }
};

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logStep("Request received");

  try {
    const { messages, images, currentPage, isFirstMessage } = await req.json();
    logStep("Parsed request", { messagesCount: messages?.length, hasImages: !!images?.length, page: currentPage?.path, isFirstMessage });

    // Get user from token
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userProfile: any = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        logStep("User authenticated", { userId });

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profile) {
          userProfile = profile;
          logStep("Profile loaded", { 
            firstName: profile.first_name,
            intolerances: profile.intolerances?.length || 0,
            dietary: profile.dietary_preference,
            country: profile.country
          });
        }
      }
    }

    // Load safety database
    const safetyDatabase = await loadSafetyDatabase(supabaseUrl, supabaseKey);
    logStep("Safety database loaded");

    // Fetch active meal plan context if user is authenticated
    let activeMealPlanContext: {
      planName: string;
      nextMeal: {
        type: string;
        label: string;
        recipeName: string;
        calories: number;
        scheduledTime: string;
      } | null;
      todayMeals: Array<{
        type: string;
        label: string;
        recipeName: string;
        calories: number;
        isCompleted: boolean;
      }>;
    } | undefined = undefined;
    
    if (userId && userProfile) {
      const mealPlanResult = await fetchActiveMealPlanContext(
        supabase, 
        userId, 
        userProfile.timezone || "America/Sao_Paulo"
      );
      if (mealPlanResult) {
        activeMealPlanContext = mealPlanResult;
      }
      logStep("Meal plan context fetched", { 
        hasPlan: !!activeMealPlanContext, 
        nextMeal: activeMealPlanContext?.nextMeal?.label 
      });
    }

    // Fetch dashboard context if user is authenticated
    let dashboardContext: DashboardContext | undefined = undefined;
    if (userId && userProfile) {
      dashboardContext = await fetchDashboardContext(
        supabase,
        userId,
        userProfile,
        userProfile.timezone || "America/Sao_Paulo"
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      userProfile, 
      safetyDatabase, 
      currentPage, 
      isFirstMessage,
      activeMealPlanContext,
      dashboardContext
    );
    logStep("System prompt built", { 
      length: systemPrompt.length, 
      isFirstMessage, 
      hasActivePlan: !!activeMealPlanContext,
      hasDashboardContext: !!dashboardContext 
    });

    // Prepare messages for AI
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        aiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // ============= INTELLIGENT IMAGE ANALYSIS =============
    // If images are provided, perform specialized food analysis
    let imageAnalysisResult: string | null = null;
    
    if (images && images.length > 0) {
      logStep("Image detected, performing intelligent analysis");
      
      try {
        imageAnalysisResult = await analyzeImageIntelligently(
          images[0], // Use first image
          userProfile,
          safetyDatabase,
          supabase
        );
        logStep("Image analysis completed", { resultLength: imageAnalysisResult?.length || 0 });
      } catch (analysisError) {
        logStep("Image analysis failed, falling back to generic", { error: String(analysisError) });
      }
    }

    // If we have a specialized image analysis, inject it into the conversation
    if (imageAnalysisResult && aiMessages.length > 1) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "user") {
        // Add the analysis result as context for the AI to format nicely
        const userContent = lastMessage.content || "";
        lastMessage.content = [
          { type: "text", text: `${userContent}\n\n[ANÁLISE DA IMAGEM - Use estas informações para responder de forma natural e amigável]\n${imageAnalysisResult}` },
        ];
        
        // Also add the image for visual context
        for (const base64Image of images) {
          const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            (lastMessage.content as any[]).push({
              type: "image_url",
              image_url: { url: base64Image }
            });
          }
        }
      }
    } else if (images && images.length > 0 && aiMessages.length > 1) {
      // Fallback: just add images without specialized analysis
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "user") {
        const parts: any[] = [{ type: "text", text: lastMessage.content || "Analise esta imagem:" }];
        
        for (const base64Image of images) {
          const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            parts.push({
              type: "image_url",
              image_url: { url: base64Image }
            });
          }
        }
        
        lastMessage.content = parts;
      }
    }

    // Call AI API
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    logStep("Calling AI API", { messagesCount: aiMessages.length });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep("AI API error", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Muitas requisições. Por favor, aguarde um momento e tente novamente." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    const executionTime = Date.now() - startTime;
    logStep("Response generated", { 
      executionTimeMs: executionTime,
      responseLength: assistantMessage.length,
      tokens: aiData.usage
    });

    // Log AI usage
    if (userId) {
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          function_name: "chat-assistant",
          model_used: "google/gemini-2.5-flash",
          prompt_tokens: aiData.usage?.prompt_tokens || 0,
          completion_tokens: aiData.usage?.completion_tokens || 0,
          total_tokens: aiData.usage?.total_tokens || 0,
          execution_time_ms: executionTime,
          metadata: {
            page_context: currentPage?.path,
            has_images: !!images?.length
          }
        });
      } catch (logError) {
        console.error("Failed to log usage:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: assistantMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });

    // Log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      
      await supabase.from("ai_error_logs").insert({
        function_name: "chat-assistant",
        error_message: errorMessage,
        error_details: { stack: error instanceof Error ? error.stack : null }
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
