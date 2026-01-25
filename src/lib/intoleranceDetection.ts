/**
 * Detecção automática de intolerâncias para alimentos cadastrados
 * 
 * NOTA: Este arquivo usa fallbacks locais para detecção rápida client-side.
 * Os labels e mapeamentos definitivos vêm do banco de dados via useSafetyLabels.
 * Usar este módulo apenas para detecção rápida local sem chamadas de rede.
 * 
 * @deprecated Para labels, usar useSafetyLabels hook que busca do banco de dados
 */

interface IntoleranceKeywords {
  keywords: string[];
  safeKeywords?: string[];
}

/**
 * Mapeamento local para detecção rápida client-side (fallback)
 * A fonte de verdade são as tabelas intolerance_mappings e intolerance_safe_keywords
 */
const INTOLERANCE_KEYWORDS: Record<string, IntoleranceKeywords> = {
  lactose: {
    keywords: [
      'leite', 'queijo', 'iogurte', 'manteiga', 'creme', 'nata', 'requeijão',
      'mussarela', 'parmesão', 'cheddar', 'cottage', 'ricota', 'catupiry',
      'cream cheese', 'burrata', 'mascarpone', 'gorgonzola', 'provolone',
      'coalho', 'chantilly', 'coalhada', 'kefir',
      'big mac', 'mc chicken', 'whopper', 'cheeseburger', 'x-burguer', 'x-salada',
      'x-tudo', 'x-bacon', 'x-egg', 'pizza', 'lasanha', 'strogonoff', 'estrogonofe',
      'parmegiana', 'gratinado', 'carbonara', 'alfredo', 'molho branco', 'bechamel',
      'milkshake', 'sundae', 'mcflurry', 'casquinha', 'sorvete',
      'cappuccino', 'latte', 'mocha', 'frappuccino', 'café com leite',
      'brigadeiro', 'beijinho', 'pudim', 'flan', 'mousse', 'cheesecake', 'tiramisu',
      'pão de queijo', 'croissant', 'fondue', 'misto quente',
      'doce de leite', 'leite condensado', 'chocolate ao leite', 'achocolatado',
    ],
    safeKeywords: [
      'sem lactose', 'zero lactose', 'vegetal', 'vegano', 'vegan', 'plant',
      'amêndoa', 'coco', 'aveia', 'arroz', 'soja', 'castanha', 'avelã',
    ],
  },
  
  gluten: {
    keywords: [
      'trigo', 'farinha', 'pão', 'macarrão', 'massa', 'biscoito', 'bolacha',
      'bolo', 'torta', 'cerveja', 'cevada', 'centeio', 'aveia', 'semolina',
      'bulgur', 'triguilho', 'cuscuz', 'seitan',
      'baguete', 'brioche', 'ciabatta', 'croissant', 'torrada',
      'espaguete', 'penne', 'fusilli', 'talharim', 'fettuccine', 'lasanha',
      'canelone', 'ravióli', 'capeletti', 'tortellini', 'nhoque', 'miojo',
      'big mac', 'mc chicken', 'whopper', 'hamburguer', 'hamburger', 'cheeseburger',
      'x-burguer', 'x-salada', 'x-tudo', 'x-bacon', 'x-egg',
      'hot dog', 'cachorro quente', 'sanduiche', 'sandwich', 'wrap', 'burrito', 'taco',
      'nuggets', 'nugget', 'mcnuggets', 'empanado', 'milanesa', 'parmegiana',
      'coxinha', 'risole', 'pastel', 'kibe', 'quibe', 'esfirra', 'esfiha',
      'salgado', 'empada', 'empadinha', 'quiche', 'panini', 'misto quente',
      'bauru', 'francesinha', 'strogonoff', 'estrogonofe',
      'shoyu', 'molho de soja', 'teriyaki',
    ],
    safeKeywords: [
      'sem glúten', 'gluten free', 'gluten-free', 'sem farinha',
      'farinha de arroz', 'farinha de amêndoas', 'farinha de coco',
      'farinha de mandioca', 'polvilho', 'tapioca',
    ],
  },
  
  ovo: {
    keywords: [
      'ovo', 'ovos', 'gema', 'clara', 'omelete', 'fritada',
      'maionese', 'caesar', 'carbonara', 'quiche', 'torta', 'bolo',
      'panqueca', 'waffle', 'crepe', 'empanado', 'milanesa',
      'nuggets', 'mcnuggets', 'brioche', 'pão de ló',
    ],
    safeKeywords: ['sem ovo', 'vegano', 'vegan'],
  },
  
  frutos_do_mar: {
    keywords: [
      'peixe', 'salmão', 'atum', 'tilápia', 'bacalhau', 'sardinha', 'merluza',
      'pescada', 'robalo', 'dourado', 'truta', 'linguado',
      'camarão', 'lagosta', 'lagostim', 'lula', 'polvo', 'marisco',
      'mexilhão', 'ostra', 'vieira', 'siri', 'caranguejo', 'sururu',
      'sushi', 'sashimi', 'temaki', 'moqueca', 'bobó', 'vatapá',
      'acarajé', 'paella', 'caldeirada', 'ceviche',
      'fish', 'shrimp', 'seafood', 'molho de peixe', 'fish sauce', 'molho de ostra',
    ],
    safeKeywords: ['vegetariano', 'vegano', 'vegan'],
  },
  
  amendoim: {
    keywords: [
      'amendoim', 'pasta de amendoim', 'manteiga de amendoim', 'peanut',
      'paçoca', 'paçoquita', 'pé de moleque', 'rapadura com amendoim',
      'pad thai', 'satay', 'óleo de amendoim',
    ],
    safeKeywords: ['sem amendoim', 'peanut free'],
  },
  
  soja: {
    keywords: [
      'soja', 'tofu', 'edamame', 'missô', 'miso', 'natto',
      'shoyu', 'molho de soja', 'tempeh', 'leite de soja',
      'proteína de soja', 'lecitina de soja',
    ],
    safeKeywords: ['sem soja', 'soy free'],
  },
  
  castanhas: {
    keywords: [
      'castanha', 'noz', 'nozes', 'amêndoa', 'avelã', 'pistache',
      'macadâmia', 'pecã', 'pinhão', 'castanha de caju', 'castanha do pará',
      'praline', 'marzipan', 'nougat', 'nutella',
    ],
    safeKeywords: ['sem nozes', 'nut free'],
  },
  
  acucar: {
    keywords: [
      'açúcar', 'mel', 'melado', 'rapadura', 'xarope',
      'leite condensado', 'doce de leite', 'caramelo',
      'refrigerante', 'suco de caixinha', 'néctar',
      'chocolate', 'bala', 'chiclete', 'pirulito',
      'sorvete', 'pudim', 'brigadeiro', 'bolo',
    ],
    safeKeywords: ['sem açúcar', 'zero açúcar', 'diet', 'sugar free', 'zero'],
  },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function checkFoodIntolerance(
  foodName: string,
  intoleranceKey: string
): boolean {
  const normalizedFood = normalizeText(foodName);
  const config = INTOLERANCE_KEYWORDS[intoleranceKey];
  
  if (!config) return false;
  
  if (config.safeKeywords) {
    const isSafe = config.safeKeywords.some(safe => 
      normalizedFood.includes(normalizeText(safe))
    );
    if (isSafe) return false;
  }
  
  return config.keywords.some(keyword => 
    normalizedFood.includes(normalizeText(keyword))
  );
}

export function detectFoodIntolerances(foodName: string): string[] {
  const detectedIntolerances: string[] = [];
  
  for (const [intoleranceKey] of Object.entries(INTOLERANCE_KEYWORDS)) {
    if (checkFoodIntolerance(foodName, intoleranceKey)) {
      detectedIntolerances.push(intoleranceKey);
    }
  }
  
  return detectedIntolerances;
}

export function checkUserIntoleranceConflict(
  foodName: string,
  userIntolerances: string[]
): { hasConflict: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  
  for (const intolerance of userIntolerances) {
    if (intolerance === "nenhuma") continue;
    
    if (checkFoodIntolerance(foodName, intolerance)) {
      conflicts.push(intolerance);
    }
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Labels de fallback - usar useSafetyLabels hook para labels do banco de dados
 * @deprecated Usar useSafetyLabels.getIntoleranceLabel() para labels atualizados do DB
 */
export const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  ovo: "Ovo",
  frutos_do_mar: "Frutos do Mar",
  amendoim: "Amendoim",
  soja: "Soja",
  castanhas: "Castanhas",
  acucar: "Açúcar",
  cafeina: "Cafeína",
  histamina: "Histamina",
  fodmap: "FODMAP",
};

/**
 * @deprecated Usar useSafetyLabels.getIntoleranceLabel() para labels atualizados do DB
 */
export function getIntoleranceLabel(key: string): string {
  return INTOLERANCE_LABELS[key] || key;
}
