import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getCountryConfig,
  getMealExamples,
  getIngredientPriority,
  buildGoalContextInstructions,
  FORBIDDEN_INGREDIENTS,
  DIETARY_FORBIDDEN_INGREDIENTS,
  DIETARY_LABELS,
  INTOLERANCE_LABELS,
  type UserProfile,
} from "../_shared/recipeConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// CONFIGURAÇÃO DE TIPOS DE REFEIÇÃO
// ============================================
const MEAL_TYPES = [
  { 
    key: 'cafe_manha', 
    label: 'Café da manhã', 
    calorieRange: [200, 450],
    proteinRange: [8, 25],
    characteristics: 'Energia para começar o dia. Combina carboidratos, proteínas e frutas.'
  },
  { 
    key: 'almoco', 
    label: 'Almoço', 
    calorieRange: [400, 700],
    proteinRange: [25, 45],
    characteristics: 'Refeição principal. Equilibrada com proteína, carboidrato e vegetais.'
  },
  { 
    key: 'lanche', 
    label: 'Lanche da tarde', 
    calorieRange: [150, 350],
    proteinRange: [5, 15],
    characteristics: 'Leve e nutritivo. Mantém energia até o jantar.'
  },
  { 
    key: 'jantar', 
    label: 'Jantar', 
    calorieRange: [300, 550],
    proteinRange: [20, 35],
    characteristics: 'Mais leve que o almoço. Favorece digestão noturna.'
  },
  { 
    key: 'ceia', 
    label: 'Ceia', 
    calorieRange: [80, 200],
    proteinRange: [5, 15],
    characteristics: 'Muito leve. Favorece sono reparador.'
  },
];

// ============================================
// CATEGORIAS ALINHADAS COM ONBOARDING
// ============================================
const RECIPE_CATEGORIES = [
  // Preferências dietéticas
  { key: 'comum', label: 'Tradicional/Comum', description: 'Receitas balanceadas sem restrições' },
  { key: 'vegetariana', label: 'Vegetariana', description: 'Sem carnes, com ovos e laticínios' },
  { key: 'vegana', label: 'Vegana', description: '100% vegetal, sem produtos de origem animal' },
  { key: 'low_carb', label: 'Low Carb', description: 'Baixo carboidrato, prioriza proteínas' },
  { key: 'pescetariana', label: 'Pescetariana', description: 'Peixes e frutos do mar, sem carnes' },
  { key: 'cetogenica', label: 'Cetogênica/Keto', description: 'Ultra low carb, alta gordura' },
  { key: 'flexitariana', label: 'Flexitariana', description: 'Majoritariamente vegetal' },
  // Estilos de receitas
  { key: 'fitness', label: 'Fitness/Light', description: 'Baixas calorias, alto valor nutricional' },
  { key: 'proteica', label: 'Rica em Proteínas', description: 'Alto teor proteico para ganho muscular' },
  { key: 'comfort', label: 'Comfort Food', description: 'Receitas reconfortantes e saborosas' },
  { key: 'rapida', label: 'Rápida e Prática', description: 'Preparo em até 20 minutos' },
  { key: 'regional', label: 'Regional Tradicional', description: 'Receitas típicas regionais' },
  { key: 'kids', label: 'Modo Kids', description: 'Receitas para crianças' },
];

// ============================================
// FUNÇÕES DE CONSTRUÇÃO DE RESTRIÇÕES
// ============================================

function buildIntoleranceInstructions(intolerances: string[] | null): string {
  if (!intolerances || intolerances.length === 0) return "";

  const forbiddenList: string[] = [];
  const labels: string[] = [];
  
  for (const intolerance of intolerances) {
    const key = intolerance.toLowerCase();
    const forbidden = FORBIDDEN_INGREDIENTS[key];
    if (forbidden) {
      forbiddenList.push(...forbidden);
    }
    const label = INTOLERANCE_LABELS[key];
    if (label) {
      labels.push(label);
    }
  }

  if (forbiddenList.length === 0) return "";

  const uniqueForbidden = [...new Set(forbiddenList)];
  
  return `

═══════════════════════════════════════════════════════════════
⛔ RESTRIÇÕES ALIMENTARES CRÍTICAS - INTOLERÂNCIAS DO USUÁRIO
═══════════════════════════════════════════════════════════════

${labels.join('\n')}

🚫 LISTA COMPLETA DE INGREDIENTES ABSOLUTAMENTE PROIBIDOS:
${uniqueForbidden.slice(0, 80).join(', ')}

⚠️ REGRA INVIOLÁVEL: NENHUM destes ingredientes ou seus derivados pode aparecer 
em QUALQUER receita. Isso inclui:
- Ingredientes diretos
- Ingredientes como parte de molhos ou preparações
- Traços ou contaminação cruzada
- Nomes alternativos ou regionais dos mesmos ingredientes

USE SEMPRE alternativas seguras e compatíveis.`;
}

function buildDietaryInstructions(category: any): string {
  const categoryKey = typeof category === 'object' ? category.key : category;
  
  const dietaryKey = ['vegetariana', 'vegana', 'low_carb', 'pescetariana', 'cetogenica', 'flexitariana'].includes(categoryKey) 
    ? categoryKey 
    : null;

  if (!dietaryKey) return "";

  const label = DIETARY_LABELS[dietaryKey];
  const forbidden = DIETARY_FORBIDDEN_INGREDIENTS[dietaryKey] || [];

  return `

═══════════════════════════════════════════════════════════════
🥗 PREFERÊNCIA ALIMENTAR: ${label?.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getDietaryGuidelines(dietaryKey)}

${forbidden.length > 0 ? `
🚫 INGREDIENTES PROIBIDOS NESTA DIETA:
${forbidden.slice(0, 50).join(', ')}
` : ''}`;
}

function getDietaryGuidelines(dietaryKey: string): string {
  const guidelines: Record<string, string> = {
    vegetariana: `
✓ PERMITIDO:
  - Ovos e todos os derivados (omelete, fritada, merengue)
  - Laticínios completos (leite, queijo, iogurte, manteiga)
  - Todas as leguminosas (feijão, lentilha, grão-de-bico)
  - Proteínas vegetais (tofu, seitan, cogumelos)

✗ PROIBIDO:
  - Qualquer tipo de carne (bovina, suína, aves)
  - Peixes e frutos do mar
  - Gelatina (derivado animal)
  - Caldos de carne ou frango`,

    vegana: `
✓ PERMITIDO:
  - Leguminosas (feijão, lentilha, grão-de-bico, ervilha)
  - Proteínas vegetais (tofu, tempeh, seitan)
  - Leites vegetais (aveia, coco, amêndoa, castanha)
  - Nuts e sementes (castanhas, linhaça, chia)

✗ ABSOLUTAMENTE PROIBIDO:
  - Qualquer carne, peixe ou fruto do mar
  - Ovos e derivados
  - Leite e TODOS os laticínios
  - Mel e derivados de abelha
  - Gelatina, corantes de origem animal`,

    low_carb: `
✓ PRIORIZAR (alto consumo):
  - Proteínas: carnes, peixes, ovos, queijos
  - Vegetais low carb: folhas, brócolis, abobrinha
  - Gorduras boas: abacate, azeite, castanhas

✓ CARBOIDRATOS POR REFEIÇÃO: máximo 30g

✗ EVITAR/ELIMINAR:
  - Açúcar e doces
  - Pães, massas, arroz branco
  - Batata e tubérculos amiláceos
  - Frutas muito doces`,

    cetogenica: `
✓ PRIORIZAR (proporções keto):
  - 70-80% gorduras: abacate, azeite, manteiga, bacon
  - 20-25% proteínas: carnes, peixes, ovos
  - 5-10% carboidratos: apenas vegetais fibrosos

✓ CARBOIDRATOS POR REFEIÇÃO: máximo 10-15g

✗ ABSOLUTAMENTE PROIBIDO:
  - Qualquer açúcar ou adoçante calórico
  - Grãos, arroz, pão, massa
  - Leguminosas (feijão, lentilha)
  - Frutas (exceto pequenas porções de berries)
  - Tubérculos (batata, mandioca)`,

    pescetariana: `
✓ PERMITIDO:
  - Todos os peixes (salmão, tilápia, atum, etc.)
  - Frutos do mar (camarão, lula, mexilhão)
  - Ovos e laticínios
  - Todas as proteínas vegetais

✗ PROIBIDO:
  - Carne bovina e suína
  - Aves (frango, peru, pato)
  - Embutidos de carne`,

    flexitariana: `
✓ PRIORIZAR:
  - Base vegetal: leguminosas, vegetais, grãos
  - Proteínas vegetais como fonte principal
  - Carnes apenas ocasionalmente (1-2x semana)

📝 DIRETRIZES:
  - 70% das receitas devem ser vegetarianas
  - Quando incluir carne, preferir cortes magros
  - Valorizar ingredientes locais e sazonais`,
  };

  return guidelines[dietaryKey] || "";
}

function buildGoalInstructions(goal: string | null): string {
  if (!goal) return "";

  const instructions: Record<string, string> = {
    emagrecer: `
═══════════════════════════════════════════════════════════════
🏃 OBJETIVO NUTRICIONAL: EMAGRECIMENTO
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Déficit calórico de 300-500 kcal
  • Proteína elevada: 1.8-2.2g por kg de peso
  • Fibras abundantes para saciedade
  • Índice glicêmico baixo a moderado

🎯 PRIORIZAR NAS RECEITAS:
  • Vegetais volumosos (folhas, brócolis, abobrinha)
  • Proteínas magras (frango, peixe, ovos, leguminosas)
  • Preparações: grelhados, assados, cozidos, vapor
  • Temperos naturais (ervas, especiarias, limão)

⚠️ MINIMIZAR/EVITAR:
  • Frituras e empanados
  • Carboidratos refinados (pão branco, arroz branco)
  • Açúcares adicionados
  • Molhos cremosos e gordurosos`,

    manter: `
═══════════════════════════════════════════════════════════════
⚖️ OBJETIVO NUTRICIONAL: MANUTENÇÃO DE PESO
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Calorias equilibradas conforme gasto energético
  • Macros balanceados: 50% carb, 25% prot, 25% gord
  • Variedade de grupos alimentares

🎯 PRIORIZAR NAS RECEITAS:
  • Equilíbrio entre todos os macronutrientes
  • Carboidratos complexos (arroz, batata, grãos)
  • Proteínas de qualidade
  • Gorduras saudáveis com moderação`,

    ganhar_peso: `
═══════════════════════════════════════════════════════════════
💪 OBJETIVO NUTRICIONAL: GANHO DE MASSA
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Superávit calórico de 300-500 kcal
  • Proteína alta: 2.0-2.4g por kg de peso
  • Carboidratos complexos abundantes
  • Gorduras saudáveis

🎯 PRIORIZAR NAS RECEITAS:
  • Porções generosas e calóricas
  • Proteínas de alto valor biológico
  • Carboidratos densos (arroz, batata, massas)
  • Adições calóricas: azeite, castanhas, abacate

💡 DICAS PARA RECEITAS HIPERCALÓRICAS:
  • Adicionar azeite ou manteiga nas finalizações
  • Incluir nuts e sementes como toppings
  • Usar molhos nutritivos e calóricos`,
  };

  return instructions[goal] || "";
}

function buildCategoryInstructions(category: any): string {
  const categoryKey = typeof category === 'object' ? category.key : category;
  
  const categoryInstructions: Record<string, string> = {
    fitness: `
🏋️ ESTILO: FITNESS/LIGHT
• Calorias reduzidas (parte inferior da faixa)
• Alto teor proteico
• Baixa gordura
• Preparações limpas: grelhado, vapor, cru`,

    proteica: `
💪 ESTILO: RICA EM PROTEÍNAS
• Proteína como protagonista (30%+ das calorias)
• Fontes variadas: carnes magras, ovos, leguminosas
• Ideal para pós-treino e ganho muscular`,

    comfort: `
🍲 ESTILO: COMFORT FOOD
• Receitas aconchegantes e reconfortantes
• Sabores robustos e nostálgicos
• Texturas cremosas e satisfatórias
• Pratos que remetem à comida caseira`,

    rapida: `
⚡ ESTILO: RÁPIDA E PRÁTICA
• Tempo de preparo: máximo 20 minutos
• Poucos ingredientes (até 6)
• Técnicas simples
• Ideal para dia a dia corrido`,

    regional: `
🗺️ ESTILO: REGIONAL TRADICIONAL
• Autenticidade culinária local
• Ingredientes típicos da região
• Técnicas tradicionais de preparo
• Sabores genuínos e autênticos`,

    kids: `
👶 ESTILO: MODO KIDS
• Receitas atrativas para crianças
• Sabores suaves e texturas agradáveis
• Apresentação divertida
• Nutrientes essenciais para crescimento
• Evitar temperos fortes e picantes`,
  };

  return categoryInstructions[categoryKey] || "";
}

// ============================================
// INSTRUÇÕES CULTURAIS DETALHADAS POR PAÍS
// ============================================
function buildCountryCulturalInstructions(countryCode: string): string {
  const culturalGuides: Record<string, string> = {
    // ═══════════════════════════════════════════════════════════
    // AMÉRICAS
    // ═══════════════════════════════════════════════════════════
    BR: `
🇧🇷 CULTURA GASTRONÔMICA: BRASIL
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
O Brasil possui uma das gastronomias mais diversas do mundo, resultado da 
fusão entre povos indígenas, portugueses, africanos, italianos, japoneses e árabes.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Café da manhã (6h-9h): Pão francês, manteiga, café com leite, frutas tropicais
• Almoço (12h-14h): Refeição principal - arroz, feijão, proteína, salada
• Lanche (15h-17h): Salgados, frutas, sucos naturais
• Jantar (19h-21h): Mais leve que o almoço, sopas ou refeição completa
• Ceia (após 21h): Opcional, geralmente frutas ou lácteos

🥘 PRATOS EMBLEMÁTICOS POR REGIÃO:
• Norte: Tacacá, pato no tucupi, açaí salgado
• Nordeste: Acarajé, baião de dois, carne de sol
• Centro-Oeste: Pequi, pamonha, arroz com galinhada
• Sudeste: Feijoada, tutu de feijão, virado à paulista
• Sul: Churrasco, chimarrão, polenta

🛒 INGREDIENTES ESSENCIAIS:
• Base: Arroz, feijão (preto, carioca), mandioca, milho
• Proteínas: Frango, carne bovina, peixe, ovos
• Temperos: Alho, cebola, cheiro-verde, pimenta-do-reino
• Frutas: Manga, mamão, goiaba, maracujá, acerola
• Laticínios: Queijo minas, requeijão, manteiga

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Refogar em alho e cebola ("refogar" é base de quase tudo)
• Cozinhar arroz com proporção exata de água
• Fazer feijão na panela de pressão
• Assar carnes em fogo baixo
• Preparar farofa para acompanhar

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Arroz e feijão são sagrados - aparecem no almoço quase sempre
• Café é essencial pela manhã, muitas vezes à tarde também
• Frutas tropicais são consumidas in natura ou em sucos
• Churrasco é tradição de domingo em família
• Salgadinhos de festa (coxinha, kibe, esfiha) são populares`,

    US: `
🇺🇸 CULTURA GASTRONÔMICA: ESTADOS UNIDOS
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A culinária americana é um "melting pot" de influências de todo o mundo,
com forte foco em conveniência, porções generosas e sabores ousados.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Breakfast (6h-9h): Ovos, bacon, panquecas, cereais, café
• Lunch (12h-13h): Sanduíches, saladas, fast food, refeição rápida
• Snack (15h-16h): Chips, granola bars, frutas
• Dinner (18h-20h): Refeição principal da família - proteína + sides

🥘 PRATOS EMBLEMÁTICOS:
• Comfort food: Mac & cheese, meatloaf, pot roast
• BBQ: Ribs, pulled pork, brisket (Texas, Kansas City, Carolina styles)
• Fast casual: Burgers, hot dogs, tacos
• Brunch: Eggs benedict, avocado toast, pancakes
• Desserts: Apple pie, brownies, cheesecake

🛒 INGREDIENTES ESSENCIAIS:
• Proteínas: Ground beef, chicken breast, turkey, bacon
• Laticínios: Cheddar cheese, cream cheese, butter, milk
• Vegetais: Potatoes, corn, tomatoes, lettuce
• Grãos: White bread, pasta, rice
• Condimentos: Ketchup, mustard, BBQ sauce, ranch

🔥 TÉCNICAS CULINÁRIAS COMUNS:
• Grilling (churrasco americano)
• Baking (assados, especialmente desserts)
• Deep frying (frituras)
• Slow cooking (cozimento lento em crockpot)
• Sheet pan dinners (tudo em uma assadeira)

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Porções são maiores que em outros países
• Praticidade é valorizada - meal prep é popular
• Brunch de domingo é tradição social
• BBQ varia muito por região (cada estado tem seu estilo)
• Holidays têm comidas específicas (Turkey no Thanksgiving)`,

    MX: `
🇲🇽 CULTURA GASTRONÔMICA: MÉXICO
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A gastronomia mexicana é Patrimônio Cultural Imaterial da UNESCO,
com raízes pré-hispânicas fundidas com influências espanholas.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (7h-10h): Huevos rancheros, chilaquiles, tamales
• Almuerzo/Comida (14h-16h): Refeição principal, elaborada
• Merienda (18h-19h): Antojitos, café com pan dulce
• Cena (20h-22h): Mais leve - tacos, quesadillas

🥘 PRATOS EMBLEMÁTICOS:
• Tortilla-based: Tacos, enchiladas, quesadillas, tostadas
• Caldos: Pozole, birria, consomé
• Moles: Mole poblano, mole negro, pipián
• Antojitos: Tamales, gorditas, sopes
• Mariscos: Ceviche, aguachile, coctel de camarón

🛒 INGREDIENTES ESSENCIAIS:
• Base: Tortillas de maíz, frijoles negros/refritos, arroz
• Chiles: Jalapeño, serrano, habanero, chipotle, guajillo
• Hierbas: Cilantro, epazote, orégano mexicano
• Proteínas: Pollo, res, cerdo, carnitas
• Otros: Limón, aguacate, queso fresco, crema

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Nixtamalización (preparação do milho)
• Asado a las brasas
• Molcajete (moer especiarias em pedra)
• Preparação de moles complexos
• Marinar carnes em adobos

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Tortillas são servidas em TODAS as refeições
• O chile define o nível de picância (sempre perguntar)
• Limão e cilantro são praticamente obrigatórios
• Domingo é dia de birria ou barbacoa em família
• Antojitos são comida de rua, essenciais da cultura`,

    AR: `
🇦🇷 CULTURA GASTRONÔMICA: ARGENTINA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Argentina é sinônimo de carne bovina de qualidade mundial,
com forte influência italiana e espanhola na culinária cotidiana.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (7h-9h): Medialunas, café con leche, tostadas
• Almuerzo (12h-14h): Refeição completa com proteína
• Merienda (17h-18h): Mate com facturas (doces)
• Cena (21h-23h): Refeição principal, tardíssima!

🥘 PRATOS EMBLEMÁTICOS:
• Carnes: Asado, bife de chorizo, vacío, entraña
• Empanadas: De carne, jamón y queso, humita
• Pasta: Ñoquis del 29, ravioles, tallarines
• Outros: Milanesa napolitana, choripán, locro
• Doces: Dulce de leche em tudo, alfajores

🛒 INGREDIENTES ESSENCIAIS:
• Proteínas: Carne bovina (todos cortes), pollo, cerdo
• Lácteos: Queso cremoso, provoleta, dulce de leche
• Vegetais: Papa, tomate, cebolla, zapallo
• Especiais: Chimichurri, provenzal, orégano
• Panificação: Pan francés, facturas, empanadas

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Asado a la parrilla (churrasco argentino)
• Preparar empanadas caseras
• Hacer chimichurri fresco
• Cozinhar pasta al dente (herança italiana)
• Provoleta a la plancha

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Asado de domingo é sagrado e social
• Mate é bebida nacional, compartilhado
• Cena é SEMPRE muito tarde (após 21h)
• Ñoquis no dia 29 é tradição (sorte e prosperidade)
• Dulce de leche aparece em quase toda sobremesa`,

    CO: `
🇨🇴 CULTURA GASTRONÔMICA: COLÔMBIA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Colômbia possui gastronomia diversa por regiões, desde a costa
caribenha até os Andes, com influências indígenas e espanholas.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (6h-8h): Arepa con huevo, caldo de costilla, changua
• Almuerzo (12h-14h): Bandeja paisa, sancocho, corrientazo
• Onces (15h-16h): Café con pan, empanadas
• Cena (19h-21h): Mais leve, sopas ou arrepas

🥘 PRATOS EMBLEMÁTICOS:
• Bandeja paisa: Frijoles, arroz, carne, chicharrón, huevo, arepa
• Sancocho: Sopa densa com carnes e vegetais
• Ajiaco: Sopa bogotana com frango e batatas
• Lechona: Porco recheado para festas
• Empanadas: Recheadas de carne ou papa

🛒 INGREDIENTES ESSENCIAIS:
• Base: Arroz, frijoles, papa criolla, plátano, yuca
• Proteínas: Carne de res, pollo, chicharrón, mojarra
• Vegetais: Tomate, cebolla, cilantro, ají
• Frutas: Lulo, maracuyá, guanábana, mora
• Especial: Hogao (refrito colombiano)

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Preparar arepa (asada ou frita)
• Hacer hogao (base de tomate e cebola)
• Cozinhar sancocho em panela grande
• Fritar empanadas crocantes
• Asar plátano maduro

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Arepa aparece em todas as refeições
• Café colombiano é servido durante todo o dia
• Almuerzo "corrientazo" inclui sopa + seco + suco + sobremesa
• Sancocho é prato de domingo em família
• Ají (molho picante) sempre disponível na mesa`,

    CL: `
🇨🇱 CULTURA GASTRONÔMICA: CHILE
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Chile tem culinária marcada pelo oceano Pacífico (peixes e frutos do mar),
influências mapuches e uma forte tradição de empanadas e caldos.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (7h-9h): Pan con palta, café, huevos
• Almuerzo (13h-15h): Refeição principal, cazuelas
• Once (17h-19h): Tradição chilena - chá com salgados
• Cena (20h-22h): Leve ou junta com "once-cena"

🥘 PRATOS EMBLEMÁTICOS:
• Empanadas de pino (carne con cebolla y huevo)
• Pastel de choclo (milho com carne)
• Cazuela de ave (caldo com frango e legumes)
• Curanto (cozido tradicional do sul)
• Completo (hot dog chileno)

🛒 INGREDIENTES ESSENCIAIS:
• Mar: Salmón, reineta, locos, erizos, almejas
• Vegetais: Papa, choclo, zapallo, porotos verdes
• Proteínas: Pollo, carne de res, chancho
• Especiais: Pebre (molho de tomate e cilantro), merkén
• Pães: Marraqueta, hallulla

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Hacer empanadas al horno
• Preparar pebre fresco
• Cozinhar cazuelas de longa cocção
• Preparar pastel de choclo em greda
• Caldos e sopas reconfortantes

⚠️ REGRAS CULTURAIS IMPORTANTES:
• "Once" é tradição sagrada (equivalente ao chá inglês)
• Empanadas são para fiestas patrias (setembro)
• Pebre sempre acompanha o pão
• Mariscos frescos são muito valorizados
• Domingo é dia de cazuela em família`,

    PE: `
🇵🇪 CULTURA GASTRONÔMICA: PERU
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Peru é considerado um dos melhores destinos gastronômicos do mundo,
fusão de tradições incas com influências espanholas, africanas, 
chinesas (chifa) e japonesas (nikkei).

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (7h-9h): Pan con palta, quinua, jugo
• Almuerzo (12h-14h): Refeição principal, muito elaborada
• Lonche (16h-17h): Pan con chicharrón, emoliente
• Cena (19h-21h): Mais leve, anticuchos, sopas

🥘 PRATOS EMBLEMÁTICOS:
• Ceviche: Pescado marinado em limão
• Lomo saltado: Stir fry peruano-chinês
• Ají de gallina: Frango cremoso com ají amarillo
• Causa limeña: Puré de papa com recheios
• Anticuchos: Espetos de coração bovino

🛒 INGREDIENTES ESSENCIAIS:
• Pimentas: Ají amarillo, ají panca, rocoto
• Tubérculos: Papa (milhares de variedades), camote
• Proteínas: Pescado, pollo, res, cuy
• Especiais: Limón, cilantro, cebolla morada
• Grãos: Quinua, kiwicha, cañihua

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Marinar ceviche no ponto certo
• Preparar leche de tigre
• Saltear no wok (influência chifa)
• Usar ají amarillo como base
• Cozinhar em piedra

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Ceviche só no almoço (tradição de pescado fresco)
• Ají amarillo é ESSENCIAL na cozinha
• Limón peruano é diferente - muito ácido
• Chifa (fusão chinesa) é comida do cotidiano
• Papa é sagrada - centenas de variedades nativas`,

    // ═══════════════════════════════════════════════════════════
    // EUROPA
    // ═══════════════════════════════════════════════════════════
    PT: `
🇵🇹 CULTURA GASTRONÔMICA: PORTUGAL
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Portugal tem culinária atlântica com forte tradição em bacalhau
(1001 receitas), frutos do mar, azeite e vinhos regionais.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Pequeno-almoço (7h-9h): Café, torradas, pastel de nata
• Almoço (12h-14h): Refeição principal, completa
• Lanche (16h-17h): Café com doce, sandes
• Jantar (19h-21h): Refeição substancial

🥘 PRATOS EMBLEMÁTICOS:
• Bacalhau à brás, à gomes de sá, com natas
• Cozido à portuguesa (carnes e enchidos)
• Arroz de marisco, caldeirada
• Francesinha (Porto)
• Sardinhas assadas

🛒 INGREDIENTES ESSENCIAIS:
• Mar: Bacalhau, sardinha, polvo, amêijoas
• Enchidos: Chouriço, morcela, salpicão
• Vegetais: Batata, couve portuguesa, grelos
• Especiais: Azeite, alho, louro, pimentão
• Pães: Broa, pão alentejano

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Dessalgar e preparar bacalhau
• Assar sardinhas na brasa
• Fazer refogados em azeite
• Cozidos longos e lentos
• Preparar caldos de peixe

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Bacalhau aparece em festas e Natal
• Azeite português de qualidade é essencial
• Café (bica) após refeições
• Sardinhas são tradição de Santo António (junho)
• Petiscos são cultura de bar (tapas portuguesas)`,

    ES: `
🇪🇸 CULTURA GASTRONÔMICA: ESPANHA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Espanha tem gastronomia regional riquíssima - cada comunidade 
autônoma tem pratos únicos, das tapas andaluzas à cocina vasca.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Desayuno (7h-9h): Café con tostada, churros
• Almuerzo (14h-16h): Refeição principal, MUITO tarde
• Merienda (17h-18h): Bocadillo, café
• Cena (21h-23h): Tapas, raciones, tardíssima

🥘 PRATOS EMBLEMÁTICOS:
• Paella valenciana (arroz com frutos do mar/carnes)
• Tortilla española (omelete de batata)
• Gazpacho/salmorejo (sopas frias)
• Jamón ibérico, chorizo
• Tapas variadas

🛒 INGREDIENTES ESSENCIAIS:
• Mar: Gambas, mejillones, pulpo, bacalao
• Embutidos: Jamón serrano/ibérico, chorizo, lomo
• Vegetais: Tomate, pimientos, patatas
• Especiais: Azafrán, pimentón, aceite de oliva
• Queijos: Manchego, cabrales

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Hacer paella en paellera
• Preparar tortilla jugosa
• Asar pimientos
• Curar jamón e embutidos
• Tapear (comer tapas)

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Horários de refeição são MUITO tardios
• Tapas são cultura social (ir de cañas)
• Sobremesa é conversa longa após comer
• Siesta ainda existe em algumas regiões
• Jamón ibérico é tesouro nacional`,

    FR: `
🇫🇷 CULTURA GASTRONÔMICA: FRANÇA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A culinária francesa é Patrimônio Cultural da UNESCO, base da
haute cuisine mundial, com técnicas clássicas e ingredientes premium.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Petit-déjeuner (7h-9h): Croissant, café, pain au chocolat
• Déjeuner (12h-14h): Refeição estruturada (entrée, plat, fromage, dessert)
• Goûter (16h): Para crianças, pain au chocolat
• Dîner (19h-21h): Refeição familiar completa

🥘 PRATOS EMBLEMÁTICOS:
• Coq au vin, boeuf bourguignon
• Ratatouille, quiche Lorraine
• Soupe à l'oignon, bouillabaisse
• Crêpes, tarte tatin
• Croissants, baguette

🛒 INGREDIENTES ESSENCIAIS:
• Laticínios: Beurre, crème fraîche, fromages (centenas)
• Proteínas: Poulet, canard, boeuf, lapin
• Vegetais: Échalotes, champignons, haricots verts
• Especiais: Herbes de Provence, moutarde, vin
• Pães: Baguette, croissant, brioche

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Fazer roux para molhos
• Flamber com conhaque/vinho
• Braise e cozimento lento
• Preparar mise en place
• Técnicas clássicas de confeitaria

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Queijo após o prato principal, antes da sobremesa
• Vinho acompanha quase todas as refeições
• Baguette fresca diariamente
• Manteiga de qualidade é essencial
• Apresentação do prato é muito importante`,

    IT: `
🇮🇹 CULTURA GASTRONÔMICA: ITÁLIA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Itália é berço de uma das culinárias mais influentes do mundo,
com forte regionalismo e respeito à qualidade dos ingredientes.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Colazione (7h-9h): Cappuccino com cornetto
• Pranzo (12h-14h): Refeição principal tradicional
• Merenda (16h-17h): Caffè, pequeno snack
• Cena (19h-21h): Refeição familiar

🥘 PRATOS EMBLEMÁTICOS:
• Pasta: Carbonara, amatriciana, bolognese, pesto
• Pizza: Margherita, marinara
• Risotto: Alla milanese, ai funghi
• Carnes: Ossobuco, saltimbocca, bistecca fiorentina
• Antipasti: Bruschetta, carpaccio, caprese

🛒 INGREDIENTES ESSENCIAIS:
• Massa: Pasta seca, fresca, gnocchi
• Queijos: Parmigiano-Reggiano, mozzarella, pecorino
• Embutidos: Prosciutto, pancetta, guanciale
• Tomates: San Marzano, pomodorini
• Especiais: Olio d'oliva, basilico, aglio

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Fazer massa fresca
• Preparar al dente
• Saltear massa na panela do molho
• Fazer risotto mantecato
• Usar água da massa

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Cappuccino APENAS de manhã
• Pasta é primo piatto (primeiro prato)
• Queijo NÃO vai com frutos do mar (regra sagrada)
• Ingredientes de qualidade > técnicas complexas
• Cada região tem suas especialidades`,

    DE: `
🇩🇪 CULTURA GASTRONÔMICA: ALEMANHA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
Alemanha tem culinária robusta e satisfatória, com foco em
carnes, batatas, pães e a maior tradição cervejeira do mundo.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Frühstück (6h-9h): Brötchen, Wurst, queijo, ovos
• Mittagessen (12h-13h): Refeição quente principal
• Kaffee und Kuchen (15h-16h): Café com bolo (tradição)
• Abendessen (18h-19h): Frio - pães, frios, queijo

🥘 PRATOS EMBLEMÁTICOS:
• Schnitzel (empanados de carne)
• Bratwurst, Currywurst, Weisswurst
• Sauerbraten (carne marinada em vinagre)
• Kartoffelsalat (salada de batata)
• Bretzel, Schwarzbrot

🛒 INGREDIENTES ESSENCIAIS:
• Carnes: Schweinefleisch, Rindfleisch, Wurst
• Vegetais: Kartoffeln, Sauerkraut, Rotkohl
• Pães: Vollkornbrot, Brötchen, Bretzel
• Laticínios: Quark, Käse variedades
• Especiais: Mostarda, raiz-forte, chucrute

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Fazer schnitzels empanados
• Preparar Braten (assados longos)
• Fermentar chucrute
• Fazer pães integrais
• Assar em forno

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Abendbrot é refeição fria (pão, frios)
• Bier acompanha muitas refeições
• Domingo é dia de Sonntagsbraten (assado)
• Kaffee und Kuchen às 15h é tradição
• Pães alemães são os melhores do mundo`,

    GB: `
🇬🇧 CULTURA GASTRONÔMICA: REINO UNIDO
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A culinária britânica é marcada por comfort food, assados de domingo,
afternoon tea e forte influência de ex-colônias (especialmente indiana).

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Breakfast (7h-9h): Full English - eggs, bacon, beans, toast
• Lunch (12h-14h): Sanduíches, soup, jacket potato
• Afternoon tea (15h-17h): Chá com scones, finger sandwiches
• Dinner/Supper (18h-20h): Refeição principal

🥘 PRATOS EMBLEMÁTICOS:
• Sunday Roast (beef, lamb, chicken com trimmings)
• Fish and Chips
• Shepherd's Pie, Cottage Pie
• Bangers and Mash
• Full English Breakfast

🛒 INGREDIENTES ESSENCIAIS:
• Carnes: Beef, lamb, pork, chicken
• Vegetais: Potatoes, peas, carrots, parsnips
• Laticínios: Cheddar, clotted cream, butter
• Especiais: Worcestershire sauce, HP sauce, gravy
• Pães: White bread, crumpets, scones

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Roasting (assados de domingo)
• Making proper gravy
• Baking pies and pastries
• Deep frying fish and chips
• Brewing proper tea

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Sunday Roast é tradição familiar sagrada
• Tea time com scones e clotted cream
• Fish and Chips na sexta-feira
• Curry é praticamente prato nacional
• Pub food é instituição cultural`,

    // ═══════════════════════════════════════════════════════════
    // ÁSIA
    // ═══════════════════════════════════════════════════════════
    JP: `
🇯🇵 CULTURA GASTRONÔMICA: JAPÃO
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A culinária japonesa (washoku) é Patrimônio Cultural da UNESCO,
focada em sazonalidade, apresentação, equilíbrio e ingredientes frescos.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Asagohan (7h-8h): Arroz, missoshiru, peixe grelhado, tsukemono
• Hirugohan (12h-13h): Bento, ramen, donburi
• Oyatsu (15h): Snacks leves
• Bangohan (18h-20h): Refeição familiar tradicional

🥘 PRATOS EMBLEMÁTICOS:
• Sushi e sashimi
• Ramen (shoyu, miso, tonkotsu)
• Tempura, tonkatsu
• Okonomiyaki, takoyaki
• Onigiri, bento

🛒 INGREDIENTES ESSENCIAIS:
• Base: Gohan (arroz japonês), dashi, shoyu
• Proteínas: Peixes variados, tofu, ovos
• Vegetais: Daikon, negi, edamame, shiitake
• Especiais: Miso, wasabi, nori, mirin
• Fermentados: Tsukemono, natto

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Fazer arroz japonês perfeito
• Preparar dashi (caldo base)
• Cortar sashimi com precisão
• Tempura crocante e leve
• Grelhar com precisão (yakimono)

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Sazonalidade é muito valorizada (shun)
• Apresentação visual é essencial
• Washoku segue regra do 5 (5 cores, 5 sabores, 5 métodos)
• Itadakimasu antes de comer
• Não espetar pauzinhos no arroz`,

    CN: `
🇨🇳 CULTURA GASTRONÔMICA: CHINA
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
China tem 8 grandes culinárias regionais (Sichuan, Cantonesa, etc.),
com técnicas milenares e uma filosofia de equilíbrio yin-yang.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Zǎocān (7h-9h): Congee, jianbing, baozi, doujiang
• Wǔcān (11h-13h): Refeição principal quente
• Wǎncān (17h-19h): Refeição familiar, múltiplos pratos

🥘 PRATOS EMBLEMÁTICOS:
• Dim sum (cantonês)
• Mapo doufu, kung pao chicken (Sichuan)
• Pato laqueado de Pequim
• Chow mein, fried rice
• Hot pot, dumplings

🛒 INGREDIENTES ESSENCIAIS:
• Base: Arroz, noodles, tofu
• Aromáticos: Ginger, garlic, scallions
• Molhos: Soy sauce, oyster sauce, hoisin
• Proteínas: Pork, chicken, duck, seafood
• Especiais: Sichuan peppercorn, five spice

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Wok hei (calor alto do wok)
• Stir frying em alta temperatura
• Steaming (dim sum, bao)
• Red braising (hongshao)
• Preparar dumplings

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Pratos são compartilhados no centro da mesa
• Chá acompanha refeições
• Número de pratos importa (par/ímpar)
• Equilíbrio de sabores e texturas
• Hot pot é social e festivo`,

    KR: `
🇰🇷 CULTURA GASTRONÔMICA: COREIA DO SUL
═══════════════════════════════════════════════════════════════

📍 IDENTIDADE CULINÁRIA:
A culinária coreana é dominada por fermentados, vegetais,
churrasco na mesa e uma impressionante variedade de banchan.

🍽️ REFEIÇÕES E HORÁRIOS TÍPICOS:
• Achim (7h-8h): Rice, soup, banchan
• Jeomsim (12h-13h): Refeição completa
• Jeonyeok (18h-20h): BBQ, jjigae, refeição social

🥘 PRATOS EMBLEMÁTICOS:
• Kimchi (fermentado essencial)
• Korean BBQ (samgyeopsal, bulgogi, galbi)
• Bibimbap (arroz misturado)
• Jjigae (ensopados: kimchi, sundubu)
• Tteokbokki (bolinhos de arroz picantes)

🛒 INGREDIENTES ESSENCIAIS:
• Fermentados: Kimchi, doenjang, gochujang
• Proteínas: Pork belly, beef, tofu
• Vegetais: Napa cabbage, radish, bean sprouts
• Especiais: Sesame oil, gochugaru, garlic
• Grãos: Short-grain rice, glass noodles

🔥 TÉCNICAS CULINÁRIAS TRADICIONAIS:
• Fermentar kimchi
• Grelhar na mesa (Korean BBQ)
• Preparar banchan variados
• Fazer caldos para jjigae
• Ssam (enrolar em folhas)

⚠️ REGRAS CULTURAIS IMPORTANTES:
• Banchan (acompanhamentos) sempre presentes
• Kimchi em TODA refeição
• BBQ é experiência social, cozinha na mesa
• Soju acompanha refeições noturnas
• Compartilhar pratos é norma`,
  };

  // Fallback para países sem guia específico
  const fallbackGuide = `
🌍 CULTURA GASTRONÔMICA: ${countryCode.toUpperCase()}
═══════════════════════════════════════════════════════════════

Por favor, gere receitas autênticas considerando:
• Ingredientes locais típicos e acessíveis
• Técnicas culinárias tradicionais da região
• Padrões de refeição e horários locais
• Preferências de sabor culturais
• Apresentação apropriada ao contexto cultural`;

  return culturalGuides[countryCode] || fallbackGuide;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY não configurada");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase não configurado");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      mealType, 
      category, 
      quantity = 10, 
      countryCode = 'BR',
      languageCode = 'pt-BR',
      intolerances = [],
      dietaryPreference = null,
      goal = null,
    } = await req.json();

    // Get configurations
    const countryConfig = getCountryConfig(countryCode);
    const selectedMealType = MEAL_TYPES.find(m => m.key === mealType) || MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)];
    const selectedCategory = typeof category === 'string' 
      ? RECIPE_CATEGORIES.find(c => c.key === category || c.label === category) || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)]
      : category || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)];
    const mealExamples = getMealExamples(selectedMealType.key, countryCode);
    const ingredientPriority = getIngredientPriority(countryCode);

    const categoryLabel = typeof selectedCategory === 'object' ? selectedCategory.label : selectedCategory;
    const categoryDescription = typeof selectedCategory === 'object' ? selectedCategory.description : '';

    console.log(`[generate-simple-meals] Gerando ${quantity} receitas: ${selectedMealType.label} - ${categoryLabel} para ${countryConfig.name}`);

    // Fetch existing recipes to avoid duplicates
    const { data: existingMeals } = await supabase
      .from('simple_meals')
      .select('name')
      .eq('country_code', countryCode);

    const existingNames = existingMeals?.map(m => m.name.toLowerCase()) || [];

    // Build all instruction sections
    const intoleranceInstructions = buildIntoleranceInstructions(intolerances);
    const dietaryInstructions = buildDietaryInstructions(selectedCategory);
    const goalInstructions = buildGoalInstructions(goal);
    const categoryStyleInstructions = buildCategoryInstructions(selectedCategory);
    const countryCulturalInstructions = buildCountryCulturalInstructions(countryCode);

    // ============================================
    // PROMPT DE NÍVEL HARVARD/GOOGLE
    // ============================================
    const systemPrompt = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    RECEIT.AI - CHEF MASTER INTELLIGENCE                      ║
║            Sistema Avançado de Geração de Receitas Nutricionais              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Você é o CHEF MASTER AI - um sistema de inteligência artificial de ponta, treinado 
pelo melhor conhecimento culinário mundial, combinando:

🎓 FORMAÇÃO ACADÊMICA:
  • Graduação em Gastronomia pela Le Cordon Bleu Paris
  • Mestrado em Ciências da Nutrição por Harvard
  • Doutorado em Food Science pelo MIT
  • Certificação em Culinária Brasileira pelo SENAC

👨‍🍳 EXPERIÊNCIA PROFISSIONAL:
  • 20 anos como Chef Executivo em restaurantes estrelados Michelin
  • Consultor culinário para Google, Apple e Meta
  • Autor de 15 livros de receitas best-sellers
  • Especialista em adaptação de receitas para restrições alimentares

═══════════════════════════════════════════════════════════════════════════════
📍 CONTEXTO GEOGRÁFICO: ${countryConfig.name.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

🌍 ESPECIALIZAÇÃO REGIONAL:
  • Idioma nativo: ${countryConfig.language}
  • ${ingredientPriority}
  • Conhecimento profundo da cultura gastronômica local
  • Domínio de técnicas culinárias tradicionais e contemporâneas

🍽️ EXEMPLOS AUTÊNTICOS DE ${selectedMealType.label.toUpperCase()}:
  ${mealExamples.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
🎯 MISSÃO: GERAR RECEITAS PARA "${selectedMealType.label.toUpperCase()}"
═══════════════════════════════════════════════════════════════════════════════

📋 CARACTERÍSTICAS DESTA REFEIÇÃO:
  • ${selectedMealType.characteristics}
  • Faixa calórica ideal: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal
  • Proteína recomendada: ${selectedMealType.proteinRange[0]}-${selectedMealType.proteinRange[1]}g

📂 CATEGORIA SELECIONADA: ${categoryLabel}
  ${categoryDescription}

${categoryStyleInstructions}

${countryCulturalInstructions}

${goalInstructions}

${dietaryInstructions}

${intoleranceInstructions}

═══════════════════════════════════════════════════════════════════════════════
📊 PADRÕES DE QUALIDADE NUTRICIONAL
═══════════════════════════════════════════════════════════════════════════════

✓ VALORES NUTRICIONAIS DEVEM SER:
  • Baseados em porções reais e mensuráveis
  • Calculados com precisão científica
  • Coerentes com os ingredientes listados
  • Dentro das faixas calóricas especificadas

✓ INGREDIENTES DEVEM SER:
  • Acessíveis em supermercados de ${countryConfig.name}
  • Listados com quantidades precisas (gramas, ml, unidades)
  • Organizados na ordem de uso
  • Entre 3 e 8 ingredientes por receita

✓ CADA RECEITA DEVE TER:
  • Nome criativo, apetitoso e autêntico
  • Descrição que desperte o apetite (1 frase)
  • Tempo de preparo realista
  • Valores nutricionais precisos

═══════════════════════════════════════════════════════════════════════════════
⚙️ FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════════

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO.
NÃO inclua markdown, comentários ou texto adicional.
NÃO use \`\`\`json ou qualquer formatação.
APENAS o JSON puro e válido.

Idioma do conteúdo: ${countryConfig.language === 'pt-BR' ? 'Português Brasileiro' : countryConfig.language}
`;

    const userPrompt = `
═══════════════════════════════════════════════════════════════════════════════
📝 TAREFA: GERAR ${quantity} RECEITAS ÚNICAS
═══════════════════════════════════════════════════════════════════════════════

PARÂMETROS:
  • Tipo de refeição: ${selectedMealType.label}
  • Categoria: ${categoryLabel}
  • Calorias por porção: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal
  • País: ${countryConfig.name}

${existingNames.length > 0 ? `
⚠️ RECEITAS JÁ EXISTENTES (NÃO REPETIR):
${existingNames.slice(0, 40).join(', ')}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
📋 ESTRUTURA JSON OBRIGATÓRIA
═══════════════════════════════════════════════════════════════════════════════

{
  "recipes": [
    {
      "name": "Nome Criativo da Receita",
      "description": "Descrição curta e apetitosa que desperta o desejo de comer",
      "calories": 350,
      "protein": 25,
      "carbs": 30,
      "fat": 12,
      "prep_time": 20,
      "ingredients": [
        {"name": "ingrediente principal", "quantity": "200g"},
        {"name": "segundo ingrediente", "quantity": "100g"},
        {"name": "tempero", "quantity": "a gosto"}
      ],
      "instructions": [
        {
          "step": 1,
          "title": "Título curto do passo",
          "description": "Descrição detalhada do que fazer, incluindo técnicas, temperaturas, tempos e dicas"
        },
        {
          "step": 2,
          "title": "Próximo passo",
          "description": "Continuação detalhada com instruções claras"
        }
      ],
      "compatible_meal_times": ["${selectedMealType.key}"]
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════════
📝 INSTRUÇÕES DE PREPARO - DIRETRIZES DETALHADAS
═══════════════════════════════════════════════════════════════════════════════

CADA RECEITA DEVE TER INSTRUÇÕES COMPLETAS COM:

✓ ESTRUTURA POR PASSO:
  • step: número sequencial (1, 2, 3...)
  • title: ação principal em 3-5 palavras (ex: "Refogar a cebola")
  • description: instrução detalhada de 2-4 frases

✓ NÍVEL DE DETALHE ESPERADO:
  • Temperaturas específicas ("fogo médio-alto", "180°C", "fervura branda")
  • Tempos exatos ("por 5 minutos", "até dourar", "cerca de 15 minutos")
  • Técnicas explicadas ("mexendo constantemente", "sem tampar", "em fio")
  • Indicadores visuais ("até ficar translúcido", "quando borbulhar", "cor dourada")
  • Pontos de atenção ("cuidado para não queimar", "reserve o líquido")

✓ QUANTIDADE DE PASSOS:
  • Mínimo: 3 passos para receitas simples
  • Ideal: 4-6 passos para receitas médias
  • Máximo: 8 passos para receitas elaboradas

✓ EXEMPLO DE INSTRUÇÃO BEM ESCRITA:
  {
    "step": 1,
    "title": "Preparar os vegetais",
    "description": "Lave bem o brócolis e separe em floretes pequenos. Corte a cenoura em rodelas finas de aproximadamente 3mm. Reserve os vegetais em tigelas separadas pois terão tempos de cozimento diferentes."
  }

═══════════════════════════════════════════════════════════════════════════════
✅ CHECKLIST DE QUALIDADE (VERIFICAR ANTES DE RESPONDER)
═══════════════════════════════════════════════════════════════════════════════

□ Todas as ${quantity} receitas são ÚNICAS e DIFERENTES entre si?
□ Nenhuma receita repete conceito ou ingrediente principal de outra?
□ Os valores nutricionais estão dentro da faixa especificada?
□ Os ingredientes são acessíveis em ${countryConfig.name}?
□ O tempo de preparo é realista para a complexidade?
□ As descrições são apetitosas e envolventes?
□ NENHUM ingrediente proibido foi incluído?
□ As INSTRUÇÕES são detalhadas com tempos, temperaturas e técnicas?
□ Cada passo tem title E description completos?
□ O JSON está formatado corretamente sem erros de sintaxe?

GERE AS ${quantity} RECEITAS AGORA:`;

    console.log(`[generate-simple-meals] Chamando API Gemini 2.5 Flash com country: ${countryCode}, category: ${categoryLabel}`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\n" + userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 16384,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-simple-meals] Erro na API Gemini:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "Chave de API inválida ou sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract usage metadata for token tracking
    const usageMetadata = aiResponse.usageMetadata || {};
    const promptTokens = usageMetadata.promptTokenCount || 0;
    const completionTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = usageMetadata.totalTokenCount || 0;
    
    // Gemini Flash Lite pricing: $0.075/1M input, $0.30/1M output
    const inputCostPer1M = 0.075;
    const outputCostPer1M = 0.30;
    const estimatedCostUsd = (promptTokens * inputCostPer1M / 1000000) + (completionTokens * outputCostPer1M / 1000000);
    
    console.log(`[generate-simple-meals] Token usage - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}, Cost: $${estimatedCostUsd.toFixed(6)}`);
    
    // Clean markdown if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("[generate-simple-meals] Resposta recebida do Gemini, parseando JSON...");

    let recipes;
    try {
      const parsed = JSON.parse(content);
      recipes = parsed.recipes || parsed;
    } catch (parseError) {
      console.error("[generate-simple-meals] Erro ao parsear JSON:", parseError);
      console.error("[generate-simple-meals] Conteúdo:", content.substring(0, 500));
      throw new Error("Formato de resposta inválido da IA");
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error("Nenhuma receita gerada");
    }

    // Prepare data for insertion
    const categoryKey = typeof selectedCategory === 'object' ? selectedCategory.key : selectedCategory;
    const mealsToInsert = recipes
      .filter(r => r.name && !existingNames.includes(r.name.toLowerCase()))
      .map((recipe, index) => ({
        name: recipe.name,
        description: recipe.description || null,
        calories: Math.round(recipe.calories) || 300,
        protein: Math.round(recipe.protein) || 15,
        carbs: Math.round(recipe.carbs) || 30,
        fat: Math.round(recipe.fat) || 10,
        prep_time: recipe.prep_time || 15,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [], // Instruções detalhadas passo-a-passo
        meal_type: selectedMealType.key,
        compatible_meal_times: recipe.compatible_meal_times || [selectedMealType.key],
        country_code: countryCode,
        language_code: languageCode,
        is_active: true,
        ai_generated: true,
        component_type: categoryKey,
        sort_order: index,
        source_module: "plano_simples", // Pool central
        usage_count: 0,
        last_used_at: null,
      }));

    if (mealsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Todas as receitas geradas já existem no banco",
        inserted: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('simple_meals')
      .insert(mealsToInsert)
      .select('id, name');

    if (insertError) {
      console.error("[generate-simple-meals] Erro ao inserir:", insertError);
      throw new Error(`Erro ao salvar receitas: ${insertError.message}`);
    }

    // Log AI usage to tracking table
    const executionEndTime = Date.now();
    const executionTimeMs = executionEndTime - Date.now(); // Will be negative, we need start time
    
    try {
      await supabase.from('ai_usage_logs').insert({
        function_name: 'generate-simple-meals',
        model_used: 'gemini-2.0-flash-lite',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        items_generated: insertedData?.length || 0,
        metadata: {
          meal_type: selectedMealType.key,
          category: categoryKey,
          country_code: countryCode,
          quantity_requested: quantity,
        },
      });
      console.log(`[generate-simple-meals] ✅ Token usage logged to ai_usage_logs`);
    } catch (logError) {
      console.error("[generate-simple-meals] Erro ao salvar log de uso:", logError);
      // Don't fail the request if logging fails
    }

    console.log(`[generate-simple-meals] ✅ Inseridas ${insertedData?.length || 0} receitas com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedData?.length || 0,
      mealType: selectedMealType.label,
      category: categoryLabel,
      country: countryConfig.name,
      recipes: insertedData?.map(r => r.name) || [],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-simple-meals] Erro geral:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
