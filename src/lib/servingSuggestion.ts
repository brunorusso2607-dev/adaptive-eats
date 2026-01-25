// Sugestão automática de porção baseada na categoria do alimento

export interface ServingSuggestion {
  defaultServingSize: number;
  servingUnit: 'g' | 'ml' | 'un' | 'fatia';
  description: string;
}

// Mapeamento de categorias para porções padrão realistas
const categoryServingMap: Record<string, ServingSuggestion> = {
  // Carnes e proteínas
  'carne': { defaultServingSize: 120, servingUnit: 'g', description: '1 bife médio' },
  'frango': { defaultServingSize: 150, servingUnit: 'g', description: '1 peito ou coxa' },
  'peixe': { defaultServingSize: 120, servingUnit: 'g', description: '1 filé médio' },
  'ovo': { defaultServingSize: 50, servingUnit: 'un', description: '1 unidade' },
  'proteina': { defaultServingSize: 100, servingUnit: 'g', description: '1 porção' },
  
  // Laticínios
  'leite': { defaultServingSize: 200, servingUnit: 'ml', description: '1 copo' },
  'iogurte': { defaultServingSize: 170, servingUnit: 'g', description: '1 pote' },
  'queijo': { defaultServingSize: 30, servingUnit: 'g', description: '1 fatia' },
  'laticinio': { defaultServingSize: 100, servingUnit: 'g', description: '1 porção' },
  
  // Bebidas
  'suco': { defaultServingSize: 200, servingUnit: 'ml', description: '1 copo' },
  'refrigerante': { defaultServingSize: 350, servingUnit: 'ml', description: '1 lata' },
  'cafe': { defaultServingSize: 50, servingUnit: 'ml', description: '1 xícara pequena' },
  'cha': { defaultServingSize: 200, servingUnit: 'ml', description: '1 xícara' },
  'bebida': { defaultServingSize: 200, servingUnit: 'ml', description: '1 copo' },
  'agua': { defaultServingSize: 200, servingUnit: 'ml', description: '1 copo' },
  
  // Pães e cereais
  'pao': { defaultServingSize: 50, servingUnit: 'un', description: '1 unidade' },
  'torrada': { defaultServingSize: 30, servingUnit: 'un', description: '2 unidades' },
  'cereal': { defaultServingSize: 40, servingUnit: 'g', description: '1 xícara' },
  'granola': { defaultServingSize: 40, servingUnit: 'g', description: '4 colheres' },
  'aveia': { defaultServingSize: 30, servingUnit: 'g', description: '3 colheres' },
  
  // Carboidratos
  'arroz': { defaultServingSize: 100, servingUnit: 'g', description: '4 colheres' },
  'macarrao': { defaultServingSize: 100, servingUnit: 'g', description: '1 prato' },
  'massa': { defaultServingSize: 100, servingUnit: 'g', description: '1 prato' },
  'batata': { defaultServingSize: 100, servingUnit: 'g', description: '1 unidade média' },
  'feijao': { defaultServingSize: 80, servingUnit: 'g', description: '1 concha' },
  
  // Frutas
  'fruta': { defaultServingSize: 100, servingUnit: 'g', description: '1 unidade média' },
  'banana': { defaultServingSize: 100, servingUnit: 'un', description: '1 unidade' },
  'maca': { defaultServingSize: 150, servingUnit: 'un', description: '1 unidade' },
  'laranja': { defaultServingSize: 180, servingUnit: 'un', description: '1 unidade' },
  
  // Vegetais
  'salada': { defaultServingSize: 100, servingUnit: 'g', description: '1 prato' },
  'legume': { defaultServingSize: 100, servingUnit: 'g', description: '1 porção' },
  'vegetal': { defaultServingSize: 100, servingUnit: 'g', description: '1 porção' },
  'verdura': { defaultServingSize: 50, servingUnit: 'g', description: '1 porção' },
  
  // Pratos prontos
  'sopa': { defaultServingSize: 300, servingUnit: 'ml', description: '1 prato' },
  'lasanha': { defaultServingSize: 300, servingUnit: 'un', description: '1 porção' },
  'pizza': { defaultServingSize: 100, servingUnit: 'fatia', description: '1 fatia' },
  'sanduiche': { defaultServingSize: 150, servingUnit: 'un', description: '1 unidade' },
  'lanche': { defaultServingSize: 150, servingUnit: 'un', description: '1 unidade' },
  'prato_pronto': { defaultServingSize: 300, servingUnit: 'g', description: '1 porção' },
  
  // Doces e sobremesas
  'doce': { defaultServingSize: 50, servingUnit: 'g', description: '1 porção' },
  'chocolate': { defaultServingSize: 25, servingUnit: 'g', description: '1 quadrado' },
  'bolo': { defaultServingSize: 80, servingUnit: 'fatia', description: '1 fatia' },
  'sorvete': { defaultServingSize: 100, servingUnit: 'g', description: '1 bola' },
  'pudim': { defaultServingSize: 100, servingUnit: 'un', description: '1 fatia' },
  'sobremesa': { defaultServingSize: 100, servingUnit: 'g', description: '1 porção' },
  
  // Snacks
  'biscoito': { defaultServingSize: 30, servingUnit: 'g', description: '5 unidades' },
  'salgadinho': { defaultServingSize: 25, servingUnit: 'g', description: '1 pacote pequeno' },
  'castanha': { defaultServingSize: 30, servingUnit: 'g', description: '1 punhado' },
  'amendoim': { defaultServingSize: 30, servingUnit: 'g', description: '1 punhado' },
  'snack': { defaultServingSize: 30, servingUnit: 'g', description: '1 porção' },
  
  // Óleos e gorduras
  'oleo': { defaultServingSize: 10, servingUnit: 'ml', description: '1 colher' },
  'azeite': { defaultServingSize: 10, servingUnit: 'ml', description: '1 colher' },
  'manteiga': { defaultServingSize: 10, servingUnit: 'g', description: '1 colher' },
  'margarina': { defaultServingSize: 10, servingUnit: 'g', description: '1 colher' },
};

// Palavras-chave para detectar categoria a partir do nome do alimento
const categoryKeywords: Record<string, string[]> = {
  'carne': ['bife', 'carne', 'picanha', 'alcatra', 'patinho', 'maminha', 'costela', 'linguica', 'salsicha', 'bacon', 'presunto', 'peito de peru', 'hamburguer'],
  'frango': ['frango', 'galinha', 'peru', 'chester', 'peito de frango', 'coxa', 'sobrecoxa', 'asa'],
  'peixe': ['peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau', 'camarao', 'lagosta', 'lula', 'polvo'],
  'ovo': ['ovo', 'ovos', 'omelete', 'ovo frito', 'ovo cozido', 'ovo mexido'],
  'leite': ['leite'],
  'iogurte': ['iogurte', 'danone', 'activia', 'danoninho'],
  'queijo': ['queijo', 'mussarela', 'parmesao', 'cheddar', 'cottage', 'ricota', 'gorgonzola', 'brie'],
  'suco': ['suco', 'néctar'],
  'refrigerante': ['refrigerante', 'coca', 'pepsi', 'guarana', 'fanta', 'sprite'],
  'cafe': ['cafe', 'expresso', 'cappuccino', 'latte'],
  'cha': ['cha', 'mate', 'chimarrao'],
  'pao': ['pao', 'bisnaga', 'baguete', 'croissant', 'brioche'],
  'torrada': ['torrada', 'toast'],
  'cereal': ['cereal', 'sucrilhos', 'corn flakes', 'musli'],
  'granola': ['granola'],
  'aveia': ['aveia'],
  'arroz': ['arroz'],
  'macarrao': ['macarrao', 'espaguete', 'penne', 'fusilli', 'talharim', 'nhoque'],
  'batata': ['batata', 'pure', 'mandioca', 'aipim', 'inhame', 'cara'],
  'feijao': ['feijao', 'lentilha', 'grao de bico', 'ervilha'],
  'fruta': ['fruta', 'abacaxi', 'manga', 'morango', 'uva', 'melancia', 'melao', 'mamao', 'kiwi', 'pera', 'pessego', 'ameixa'],
  'banana': ['banana'],
  'maca': ['maca'],
  'laranja': ['laranja', 'tangerina', 'mexerica', 'ponkan', 'limao'],
  'salada': ['salada', 'mix de folhas'],
  'legume': ['cenoura', 'beterraba', 'chuchu', 'abobrinha', 'abobora', 'berinjela', 'pepino', 'tomate', 'pimentao'],
  'verdura': ['alface', 'rucula', 'agriao', 'espinafre', 'couve', 'brocolis', 'couve-flor', 'repolho'],
  'sopa': ['sopa', 'caldo', 'creme de'],
  'lasanha': ['lasanha'],
  'pizza': ['pizza'],
  'sanduiche': ['sanduiche', 'sandwich', 'misto', 'bauru', 'x-burguer', 'x-salada'],
  'lanche': ['lanche', 'hamburguer', 'hot dog', 'cachorro quente'],
  'doce': ['brigadeiro', 'beijinho', 'cajuzinho', 'docinho', 'trufa'],
  'chocolate': ['chocolate', 'bombom', 'cacau'],
  'bolo': ['bolo', 'torta'],
  'sorvete': ['sorvete', 'gelato', 'acai', 'frozen'],
  'pudim': ['pudim', 'flan', 'mousse', 'manjar'],
  'biscoito': ['biscoito', 'bolacha', 'cookie', 'wafer'],
  'salgadinho': ['salgadinho', 'chips', 'batata palha', 'doritos', 'cheetos'],
  'castanha': ['castanha', 'noz', 'avel', 'macadamia', 'pistache'],
  'amendoim': ['amendoim'],
  'oleo': ['oleo'],
  'azeite': ['azeite'],
  'manteiga': ['manteiga'],
  'margarina': ['margarina'],
};

/**
 * Detecta a categoria de um alimento baseado no nome
 */
export function detectCategory(foodName: string): string | null {
  const normalizedName = foodName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      if (normalizedName.includes(normalizedKeyword)) {
        return category;
      }
    }
  }
  
  return null;
}

/**
 * Sugere porção padrão baseada na categoria do alimento
 */
export function suggestServing(category: string | null): ServingSuggestion {
  const defaultSuggestion: ServingSuggestion = {
    defaultServingSize: 100,
    servingUnit: 'g',
    description: '100g'
  };
  
  if (!category) {
    return defaultSuggestion;
  }
  
  const normalizedCategory = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  return categoryServingMap[normalizedCategory] || defaultSuggestion;
}

/**
 * Sugere porção baseada no nome do alimento (detecta categoria automaticamente)
 */
export function suggestServingByName(foodName: string): ServingSuggestion {
  const category = detectCategory(foodName);
  return suggestServing(category);
}

/**
 * Retorna todas as categorias disponíveis
 */
export function getAvailableCategories(): string[] {
  return Object.keys(categoryServingMap);
}
