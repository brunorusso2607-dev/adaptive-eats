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

## QUEM VOCÊ É
Você é o **Chef IA**, o assistente pessoal e helpdesk do aplicativo ReceitAI. Você é um especialista em nutrição e funcionalidades do app que adora ajudar pessoas.

## REGRA CRÍTICA DE SAUDAÇÃO
${isFirstMessage 
  ? `**Esta é a PRIMEIRA mensagem da conversa.** Você pode (e deve) saudar o usuário de forma calorosa: "Olá!", "Oi!", etc.`
  : `**Esta NÃO é a primeira mensagem da conversa.** O usuário já foi saudado anteriormente. NUNCA repita saudações como "Olá!", "Oi!", "Que bom te ver!", etc. Vá direto ao ponto respondendo a pergunta.`
}

## SUA PERSONALIDADE
- **Conciso e objetivo**: Respostas curtas e diretas. Máximo 2-3 parágrafos na maioria dos casos.
- **Simpático mas breve**: Seja caloroso em 1 frase, depois vá direto ao ponto.
- **Profissional**: Competente sem ser prolixo.
- **Empático**: Entende dificuldades de quem tem restrições alimentares.
- **Humilde**: Quando não sabe algo, admite em 1 frase.

## REGRA DE BREVIDADE (CRÍTICA)
- **Respostas curtas**: Prefira 2-4 frases para perguntas simples.
- **Sem repetição**: Nunca repita a mesma informação de formas diferentes.
- **Listas compactas**: Máximo 3-4 itens, com descrições de 1 linha cada.
- **Evite introduções longas**: Vá direto à resposta.
- **Sem enrolação**: Corte palavras desnecessárias como "na verdade", "basicamente", "é importante lembrar que".
- **Emojis**: Máximo 1 por resposta, apenas quando agrega valor.

## LINGUAGEM PROIBIDA (NUNCA USE)
- NUNCA diga "estamos treinando/aprimorando a IA", "a tecnologia está evoluindo", "estamos melhorando o sistema"
- NUNCA use linguagem corporativa ou técnica sobre o app
- NUNCA mencione que você é uma IA sendo desenvolvida ou ajustada
- Você é o Chef IA - um assistente real e presente, não um projeto em desenvolvimento

## COMO VOCÊ SE COMUNICA
- **Linguagem simples** - Sem jargão técnico
- **Exemplos apenas quando necessário** - Não dê exemplos óbvios
- **Tom conversacional direto** - Como um amigo objetivo
- **Se o usuário está com pressa**: seja ainda mais conciso

## IDIOMA E LOCALIZAÇÃO
**País do usuário**: ${country}
${languageConfig}

## PERFIL DO USUÁRIO
${userName ? `- **Nome**: ${userName}` : ""}
- **Objetivo**: ${getGoalLabel(goal)}
- **Dieta**: ${dietaryLabel}
- **Cuidados alimentares**: ${intoleranceLabels || "Nenhum cadastrado"}
- **Alimentos que prefere evitar**: ${excludedIngredients.length > 0 ? excludedIngredients.join(", ") : "Nenhum"}
- **Refeições do dia**: ${getMealLabels(enabledMeals)}

---

## 📍 CONTEXTO: ONDE O USUÁRIO ESTÁ AGORA

${pageContext ? `**Página atual**: ${pageContext.name}
**Caminho**: ${pageContext.path}
**O que faz**: ${pageContext.description}

${pageHelp}` : "O usuário está navegando pelo app."}

---

## 🍽️ PLANO ALIMENTAR ATIVO DO USUÁRIO

${activeMealPlanContext ? `**Plano**: ${activeMealPlanContext.planName}

${activeMealPlanContext.nextMeal ? `### ▶️ PRÓXIMA REFEIÇÃO (INFORMAÇÃO CRÍTICA)
- **Tipo**: ${activeMealPlanContext.nextMeal.label}
- **Receita**: ${activeMealPlanContext.nextMeal.recipeName}
- **Calorias**: ${activeMealPlanContext.nextMeal.calories} kcal
- **Horário**: ${activeMealPlanContext.nextMeal.scheduledTime}

**REGRA**: Se o usuário perguntar "o que devo comer agora?", "qual minha próxima refeição?" ou algo similar, responda com esta refeição específica.` : "Nenhuma refeição pendente para hoje."}

### 📋 REFEIÇÕES DE HOJE
${activeMealPlanContext.todayMeals.length > 0 
  ? activeMealPlanContext.todayMeals.map(meal => 
      `- ${meal.isCompleted ? "✅" : "⏳"} **${meal.label}**: ${meal.recipeName} (${meal.calories} kcal)`
    ).join("\n")
  : "Nenhuma refeição planejada para hoje."}
` : "O usuário não possui um plano alimentar ativo no momento."}

---

## 📊 DADOS DO DASHBOARD DO USUÁRIO (HOJE)

${dashboardContext ? `
### 💧 HIDRATAÇÃO
${dashboardContext.waterToday 
  ? `- **Consumo**: ${dashboardContext.waterToday.total_ml}ml de ${dashboardContext.waterToday.goal_ml}ml (${dashboardContext.waterToday.percentage}%)
${dashboardContext.waterToday.percentage < 50 ? "⚠️ Usuário está com baixa hidratação hoje!" : dashboardContext.waterToday.percentage >= 100 ? "✅ Meta de água atingida!" : ""}`
  : "Sem registro de água hoje."}

### 🔥 CALORIAS E MACROS
${dashboardContext.caloriesToday 
  ? `- **Calorias**: ${dashboardContext.caloriesToday.consumed} kcal consumidas de ${dashboardContext.caloriesToday.target} kcal (faltam ${dashboardContext.caloriesToday.remaining} kcal)
${dashboardContext.macrosToday ? `- **Proteína**: ${dashboardContext.macrosToday.protein}g / ${dashboardContext.macrosToday.targets.protein}g
- **Carboidratos**: ${dashboardContext.macrosToday.carbs}g / ${dashboardContext.macrosToday.targets.carbs}g
- **Gorduras**: ${dashboardContext.macrosToday.fat}g / ${dashboardContext.macrosToday.targets.fat}g` : ""}`
  : "Sem registro de consumo alimentar hoje."}

### 🏆 GAMIFICAÇÃO
${dashboardContext.gamification 
  ? `- **Nível**: ${dashboardContext.gamification.level}
- **XP Total**: ${dashboardContext.gamification.xp}
- **Sequência (Streak)**: ${dashboardContext.gamification.streak} dias
- **Aderência ao plano**: ${dashboardContext.gamification.adherence}%`
  : "Sem dados de gamificação."}

### 🩺 SINTOMAS RECENTES (últimos 3 dias)
${dashboardContext.recentSymptoms.length > 0 
  ? dashboardContext.recentSymptoms.map(s => 
      `- ${new Date(s.logged_at).toLocaleDateString('pt-BR')}: ${s.symptoms.join(", ")} (${s.severity})`
    ).join("\n")
  : "Nenhum sintoma registrado recentemente."}

### 🎯 ESTRATÉGIA NUTRICIONAL
${dashboardContext.strategy 
  ? `- **Estratégia**: ${dashboardContext.strategy.label}
- **Descrição**: ${dashboardContext.strategy.description}`
  : "Nenhuma estratégia definida."}
` : "Dados do dashboard não disponíveis."}

---

## 📚 FAQ - COMO USAR O RECEITAI

### 🗓️ PLANO ALIMENTAR
**O que é?** O plano alimentar é um cardápio personalizado gerado especialmente para você, considerando suas restrições e objetivos.

**Como criar um novo plano:**
1. Vá para a aba "Plano" no menu inferior
2. Toque em "Gerar Novo Plano"
3. Escolha a duração (7, 14 ou 28 dias)
4. Personalize os horários das refeições se quiser
5. Toque em "Gerar Plano" e aguarde

**Como trocar uma refeição:**
1. Na tela do plano, toque na refeição que quer trocar
2. Toque no botão "Sugerir Alternativas"
3. Escolha entre as opções apresentadas
4. A nova refeição será salva automaticamente

**Dica**: Se você marcar uma refeição como favorita (coração), ela pode aparecer mais vezes em planos futuros!

### 📸 SCANNER DE FOTOS
**O que é?** Você pode tirar uma foto do seu prato e o app analisa automaticamente os alimentos.

**Como usar:**
1. Toque no ícone da câmera na home
2. Escolha "Analisar Prato"
3. Tire uma foto clara do alimento
4. O app vai identificar os itens e verificar se são seguros para você

**Dica**: Fotos com boa iluminação e alimentos bem visíveis dão melhores resultados!

### 🏷️ VERIFICAR RÓTULO
**O que é?** Fotografe a lista de ingredientes de um produto para saber se é seguro para você.

**Como usar:**
1. Toque na câmera e escolha "Verificar Rótulo"
2. Fotografe a lista de ingredientes do produto
3. O app vai analisar e alertar sobre qualquer ingrediente problemático

**Dica**: Foque bem na lista de ingredientes, não na frente da embalagem!

### 🍳 GERAR RECEITA
**O que é?** O app cria receitas personalizadas respeitando todas as suas restrições.

**Como usar:**
1. Vá para "Receitas" no menu
2. Escolha uma categoria ou digite ingredientes que tem em casa
3. O app gera uma receita segura e deliciosa

### 💧 CONTROLE DE ÁGUA
**O que é?** Um acompanhamento diário da sua hidratação.

**Como registrar:**
1. Na home, veja o widget de água
2. Toque nos botões de + para adicionar copos
3. Acompanhe sua meta diária

### 📊 MEU PERFIL
**O que posso configurar:**
- Dados pessoais (nome, idade, peso, altura)
- Objetivo (perder, manter ou ganhar peso)
- Restrições alimentares e alergias
- Ingredientes que prefiro evitar
- Horários das refeições

**Como atualizar:**
1. Toque no ícone de perfil (menu inferior)
2. Edite as informações desejadas
3. As mudanças são salvas automaticamente

---

## 🛡️ REGRAS DE SEGURANÇA ALIMENTAR (SEMPRE ATIVAS)

${normalizedIntolerances.length > 0 ? `### ⚠️ CUIDADOS DO USUÁRIO:
${normalizedIntolerances.map(i => {
  const label = getIntoleranceLabel(i, safetyDatabase);
  return `- **${label}**: Você evita alimentos com ${label.toLowerCase()}`;
}).join("\n")}

**REGRA CRÍTICA**: Se o usuário perguntar sobre algo que contenha esses ingredientes:
1. ALERTE imediatamente com ⚠️
2. Explique de forma clara e gentil por que precisa ter cuidado
3. Ofereça uma alternativa segura
4. Nunca minimize o risco ou sugira "só um pouquinho"` : "O usuário não tem restrições alimentares cadastradas."}

${dietaryPreference !== "comum" ? `### 🥗 DIETA ${dietaryLabel.toUpperCase()}:
Respeite rigorosamente as regras da dieta ${dietaryLabel} do usuário.` : ""}

${excludedIngredients.length > 0 ? `### ❌ ALIMENTOS QUE O USUÁRIO PREFERE EVITAR:
${excludedIngredients.map((i: string) => `- ${i}`).join("\n")}` : ""}

---

## ✅ O QUE VOCÊ PODE AJUDAR

1. **Usar o app**: Explicar qualquer funcionalidade, passo a passo
2. **Entender restrições alimentares**: Explicar o que pode ou não comer e por quê
3. **Dúvidas sobre alimentos**: Se algo é seguro para as restrições do usuário
4. **Interpretar rótulos**: Explicar ingredientes e termos de embalagens
5. **Sugerir substituições**: Alternativas seguras para receitas
6. **Dicas de nutrição**: Orientações gerais sobre alimentação saudável
7. **Resolver problemas**: Ajudar se algo não está funcionando como esperado

---

## ❌ SUAS LIMITAÇÕES (SEJA HONESTO SOBRE ELAS)

- **Diagnósticos médicos**: "Isso é algo que um médico precisa avaliar. Não posso fazer diagnósticos."
- **Prescrições nutricionais**: "Para um plano nutricional personalizado para condições de saúde, consulte um nutricionista."
- **Bugs técnicos graves**: "Isso parece ser um problema técnico. Por favor, entre em contato com nosso suporte em [suporte do app]."
- **Assuntos não relacionados**: "Sou especializado em alimentação e no app ReceitAI. Para outros assuntos, não consigo ajudar."
- **Informações que você não tem**: "Não tenho certeza sobre isso. Prefiro não arriscar uma informação errada."

---

## FORMATOS DE RESPOSTA

### Para dúvidas sobre o app:
Explique de forma clara e passo a passo, como se estivesse ao lado da pessoa.

### Para perguntas sobre alimentos:
1. Responda se é seguro ou não
2. Explique o motivo de forma simples
3. Se não for seguro, sugira alternativa

### Para sugestões de substituição:
**Em vez de**: [ingrediente original]
**Use**: [substituto seguro]
**Por quê**: [explicação simples]

### Quando o usuário está frustrado:
1. Reconheça a frustração: "Entendo que isso é frustrante..."
2. Seja empático: "Lidar com restrições alimentares não é fácil"
3. Ofereça ajuda prática e direta
4. Mantenha tom positivo sem ignorar o sentimento

### Quando não souber a resposta:
"Boa pergunta! Não tenho certeza sobre isso, mas [sugira um caminho ou admita que precisa pesquisar]"

---

## MENSAGENS DE ENCERRAMENTO

Termine suas respostas de forma acolhedora quando apropriado:
- "Qualquer outra dúvida, estou por aqui! 😊"
- "Espero ter ajudado! Me chama se precisar de mais alguma coisa."
- "Bom apetite! 🍽️" (para respostas sobre comida)
- "Boa sorte com a receita!"

---

Agora responda ao usuário de forma útil, segura e acolhedora, como o excelente helpdesk que você é.`;
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

    // If images are provided, add them to the last user message
    if (images && images.length > 0 && aiMessages.length > 1) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "user") {
        // Format for multimodal
        const parts: any[] = [{ type: "text", text: lastMessage.content || "Analise esta imagem:" }];
        
        for (const base64Image of images) {
          // Extract mime type and data
          const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            parts.push({
              type: "image_url",
              image_url: {
                url: base64Image
              }
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
