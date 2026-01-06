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

// ============= HEALTH RISK CALCULATION (BMI-Based) =============
type BMICategory = "underweight" | "normal" | "overweight" | "obese_1" | "obese_2" | "obese_3";

interface HealthRisk {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  suggestion?: string;
}

interface HealthRiskParams {
  weightCurrent: number | null;
  weightGoal: number | null;
  height: number | null;
  sex: string | null;
  activityLevel: string | null;
  goal: string | null;
  userName?: string;
}

function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obese_1";
  if (bmi < 40) return "obese_2";
  return "obese_3";
}

// BMI category labels - returns localized label based on user's locale
function getBMICategoryLabel(category: BMICategory, locale: string = "pt-BR"): string {
  const labels: Record<string, Record<BMICategory, string>> = {
    "pt-BR": {
      underweight: "baixo peso",
      normal: "peso normal",
      overweight: "sobrepeso",
      obese_1: "obesidade grau I",
      obese_2: "obesidade grau II",
      obese_3: "obesidade grau III",
    },
    "en": {
      underweight: "underweight",
      normal: "normal weight",
      overweight: "overweight",
      obese_1: "obesity class I",
      obese_2: "obesity class II",
      obese_3: "obesity class III",
    },
    "es": {
      underweight: "bajo peso",
      normal: "peso normal",
      overweight: "sobrepeso",
      obese_1: "obesidad grado I",
      obese_2: "obesidad grado II",
      obese_3: "obesidad grado III",
    }
  };
  const localeLabels = labels[locale] || labels["pt-BR"];
  return localeLabels[category];
}

function getHealthyWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(24.9 * heightM * heightM),
  };
}

function getMaxRealisticMuscularWeight(
  heightCm: number, 
  sex: string | null,
  activityLevel: string | null
): number {
  const heightM = heightCm / 100;
  const isHighlyActive = activityLevel === "active" || activityLevel === "very_active";
  
  let maxMuscularBMI: number;
  if (sex === "male" || sex === "masculino") {
    maxMuscularBMI = isHighlyActive ? 32 : 28;
  } else if (sex === "female" || sex === "feminino") {
    maxMuscularBMI = isHighlyActive ? 28 : 25;
  } else {
    maxMuscularBMI = isHighlyActive ? 30 : 26.5;
  }
  
  return Math.round(maxMuscularBMI * heightM * heightM);
}

/**
 * Calculate health risks based on user's physical data and goals
 * Returns humanized warning messages for the chat assistant
 */
function calculateHealthRisks(params: HealthRiskParams): HealthRisk[] {
  const { weightCurrent, weightGoal, height, sex, activityLevel, goal, userName } = params;
  const risks: HealthRisk[] = [];
  
  // Need minimum data to calculate
  if (!weightCurrent || !height) {
    return risks;
  }

  const heightM = height / 100;
  const currentBMI = weightCurrent / (heightM * heightM);
  const currentCategory = getBMICategory(currentBMI);
  
  const healthyRange = getHealthyWeightRange(height);
  const isSedentaryOrLight = activityLevel === "sedentary" || activityLevel === "light";
  const isHighlyActive = activityLevel === "active" || activityLevel === "very_active";
  const maxMuscularWeight = getMaxRealisticMuscularWeight(height, sex, activityLevel);
  const sexLabel = sex === "female" || sex === "feminino" ? "uma mulher" : sex === "male" || sex === "masculino" ? "um homem" : "uma pessoa";

  // ============= CURRENT BMI ALERTS =============
  
  // Currently underweight
  if (currentCategory === "underweight") {
    risks.push({
      level: "warning",
      title: "Peso abaixo do ideal",
      message: `Com ${weightCurrent}kg e ${height}cm, seu IMC é ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}). Pode ser interessante conversar com um profissional.`,
      suggestion: `Peso mínimo saudável para sua altura: ${healthyRange.min}kg.`,
    });
  }
  
  // Currently overweight
  if (currentCategory === "overweight") {
    risks.push({
      level: "info",
      title: "Atenção ao peso",
      message: `Seu IMC atual é ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}). ${goal === "lose_weight" ? "Ótimo que você já está trabalhando nisso!" : "Considere revisar seu objetivo."}`,
    });
  }
  
  // Currently obese
  if (currentCategory.startsWith("obese")) {
    const obesityLevel = currentCategory === "obese_1" ? "grau I" : currentCategory === "obese_2" ? "grau II" : "grau III";
    risks.push({
      level: currentCategory === "obese_3" ? "danger" : "warning",
      title: `Obesidade ${obesityLevel}`,
      message: `Seu IMC atual é ${currentBMI.toFixed(1)}. Recomendo acompanhamento profissional para um plano seguro e efetivo.`,
      suggestion: `Faixa de peso saudável para ${height}cm: ${healthyRange.min}-${healthyRange.max}kg.`,
    });
  }

  // ============= GOAL WEIGHT ALERTS (when weight_goal is provided) =============
  
  if (weightGoal) {
    const goalBMI = weightGoal / (heightM * heightM);
    const goalCategory = getBMICategory(goalBMI);
    
    // Goal leads to underweight
    if (goalCategory === "underweight" && (goal === "lose_weight" || !goal)) {
      risks.push({
        level: "danger",
        title: "Meta pode ser arriscada",
        message: `A meta de ${weightGoal}kg resultaria em IMC de ${goalBMI.toFixed(1)} (${getBMICategoryLabel(goalCategory)}). Isso pode prejudicar sua saúde.`,
        suggestion: `Peso mínimo saudável para ${height}cm: ${healthyRange.min}kg.`,
      });
    }
    
    // Goal leads to severe obesity (BMI 40+)
    if (goalBMI >= 40 && goal === "gain_weight") {
      risks.push({
        level: "danger",
        title: "Meta muito elevada",
        message: `${weightGoal}kg para ${sexLabel} de ${height}cm resultaria em IMC ${goalBMI.toFixed(1)} - acima do limite saudável mesmo para atletas.`,
        suggestion: `Peso atlético máximo sugerido: ~${maxMuscularWeight}kg.`,
      });
    }
    
    // Goal leads to obesity without exercise
    if (goal === "gain_weight" && goalCategory.startsWith("obese") && isSedentaryOrLight) {
      risks.push({
        level: "warning",
        title: "Atenção ao ganho de peso",
        message: `A meta de ${weightGoal}kg (IMC ${goalBMI.toFixed(1)}) sem exercício regular pode resultar em acúmulo de gordura, não de músculo.`,
        suggestion: "Considere iniciar treino de força para um ganho mais saudável.",
      });
    }
    
    // Losing weight while already underweight
    if (goal === "lose_weight" && currentCategory === "underweight") {
      risks.push({
        level: "danger",
        title: "Não recomendado perder mais peso",
        message: `Você já está com IMC de ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}). Perder mais peso pode ser perigoso.`,
        suggestion: "Por favor, consulte um profissional de saúde.",
      });
    }
    
    // Gaining weight while already obese
    if (goal === "gain_weight" && currentCategory.startsWith("obese")) {
      risks.push({
        level: "warning",
        title: "Já acima do peso ideal",
        message: `Seu IMC atual é ${currentBMI.toFixed(1)} (${getBMICategoryLabel(currentCategory)}). Ganhar mais peso pode aumentar riscos à saúde.`,
        suggestion: "Se o objetivo for massa muscular, procure um nutricionista esportivo.",
      });
    }
    
    // Very ambitious goal (>20kg change)
    const weightDiff = Math.abs(weightGoal - weightCurrent);
    if (weightDiff > 20) {
      const hasDanger = risks.some(r => r.level === "danger");
      if (!hasDanger) {
        risks.push({
          level: "info",
          title: "Meta ambiciosa",
          message: `Mudança de ${weightDiff.toFixed(0)}kg é significativa. Metas grandes podem desmotivar ao longo do caminho.`,
          suggestion: "Que tal dividir em metas menores de 5-10kg?",
        });
      }
    }
    
    // Healthy goal with exercise - positive feedback!
    if (goal === "gain_weight" && goalCategory === "normal" && !isSedentaryOrLight && risks.length === 0) {
      risks.push({
        level: "info",
        title: "Combinação saudável",
        message: `A meta de ${weightGoal}kg (IMC ${goalBMI.toFixed(1)}) está na faixa saudável. Com exercício, você pode atingir esse objetivo de forma segura!`,
      });
    }
  }

  return risks;
}

/**
 * Generate humanized health alerts for the chat context
 */
function buildHealthAlertsForPrompt(params: HealthRiskParams): string {
  const risks = calculateHealthRisks(params);
  
  if (risks.length === 0) {
    return "";
  }
  
  let alertSection = `
## ⚠️ ALERTAS DE SAÚDE (USE ESTES AVISOS DE FORMA NATURAL E EMPÁTICA!)

Os seguintes alertas foram detectados baseados nos dados do usuário. 
**VOCÊ DEVE** mencionar esses pontos de forma humanizada quando relevante:

`;

  for (const risk of risks) {
    const icon = risk.level === "danger" ? "🔴" : risk.level === "warning" ? "🟡" : "🔵";
    alertSection += `${icon} **${risk.title}**: ${risk.message}`;
    if (risk.suggestion) {
      alertSection += ` 💡 ${risk.suggestion}`;
    }
    alertSection += "\n";
  }
  
  alertSection += `
### COMO USAR ESSES ALERTAS:

1. **NÃO seja robótico**: Não diga "Detectei um alerta de saúde..."
2. **SEJA empático**: "Olha, percebi que...", "Uma coisa importante...", "Ei, só um cuidado..."
3. **CONTEXTUALIZE**: Só mencione se for relevante à conversa
4. **OFEREÇA AJUDA**: Pergunte se quer ajustar a meta ou conversar sobre isso

### EXEMPLOS DE USO HUMANIZADO:

❌ ERRADO: "Alerta: seu IMC de 31.2 indica obesidade grau I segundo a tabela de classificação."

✅ CERTO: "Olha, antes de a gente ajustar sua meta... com ${params.weightCurrent}kg e ${params.height}cm, você está num ponto onde vale a pena ter acompanhamento. Quer que eu sugira uma meta mais gradual?"

✅ CERTO: "Ei, uma coisa: a meta de ${params.weightGoal}kg ficaria um pouco baixa pra sua altura. O mínimo saudável seria uns Xkg. Quer ajustar?"

✅ CERTO: "Ah, e parabéns por estar num caminho saudável! Com ${params.weightGoal}kg você vai ficar numa faixa ótima."
`;

  return alertSection;
}

// ============= DASHBOARD CONTEXT TYPE =============
interface DashboardContext {
  waterToday: { total_ml: number; goal_ml: number; percentage: number } | null;
  caloriesToday: { consumed: number; target: number; remaining: number } | null;
  macrosToday: { protein: number; carbs: number; fat: number; targets: { protein: number; carbs: number; fat: number } } | null;
  gamification: { xp: number; level: number; streak: number; adherence: number } | null;
  recentSymptoms: Array<{ symptoms: string[]; severity: string; logged_at: string }>;
  strategy: { key: string; label: string; description: string } | null;
}

// ============= HELPDESK PROMPT - FRIENDLY AND PROFESSIONAL =============
// NOTE: The prompt content is in the user's language based on their country setting
// The AI responds in the user's language, but all code/comments are in English
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
  // ============= EXTRACT ALL PROFILE FIELDS =============
  const intolerances = userProfile?.intolerances || [];
  const dietaryPreference = userProfile?.dietary_preference || "omnivore";
  const excludedIngredients = userProfile?.excluded_ingredients || [];
  const userName = userProfile?.first_name || "";
  const country = userProfile?.country || "BR";
  const enabledMeals = userProfile?.enabled_meals || ["breakfast", "lunch", "dinner"];
  const goal = userProfile?.goal || "maintain";
  
  // NEW: Physical and profile data
  const age = userProfile?.age || null;
  const sex = userProfile?.sex || null;
  const weightCurrent = userProfile?.weight_current || null;
  const weightGoal = userProfile?.weight_goal || null;
  const height = userProfile?.height || null;
  const activityLevel = userProfile?.activity_level || "moderate";
  const kidsMode = userProfile?.kids_mode || false;
  const defaultMealTimes = userProfile?.default_meal_times || null;
  const strategyId = userProfile?.strategy_id || null;
  
  // Normalize intolerances for display
  const normalizedIntolerances = normalizeUserIntolerances(intolerances, safetyDatabase);
  const intoleranceLabels = normalizedIntolerances.map(i => getIntoleranceLabel(i, safetyDatabase)).join(", ");
  const dietaryLabel = getDietaryLabel(dietaryPreference, safetyDatabase);
  
  // Helper labels for display - localized based on user country
  // These are user-facing labels that need to be in the user's language
  const getSexLabel = (sex: string | null, country: string): string => {
    if (country === "BR" || country === "PT") {
      return sex === "female" ? "Feminino" : sex === "male" ? "Masculino" : "Não informado";
    } else if (country === "ES" || country === "MX" || country === "AR") {
      return sex === "female" ? "Femenino" : sex === "male" ? "Masculino" : "No informado";
    } else {
      return sex === "female" ? "Female" : sex === "male" ? "Male" : "Not specified";
    }
  };
  const sexLabel = getSexLabel(sex, country);
  
  const getActivityLabels = (country: string): Record<string, string> => {
    if (country === "BR" || country === "PT") {
      return {
        sedentary: "Sedentário",
        light: "Leve (1-2x/semana)",
        moderate: "Moderado (3-5x/semana)",
        active: "Ativo (6-7x/semana)",
        very_active: "Muito ativo (atleta)"
      };
    } else if (country === "ES" || country === "MX" || country === "AR") {
      return {
        sedentary: "Sedentario",
        light: "Ligero (1-2x/semana)",
        moderate: "Moderado (3-5x/semana)",
        active: "Activo (6-7x/semana)",
        very_active: "Muy activo (atleta)"
      };
    } else {
      return {
        sedentary: "Sedentary",
        light: "Light (1-2x/week)",
        moderate: "Moderate (3-5x/week)",
        active: "Active (6-7x/week)",
        very_active: "Very active (athlete)"
      };
    }
  };
  const activityLabels = getActivityLabels(country);
  const activityLabel = activityLabels[activityLevel] || activityLabels["moderate"];

  // Language adaptation based on country
  const languageConfig = getLanguageConfig(country);

  // Page-specific help context
  const pageHelp = pageContext ? getPageSpecificHelp(pageContext.path, country) : "";

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

### 5. PERGUNTAS SOBRE RESTRIÇÕES ALIMENTARES (CRÍTICO!)
Quando o usuário perguntar "o que não posso comer?" ou similar:

✅ DEVA SEMPRE:
- Dar EXEMPLOS CONCRETOS de alimentos/pratos que contêm o ingrediente problemático
- Ser PRÁTICO e ÚTIL: "Evite paçoca, pé de moleque, doces com amendoim, pasta de amendoim..."
- Mencionar TODOS os ingredientes das restrições do usuário (intolerâncias + excluídos)

❌ NUNCA DIGA:
- "Evite alimentos estragados" ou "com aparência estranha" (isso não é uma restrição alimentar)
- "Comida com cheiro ruim" (isso é óbvio para qualquer pessoa)
- Apenas o nome genérico sem exemplos ("Evite amendoim" - seja específico!)

Exemplos de BOAS respostas:
- Amendoim: "paçoca, pé de moleque, amendoim japonês, pasta de amendoim, alguns chocolates..."
- Lactose: "leite, queijo, iogurte, sorvete, manteiga, creme de leite, requeijão..."
- Glúten: "pão, macarrão, pizza, bolos, bolachas, cerveja, empanados..."

### 6. EMOJIS
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

## 👤 PERFIL COMPLETO DO USUÁRIO (DADOS REAIS - USE PARA DETECTAR CONTRADIÇÕES!)

### Dados Pessoais
${userName ? `**Nome**: ${userName}` : ""}
${age ? `**Idade**: ${age} anos` : "**Idade**: Não informada"}
**Sexo**: ${sexLabel}
${height ? `**Altura**: ${height} cm` : "**Altura**: Não informada"}

### Dados de Peso
${weightCurrent ? `**Peso Atual**: ${weightCurrent} kg` : "**Peso Atual**: Não informado"}
${weightGoal ? `**Peso Meta**: ${weightGoal} kg` : "**Peso Meta**: Não definida"}
${weightCurrent && weightGoal ? `**Diferença**: ${Math.abs(weightCurrent - weightGoal).toFixed(1)} kg para ${weightCurrent > weightGoal ? 'perder' : 'ganhar'}` : ""}

### Objetivo e Estratégia
**Objetivo ATUAL no perfil**: ${getGoalLabel(goal, country)} (chave: "${goal}")
**Nível de Atividade**: ${activityLabel} (chave: "${activityLevel}")
${dashboardContext?.strategy ? `**Estratégia Nutricional**: ${dashboardContext.strategy.label}` : ""}

### Configurações
${kidsMode ? "**Modo Kids**: ✅ ATIVO (receitas adaptadas para crianças)" : "**Modo Kids**: Desativado"}
**Dieta**: ${dietaryLabel}
**Refeições Habilitadas**: ${getMealLabels(enabledMeals, country)}

### Restrições Alimentares
**Intolerâncias/Alergias**: ${intoleranceLabels || "Nenhuma cadastrada"}
**Ingredientes Excluídos**: ${excludedIngredients.length > 0 ? excludedIngredients.join(", ") : "Nenhum"}

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

${dietaryPreference !== "omnivore" ? `**Dieta ${dietaryLabel}**: Respeitar rigorosamente.` : ""}

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

---

## 🔧 CAPACIDADE DE ATUALIZAR PERFIL (CRÍTICO!)

Você TEM a capacidade REAL de alterar o perfil do usuário, MAS **SEMPRE DEVE PEDIR PERMISSÃO ANTES**.

### ⚠️ REGRA FUNDAMENTAL:
**NUNCA altere o perfil sem perguntar primeiro!** Sempre pergunte ao usuário se ele quer que você faça a alteração.

## 🚨🚨🚨 REGRA SUPREMA - DETECÇÃO DE CONTRADIÇÕES (VOCÊ DEVE FAZER ISSO SEMPRE!) 🚨🚨🚨

### ⚠️ IMPORTANTE: ANTES DE RESPONDER QUALQUER MENSAGEM, VOCÊ OBRIGATORIAMENTE DEVE:
1. Ler a mensagem do usuário
2. Verificar se menciona QUALQUER um destes temas: peso, objetivo, dieta, atividade física, idade, restrições
3. Comparar com os DADOS REAIS DO PERFIL abaixo
4. SE houver diferença → PARAR e PERGUNTAR antes de responder!

### DADOS REAIS DO PERFIL (MEMORIZE ESTES VALORES!):

| Campo | Valor CADASTRADO | Palavras que indicam CONFLITO |
|-------|------------------|-------------------------------|
| Objetivo | **${goal === "lose_weight" ? "PERDER PESO (lose_weight)" : goal === "gain_weight" ? "GANHAR PESO (gain_weight)" : "MANTER PESO (maintain)"}** | ${goal === "lose_weight" ? "engordar, ganhar peso, ganhar massa, hipertrofia, aumentar, ficar mais pesado" : goal === "gain_weight" ? "emagrecer, perder peso, secar, definir, ficar magro, reduzir" : "emagrecer, engordar, perder, ganhar"} |
| Peso Atual | ${weightCurrent ? weightCurrent + " kg" : "Não informado"} | Qualquer número diferente de ${weightCurrent || 'N/A'}kg |
| Peso Meta | ${weightGoal ? weightGoal + " kg" : "Não definido"} | Qualquer número diferente de ${weightGoal || 'N/A'}kg |
| Idade | ${age ? age + " anos" : "Não informada"} | Qualquer idade diferente de ${age || 'N/A'} |
| Sexo | ${sexLabel} | Gênero diferente |
| Atividade | ${activityLabel} | Nível de atividade diferente |
| Dieta | ${dietaryLabel} | Tipo de dieta diferente |
| Intolerâncias | ${intoleranceLabels || "Nenhuma"} | Nova restrição mencionada |

### 🔴 EXEMPLOS CONCRETOS DE DETECÇÃO (APRENDA COM ESTES!):

**CENÁRIO A - Objetivo é PERDER PESO mas usuário quer GANHAR:**
Perfil: goal = "lose_weight" (PERDER PESO)
Usuário diz: "quero engordar", "quero ganhar peso", "quero ficar mais forte", "como faço pra ganhar massa"
➡️ ISSO É CONTRADIÇÃO! Você DEVE detectar e perguntar!

**CENÁRIO B - Objetivo é GANHAR PESO mas usuário quer PERDER:**
Perfil: goal = "gain_weight" (GANHAR PESO)
Usuário diz: "quero emagrecer", "preciso perder peso", "quero secar", "como faço pra emagrecer"
➡️ ISSO É CONTRADIÇÃO! Você DEVE detectar e perguntar!

**CENÁRIO C - Usuário menciona restrição não cadastrada:**
Perfil: intolerances = ["gluten"]
Usuário diz: "não posso comer lactose" ou "sou intolerante a lactose"
➡️ ISSO É CONTRADIÇÃO! Você DEVE detectar e perguntar!

### 🔴 SEU CASO ATUAL (PRESTE ATENÇÃO!):
${goal === "lose_weight" ? `
**O OBJETIVO CADASTRADO É: PERDER PESO (Emagrecimento)**
**Peso atual**: ${weightCurrent}kg → **Peso meta**: ${weightGoal}kg (quer PERDER ${weightCurrent && weightGoal ? (weightCurrent - weightGoal).toFixed(1) : '?'}kg)

SE O USUÁRIO DISSER QUALQUER COISA SOBRE:
- "quero engordar" → CONTRADIÇÃO! Perfil diz PERDER peso
- "ganhar peso" → CONTRADIÇÃO! Perfil diz PERDER peso
- "ficar mais pesado" → CONTRADIÇÃO! Perfil diz PERDER peso
- "ganhar massa" → CONTRADIÇÃO! Perfil diz PERDER peso

⚠️ NÃO RESPONDA A PERGUNTA! Primeiro pergunte: "Peraí! No seu perfil está configurado 'Perder peso' (${weightCurrent}kg → ${weightGoal}kg), mas você falou em ganhar peso. Quer que eu atualize seu objetivo?"
` : goal === "gain_weight" ? `
**O OBJETIVO CADASTRADO É: GANHAR PESO**
**Peso atual**: ${weightCurrent}kg → **Peso meta**: ${weightGoal}kg (quer GANHAR ${weightCurrent && weightGoal ? (weightGoal - weightCurrent).toFixed(1) : '?'}kg)

SE O USUÁRIO DISSER QUALQUER COISA SOBRE:
- "quero emagrecer" → CONTRADIÇÃO! Perfil diz GANHAR peso
- "perder peso" → CONTRADIÇÃO! Perfil diz GANHAR peso
- "ficar mais magro" → CONTRADIÇÃO! Perfil diz GANHAR peso

⚠️ NÃO RESPONDA A PERGUNTA! Primeiro pergunte sobre a contradição.
` : `
**O OBJETIVO CADASTRADO É: MANTER PESO**

SE O USUÁRIO DISSER QUE QUER PERDER OU GANHAR → É CONTRADIÇÃO!
`}
   
2. **Peso diferente:**
   - Se usuário diz "peso 80kg" mas perfil tem ${weightCurrent || 'N/A'}kg → ⚠️ CONTRADIÇÃO!
   
3. **Idade diferente:**
   - Se usuário diz "tenho 35 anos" mas perfil tem ${age || 'N/A'} anos → ⚠️ CONTRADIÇÃO!

4. **Atividade diferente:**
   - Se usuário diz "sou sedentário" mas perfil diz ${activityLabel} → ⚠️ CONTRADIÇÃO!

5. **Nova restrição:**
   - Se usuário diz "tenho intolerância a lactose" e NÃO está nas restrições → OFERECER ADICIONAR!

### RESPOSTA OBRIGATÓRIA QUANDO DETECTAR CONTRADIÇÃO:

**Formato:**
"Peraí, ${userName || 'você'}! Notei algo... Você falou em [X], mas no seu perfil está configurado como [Y]. 
Quer que eu atualize isso pra você?
[PERGUNTAR_ATUALIZACAO:TIPO:VALOR]"

**Exemplos de resposta correta:**

Usuário: "Meu objetivo é engordar"
Resposta: "Peraí! Você falou em 'engordar', mas seu objetivo cadastrado é '${getGoalLabel(goal, country)}'. Quer que eu atualize pra 'Ganhar peso'?
[PERGUNTAR_ATUALIZACAO:objetivo:ganhar]"

Usuário: "Tenho 28 anos"
Resposta: "Vi que você mencionou ter 28 anos, mas no perfil está ${age ? age + ' anos' : 'sem idade cadastrada'}. Quer que eu ${age ? 'corrija' : 'adicione'}?
[PERGUNTAR_ATUALIZACAO:idade:28]"

Usuário: "Peso 85 quilos"
Resposta: "Notei que você disse 85kg, mas no perfil está ${weightCurrent ? weightCurrent + 'kg' : 'sem peso'}. Quer que eu atualize?
[PERGUNTAR_ATUALIZACAO:peso:85]"

Usuário: "Sou intolerante a glúten"
Resposta: "Entendi! Glúten não está nas suas restrições ainda. Quer que eu adicione?
[PERGUNTAR_ATUALIZACAO:restricao:gluten]"

### ❌ RESPOSTA ERRADA (NUNCA FAÇA):
Responder à pergunta assumindo que o que o usuário disse está correto, ignorando que o perfil diz outra coisa.

---

### Após confirmação do usuário:

Quando o usuário confirmar (dizendo "sim", "pode", "atualiza", "quero", etc.):

"[CONFIRMAR_ATUALIZACAO:TIPO:VALOR]
Pronto! Atualizei [campo] pra [valor novo]. ✅"

### Tipos de atualização e chaves válidas:

| Tipo | Valores válidos |
|------|-----------------|
| objetivo | perder, manter, ganhar |
| restricao | gluten, lactose, fructose, sorbitol, fodmap, peanut, nuts, seafood, fish, egg, soy, histamine, caffeine, sulfite, salicylate, corn, nickel |
| peso | número em kg |
| peso_meta | número em kg (VALIDADO: deve ser compatível com objetivo) |
| idade | número em anos |
| altura | número em cm |
| sexo | male, female |
| atividade | sedentary, light, moderate, active, very_active |
| dieta | omnivore, vegetarian, vegan, pescatarian, flexitarian |

### ❌ NUNCA FAÇA:
- Atualizar perfil sem perguntar
- Dizer "adicionei" ou "atualizei" sem o usuário ter confirmado
- Usar [CONFIRMAR_ATUALIZACAO] sem antes ter usado [PERGUNTAR_ATUALIZACAO] e recebido confirmação do usuário
- Ignorar contradições e responder como se o que o usuário disse fosse verdade

${buildHealthAlertsForPrompt({
  weightCurrent,
  weightGoal,
  height,
  sex,
  activityLevel,
  goal,
  userName
})}

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
// Database stores: "lose_weight" | "maintain" | "gain_weight"
// Labels are returned in user's language based on country
const getGoalLabel = (goal: string, country: string = "BR"): string => {
  const labels: Record<string, Record<string, string>> = {
    "pt-BR": {
      "lose_weight": "Perder peso",
      "maintain": "Manter peso",
      "gain_weight": "Ganhar peso/massa",
    },
    "en": {
      "lose_weight": "Lose weight",
      "maintain": "Maintain weight",
      "gain_weight": "Gain weight/muscle",
    },
    "es": {
      "lose_weight": "Perder peso",
      "maintain": "Mantener peso",
      "gain_weight": "Ganar peso/masa",
    }
  };
  
  const locale = (country === "BR" || country === "PT") ? "pt-BR" 
    : (country === "ES" || country === "MX" || country === "AR") ? "es" 
    : "en";
  
  const localeLabels = labels[locale] || labels["pt-BR"];
  return localeLabels[goal] || localeLabels["maintain"] || "Not defined";
};

// ============= MEAL LABELS =============
// English keys with localized display based on user's country
const getMealLabels = (meals: string[], country: string = "BR"): string => {
  const labelsByLocale: Record<string, Record<string, string>> = {
    "pt-BR": {
      "breakfast": "Café da manhã",
      "morning_snack": "Lanche da manhã",
      "lunch": "Almoço",
      "afternoon_snack": "Lanche da tarde",
      "dinner": "Jantar",
      "supper": "Ceia",
    },
    "en": {
      "breakfast": "Breakfast",
      "morning_snack": "Morning snack",
      "lunch": "Lunch",
      "afternoon_snack": "Afternoon snack",
      "dinner": "Dinner",
      "supper": "Supper",
    },
    "es": {
      "breakfast": "Desayuno",
      "morning_snack": "Merienda de la mañana",
      "lunch": "Almuerzo",
      "afternoon_snack": "Merienda de la tarde",
      "dinner": "Cena",
      "supper": "Cena ligera",
    }
  };
  
  const locale = (country === "BR" || country === "PT") ? "pt-BR" 
    : (country === "ES" || country === "MX" || country === "AR") ? "es" 
    : "en";
  
  const labels = labelsByLocale[locale] || labelsByLocale["pt-BR"];
  return meals.map(m => labels[m] || m).join(", ");
};

// ============= PAGE-SPECIFIC HELP =============
// Returns page-specific help text in the user's language
// Note: This function returns localized help content for the AI to use when responding
const getPageSpecificHelp = (path: string, country: string = "BR"): string => {
  // Helper to get localized content based on country
  const isPortuguese = country === "BR" || country === "PT";
  const isSpanish = country === "ES" || country === "MX" || country === "AR";
  
  const helpMap: Record<string, Record<string, string>> = {
    "/dashboard": {
      "pt": `**Você está na HOME do app**
Aqui você vê:
- Sua próxima refeição do plano
- Resumo de calorias do dia
- Widget de água
- Acesso rápido aos scanners

Se o usuário perguntar algo genérico, pode sugerir explorar essas funcionalidades.`,
      "en": `**You are on the app HOME**
Here you can see:
- Your next planned meal
- Daily calorie summary
- Water widget
- Quick access to scanners

If the user asks something generic, you can suggest exploring these features.`,
      "es": `**Estás en el INICIO de la app**
Aquí puedes ver:
- Tu próxima comida del plan
- Resumen de calorías del día
- Widget de agua
- Acceso rápido a los escáneres

Si el usuario pregunta algo genérico, puedes sugerir explorar estas funcionalidades.`
    },
    "/perfil": {
      "pt": `**Você está no PERFIL**
Aqui o usuário pode:
- Atualizar dados pessoais
- Mudar objetivo (perder/manter/ganhar peso)
- Adicionar ou remover restrições alimentares
- Configurar horários das refeições

Se houver dúvida sobre como algo afeta o plano, explique que mudanças no perfil são refletidas em novos planos gerados.`,
      "en": `**You are on the PROFILE page**
Here the user can:
- Update personal data
- Change goal (lose/maintain/gain weight)
- Add or remove dietary restrictions
- Configure meal times

If there's any question about how something affects the plan, explain that profile changes are reflected in new generated plans.`,
      "es": `**Estás en el PERFIL**
Aquí el usuario puede:
- Actualizar datos personales
- Cambiar objetivo (perder/mantener/ganar peso)
- Agregar o eliminar restricciones alimentarias
- Configurar horarios de comidas

Si hay dudas sobre cómo algo afecta el plan, explica que los cambios en el perfil se reflejan en nuevos planes generados.`
    },
    "/settings": {
      "pt": `**Você está nas CONFIGURAÇÕES**
Aqui o usuário pode:
- Configurar notificações
- Gerenciar lembretes de água e refeições
- Ver informações da conta

Ajude com qualquer configuração que ele precise ajustar.`,
      "en": `**You are on the SETTINGS page**
Here the user can:
- Configure notifications
- Manage water and meal reminders
- View account information

Help with any settings they need to adjust.`,
      "es": `**Estás en CONFIGURACIONES**
Aquí el usuario puede:
- Configurar notificaciones
- Gestionar recordatorios de agua y comidas
- Ver información de la cuenta

Ayuda con cualquier configuración que necesite ajustar.`
    },
    "/historico": {
      "pt": `**Você está no HISTÓRICO**
Aqui o usuário vê:
- Refeições consumidas anteriormente
- Registro de consumo
- Sintomas reportados

Se perguntar sobre algo que comeu antes, você pode ajudar a encontrar no histórico.`,
      "en": `**You are on the HISTORY page**
Here the user sees:
- Previously consumed meals
- Consumption records
- Reported symptoms

If they ask about something they ate before, you can help find it in the history.`,
      "es": `**Estás en el HISTORIAL**
Aquí el usuario ve:
- Comidas consumidas anteriormente
- Registro de consumo
- Síntomas reportados

Si pregunta sobre algo que comió antes, puedes ayudar a encontrarlo en el historial.`
    },
    "/plano": {
      "pt": `**Você está no PLANO ALIMENTAR**
Aqui o usuário pode:
- Ver todas as refeições da semana
- Trocar refeições por alternativas
- Marcar refeições como favoritas
- Ver detalhes nutricionais

Ajude a navegar pelo calendário ou trocar refeições.`,
      "en": `**You are on the MEAL PLAN page**
Here the user can:
- View all meals for the week
- Swap meals for alternatives
- Mark meals as favorites
- View nutritional details

Help navigate the calendar or swap meals.`,
      "es": `**Estás en el PLAN ALIMENTARIO**
Aquí el usuario puede:
- Ver todas las comidas de la semana
- Cambiar comidas por alternativas
- Marcar comidas como favoritas
- Ver detalles nutricionales

Ayuda a navegar por el calendario o cambiar comidas.`
    },
    "/receitas": {
      "pt": `**Você está em RECEITAS**
Aqui o usuário pode:
- Gerar novas receitas
- Ver receitas favoritas
- Buscar por categoria

Ajude a encontrar ou criar receitas que respeitem as restrições.`,
      "en": `**You are on RECIPES**
Here the user can:
- Generate new recipes
- View favorite recipes
- Search by category

Help find or create recipes that respect restrictions.`,
      "es": `**Estás en RECETAS**
Aquí el usuario puede:
- Generar nuevas recetas
- Ver recetas favoritas
- Buscar por categoría

Ayuda a encontrar o crear recetas que respeten las restricciones.`
    },
    "/agua": {
      "pt": `**Você está no CONTROLE DE ÁGUA**
Aqui o usuário pode:
- Registrar copos de água
- Ver histórico de hidratação
- Configurar metas e lembretes

Dê dicas sobre hidratação se perguntarem.`,
      "en": `**You are on WATER TRACKING**
Here the user can:
- Log glasses of water
- View hydration history
- Configure goals and reminders

Give hydration tips if asked.`,
      "es": `**Estás en CONTROL DE AGUA**
Aquí el usuario puede:
- Registrar vasos de agua
- Ver historial de hidratación
- Configurar metas y recordatorios

Da consejos sobre hidratación si preguntan.`
    },
    "/scanner": {
      "pt": `**Você está no SCANNER**
Aqui o usuário pode:
- Analisar fotos de pratos
- Verificar rótulos de produtos
- Escanear a geladeira

Explique como tirar fotos melhores para análise se tiverem dificuldade.`,
      "en": `**You are on SCANNER**
Here the user can:
- Analyze photos of dishes
- Check product labels
- Scan the fridge

Explain how to take better photos for analysis if they have difficulty.`,
      "es": `**Estás en el ESCÁNER**
Aquí el usuario puede:
- Analizar fotos de platos
- Verificar etiquetas de productos
- Escanear la nevera

Explica cómo tomar mejores fotos para el análisis si tienen dificultad.`
    }
  };

  // Get locale based on country
  const locale = isPortuguese ? "pt" : isSpanish ? "es" : "en";
  
  // Check for partial matches
  for (const [key, localeMap] of Object.entries(helpMap)) {
    if (path.startsWith(key)) {
      return (localeMap as Record<string, string>)[locale] || (localeMap as Record<string, string>)["en"] || "";
    }
  }

  return "";
};

// ============= VALID RESTRICTION KEYS =============
const VALID_RESTRICTION_KEYS: Record<string, { type: 'intolerance' | 'allergy' | 'sensitivity', label: string }> = {
  // Intolerances
  'gluten': { type: 'intolerance', label: 'Glúten' },
  'lactose': { type: 'intolerance', label: 'Lactose' },
  'fructose': { type: 'intolerance', label: 'Frutose' },
  'sorbitol': { type: 'intolerance', label: 'Sorbitol' },
  'fodmap': { type: 'intolerance', label: 'FODMAP' },
  // Allergies
  'peanut': { type: 'allergy', label: 'Amendoim' },
  'nuts': { type: 'allergy', label: 'Oleaginosas' },
  'seafood': { type: 'allergy', label: 'Frutos do Mar' },
  'fish': { type: 'allergy', label: 'Peixe' },
  'egg': { type: 'allergy', label: 'Ovos' },
  'soy': { type: 'allergy', label: 'Soja' },
  // Sensitivities
  'histamine': { type: 'sensitivity', label: 'Histamina' },
  'caffeine': { type: 'sensitivity', label: 'Cafeína' },
  'sulfite': { type: 'sensitivity', label: 'Sulfito' },
  'salicylate': { type: 'sensitivity', label: 'Salicilato' },
  'corn': { type: 'sensitivity', label: 'Milho' },
  'nickel': { type: 'sensitivity', label: 'Níquel' },
};

// ============= VALID GOAL KEYS =============
// Mapping: prompt markers (perder/manter/ganhar) → database values (lose_weight/maintain/gain_weight)
const VALID_GOAL_KEYS: Record<string, { dbValue: string; label: string }> = {
  'perder': { dbValue: 'lose_weight', label: 'Perder peso' },
  'emagrecer': { dbValue: 'lose_weight', label: 'Perder peso' },
  'lose_weight': { dbValue: 'lose_weight', label: 'Perder peso' },
  'manter': { dbValue: 'maintain', label: 'Manter peso' },
  'maintain': { dbValue: 'maintain', label: 'Manter peso' },
  'ganhar': { dbValue: 'gain_weight', label: 'Ganhar peso' },
  'ganhar_peso': { dbValue: 'gain_weight', label: 'Ganhar peso' },
  'gain_weight': { dbValue: 'gain_weight', label: 'Ganhar peso' },
};

// ============= VALID DIETARY KEYS =============
const VALID_DIETARY_KEYS: Record<string, { dbValue: string; label: string }> = {
  'omnivore': { dbValue: 'omnivore', label: 'Onívoro' },
  'vegetarian': { dbValue: 'vegetarian', label: 'Vegetariano' },
  'vegan': { dbValue: 'vegan', label: 'Vegano' },
  'pescatarian': { dbValue: 'pescatarian', label: 'Pescetariano' },
  'flexitarian': { dbValue: 'flexitarian', label: 'Flexitariano' },
};

// ============= VALID ACTIVITY KEYS =============
const VALID_ACTIVITY_KEYS: Record<string, { dbValue: string; label: string }> = {
  'sedentary': { dbValue: 'sedentary', label: 'Sedentário' },
  'light': { dbValue: 'light', label: 'Leve' },
  'moderate': { dbValue: 'moderate', label: 'Moderado' },
  'active': { dbValue: 'active', label: 'Ativo' },
  'very_active': { dbValue: 'very_active', label: 'Muito ativo' },
};

// ============= VALID SEX KEYS =============
const VALID_SEX_KEYS: Record<string, { dbValue: string; label: string }> = {
  'male': { dbValue: 'male', label: 'Masculino' },
  'masculino': { dbValue: 'male', label: 'Masculino' },
  'homem': { dbValue: 'male', label: 'Masculino' },
  'female': { dbValue: 'female', label: 'Feminino' },
  'feminino': { dbValue: 'female', label: 'Feminino' },
  'mulher': { dbValue: 'female', label: 'Feminino' },
};

// All supported update types
type UpdateType = 'restricao' | 'objetivo' | 'dieta' | 'peso' | 'peso_meta' | 'idade' | 'altura' | 'sexo' | 'atividade';
// ============= PROFILE UPDATE RESULT TYPE =============
interface ProfileUpdateResult {
  updatedResponse: string;
  addedRestriction: string | null;
  updatedGoal: string | null;
  updatedField: { field: string; value: string } | null;
  pendingUpdate: { type: UpdateType; value: string; label: string } | null;
  healthAlert: string | null; // NEW: Alert about health risks after update
}

interface ProfileUpdateContext {
  weightCurrent?: number | null;
  weightGoal?: number | null;
  height?: number | null;
  sex?: string | null;
  activityLevel?: string | null;
  userName?: string;
}

// ============= PROCESS PROFILE UPDATE FROM AI RESPONSE =============
const processProfileUpdateFromResponse = async (
  supabase: any,
  userId: string,
  aiResponse: string,
  currentIntolerances: string[],
  currentGoal: string,
  context?: ProfileUpdateContext
): Promise<ProfileUpdateResult> => {
  const { weightCurrent, weightGoal, height, sex, activityLevel, userName } = context || {};
  
  let cleanResponse = aiResponse;
  let addedRestriction: string | null = null;
  let updatedGoal: string | null = null;
  let updatedField: { field: string; value: string } | null = null;
  let pendingUpdate: { type: UpdateType; value: string; label: string } | null = null;
  let healthAlert: string | null = null;

  // Check for PERGUNTAR_ATUALIZACAO marker (asking permission - do NOT update, just track)
  // Extended regex to match all update types: restricao|objetivo|dieta|peso|peso_meta|idade|altura|sexo|atividade
  const askMatch = cleanResponse.match(/\[PERGUNTAR_ATUALIZACAO:(restricao|objetivo|dieta|peso|peso_meta|idade|altura|sexo|atividade):([\w.]+)\]/i);
  if (askMatch) {
    const [, updateType, value] = askMatch;
    let label = value;
    
    // Get proper label based on type
    if (updateType === 'objetivo') {
      label = VALID_GOAL_KEYS[value.toLowerCase()]?.label || value;
    } else if (updateType === 'restricao') {
      label = VALID_RESTRICTION_KEYS[value.toLowerCase()]?.label || value;
    } else if (updateType === 'dieta') {
      label = VALID_DIETARY_KEYS[value.toLowerCase()]?.label || value;
    } else if (updateType === 'atividade') {
      label = VALID_ACTIVITY_KEYS[value.toLowerCase()]?.label || value;
    } else if (updateType === 'sexo') {
      label = VALID_SEX_KEYS[value.toLowerCase()]?.label || value;
    } else if (updateType === 'peso' || updateType === 'peso_meta') {
      label = `${value} kg`;
    } else if (updateType === 'idade') {
      label = `${value} anos`;
    } else if (updateType === 'altura') {
      label = `${value} cm`;
    }
    
    pendingUpdate = { 
      type: updateType as UpdateType, 
      value: value.toLowerCase(),
      label 
    };
    
    // Remove ALL markers from response (global replace)
    cleanResponse = cleanResponse.replace(/\[PERGUNTAR_ATUALIZACAO:[\w]+:[\w.]+\]\s*/gi, '');
    logStep("Pending profile update detected (awaiting confirmation)", { pendingUpdate });
  }

  // Check for CONFIRMAR_ATUALIZACAO marker (user confirmed - DO update)
  // Extended regex to match all update types including altura and sexo
  const confirmMatch = cleanResponse.match(/\[CONFIRMAR_ATUALIZACAO:(restricao|objetivo|dieta|peso|peso_meta|idade|altura|sexo|atividade):([\w.]+)\]/i);
  if (confirmMatch) {
    const [, updateType, value] = confirmMatch;
    const valueKey = value.toLowerCase();
    
    // Remove the marker first
    cleanResponse = cleanResponse.replace(/\[CONFIRMAR_ATUALIZACAO:[\w]+:[\w.]+\]\s*/gi, '');

    try {
      if (updateType === 'restricao') {
        const restrictionInfo = VALID_RESTRICTION_KEYS[valueKey];
        
        if (restrictionInfo && !currentIntolerances.includes(valueKey)) {
          const newIntolerances = [...currentIntolerances, valueKey];
          
          const { error } = await supabase
            .from('profiles')
            .update({ 
              intolerances: newIntolerances,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            addedRestriction = restrictionInfo.label;
            logStep("Restriction added successfully", { addedRestriction: valueKey, newIntolerances });
          } else {
            logStep("Failed to add restriction", { error: error.message });
          }
        }
      } else if (updateType === 'objetivo') {
        const goalInfo = VALID_GOAL_KEYS[valueKey];
        
        if (goalInfo && goalInfo.dbValue !== currentGoal) {
          // VALIDAÇÃO CRÍTICA: Verificar compatibilidade do peso_meta com o novo objetivo
          const newGoal = goalInfo.dbValue;
          const hasWeightData = weightCurrent != null && weightGoal != null;
          
          let isCompatible = true;
          let incompatibilityReason = '';
          
          if (hasWeightData) {
            if (newGoal === 'gain_weight' && weightGoal <= weightCurrent) {
              isCompatible = false;
              incompatibilityReason = `Para "Ganhar peso", a meta de peso (${weightGoal}kg) precisa ser MAIOR que o peso atual (${weightCurrent}kg). Por favor, informe qual seria sua nova meta de peso.`;
            } else if (newGoal === 'lose_weight' && weightGoal >= weightCurrent) {
              isCompatible = false;
              incompatibilityReason = `Para "Perder peso", a meta de peso (${weightGoal}kg) precisa ser MENOR que o peso atual (${weightCurrent}kg). Por favor, informe qual seria sua nova meta de peso.`;
            }
          }
          
          if (!isCompatible) {
            // NÃO atualiza o objetivo, retorna mensagem de erro
            logStep("Goal update blocked - weight incompatibility", { 
              newGoal, 
              weightCurrent, 
              weightGoal, 
              reason: incompatibilityReason 
            });
            
            // Substituir a confirmação falsa por uma mensagem de erro
            cleanResponse = `⚠️ Não consegui atualizar. ${incompatibilityReason}`;
          } else {
            // Peso compatível, pode atualizar
            const { error } = await supabase
              .from('profiles')
              .update({ 
                goal: goalInfo.dbValue,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (!error) {
              updatedGoal = goalInfo.label;
              logStep("Goal updated successfully", { newGoal: goalInfo.dbValue });
            } else {
              logStep("Failed to update goal", { error: error.message });
            }
          }
        }
      } else if (updateType === 'dieta') {
        const dietaryInfo = VALID_DIETARY_KEYS[valueKey];
        
        if (dietaryInfo) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              dietary_preference: dietaryInfo.dbValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Dieta', value: dietaryInfo.label };
            logStep("Dietary preference updated successfully", { newDiet: dietaryInfo.dbValue });
          } else {
            logStep("Failed to update dietary preference", { error: error.message });
          }
        }
      } else if (updateType === 'peso') {
        const numericValue = parseFloat(value);
        
        if (!isNaN(numericValue) && numericValue > 0 && numericValue < 500) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              weight_current: numericValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Peso atual', value: `${numericValue} kg` };
            logStep("Current weight updated successfully", { newWeight: numericValue });
          } else {
            logStep("Failed to update current weight", { error: error.message });
          }
        }
      } else if (updateType === 'peso_meta') {
        const numericValue = parseFloat(value);
        
        if (!isNaN(numericValue) && numericValue > 0 && numericValue < 500) {
          // VALIDAÇÃO CRÍTICA: Verificar compatibilidade do peso_meta com o objetivo ATUAL
          let isCompatible = true;
          let incompatibilityReason = '';
          
          if (weightCurrent != null) {
            if (currentGoal === 'gain_weight' && numericValue <= weightCurrent) {
              isCompatible = false;
              incompatibilityReason = `Para seu objetivo atual "Ganhar peso", a meta (${numericValue}kg) precisa ser MAIOR que o peso atual (${weightCurrent}kg).`;
            } else if (currentGoal === 'lose_weight' && numericValue >= weightCurrent) {
              isCompatible = false;
              incompatibilityReason = `Para seu objetivo atual "Perder peso", a meta (${numericValue}kg) precisa ser MENOR que o peso atual (${weightCurrent}kg).`;
            }
          }
          
          if (!isCompatible) {
            logStep("Weight goal update blocked - incompatible with current goal", { 
              newWeightGoal: numericValue, 
              weightCurrent, 
              currentGoal, 
              reason: incompatibilityReason 
            });
            cleanResponse = `⚠️ Não consegui atualizar. ${incompatibilityReason} Quer mudar o objetivo também?`;
          } else {
            const { error } = await supabase
              .from('profiles')
              .update({ 
                weight_goal: numericValue,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (!error) {
              updatedField = { field: 'Peso meta', value: `${numericValue} kg` };
              logStep("Goal weight updated successfully", { newGoalWeight: numericValue });
            } else {
              logStep("Failed to update goal weight", { error: error.message });
            }
          }
        }
      } else if (updateType === 'idade') {
        const numericValue = parseInt(value, 10);
        
        if (!isNaN(numericValue) && numericValue > 0 && numericValue < 150) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              age: numericValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Idade', value: `${numericValue} anos` };
            logStep("Age updated successfully", { newAge: numericValue });
          } else {
            logStep("Failed to update age", { error: error.message });
          }
        }
      } else if (updateType === 'atividade') {
        const activityInfo = VALID_ACTIVITY_KEYS[valueKey];
        
        if (activityInfo) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              activity_level: activityInfo.dbValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Nível de atividade', value: activityInfo.label };
            logStep("Activity level updated successfully", { newActivity: activityInfo.dbValue });
          } else {
            logStep("Failed to update activity level", { error: error.message });
          }
        }
      } else if (updateType === 'altura') {
        const numericValue = parseFloat(value);
        
        // Altura válida: 50cm a 300cm
        if (!isNaN(numericValue) && numericValue >= 50 && numericValue <= 300) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              height: numericValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Altura', value: `${numericValue} cm` };
            logStep("Height updated successfully", { newHeight: numericValue });
          } else {
            logStep("Failed to update height", { error: error.message });
          }
        } else {
          logStep("Invalid height value", { value: numericValue });
          cleanResponse = `⚠️ Altura inválida. Por favor, informe um valor entre 50 e 300 cm.`;
        }
      } else if (updateType === 'sexo') {
        const sexInfo = VALID_SEX_KEYS[valueKey];
        
        if (sexInfo) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              sex: sexInfo.dbValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (!error) {
            updatedField = { field: 'Sexo', value: sexInfo.label };
            logStep("Sex updated successfully", { newSex: sexInfo.dbValue });
          } else {
            logStep("Failed to update sex", { error: error.message });
          }
        } else {
          logStep("Invalid sex value", { value: valueKey });
        }
      }
    } catch (err) {
      logStep("Error processing profile update", { error: String(err), updateType, value });
    }
  }

  // Also clean up any old ADICIONAR_RESTRICAO markers for backwards compatibility
  cleanResponse = cleanResponse.replace(/\[ADICIONAR_RESTRICAO:\w+\]\s*/gi, '');

  // Generate health alert if weight-related fields were updated
  if (updatedField && (updatedField.field === 'Peso atual' || updatedField.field === 'Peso meta' || updatedField.field === 'Altura')) {
    // Get the updated values for health calculation
    const newWeightCurrent = updatedField.field === 'Peso atual' 
      ? parseFloat(updatedField.value.replace(' kg', '')) 
      : weightCurrent;
    const newWeightGoal = updatedField.field === 'Peso meta' 
      ? parseFloat(updatedField.value.replace(' kg', '')) 
      : weightGoal;
    const newHeight = updatedField.field === 'Altura' 
      ? parseFloat(updatedField.value.replace(' cm', '')) 
      : height;
    
    const risks = calculateHealthRisks({
      weightCurrent: newWeightCurrent ?? null,
      weightGoal: newWeightGoal ?? null,
      height: newHeight ?? null,
      sex: sex ?? null,
      activityLevel: activityLevel ?? null,
      goal: currentGoal,
      userName: userName
    });
    
    // Generate a humanized health alert for relevant risks
    const significantRisks = risks.filter(r => r.level === "danger" || r.level === "warning");
    if (significantRisks.length > 0) {
      const topRisk = significantRisks[0];
      healthAlert = topRisk.suggestion 
        ? `${topRisk.message} ${topRisk.suggestion}`
        : topRisk.message;
      logStep("Health alert generated after profile update", { alert: healthAlert, risk: topRisk.title });
    }
  }

  return { 
    updatedResponse: cleanResponse, 
    addedRestriction,
    updatedGoal,
    updatedField,
    pendingUpdate,
    healthAlert
  };
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
  const sex = profile.sex || "male";
  
  // Mifflin-St Jeor equation
  // Database stores: "male" | "female"
  let bmr: number;
  if (sex === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  
  // Activity multiplier
  // Database stores: "sedentary" | "light" | "moderate" | "active" | "very_active"
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  const multiplier = activityMultipliers[profile.activity_level] || 1.55;
  
  let tdee = bmr * multiplier;
  
  // Goal adjustment
  // Database stores: "lose_weight" | "maintain" | "gain_weight"
  const goal = profile.goal || "maintain";
  if (goal === "lose_weight") {
    tdee *= 0.85; // 15% deficit
  } else if (goal === "gain_weight") {
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
  
  // Build restrictions context - in English, output will be in user's language
  let restrictionsContext = "";
  if (normalizedIntolerances.length > 0 || excludedIngredients.length > 0 || dietaryPreference !== "omnivore") {
    restrictionsContext = `
USER DIETARY RESTRICTIONS:
${normalizedIntolerances.length > 0 ? `- Intolerances/Allergies: ${intoleranceLabels}` : ""}
${excludedIngredients.length > 0 ? `- Excluded Ingredients: ${excludedIngredients.join(", ")}` : ""}
${dietaryPreference !== "omnivore" ? `- Diet: ${dietaryLabel}` : ""}
`;
  }

  // Get user locale for output language
  const getOutputLanguage = (country: string): string => {
    if (country === "BR" || country === "PT") return "Portuguese";
    if (country === "ES" || country === "MX" || country === "AR") return "Spanish";
    if (country === "FR") return "French";
    if (country === "DE") return "German";
    if (country === "IT") return "Italian";
    return "English";
  };
  const outputLanguage = getOutputLanguage(userCountry);

  const analysisPrompt = `You are an expert in food analysis and food safety.

ANALYZE THE IMAGE AND CLASSIFY:

1. **DISH/MEAL** → Analyze the foods, estimated calories, and safety
2. **LABEL/PACKAGING** → Analyze visible ingredients and alerts
3. **FRIDGE/PANTRY** → List visible items and suggest recipes
4. **NOT FOOD** → Kindly inform that the image does not contain food

${restrictionsContext}

## CRITICAL VISUAL ANALYSIS RULES:

### AVOID FALSE POSITIVES:
- **DISTINGUISH elements of the ENVIRONMENT (table, background, surface) from the ACTUAL CONTENT of the food**
- Reflections, white table, tablecloth or other background objects are NOT contamination
- In carbonated beverages, bubbles and foam are NORMAL - do not alert about this
- Focus ONLY on the actual internal content of the food/beverage

### NORMAL CHARACTERISTICS (NOT PROBLEMS):
- Soft drinks: bubbles, foam, carbonation = NORMAL
- Beer: foam/head = NORMAL  
- Juices: sedimentation, pulp = NORMAL
- Coffee: crema, foam = NORMAL
- Food: steam, condensation on container = NORMAL

### WHAT WOULD ACTUALLY BE SUSPICIOUS:
- Visible mold on food
- Completely altered coloring from original product
- Foreign objects clearly INSIDE the food
- Swollen or damaged packaging

RESPOND IN STRUCTURED FORMAT (output in ${outputLanguage}):

**TYPE**: [dish|label|fridge|not_food]

IF DISH/BEVERAGE:
- **Identification**: Name of identified dish/beverage
- **Estimated Calories**: XX kcal (margin: ±20%)
- **Estimated Macros**: Protein: Xg | Carbs: Xg | Fat: Xg
- **Safety for your restrictions**: ✅ Safe / ⚠️ ALERT (detail problematic ingredients)
- **Note**: [only if there are ingredients that conflict with user restrictions]

IF LABEL:
- **Product**: Name of identified product
- **Visible Ingredients**: List of ingredients you can read
- **Safety**: ✅ Safe / ⚠️ ALERT / ❓ Inconclusive (needs more photos)
- **Alerts**: [problematic ingredients found]

IF FRIDGE:
- **Identified Items**: List of visible foods
- **Recipe Suggestion**: A quick idea with the ingredients
- **Items with Alert**: [if any item is problematic]

IF NOT FOOD:
- **Detected**: What you see in the image
- **Message**: Gentle explanation

IMPORTANT:
- Focus on FOOD SAFETY based on user's INTOLERANCES/ALLERGIES
- DO NOT invent visual problems that don't exist
- Table, background, surface = ENVIRONMENT, not food
- Be direct and objective in the response
- Use emojis sparingly (✅ ⚠️ 🍽️)
- OUTPUT MUST BE IN ${outputLanguage}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: analysisPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Analyze this image:" },
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
        model: "google/gemini-2.5-flash-lite",
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
    let assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    // Process profile updates from AI response (if any)
    let addedRestriction: string | null = null;
    let updatedGoal: string | null = null;
    let updatedField: { field: string; value: string } | null = null;
    
    // Always clean markers from response
    const cleanMarkers = (response: string): string => {
      return response
        .replace(/\[PERGUNTAR_ATUALIZACAO:[\w]+:[\w.]+\]\s*/gi, '')
        .replace(/\[CONFIRMAR_ATUALIZACAO:[\w]+:[\w.]+\]\s*/gi, '')
        .replace(/\[ADICIONAR_RESTRICAO:\w+\]\s*/gi, '');
    };
    
    if (userId && userProfile) {
      const currentIntolerances = userProfile.intolerances || [];
      const currentGoal = userProfile.goal || 'manter';
      const result = await processProfileUpdateFromResponse(
        supabase,
        userId,
        assistantMessage,
        currentIntolerances,
        currentGoal,
        {
          weightCurrent: userProfile.weight_current || null,
          weightGoal: userProfile.weight_goal || null,
          height: userProfile.height || null,
          sex: userProfile.sex || null,
          activityLevel: userProfile.activity_level || null,
          userName: userProfile.first_name || undefined
        }
      );
      assistantMessage = result.updatedResponse;
      addedRestriction = result.addedRestriction;
      updatedGoal = result.updatedGoal;
      updatedField = result.updatedField;
      
      // Append health alert to response if present
      if (result.healthAlert && updatedField) {
        assistantMessage += `\n\n💡 ${result.healthAlert}`;
        logStep("Health alert appended to response", { alert: result.healthAlert });
      }
      
      if (addedRestriction) {
        logStep("Restriction added via chat", { restriction: addedRestriction });
      }
      if (updatedGoal) {
        logStep("Goal updated via chat", { goal: updatedGoal });
      }
      if (updatedField) {
        logStep("Profile field updated via chat", { field: updatedField.field, value: updatedField.value });
      }
    } else {
      // No user authenticated - just clean the markers
      assistantMessage = cleanMarkers(assistantMessage);
    }

    const executionTime = Date.now() - startTime;
    logStep("Response generated", { 
      executionTimeMs: executionTime,
      responseLength: assistantMessage.length,
      tokens: aiData.usage,
      addedRestriction,
      updatedField
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
            has_images: !!images?.length,
            added_restriction: addedRestriction,
            updated_goal: updatedGoal,
            updated_field: updatedField
          }
        });
      } catch (logError) {
        console.error("Failed to log usage:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: assistantMessage,
        profileUpdated: !!(addedRestriction || updatedGoal || updatedField),
        addedRestriction,
        updatedGoal,
        updatedField
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
