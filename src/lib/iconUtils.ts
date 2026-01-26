import { type LucideIcon } from "lucide-react";
import {
  Wheat, WheatOff, Milk, MilkOff, Nut, NutOff, Fish, FishOff,
  Egg, EggOff, Bean, BeanOff, CircleSlash, Leaf, LeafyGreen, Salad,
  Scale, TrendingDown, TrendingUp, Minus, Clock, Flame, Timer,
  User, Users, Baby, Check, Ban, CircleOff, CircleDot,
  Beef, Bird, Drumstick, Ham, Bone, Carrot, Apple, Banana,
  Cherry, Citrus, Grape, Pizza, Sandwich, Soup, Cookie, Cake,
  IceCreamCone, Popcorn, Candy, Coffee, Beer, Wine,
  Croissant, Slice, Vegan, Snowflake, Lollipop, ChefHat
} from "lucide-react";

/**
 * Mapeamento centralizado de nomes de ícones para componentes Lucide
 * Este é o único local onde os ícones são mapeados - garante consistência em toda a aplicação
 */
export const LUCIDE_ICONS: Record<string, LucideIcon> = {
  // Grãos e cereais
  wheat: Wheat,
  "wheat-off": WheatOff,

  // Laticínios
  milk: Milk,
  "milk-off": MilkOff,

  // Oleaginosas
  nut: Nut,
  "nut-off": NutOff,

  // Peixes e frutos do mar
  fish: Fish,
  "fish-off": FishOff,

  // Ovos
  egg: Egg,
  "egg-off": EggOff,

  // Leguminosas
  bean: Bean,
  "bean-off": BeanOff,

  // Carnes
  beef: Beef,
  bird: Bird,
  drumstick: Drumstick,
  ham: Ham,
  bone: Bone,

  // Vegetais e folhas
  leaf: Leaf,
  "leafy-green": LeafyGreen,
  salad: Salad,
  carrot: Carrot,
  vegan: Vegan,

  // Frutas
  apple: Apple,
  banana: Banana,
  cherry: Cherry,
  citrus: Citrus,
  grape: Grape,

  // Refeições
  utensils: CircleSlash,
  pizza: Pizza,
  sandwich: Sandwich,
  soup: Soup,
  croissant: Croissant,
  slice: Slice,

  // Doces e sobremesas
  cookie: Cookie,
  cake: Cake,
  "ice-cream-cone": IceCreamCone,
  popcorn: Popcorn,
  candy: Candy,
  "candy-off": Ban,
  lollipop: Lollipop,

  // Bebidas
  coffee: Coffee,
  beer: Beer,
  wine: Wine,

  // Dieta e nutrição
  flame: Flame,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  scale: Scale,
  minus: Minus,
  snowflake: Snowflake,

  // Tempo e preparo
  clock: Clock,
  zap: Timer,
  timer: Timer,
  "chef-hat": ChefHat,

  // Pessoas
  user: User,
  users: Users,
  baby: Baby,

  // Status e indicadores
  check: Check,
  ban: Ban,
  "circle-off": CircleOff,
  "circle-dot": CircleDot,
};

/**
 * Mapeamento de fallback por option_id para compatibilidade
 */
const FALLBACK_ICON_MAP: Record<string, LucideIcon> = {
  gluten: Wheat,
  lactose: Milk,
  peanut: CircleDot,
  nuts: Nut,
  seafood: Fish,
  fish: Fish,
  eggs: Egg,
  soy: Bean,
  none: Check,
  nenhuma: Check,
  // Dietary preferences - English canonical keys
  omnivore: Salad,
  vegetarian: Leaf,
  vegan: Leaf,
  pescatarian: Fish,
  flexitarian: Leaf,
  ketogenic: Flame,
  low_carb: Flame,
  // Legacy Portuguese keys for compatibility
  comum: Salad,
  vegetariana: Leaf,
  vegana: Leaf,
  pescetariana: Fish,
  flexitariana: Leaf,
  cetogenica: Flame,
  emagrecer: TrendingDown,
  lose_weight: TrendingDown,
  weight_loss: TrendingDown,
  manter: Minus,
  maintain: Minus,
  maintenance: Minus,
  ganhar_peso: TrendingUp,
  gain_weight: TrendingUp,
  weight_gain: TrendingUp,
  reduzir: TrendingDown,
  aumentar: TrendingUp,
  definir_depois: Clock,
  rapida: Timer,
  equilibrada: Scale,
  elaborada: ChefHat,
  individual: User,
  familia: Users,
  modo_kids: Baby,
  // Novas intolerâncias
  frutose: Apple,
  fodmap: CircleDot,
  histamina: Wine,
  cafeina: Coffee,
  sulfito: Grape,
  sorbitol: Candy,
  salicilato: Leaf,
  milho: Wheat,
  niquel: Nut,
};

/**
 * Obtém o ícone Lucide para uma opção de onboarding
 * Prioriza icon_name do banco de dados, depois fallback por option_id
 */
export function getOnboardingIcon(option: { 
  option_id: string; 
  icon_name?: string | null;
}): LucideIcon | null {
  // Prioriza icon_name do banco de dados
  if (option.icon_name && LUCIDE_ICONS[option.icon_name]) {
    return LUCIDE_ICONS[option.icon_name];
  }
  
  // Fallback para mapeamento por option_id (compatibilidade)
  return FALLBACK_ICON_MAP[option.option_id] || null;
}

/**
 * Obtém o ícone Lucide pelo nome
 */
export function getIconByName(iconName: string): LucideIcon | null {
  return LUCIDE_ICONS[iconName] || null;
}
