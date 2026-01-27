import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";
import { getNutritionalTablePrompt } from "../_shared/nutritionalTableInjection.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getLocaleFromCountry
} from "../_shared/nutritionPrompt.ts";
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  generateRestrictionsPromptContext,
  getIntoleranceLabel,
  getDietaryLabel,
  type UserRestrictions,
  type SafetyCheckResult,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[FRIDGE-ANALYZER] ${step}`, details ? JSON.stringify(details) : '');
};

// ========== DECOMPOSIÇÃO DE ALIMENTOS PROCESSADOS ==========
// Palavras-chave que indicam alimentos processados que precisam ser decompostos
const PROCESSED_FOOD_KEYWORDS = [
  // Padaria e massas
  'biscoito', 'bolacha', 'pão', 'bolo', 'torta', 'pizza', 'macarrão', 'massa', 
  'salgado', 'pastel', 'empada', 'coxinha', 'esfiha', 'croissant', 'wafer',
  'cookie', 'cracker', 'muffin', 'brownie', 'donut', 'rosquinha', 'pretzel',
  'sanduíche', 'hambúrguer', 'hot dog', 'cachorro quente', 'wrap', 'tapioca',
  'lasanha', 'nhoque', 'ravioli', 'cappelletti', 'ravióli', 'canelone',
  'panqueca', 'crepe', 'waffle', 'churros', 'sonho', 'bomba', 'éclair',
  'panetone', 'colomba', 'brioche', 'focaccia', 'ciabatta', 'baguete',
  'cereal', 'granola', 'muesli', 'barra de cereal', 'snack', 'chips',
  'sorvete', 'picolé', 'açaí', 'pudim', 'mousse', 'cheesecake',
  'bagel', 'broa', 'pita', 'scone', 'danish', 'folhado', 'vol-au-vent',
  'canapé', 'bruschetta', 'quiche', 'panko', 'crouton',
  // Doces brasileiros
  'brigadeiro', 'beijinho', 'cajuzinho', 'paçoca', 'pé de moleque',
  'canjica', 'arroz doce', 'mingau', 'manjar', 'quindim', 'romeu e julieta',
  // Bebidas
  'vitamina', 'milk shake', 'milkshake', 'cappuccino', 'café com leite',
  'achocolatado', 'yakult', 'leite fermentado', 'petit suisse', 'danoninho',
  'cerveja', 'refrigerante', 'frappuccino', 'latte', 'mocha', 'chai',
  'smoothie', 'shake', 'whisky', 'whiskey', 'vodka', 'gin', 'baileys',
  'licor', 'vinho', 'champagne', 'sidra', 'sakê', 'sake',
  'ovomaltine', 'toddy', 'nescau', 'kefir', 'lassi', 'horchata',
  'protein shake', 'whey', 'mass gainer',
  // Pratos regionais
  'strogonoff', 'strogonofe', 'escondidinho', 'bobó', 'moqueca', 'vatapá',
  'acarajé', 'pão de queijo', 'cuscuz', 'polenta', 'purê', 'xinxim',
  'caruru', 'tacacá', 'baião', 'tropeiro', 'carreteiro', 'galinhada',
  'pamonha', 'curau', 'cural', 'mungunzá',
  // Oriental
  'sushi', 'tempurá', 'tempura', 'yakisoba', 'rolinho primavera', 'guioza',
  'dumpling', 'miojo', 'lámen', 'lamen', 'ramen', 'udon', 'soba',
  'takoyaki', 'okonomiyaki', 'tonkatsu', 'korokke', 'gyudon', 'katsudon',
  'oyakodon', 'natto', 'unagi', 'tamagoyaki', 'dim sum', 'siu mai',
  'har gow', 'baozi', 'jiaozi', 'wonton', 'char siu', 'congee',
  // Sobremesas internacionais
  'tiramisù', 'tiramisu', 'panna cotta', 'creme brulee', 'crème brûlée',
  'petit gateau', 'pastel de nata', 'pão de mel', 'affogato',
  'cinnamon roll', 'macaron', 'blondie', 'pavê',
  'trifle', 'banana split', 'sundae',
  'cannoli', 'sfogliatella', 'galaktoboureko', 'tres leches', 'alfajor',
  'strudel', 'sachertorte', 'black forest', 'floresta negra',
  'opera cake', 'mille-feuille', 'mil folhas', 'paris-brest', 'saint honoré',
  'baba au rhum', 'rum ball', 'trufa', 'gulab jamun', 'jalebi', 'kheer',
  'barfi', 'ladoo', 'halwa',
  // Embutidos e processados
  'salsicha', 'linguiça', 'mortadela', 'presunto', 'nugget', 'empanado',
  'almôndega', 'croquete', 'bolinho', 'isca', 'milanesa',
  // Salgadinhos
  'doritos', 'cheetos', 'salgadinho', 'pipoca', 'ruffles', 'pringles',
  'grissini', 'croutons', 'barrinha',
  // Cremes e pastas
  'nutella', 'creme de avelã', 'requeijão', 'cream cheese',
  'creme de milho', 'shoyu', 'molho', 'maionese', 'aioli', 'pesto',
  'chimichurri', 'catchup', 'mostarda', 'barbecue', 'teriyaki', 'hoisin',
  'sriracha', 'ranch', 'alfredo', 'carbonara',
  'tahine', 'pasta de amendoim', 'manteiga de amendoim', 'doce de leite',
  'molho inglês', 'worcestershire', 'ponzu', 'tonkatsu', 'yakitori',
  // Fast food
  'big mac', 'whopper', 'mcchicken', 'mcnuggets', 'mcflurry', 'cheeseburger',
  'cheeseburguer', 'onion rings', 'mozzarella sticks', 'fish burger',
  'subway', 'frozen yogurt', 'froyo',
  // Sopas e caldos
  'sopa', 'caldo', 'canja', 'minestrone', 'gazpacho', 'vichyssoise',
  'bisque', 'clam chowder', 'missoshiru',
  // Pratos internacionais
  'pad thai', 'tom yum', 'tom kha', 'satay', 'curry', 'pho', 'banh mi',
  'kimchi', 'bibimbap', 'bulgogi', 'japchae', 'kimbap', 'mandu',
  'taco', 'burrito', 'quesadilla', 'nachos', 'enchilada', 'fajita',
  'chimichanga', 'tamale', 'elote', 'sopapilla', 'queso dip',
  'chili', 'guacamole', 'falafel', 'shawarma', 'kebab', 'kafta',
  'tabule', 'homus', 'hummus', 'babaganoush', 'baklava',
  'tikka masala', 'naan', 'samosa', 'pakora', 'biryani', 'dal',
  'raita', 'paneer', 'korma', 'vindaloo', 'butter chicken',
  'paratha', 'roti', 'chapati', 'palak paneer', 'dal makhani',
  'massaman', 'som tam', 'larb', 'goi cuon', 'cha gio', 'banh xeo',
  'kung pao', 'chop suey', 'chow mein', 'lo mein', 'ma po tofu',
  'dan dan', 'peking duck', 'pato de pequim',
  // Empanados e milanesas
  'parmegiana', 'schnitzel', 'fish and chips', 'calamari',
  // Fondues e queijos
  'fondue', 'raclette', 'tartiflette', 'croque',
  // Massas italianas
  'fettuccine', 'spaghetti', 'mac and cheese',
  // Produtos veganos
  'hambúrguer de soja', 'salsicha vegana', 'nuggets veganos', 'seitan',
  'tempeh', 'proteína texturizada', 'pts', 'carne de soja',
  'queijo vegano', 'leite de soja', 'leite de amêndoa', 'leite de avelã',
  // Frutos do mar
  'paella', 'caldeirada', 'bacalhoada', 'ceviche', 'carpaccio',
  'risoto de camarão', 'risoto de frutos do mar',
];

// Mapa expandido de decomposição para alimentos processados (~300 alimentos)
const DECOMPOSITION_MAP: Record<string, string[]> = {
  // ========== BISCOITOS E BOLACHAS ==========
  'biscoito': ['farinha de trigo', 'trigo', 'açúcar', 'manteiga', 'leite'],
  'bolacha': ['farinha de trigo', 'trigo', 'açúcar', 'manteiga'],
  'biscoito de maisena': ['farinha de trigo', 'trigo', 'amido de milho', 'açúcar', 'manteiga', 'leite'],
  'biscoito maisena': ['farinha de trigo', 'trigo', 'amido de milho', 'açúcar', 'manteiga', 'leite'],
  'maisena': ['farinha de trigo', 'trigo', 'amido de milho', 'açúcar', 'manteiga', 'leite'],
  'biscoito maria': ['farinha de trigo', 'trigo', 'açúcar', 'gordura vegetal'],
  'biscoito cream cracker': ['farinha de trigo', 'trigo', 'gordura vegetal', 'sal'],
  'bolacha recheada': ['farinha de trigo', 'trigo', 'açúcar', 'gordura vegetal', 'cacau', 'leite'],
  'cookie': ['farinha de trigo', 'trigo', 'açúcar', 'manteiga', 'ovo', 'chocolate'],
  'wafer': ['farinha de trigo', 'trigo', 'açúcar', 'gordura vegetal', 'cacau'],
  'cracker': ['farinha de trigo', 'trigo', 'sal', 'gordura vegetal'],
  
  // ========== PÃES ==========
  'pão': ['farinha de trigo', 'trigo', 'fermento', 'sal', 'açúcar'],
  'pão de forma': ['farinha de trigo', 'trigo', 'fermento', 'açúcar', 'leite', 'soja'],
  'pão francês': ['farinha de trigo', 'trigo', 'fermento', 'sal', 'leite'],
  'pão integral': ['farinha de trigo integral', 'trigo', 'fermento', 'sal', 'mel'],
  'pão de queijo': ['polvilho', 'queijo', 'leite', 'ovo'],
  'pão de hot dog': ['farinha de trigo', 'trigo', 'leite', 'açúcar'],
  'pão de hambúrguer': ['farinha de trigo', 'trigo', 'leite', 'soja', 'açúcar'],
  'pão sírio': ['farinha de trigo', 'trigo', 'fermento'],
  'pão árabe': ['farinha de trigo', 'trigo', 'fermento'],
  'pita': ['farinha de trigo', 'trigo', 'fermento'],
  'torrada': ['farinha de trigo', 'trigo', 'manteiga'],
  'croissant': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'ovo'],
  'brioche': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'ovo', 'açúcar'],
  'focaccia': ['farinha de trigo', 'trigo', 'azeite', 'sal'],
  'ciabatta': ['farinha de trigo', 'trigo', 'azeite', 'sal'],
  'baguete': ['farinha de trigo', 'trigo', 'fermento', 'sal'],
  'pretzel': ['farinha de trigo', 'trigo', 'manteiga', 'sal'],
  'pão de mel': ['farinha de trigo', 'trigo', 'mel', 'chocolate', 'leite'],
  
  // ========== MASSAS E ITALIANOS ==========
  'macarrão': ['farinha de trigo', 'trigo', 'ovo'],
  'massa': ['farinha de trigo', 'trigo', 'ovo'],
  'macarrão instantâneo': ['farinha de trigo', 'trigo', 'soja', 'glutamato'],
  'lasanha': ['farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite', 'carne'],
  'pizza': ['farinha de trigo', 'trigo', 'queijo', 'tomate'],
  'nhoque': ['batata', 'farinha de trigo', 'trigo', 'ovo'],
  'gnocchi': ['batata', 'farinha de trigo', 'trigo', 'ovo'],
  'ravioli': ['farinha de trigo', 'trigo', 'ovo', 'queijo'],
  'ravióli': ['farinha de trigo', 'trigo', 'ovo', 'queijo'],
  'cappelletti': ['farinha de trigo', 'trigo', 'ovo', 'carne'],
  'canelone': ['farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite', 'ricota'],
  'rondelli': ['farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite'],
  'risoto': ['arroz', 'vinho', 'queijo', 'manteiga', 'cebola'],
  'polenta': ['milho', 'fubá', 'queijo', 'manteiga'],
  'miojo': ['farinha de trigo', 'trigo', 'glutamato', 'soja'],
  'lámen': ['farinha de trigo', 'trigo', 'ovo'],
  'lamen': ['farinha de trigo', 'trigo', 'ovo'],
  'ramen': ['farinha de trigo', 'trigo', 'ovo'],
  
  // ========== BOLOS E DOCES ==========
  'bolo': ['farinha de trigo', 'trigo', 'açúcar', 'ovo', 'leite', 'manteiga'],
  'bolo de cenoura': ['farinha de trigo', 'trigo', 'ovo', 'cenoura', 'óleo'],
  'bolo de chocolate': ['farinha de trigo', 'trigo', 'ovo', 'cacau', 'leite'],
  'bolo de laranja': ['farinha de trigo', 'trigo', 'ovo', 'laranja', 'açúcar'],
  'bolo de milho': ['fubá', 'leite', 'ovo', 'açúcar'],
  'bolo de fubá': ['fubá', 'leite', 'ovo', 'açúcar'],
  'torta': ['farinha de trigo', 'trigo', 'açúcar', 'manteiga', 'ovo'],
  'torta de limão': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'limão'],
  'torta de maçã': ['farinha de trigo', 'trigo', 'manteiga', 'maçã'],
  'torta de morango': ['farinha de trigo', 'trigo', 'leite', 'creme'],
  'brownie': ['farinha de trigo', 'trigo', 'chocolate', 'açúcar', 'ovo', 'manteiga'],
  'muffin': ['farinha de trigo', 'trigo', 'açúcar', 'ovo', 'leite'],
  'cupcake': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'açúcar'],
  'panqueca': ['farinha de trigo', 'trigo', 'leite', 'ovo'],
  'crepe': ['farinha de trigo', 'trigo', 'leite', 'ovo'],
  'waffle': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'açúcar'],
  'churros': ['farinha de trigo', 'trigo', 'açúcar', 'chocolate'],
  'sonho': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'creme'],
  'berliner': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'açúcar'],
  'éclair': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'creme', 'chocolate'],
  'profiterole': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'chocolate'],
  'bomba': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'creme'],
  'donut': ['farinha de trigo', 'trigo', 'açúcar', 'leite', 'ovo'],
  'rosquinha': ['farinha de trigo', 'trigo', 'açúcar', 'ovo'],
  'panetone': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'frutas cristalizadas'],
  'chocotone': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'chocolate'],
  'colomba': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'açúcar'],
  'rabanada': ['pão', 'farinha de trigo', 'trigo', 'leite', 'ovo'],
  
  // ========== DOCES BRASILEIROS ==========
  'brigadeiro': ['leite condensado', 'leite', 'chocolate', 'cacau', 'manteiga'],
  'beijinho': ['leite condensado', 'leite', 'coco', 'manteiga'],
  'cajuzinho': ['amendoim', 'leite condensado', 'leite'],
  'paçoca': ['amendoim', 'açúcar'],
  'pé de moleque': ['amendoim', 'açúcar', 'mel'],
  'canjica': ['milho', 'leite', 'coco', 'açúcar'],
  'arroz doce': ['arroz', 'leite', 'açúcar', 'canela'],
  'mingau': ['leite', 'açúcar', 'amido'],
  'mingau de aveia': ['aveia', 'leite', 'açúcar'],
  'manjar': ['leite de coco', 'leite', 'açúcar'],
  'quindim': ['ovo', 'açúcar', 'coco'],
  'romeu e julieta': ['queijo', 'leite', 'goiabada'],
  
  // ========== SOBREMESAS INTERNACIONAIS ==========
  'pudim': ['leite', 'ovo', 'açúcar', 'caramelo'],
  'mousse': ['leite', 'creme de leite', 'açúcar', 'gelatina'],
  'cheesecake': ['cream cheese', 'leite', 'biscoito', 'trigo', 'açúcar'],
  'tiramisù': ['café', 'mascarpone', 'leite', 'biscoito', 'trigo', 'cacau'],
  'tiramisu': ['café', 'mascarpone', 'leite', 'biscoito', 'trigo', 'cacau'],
  'panna cotta': ['creme de leite', 'leite', 'gelatina', 'açúcar'],
  'creme brulee': ['leite', 'creme de leite', 'ovo', 'açúcar'],
  'crème brûlée': ['leite', 'creme de leite', 'ovo', 'açúcar'],
  'petit gateau': ['farinha de trigo', 'trigo', 'chocolate', 'ovo', 'manteiga'],
  'pastel de nata': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'açúcar'],
  'sorvete': ['leite', 'açúcar', 'creme de leite'],
  'picolé': ['açúcar', 'água'],
  'açaí': ['açaí', 'guaraná', 'açúcar'],
  
  // ========== SALGADOS BRASILEIROS ==========
  'coxinha': ['farinha de trigo', 'trigo', 'frango', 'leite', 'ovo'],
  'kibe': ['trigo', 'carne', 'cebola'],
  'quibe': ['trigo', 'carne', 'cebola'],
  'esfiha': ['farinha de trigo', 'trigo', 'carne', 'cebola', 'alho'],
  'pastel': ['farinha de trigo', 'trigo', 'gordura', 'ovo'],
  'empada': ['farinha de trigo', 'trigo', 'manteiga', 'ovo'],
  'bolinha de queijo': ['farinha de trigo', 'trigo', 'leite', 'queijo'],
  'risoles': ['farinha de trigo', 'trigo', 'leite', 'ovo'],
  'enroladinho': ['farinha de trigo', 'trigo', 'leite', 'salsicha'],
  'croquete': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'carne'],
  'joelho': ['farinha de trigo', 'trigo', 'leite', 'presunto', 'queijo'],
  'quiche': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'creme de leite'],
  'tapioca': ['mandioca'],
  
  // ========== SANDUÍCHES ==========
  'sanduíche': ['pão', 'farinha de trigo', 'trigo'],
  'hambúrguer': ['pão', 'farinha de trigo', 'trigo', 'carne bovina', 'queijo'],
  'hot dog': ['pão', 'farinha de trigo', 'trigo', 'salsicha'],
  'cachorro quente': ['pão', 'farinha de trigo', 'trigo', 'salsicha'],
  'wrap': ['farinha de trigo', 'trigo'],
  'bauru': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'presunto'],
  'misto quente': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'presunto'],
  
  // ========== PRATOS REGIONAIS BRASILEIROS ==========
  'strogonoff': ['creme de leite', 'leite', 'cogumelo', 'carne', 'cebola'],
  'strogonofe': ['creme de leite', 'leite', 'cogumelo', 'carne', 'cebola'],
  'escondidinho': ['purê de batata', 'leite', 'manteiga', 'queijo'],
  'bobó': ['leite de coco', 'camarão', 'mandioca'],
  'bobó de camarão': ['leite de coco', 'camarão', 'mandioca'],
  'moqueca': ['leite de coco', 'peixe', 'azeite de dendê'],
  'vatapá': ['amendoim', 'castanha de caju', 'camarão', 'leite de coco'],
  'acarajé': ['feijão fradinho', 'camarão', 'azeite de dendê'],
  'caruru': ['quiabo', 'camarão', 'amendoim'],
  'tacacá': ['tucupi', 'camarão', 'jambu'],
  'baião de dois': ['feijão', 'queijo coalho', 'leite'],
  'carne de sol': ['carne curada'],
  'arroz carreteiro': ['arroz', 'carne seca'],
  'tropeiro': ['feijão', 'farinha', 'ovo', 'linguiça'],
  'feijão tropeiro': ['feijão', 'farinha', 'ovo', 'linguiça'],
  'cuscuz': ['milho', 'fubá'],
  'purê': ['batata', 'leite', 'manteiga'],
  'purê de batata': ['batata', 'leite', 'manteiga'],
  'creme de milho': ['milho', 'leite', 'creme de leite'],
  'farofa': ['farinha de mandioca', 'manteiga'],
  
  // ========== COMIDA ORIENTAL ==========
  'sushi': ['arroz', 'peixe', 'alga', 'vinagre'],
  'sashimi': ['peixe cru'],
  'nigiri': ['arroz', 'peixe'],
  'temaki': ['arroz', 'peixe', 'alga'],
  'tempurá': ['farinha de trigo', 'trigo', 'frutos do mar', 'ovo'],
  'tempura': ['farinha de trigo', 'trigo', 'frutos do mar', 'ovo'],
  'yakisoba': ['macarrão', 'farinha de trigo', 'trigo', 'shoyu', 'soja'],
  'rolinho primavera': ['farinha de trigo', 'trigo', 'vegetais'],
  'spring roll': ['farinha de trigo', 'trigo', 'camarão'],
  'guioza': ['farinha de trigo', 'trigo', 'carne', 'cebola'],
  'gyoza': ['farinha de trigo', 'trigo', 'carne', 'cebola'],
  'dumpling': ['farinha de trigo', 'trigo', 'carne'],
  'wonton': ['farinha de trigo', 'trigo', 'carne suína'],
  'dim sum': ['farinha de trigo', 'trigo', 'camarão', 'carne'],
  'shoyu': ['soja', 'trigo', 'sal'],
  'molho shoyu': ['soja', 'trigo', 'sal'],
  'missô': ['soja fermentada'],
  'miso': ['soja fermentada'],
  'tofu': ['soja'],
  'edamame': ['soja'],
  
  // ========== COMIDA TAILANDESA/VIETNAMITA ==========
  'pad thai': ['macarrão de arroz', 'amendoim', 'molho de peixe', 'ovo', 'camarão'],
  'tom yum': ['camarão', 'cogumelos'],
  'satay': ['amendoim', 'carne'],
  'curry verde': ['leite de coco', 'camarão'],
  'curry vermelho': ['leite de coco', 'carne'],
  'pho': ['macarrão de arroz', 'carne', 'cebola'],
  'banh mi': ['pão', 'farinha de trigo', 'trigo', 'molho de peixe'],
  'summer roll': ['papel de arroz', 'camarão', 'amendoim'],
  
  // ========== COMIDA COREANA ==========
  'kimchi': ['repolho fermentado', 'alho'],
  'bibimbap': ['arroz', 'ovo', 'legumes', 'carne'],
  'bulgogi': ['carne', 'soja', 'alho'],
  'japchae': ['macarrão de batata doce', 'soja'],
  'kimbap': ['arroz', 'alga', 'ovo'],
  'mandu': ['farinha de trigo', 'trigo', 'carne', 'cebola'],
  
  // ========== COMIDA MEXICANA ==========
  'taco': ['milho', 'carne', 'queijo', 'cebola'],
  'burrito': ['farinha de trigo', 'trigo', 'feijão', 'queijo', 'cebola'],
  'quesadilla': ['farinha de trigo', 'trigo', 'queijo'],
  'nachos': ['milho', 'queijo'],
  'enchilada': ['milho', 'queijo', 'cebola'],
  'fajita': ['farinha de trigo', 'trigo', 'carne', 'cebola', 'pimentão'],
  'chili con carne': ['feijão', 'carne', 'cebola', 'alho'],
  'guacamole': ['abacate', 'cebola', 'alho'],
  'salsa mexicana': ['tomate', 'cebola', 'pimenta'],
  
  // ========== COMIDA ÁRABE/MEDITERRÂNEA ==========
  'falafel': ['grão de bico', 'cebola', 'alho'],
  'shawarma': ['carne', 'alho', 'pão', 'trigo'],
  'kebab': ['carne', 'cebola', 'alho'],
  'kafta': ['carne', 'cebola', 'alho'],
  'tabule': ['trigo', 'cebola'],
  'homus': ['grão de bico', 'alho'],
  'hummus': ['grão de bico', 'alho'],
  'babaganoush': ['berinjela', 'alho'],
  'baklava': ['farinha de trigo', 'trigo', 'nozes', 'mel'],
  'coalhada': ['leite fermentado'],
  
  // ========== COMIDA INDIANA ==========
  'curry': ['cebola', 'alho', 'especiarias'],
  'tikka masala': ['creme de leite', 'cebola', 'alho'],
  'naan': ['farinha de trigo', 'trigo', 'iogurte', 'leite'],
  'samosa': ['farinha de trigo', 'trigo', 'batata', 'cebola'],
  'pakora': ['grão de bico', 'cebola'],
  'biryani': ['arroz', 'cebola', 'alho'],
  'dal': ['lentilha', 'cebola', 'alho'],
  'raita': ['iogurte', 'leite', 'pepino'],
  'lassi': ['iogurte', 'leite'],
  'paneer': ['queijo', 'leite'],
  'korma': ['creme de leite', 'castanhas', 'nozes'],
  'vindaloo': ['cebola', 'alho', 'vinagre'],
  
  // ========== MOLHOS E CONDIMENTOS ==========
  'molho branco': ['leite', 'manteiga', 'farinha de trigo', 'trigo'],
  'molho bechamel': ['leite', 'manteiga', 'farinha de trigo', 'trigo'],
  'molho rosé': ['leite', 'tomate', 'cebola'],
  'molho quatro queijos': ['leite', 'queijo'],
  'molho de alho': ['alho', 'óleo'],
  'molho barbecue': ['açúcar', 'vinagre'],
  'molho teriyaki': ['soja', 'açúcar'],
  'molho agridoce': ['açúcar', 'vinagre'],
  'molho de ostra': ['frutos do mar', 'ostra'],
  'molho de peixe': ['peixe fermentado'],
  'maionese': ['ovo', 'óleo', 'vinagre'],
  'aioli': ['ovo', 'alho', 'óleo'],
  'molho tártaro': ['ovo', 'cebola', 'maionese'],
  'molho caesar': ['ovo', 'anchova', 'queijo', 'peixe'],
  'pesto': ['manjericão', 'castanha', 'queijo', 'parmesão'],
  'chimichurri': ['alho', 'salsa'],
  'catchup': ['tomate', 'açúcar', 'vinagre'],
  'mostarda': ['mostarda', 'vinagre'],
  
  // ========== BEBIDAS ==========
  'vitamina': ['leite', 'frutas'],
  'vitamina de banana': ['banana', 'leite'],
  'milk shake': ['leite', 'sorvete', 'açúcar'],
  'milkshake': ['leite', 'sorvete', 'açúcar'],
  'smoothie': ['frutas', 'iogurte', 'leite'],
  'cappuccino': ['café', 'leite'],
  'café com leite': ['café', 'leite'],
  'latte': ['café', 'leite'],
  'mocha': ['café', 'leite', 'chocolate'],
  'chocolate quente': ['cacau', 'leite'],
  'achocolatado': ['leite', 'cacau', 'açúcar'],
  'yakult': ['leite', 'fermento lácteo'],
  'leite fermentado': ['leite', 'fermento lácteo'],
  'petit suisse': ['leite', 'açúcar', 'frutas'],
  'danoninho': ['leite', 'açúcar', 'frutas'],
  'cerveja': ['cevada', 'trigo', 'lúpulo', 'glúten'],
  'vinho': ['uva', 'sulfitos'],
  'vinho tinto': ['uva', 'sulfitos'],
  'vinho branco': ['uva', 'sulfitos'],
  'champagne': ['uva', 'sulfitos'],
  'sidra': ['maçã', 'sulfitos'],
  'licor de café': ['café', 'açúcar'],
  'licor de chocolate': ['cacau', 'leite'],
  'refrigerante': ['água', 'açúcar', 'xarope de milho'],
  'energético': ['cafeína', 'taurina'],
  'suco de laranja': ['laranja'],
  'suco de maçã': ['maçã'],
  'chá mate': ['cafeína'],
  'chá verde': ['cafeína'],
  'chá preto': ['cafeína'],
  
  // ========== CEREAIS E GRANOLAS ==========
  'cereal': ['trigo', 'aveia', 'milho', 'açúcar'],
  'corn flakes': ['milho', 'malte de cevada', 'glúten'],
  'sucrilhos': ['milho', 'açúcar'],
  'granola': ['aveia', 'mel', 'castanhas', 'nozes'],
  'muesli': ['aveia', 'frutas secas', 'castanhas'],
  'barra de cereal': ['aveia', 'mel', 'açúcar', 'frutas secas'],
  'aveia': ['aveia', 'glúten'],
  
  // ========== SALGADINHOS E SNACKS ==========
  'doritos': ['milho', 'queijo', 'leite'],
  'cheetos': ['milho', 'queijo', 'leite'],
  'salgadinho': ['milho', 'queijo', 'leite'],
  'chips': ['batata', 'sal'],
  'batata chips': ['batata', 'sal'],
  'pipoca': ['milho'],
  'pipoca de micro-ondas': ['milho', 'manteiga', 'leite'],
  'amendoim japonês': ['amendoim', 'farinha de trigo', 'trigo'],
  'castanha de caju': ['castanha', 'nozes'],
  'mix de nuts': ['castanhas', 'nozes', 'amendoim'],
  'torresmo': ['porco'],
  'azeitona': ['azeitona', 'sulfitos'],
  'picles': ['pepino fermentado'],
  'patê': ['fígado', 'cebola'],
  'antepasto': ['berinjela', 'cebola'],
  
  // ========== EMBUTIDOS E FRIOS ==========
  'salsicha': ['carne', 'amido', 'sal', 'soja', 'lactose'],
  'linguiça': ['carne suína', 'sal', 'alho'],
  'mortadela': ['carne', 'amido', 'sal', 'soja', 'lactose'],
  'presunto': ['carne suína', 'sal', 'açúcar', 'lactose'],
  'salame': ['carne fermentada'],
  'pepperoni': ['carne fermentada'],
  'bacon': ['carne suína defumada'],
  'paio': ['carne', 'alho'],
  'copa': ['carne curada'],
  'pancetta': ['carne curada'],
  'prosciutto': ['carne curada'],
  'peito de peru': ['peru', 'lactose'],
  'blanquet': ['peru', 'lactose'],
  'nugget': ['frango', 'farinha de trigo', 'trigo', 'amido'],
  'empanado': ['farinha de trigo', 'trigo', 'ovo'],
  
  // ========== QUEIJOS E LATICÍNIOS ==========
  'queijo prato': ['leite'],
  'queijo mussarela': ['leite'],
  'queijo parmesão': ['leite'],
  'queijo gorgonzola': ['leite', 'mofo'],
  'queijo brie': ['leite', 'mofo'],
  'queijo camembert': ['leite', 'mofo'],
  'queijo roquefort': ['leite', 'mofo'],
  'cream cheese': ['leite', 'creme de leite'],
  'requeijão': ['leite', 'creme de leite'],
  'cottage': ['leite'],
  'ricota': ['leite'],
  'catupiry': ['leite'],
  'queijo coalho': ['leite'],
  'queijo minas': ['leite'],
  'iogurte': ['leite', 'fermento lácteo'],
  'queijo': ['leite'],
  'manteiga': ['leite'],
  'creme de leite': ['leite'],
  'leite condensado': ['leite', 'açúcar'],
  'margarina': ['gordura vegetal', 'soro de leite'],
  
  // ========== CREMES E PASTAS ==========
  'nutella': ['avelã', 'cacau', 'leite', 'açúcar'],
  'creme de avelã': ['avelã', 'cacau', 'leite', 'açúcar'],
  
  // ========== CONSERVAS E ENLATADOS ==========
  'atum enlatado': ['atum', 'peixe'],
  'sardinha enlatada': ['sardinha', 'peixe'],
  'palmito': ['palmito', 'sulfitos'],
  'molho de tomate': ['tomate', 'cebola'],
  
  // ========== FAST FOOD E REDES ==========
  'big mac': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'carne bovina', 'molho especial', 'cebola'],
  'whopper': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'carne bovina', 'maionese', 'ovo'],
  'mcchicken': ['pão', 'farinha de trigo', 'trigo', 'frango empanado', 'maionese', 'ovo'],
  'chicken mcnuggets': ['frango empanado', 'farinha de trigo', 'trigo', 'soja'],
  'mcnuggets': ['frango empanado', 'farinha de trigo', 'trigo', 'soja'],
  'mcflurry': ['sorvete', 'leite', 'biscoito', 'trigo', 'chocolate'],
  'sundae': ['sorvete', 'leite', 'calda'],
  'cheeseburguer': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'carne'],
  'cheeseburger': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'carne'],
  'onion rings': ['cebola', 'farinha de trigo', 'trigo', 'ovo'],
  'anéis de cebola': ['cebola', 'farinha de trigo', 'trigo', 'ovo'],
  'mozzarella sticks': ['queijo', 'leite', 'farinha de trigo', 'trigo'],
  'palitos de mussarela': ['queijo', 'leite', 'farinha de trigo', 'trigo'],
  'chicken wings': ['frango', 'farinha de trigo', 'trigo'],
  'asas de frango': ['frango', 'farinha de trigo', 'trigo'],
  'fish burger': ['peixe empanado', 'pão', 'farinha de trigo', 'trigo'],
  'mcfish': ['peixe empanado', 'pão', 'farinha de trigo', 'trigo'],
  'subway': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite'],
  'açaí com granola': ['açaí', 'granola', 'aveia', 'glúten'],
  'açaí com leite condensado': ['açaí', 'leite condensado', 'leite'],
  'açaí com leite em pó': ['açaí', 'leite em pó', 'leite'],
  'frozen yogurt': ['iogurte', 'leite'],
  'froyo': ['iogurte', 'leite'],
  
  // ========== PRATOS PRONTOS CONGELADOS ==========
  'lasanha congelada': ['massa', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'molho branco'],
  'pizza congelada': ['massa', 'farinha de trigo', 'trigo', 'queijo', 'leite'],
  'hambúrguer congelado': ['carne', 'pão ralado', 'farinha de trigo', 'trigo'],
  'almôndega congelada': ['carne', 'pão ralado', 'farinha de trigo', 'trigo', 'leite'],
  'almôndega': ['carne', 'pão ralado', 'farinha de trigo', 'trigo', 'leite'],
  'nuggets congelado': ['frango', 'farinha de trigo', 'trigo'],
  'strogonoff congelado': ['carne', 'creme de leite', 'leite', 'cogumelo'],
  'escondidinho congelado': ['purê', 'leite', 'manteiga', 'queijo'],
  'torta congelada': ['massa', 'farinha de trigo', 'trigo', 'recheio', 'leite'],
  'quiche congelada': ['massa', 'farinha de trigo', 'trigo', 'creme', 'leite', 'ovo', 'queijo'],
  'panqueca congelada': ['farinha de trigo', 'trigo', 'leite', 'ovo'],
  'croquete congelado': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'carne'],
  'bolinho de bacalhau': ['bacalhau', 'peixe', 'farinha de trigo', 'trigo', 'ovo'],
  'risoto congelado': ['arroz', 'queijo', 'leite', 'manteiga'],
  'yakisoba congelado': ['macarrão', 'farinha de trigo', 'trigo', 'molho soja', 'soja'],
  'gyoza congelado': ['massa', 'farinha de trigo', 'trigo', 'carne', 'cebola'],
  'harumaki congelado': ['massa', 'farinha de trigo', 'trigo', 'vegetais'],
  'harumaki': ['massa', 'farinha de trigo', 'trigo', 'vegetais'],
  'empanada congelada': ['massa', 'farinha de trigo', 'trigo', 'carne'],
  'empanada': ['massa', 'farinha de trigo', 'trigo', 'carne'],
  'croissant congelado': ['farinha de trigo', 'trigo', 'manteiga', 'leite'],
  'pão de queijo congelado': ['polvilho', 'queijo', 'leite', 'ovo'],
  
  // ========== SOPAS E CALDOS ==========
  'sopa de cebola': ['cebola', 'caldo', 'queijo gratinado', 'leite'],
  'sopa de tomate': ['tomate', 'creme de leite', 'leite'],
  'canja de galinha': ['frango', 'macarrão', 'farinha de trigo', 'trigo'],
  'canja': ['frango', 'macarrão', 'farinha de trigo', 'trigo'],
  'sopa de legumes com macarrão': ['legumes', 'macarrão', 'farinha de trigo', 'trigo'],
  'caldo verde': ['batata', 'couve', 'linguiça'],
  'sopa de ervilha': ['ervilha', 'cebola'],
  'sopa de feijão': ['feijão', 'cebola', 'alho'],
  'sopa de lentilha': ['lentilha', 'cebola', 'alho'],
  'cream of mushroom': ['cogumelo', 'creme de leite', 'leite'],
  'creme de cogumelos': ['cogumelo', 'creme de leite', 'leite'],
  'clam chowder': ['mariscos', 'frutos do mar', 'creme', 'leite'],
  'bisque de lagosta': ['lagosta', 'crustáceo', 'creme', 'leite'],
  'sopa wonton': ['wonton', 'massa', 'farinha de trigo', 'trigo', 'carne'],
  'missoshiru': ['missô', 'soja fermentada', 'soja', 'tofu'],
  'sopa de aspargos': ['aspargos', 'cebola'],
  'gazpacho': ['tomate', 'pão', 'farinha de trigo', 'trigo'],
  'vichyssoise': ['alho-poró', 'creme', 'leite', 'cebola'],
  'minestrone': ['feijão', 'macarrão', 'farinha de trigo', 'trigo', 'legumes'],
  'sopa de cevada': ['cevada', 'glúten', 'legumes'],
  
  // ========== MOLHOS INDUSTRIALIZADOS ADICIONAIS ==========
  'molho hoisin': ['soja', 'trigo', 'glúten', 'açúcar'],
  'molho sriracha': ['pimenta', 'alho'],
  'molho ranch': ['leite', 'buttermilk', 'maionese', 'ovo'],
  'molho blue cheese': ['queijo azul', 'leite'],
  'molho alfredo': ['creme de leite', 'leite', 'queijo parmesão'],
  'molho carbonara': ['ovo', 'queijo', 'leite', 'bacon'],
  'molho de queijo': ['queijo', 'leite', 'amido'],
  'molho nacho': ['queijo', 'leite', 'pimenta'],
  
  // ========== SNACKS INDUSTRIALIZADOS ADICIONAIS ==========
  'ruffles': ['batata', 'soro de leite', 'leite'],
  'pringles': ['batata', 'farinha de trigo', 'trigo', 'lactose', 'leite'],
  'cream cracker': ['farinha de trigo', 'trigo', 'gordura'],
  'agua e sal': ['farinha de trigo', 'trigo', 'gordura'],
  'bolacha recheada industrial': ['farinha de trigo', 'trigo', 'leite', 'açúcar'],
  'wafer industrial': ['farinha de trigo', 'trigo', 'leite', 'açúcar'],
  'tortilla chips': ['milho'],
  'palitinho de gergelim': ['farinha de trigo', 'trigo', 'gergelim'],
  'grissini': ['farinha de trigo', 'trigo'],
  'croutons': ['pão', 'farinha de trigo', 'trigo'],
  'cookies industrializados': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'açúcar'],
  'brownie industrializado': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'chocolate'],
  'barrinha de cereal': ['aveia', 'glúten', 'mel', 'açúcar'],
  'barrinha de proteína': ['whey', 'leite', 'soja'],
  'barra de proteína': ['whey', 'leite', 'soja'],
  
  // ========== BEBIDAS ALCOÓLICAS E MISTAS ==========
  'cerveja de trigo': ['trigo', 'glúten', 'cevada'],
  'whisky': ['cevada maltada', 'glúten'],
  'whiskey': ['cevada maltada', 'glúten'],
  'vodka de trigo': ['trigo', 'glúten'],
  'gin': ['botanicals'],
  'baileys': ['creme de leite', 'leite', 'whisky'],
  'licor de creme': ['creme de leite', 'leite'],
  'piña colada': ['leite de coco', 'rum', 'abacaxi'],
  'pina colada': ['leite de coco', 'rum', 'abacaxi'],
  'white russian': ['creme de leite', 'leite', 'vodka', 'licor de café'],
  'mudslide': ['creme de leite', 'leite', 'licor'],
  'irish coffee': ['café', 'whisky', 'creme', 'leite', 'glúten'],
  'bloody mary': ['tomate', 'molho worcestershire', 'anchova', 'peixe'],
  'sakê': ['arroz fermentado'],
  'sake': ['arroz fermentado'],
  
  // ========== CAFETERIA E CONFEITARIA ==========
  'frappuccino': ['café', 'leite', 'creme', 'açúcar'],
  'chai latte': ['chá', 'leite', 'especiarias'],
  'matcha latte': ['matcha', 'leite'],
  'hot chocolate': ['chocolate', 'leite', 'cacau'],
  'affogato': ['café', 'sorvete', 'leite'],
  'croissant de chocolate': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'chocolate'],
  'pain au chocolat': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'chocolate'],
  'scone': ['farinha de trigo', 'trigo', 'manteiga', 'leite'],
  'danish': ['massa folhada', 'farinha de trigo', 'trigo', 'cream cheese', 'leite'],
  'cinnamon roll': ['farinha de trigo', 'trigo', 'cream cheese', 'leite', 'canela'],
  'macaron': ['amêndoa', 'nozes', 'clara de ovo', 'ovo'],
  'blondie': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'açúcar'],
  
  // ========== COMIDA DE RUA BRASILEIRA ==========
  'tapioca com queijo': ['tapioca', 'queijo', 'leite'],
  'tapioca com leite condensado': ['tapioca', 'leite condensado', 'leite'],
  'caldo de sururu': ['sururu', 'mariscos', 'frutos do mar'],
  'caldo de mocotó': ['mocotó', 'carne'],
  'espetinho de queijo': ['queijo coalho', 'leite'],
  'milho cozido com manteiga': ['milho', 'manteiga', 'leite'],
  'pamonha': ['milho', 'leite'],
  'pamonha de queijo': ['milho', 'queijo', 'leite'],
  'curau': ['milho', 'leite'],
  'cural': ['milho', 'leite'],
  'mungunzá': ['milho', 'leite de coco'],
  
  // ========== COMIDA JAPONESA DETALHADA ==========
  'sushi de salmão': ['salmão', 'peixe', 'arroz', 'alga'],
  'tempurá de camarão': ['camarão', 'crustáceo', 'farinha de trigo', 'trigo', 'ovo'],
  'tempura de camarão': ['camarão', 'crustáceo', 'farinha de trigo', 'trigo', 'ovo'],
  'tempurá de legumes': ['legumes', 'farinha de trigo', 'trigo', 'ovo'],
  'tempura de legumes': ['legumes', 'farinha de trigo', 'trigo', 'ovo'],
  'gyudon': ['carne bovina', 'molho soja', 'soja', 'cebola'],
  'katsudon': ['porco empanado', 'farinha de trigo', 'trigo', 'ovo'],
  'oyakodon': ['frango', 'ovo', 'cebola'],
  'udon': ['macarrão', 'farinha de trigo', 'trigo'],
  'soba': ['macarrão', 'trigo sarraceno', 'trigo'],
  'takoyaki': ['polvo', 'frutos do mar', 'farinha de trigo', 'trigo', 'ovo'],
  'okonomiyaki': ['farinha de trigo', 'trigo', 'ovo', 'camarão', 'crustáceo'],
  'tonkatsu': ['porco empanado', 'farinha de trigo', 'trigo'],
  'korokke': ['batata', 'farinha de trigo', 'trigo', 'ovo'],
  'natto': ['soja fermentada', 'soja'],
  'unagi': ['enguia', 'peixe', 'molho soja', 'soja'],
  'tamagoyaki': ['ovo', 'açúcar'],
  
  // ========== COMIDA CHINESA DETALHADA ==========
  'frango xadrez': ['frango', 'amendoim', 'molho soja', 'soja'],
  'kung pao chicken': ['frango', 'amendoim', 'molho soja', 'soja'],
  'kung pao': ['frango', 'amendoim', 'molho soja', 'soja'],
  'chop suey': ['legumes', 'molho soja', 'soja'],
  'chow mein': ['macarrão', 'farinha de trigo', 'trigo', 'molho soja', 'soja'],
  'lo mein': ['macarrão', 'farinha de trigo', 'trigo', 'molho soja', 'soja'],
  'siu mai': ['massa', 'farinha de trigo', 'trigo', 'camarão', 'crustáceo'],
  'har gow': ['camarão', 'crustáceo', 'amido'],
  'char siu': ['porco', 'molho soja', 'soja'],
  'peking duck': ['pato', 'molho hoisin', 'soja', 'trigo'],
  'pato de pequim': ['pato', 'molho hoisin', 'soja', 'trigo'],
  'ma po tofu': ['tofu', 'soja', 'carne'],
  'mapo tofu': ['tofu', 'soja', 'carne'],
  'dan dan noodles': ['macarrão', 'farinha de trigo', 'trigo', 'amendoim'],
  'zha jiang mian': ['macarrão', 'farinha de trigo', 'trigo', 'soja'],
  'congee': ['arroz'],
  'baozi': ['massa', 'farinha de trigo', 'trigo', 'recheio'],
  'jiaozi': ['massa', 'farinha de trigo', 'trigo', 'carne'],
  
  // ========== PRATOS BRASILEIROS ADICIONAIS ==========
  'moqueca de peixe': ['peixe', 'leite de coco', 'dendê'],
  'moqueca de camarão': ['camarão', 'crustáceo', 'leite de coco', 'dendê'],
  'bobó de frango': ['frango', 'leite de coco', 'mandioca'],
  'xinxim de galinha': ['frango', 'amendoim', 'camarão seco', 'crustáceo'],
  'galinhada': ['frango', 'arroz', 'açafrão'],
  'frango a passarinho': ['frango', 'farinha de trigo', 'trigo'],
  'frango empanado': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'bife a milanesa': ['carne', 'farinha de trigo', 'trigo', 'ovo'],
  'bife empanado': ['carne', 'farinha de trigo', 'trigo', 'ovo'],
  'filé de frango empanado': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'parmegiana': ['carne', 'farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite'],
  'parmegiana de frango': ['frango', 'farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite'],
  'estrogonofe de carne': ['carne', 'creme de leite', 'leite', 'cogumelo'],
  'estrogonofe de frango': ['frango', 'creme de leite', 'leite', 'cogumelo'],
  'picanha na nata': ['carne', 'creme de leite', 'leite'],
  'filé mignon ao molho madeira': ['carne', 'vinho', 'cogumelo'],
  'filé de peixe empanado': ['peixe', 'farinha de trigo', 'trigo', 'ovo'],
  'camarão empanado': ['camarão', 'crustáceo', 'farinha de trigo', 'trigo', 'ovo'],
  'isca de peixe': ['peixe', 'farinha de trigo', 'trigo', 'ovo'],
  'isca de frango': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'bolinho de arroz': ['arroz', 'queijo', 'leite', 'ovo'],
  'bolinho de aipim': ['aipim', 'queijo', 'leite'],
  'bolinho de mandioca': ['mandioca', 'queijo', 'leite'],
  
  // ========== OUTROS PRATOS INTERNACIONAIS ==========
  'fish and chips': ['peixe', 'farinha de trigo', 'trigo', 'ovo', 'batata'],
  'schnitzel': ['carne', 'farinha de trigo', 'trigo', 'ovo'],
  'fondue de queijo': ['queijo', 'leite', 'vinho', 'pão', 'trigo'],
  'fondue de chocolate': ['chocolate', 'creme de leite', 'leite'],
  'raclette': ['queijo', 'leite', 'batata'],
  'tartiflette': ['batata', 'queijo', 'leite', 'bacon'],
  'croque monsieur': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'presunto'],
  'croque madame': ['pão', 'farinha de trigo', 'trigo', 'queijo', 'leite', 'presunto', 'ovo'],
  'carbonara': ['macarrão', 'farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite', 'bacon'],
  'fettuccine alfredo': ['macarrão', 'farinha de trigo', 'trigo', 'creme de leite', 'leite', 'queijo'],
  'spaghetti bolonhesa': ['macarrão', 'farinha de trigo', 'trigo', 'carne', 'tomate'],
  'macarrão ao sugo': ['macarrão', 'farinha de trigo', 'trigo', 'tomate'],
  'macarrão a bolonhesa': ['macarrão', 'farinha de trigo', 'trigo', 'carne', 'tomate'],
  'macarrão ao molho branco': ['macarrão', 'farinha de trigo', 'trigo', 'leite', 'creme de leite'],
  'macarrão com queijo': ['macarrão', 'farinha de trigo', 'trigo', 'queijo', 'leite'],
  'mac and cheese': ['macarrão', 'farinha de trigo', 'trigo', 'queijo', 'leite'],
  
  // ========== SOBREMESAS ADICIONAIS ==========
  'torta alemã': ['biscoito', 'farinha de trigo', 'trigo', 'chocolate', 'creme de leite', 'leite'],
  'torta holandesa': ['biscoito', 'farinha de trigo', 'trigo', 'chocolate', 'creme de leite', 'leite'],
  'torta de limao com merengue': ['biscoito', 'farinha de trigo', 'trigo', 'leite condensado', 'leite'],
  'torta de morango com chantilly': ['biscoito', 'farinha de trigo', 'trigo', 'creme', 'leite'],
  'pavê': ['biscoito', 'farinha de trigo', 'trigo', 'creme', 'leite', 'chocolate'],
  'pavê de chocolate': ['biscoito', 'farinha de trigo', 'trigo', 'creme', 'leite', 'chocolate'],
  'trifle': ['biscoito', 'farinha de trigo', 'trigo', 'creme', 'leite', 'frutas'],
  'banana split': ['banana', 'sorvete', 'leite', 'calda', 'chantilly'],
  'sundae de chocolate': ['sorvete', 'leite', 'calda de chocolate'],
  'milk shake de chocolate': ['leite', 'sorvete', 'chocolate'],
  'milk shake de morango': ['leite', 'sorvete', 'morango'],
  'milk shake de baunilha': ['leite', 'sorvete', 'baunilha'],
  'flocos': ['milho', 'leite', 'açúcar'],
  'açaí na tigela': ['açaí', 'banana', 'granola', 'aveia', 'glúten'],
  'açaí com banana': ['açaí', 'banana'],
  'smoothie de frutas': ['frutas', 'iogurte', 'leite'],
  'smoothie de morango': ['morango', 'iogurte', 'leite'],
  'smoothie bowl': ['frutas', 'iogurte', 'leite', 'granola', 'aveia'],
  
  // ========== PADARIA ARTESANAL (4ª RODADA) ==========
  'pão de queijo recheado': ['polvilho', 'queijo', 'leite', 'ovo', 'recheio'],
  'broa de milho': ['fubá', 'farinha de trigo', 'trigo', 'açúcar'],
  'pão australiano': ['farinha de trigo', 'trigo', 'cacau', 'leite'],
  'pão pita': ['farinha de trigo', 'trigo', 'fermento'],
  'bagel': ['farinha de trigo', 'trigo', 'ovo', 'fermento'],
  'bagel com cream cheese': ['farinha de trigo', 'trigo', 'ovo', 'cream cheese', 'leite'],
  'muffin salgado': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'queijo'],
  'croissant de presunto e queijo': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'presunto', 'queijo'],
  'danish pastry': ['farinha de trigo', 'trigo', 'manteiga', 'leite', 'ovo', 'cream cheese'],
  'pão 7 grãos': ['farinha de trigo', 'trigo', 'aveia', 'centeio', 'glúten'],
  'pão de centeio': ['farinha de centeio', 'glúten', 'fermento'],
  'farinha panko': ['farinha de trigo', 'trigo'],
  'pão de alho': ['pão', 'farinha de trigo', 'trigo', 'manteiga', 'leite', 'alho'],
  'pão de alho com queijo': ['pão', 'farinha de trigo', 'trigo', 'manteiga', 'leite', 'queijo', 'alho'],
  'folhado de salsicha': ['massa folhada', 'farinha de trigo', 'trigo', 'manteiga', 'leite', 'salsicha'],
  'pastel de forno': ['farinha de trigo', 'trigo', 'leite', 'manteiga', 'recheio'],
  'vol-au-vent': ['massa folhada', 'farinha de trigo', 'trigo', 'manteiga', 'leite'],
  'canapé': ['pão', 'farinha de trigo', 'trigo', 'cobertura'],
  'bruschetta': ['pão', 'farinha de trigo', 'trigo', 'tomate', 'azeite'],
  'torta de palmito': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'palmito'],
  'torta de frango': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'frango'],
  'quiche lorraine': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'bacon', 'queijo'],
  'quiche de alho-poró': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'alho-poró', 'queijo'],
  
  // ========== MOLHOS E CONDIMENTOS INDUSTRIAIS (4ª RODADA) ==========
  'molho inglês': ['anchovas', 'peixe', 'soja', 'trigo', 'glúten'],
  'molho worcestershire': ['anchovas', 'peixe', 'soja', 'trigo', 'glúten'],
  'molho de ostra industrial': ['ostras', 'moluscos', 'frutos do mar', 'soja', 'trigo'],
  'pasta de missô': ['soja fermentada', 'soja', 'trigo', 'glúten'],
  'molho ponzu': ['soja', 'peixe', 'cítricos'],
  'molho tonkatsu': ['soja', 'trigo', 'glúten', 'tomate'],
  'molho yakitori': ['soja', 'trigo', 'glúten', 'mirin'],
  'mostarda dijon': ['mostarda', 'vinagre'],
  'mostarda amarela': ['mostarda', 'vinagre', 'açafrão'],
  'maionese japonesa': ['ovo', 'óleo', 'vinagre'],
  'molho mil ilhas': ['maionese', 'ovo', 'catchup', 'leite'],
  'pasta de gergelim': ['gergelim'],
  'tahine': ['gergelim'],
  'pasta de amendoim': ['amendoim'],
  'manteiga de amendoim': ['amendoim'],
  'manteiga de amêndoa': ['amêndoa', 'nozes'],
  'doce de leite': ['leite', 'açúcar'],
  'geleia de mocotó': ['mocotó', 'açúcar'],
  
  // ========== PRODUTOS VEGANOS/VEGETARIANOS PROCESSADOS (4ª RODADA) ==========
  'hambúrguer de soja': ['soja', 'farinha de trigo', 'trigo', 'glúten'],
  'hamburguer de soja': ['soja', 'farinha de trigo', 'trigo', 'glúten'],
  'salsicha vegana': ['soja', 'farinha de trigo', 'trigo', 'glúten'],
  'nuggets veganos': ['soja', 'farinha de trigo', 'trigo', 'glúten'],
  'almôndega vegana': ['soja', 'farinha de trigo', 'trigo', 'glúten'],
  'leite de soja': ['soja'],
  'iogurte de soja': ['soja'],
  'tofu defumado': ['soja'],
  'tempeh': ['soja fermentada', 'soja'],
  'seitan': ['glúten', 'trigo'],
  'proteína texturizada de soja': ['soja'],
  'pts': ['soja'],
  'carne de soja': ['soja', 'glúten'],
  'queijo vegano de castanha': ['castanha de caju', 'nozes'],
  'queijo vegano de amêndoa': ['amêndoa', 'nozes'],
  'cream cheese vegano': ['castanha de caju', 'nozes'],
  'maionese vegana': ['soja'],
  'leite de amêndoa': ['amêndoa', 'nozes'],
  'leite de castanha': ['castanha de caju', 'nozes'],
  'leite de avelã': ['avelã', 'nozes'],
  'creme de leite vegano': ['soja', 'castanha de caju'],
  'sorvete vegano': ['soja', 'castanha de caju'],
  'chocolate vegano': ['cacau', 'soja'],
  
  // ========== CEREAIS E GRANOLAS (4ª RODADA) ==========
  'froot loops': ['milho', 'trigo', 'glúten', 'açúcar'],
  'cheerios': ['aveia', 'glúten', 'açúcar'],
  'all bran': ['trigo', 'glúten', 'fibras'],
  'weetabix': ['trigo', 'glúten'],
  'cereal de chocolate': ['trigo', 'glúten', 'chocolate', 'leite'],
  'cereal matinal': ['trigo', 'milho', 'glúten', 'açúcar'],
  'barra de proteína industrial': ['whey', 'leite', 'soja', 'glúten'],
  'farelo de aveia': ['aveia', 'glúten'],
  'overnight oats': ['aveia', 'glúten', 'leite', 'iogurte'],
  'bowl de frutas com granola': ['frutas', 'granola', 'aveia', 'glúten', 'castanhas'],
  
  // ========== PETISCOS E APERITIVOS (4ª RODADA) ==========
  'castanha de caju caramelizada': ['castanha de caju', 'nozes', 'açúcar'],
  'azeitona recheada com anchova': ['azeitona', 'anchova', 'peixe'],
  'patê de azeitona': ['azeitona', 'anchova', 'peixe'],
  'patê de atum': ['atum', 'peixe', 'maionese', 'ovo'],
  'patê de frango': ['frango', 'leite', 'creme', 'farinha de trigo'],
  'patê de fígado': ['fígado', 'leite', 'creme'],
  'antepasto de berinjela': ['berinjela', 'azeite'],
  'mini pizza': ['massa', 'farinha de trigo', 'trigo', 'queijo', 'leite'],
  'mini quiche': ['farinha de trigo', 'trigo', 'leite', 'ovo', 'queijo'],
  'tartelette': ['farinha de trigo', 'trigo', 'manteiga', 'leite'],
  
  // ========== SOBREMESAS INTERNACIONAIS (4ª RODADA) ==========
  'cannoli': ['farinha de trigo', 'trigo', 'ricota', 'leite', 'açúcar'],
  'sfogliatella': ['farinha de trigo', 'trigo', 'ricota', 'leite'],
  'galaktoboureko': ['massa filo', 'farinha de trigo', 'trigo', 'leite', 'ovo', 'semolina'],
  'churros com chocolate': ['farinha de trigo', 'trigo', 'chocolate', 'leite'],
  'flan napolitano': ['leite', 'ovo', 'açúcar', 'caramelo'],
  'tres leches': ['farinha de trigo', 'trigo', 'leite', 'leite condensado', 'creme de leite', 'ovo'],
  'alfajor': ['farinha de trigo', 'trigo', 'doce de leite', 'leite'],
  'strudel de maçã': ['farinha de trigo', 'trigo', 'maçã', 'nozes', 'castanhas'],
  'sachertorte': ['farinha de trigo', 'trigo', 'chocolate', 'ovo', 'leite'],
  'black forest': ['farinha de trigo', 'trigo', 'chocolate', 'creme', 'leite', 'ovo', 'cereja'],
  'floresta negra': ['farinha de trigo', 'trigo', 'chocolate', 'creme', 'leite', 'ovo', 'cereja'],
  'opera cake': ['farinha de trigo', 'trigo', 'amêndoa', 'nozes', 'café', 'chocolate', 'leite', 'ovo'],
  'mille-feuille': ['massa folhada', 'farinha de trigo', 'trigo', 'creme', 'leite'],
  'mil folhas': ['massa folhada', 'farinha de trigo', 'trigo', 'creme', 'leite'],
  'paris-brest': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'creme', 'leite', 'avelã', 'nozes'],
  'saint honoré': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'creme', 'leite', 'caramelo'],
  'baba au rhum': ['farinha de trigo', 'trigo', 'manteiga', 'ovo', 'leite', 'rum'],
  'rum ball': ['biscoito', 'farinha de trigo', 'trigo', 'rum', 'chocolate', 'nozes'],
  'trufa de chocolate': ['chocolate', 'creme de leite', 'leite'],
  'brigadeiro gourmet': ['leite condensado', 'leite', 'chocolate', 'manteiga'],
  'beijinho gourmet': ['leite condensado', 'leite', 'coco', 'manteiga'],
  
  // ========== PRATOS INDIANOS (4ª RODADA) ==========
  'paratha': ['farinha de trigo', 'trigo', 'manteiga', 'ghee', 'leite'],
  'roti': ['farinha de trigo', 'trigo'],
  'chapati': ['farinha de trigo', 'trigo'],
  'butter chicken': ['frango', 'creme de leite', 'leite', 'manteiga', 'especiarias'],
  'palak paneer': ['espinafre', 'paneer', 'queijo', 'leite', 'creme'],
  'dal makhani': ['lentilhas', 'creme de leite', 'leite', 'manteiga'],
  'mango lassi': ['manga', 'iogurte', 'leite'],
  'gulab jamun': ['leite em pó', 'leite', 'farinha de trigo', 'trigo', 'açúcar'],
  'jalebi': ['farinha de trigo', 'trigo', 'açúcar', 'iogurte', 'leite'],
  'kheer': ['arroz', 'leite', 'castanhas', 'nozes', 'açúcar'],
  'barfi': ['leite', 'açúcar', 'castanhas', 'nozes'],
  'ladoo': ['farinha de grão de bico', 'ghee', 'leite', 'açúcar'],
  'halwa': ['semolina', 'trigo', 'glúten', 'leite', 'manteiga', 'castanhas'],
  'gajar halwa': ['cenoura', 'leite', 'ghee', 'castanhas', 'nozes'],
  
  // ========== PRATOS MEXICANOS/TEX-MEX (4ª RODADA) ==========
  'tortilla de trigo': ['farinha de trigo', 'trigo'],
  'tortilha de trigo': ['farinha de trigo', 'trigo'],
  'chimichanga': ['farinha de trigo', 'trigo', 'queijo', 'leite', 'carne'],
  'taco shell': ['milho'],
  'elote': ['milho', 'maionese', 'ovo', 'queijo', 'leite'],
  'tamale': ['milho', 'gordura', 'recheio'],
  'churro mexicano': ['farinha de trigo', 'trigo', 'açúcar', 'canela'],
  'sopapilla': ['farinha de trigo', 'trigo', 'mel', 'açúcar'],
  'flan mexicano': ['leite', 'ovo', 'açúcar', 'caramelo'],
  'horchata': ['arroz', 'leite', 'canela'],
  'guacamole industrial': ['abacate', 'cebola'],
  'queso dip': ['queijo', 'leite', 'creme'],
  'molho de queso': ['queijo', 'leite', 'creme'],
  'refried beans industrial': ['feijão', 'gordura'],
  'feijão refrito': ['feijão', 'gordura'],
  
  // ========== PRATOS TAILANDESES/VIETNAMITAS (4ª RODADA) ==========
  'tom kha': ['leite de coco', 'frango', 'galanga'],
  'tom kha gai': ['leite de coco', 'frango', 'galanga'],
  'green curry': ['leite de coco', 'pasta de curry', 'peixe'],
  'curry verde tailandês': ['leite de coco', 'pasta de curry', 'molho de peixe', 'peixe'],
  'red curry': ['leite de coco', 'pasta de curry', 'peixe'],
  'curry vermelho tailandês': ['leite de coco', 'pasta de curry', 'molho de peixe', 'peixe'],
  'massaman curry': ['leite de coco', 'amendoim', 'molho de peixe', 'peixe'],
  'som tam': ['mamão', 'amendoim', 'molho de peixe', 'peixe', 'camarão seco', 'crustáceo'],
  'larb': ['carne', 'molho de peixe', 'peixe'],
  'goi cuon': ['papel de arroz', 'camarão', 'crustáceo', 'amendoim'],
  'cha gio': ['massa', 'farinha de trigo', 'trigo', 'carne', 'vegetais'],
  'bun bo hue': ['macarrão', 'carne', 'camarão seco', 'crustáceo'],
  'cao lau': ['macarrão', 'farinha de trigo', 'trigo', 'carne', 'vegetais'],
  'banh xeo': ['farinha de arroz', 'leite de coco', 'camarão', 'crustáceo'],
  
  // ========== BEBIDAS E SHAKES (4ª RODADA) ==========
  'smoothie proteico': ['frutas', 'whey', 'leite', 'iogurte'],
  'ovomaltine': ['malte', 'cacau', 'leite', 'glúten'],
  'toddy': ['cacau', 'leite', 'açúcar'],
  'nescau': ['cacau', 'leite', 'açúcar'],
  'cappuccino em pó': ['café', 'leite em pó', 'leite', 'açúcar'],
  'golden milk': ['cúrcuma', 'leite'],
  'protein shake': ['whey', 'leite', 'proteína'],
  'whey protein': ['soro de leite', 'leite'],
  'mass gainer': ['whey', 'leite', 'maltodextrina', 'soja', 'glúten'],
  'kefir': ['leite fermentado', 'leite'],
  'iogurte grego': ['leite', 'creme de leite'],
  'coalhada seca': ['leite fermentado', 'leite'],
  'leite em pó': ['leite'],
  'leite condensado industrial': ['leite', 'açúcar'],
  'creme de leite industrial': ['leite', 'creme'],
  
  // ========== OUTROS ITENS CRÍTICOS (4ª RODADA) ==========
  'milanesa de frango': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'milanesa de carne': ['carne', 'farinha de trigo', 'trigo', 'ovo'],
  'frango à passarinho empanado': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'iscas de frango empanadas': ['frango', 'farinha de trigo', 'trigo', 'ovo'],
  'peixe empanado': ['peixe', 'farinha de trigo', 'trigo', 'ovo'],
  'bacalhau empanado': ['bacalhau', 'peixe', 'farinha de trigo', 'trigo', 'ovo'],
  'lula empanada': ['lula', 'frutos do mar', 'moluscos', 'farinha de trigo', 'trigo', 'ovo'],
  'calamari': ['lula', 'frutos do mar', 'moluscos', 'farinha de trigo', 'trigo', 'ovo'],
  'polvo grelhado': ['polvo', 'frutos do mar', 'moluscos'],
  'risoto de camarão': ['arroz', 'camarão', 'crustáceo', 'queijo', 'leite', 'manteiga'],
  'risoto de frutos do mar': ['arroz', 'frutos do mar', 'camarão', 'crustáceo', 'queijo', 'leite'],
  'paella': ['arroz', 'frutos do mar', 'camarão', 'crustáceo', 'mariscos'],
  'arroz de marisco': ['arroz', 'frutos do mar', 'camarão', 'crustáceo', 'mariscos'],
  'caldeirada': ['peixe', 'frutos do mar', 'batata'],
  'bacalhoada': ['bacalhau', 'peixe', 'batata', 'ovo'],
  'bolinho de bacalhau frito': ['bacalhau', 'peixe', 'batata', 'farinha de trigo', 'trigo', 'ovo'],
  'pastel de bacalhau': ['bacalhau', 'peixe', 'batata', 'farinha de trigo', 'trigo'],
  'salmão grelhado com molho': ['salmão', 'peixe', 'manteiga', 'leite'],
  'atum selado': ['atum', 'peixe', 'gergelim'],
  'ceviche': ['peixe cru', 'peixe', 'limão'],
  'carpaccio de salmão': ['salmão', 'peixe'],
};

// Função para verificar se é alimento processado
function isProcessedFood(name: string): boolean {
  const normalized = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PROCESSED_FOOD_KEYWORDS.some(keyword => 
    normalized.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  );
}

// Função para buscar decomposição no banco de dados
// Lógica multilíngue: EN (global) primeiro, BR (regional) como fallback para brasileiros
async function getDecompositionFromDatabase(foodName: string, supabaseUrl: string, serviceRoleKey: string, userCountry?: string): Promise<string[] | null> {
  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const normalized = foodName.toLowerCase().trim();
    const country = userCountry || 'BR';
    
    // 1. Buscar em EN primeiro (padrão global para todos os países)
    const { data: enData, error: enError } = await serviceClient
      .from('food_decomposition_mappings')
      .select('base_ingredients')
      .eq('is_active', true)
      .eq('language', 'en')
      .ilike('food_name', `%${normalized}%`)
      .limit(1)
      .single();
    
    if (!enError && enData?.base_ingredients?.length > 0) {
      logStep(`Found EN decomposition in database for "${foodName}"`, { 
        ingredients: enData.base_ingredients 
      });
      return enData.base_ingredients;
    }
    
    // 2. Se usuário for brasileiro e não achou em EN, buscar em BR (produtos típicos)
    if (country === 'BR') {
      const { data: brData, error: brError } = await serviceClient
        .from('food_decomposition_mappings')
        .select('base_ingredients')
        .eq('is_active', true)
        .eq('language', 'br')
        .ilike('food_name', `%${normalized}%`)
        .limit(1)
        .single();
      
      if (!brError && brData?.base_ingredients?.length > 0) {
        logStep(`Found BR decomposition in database for "${foodName}"`, { 
          ingredients: brData.base_ingredients 
        });
        return brData.base_ingredients;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Função para consultar OpenFoodFacts e salvar no cache
async function getDecompositionFromOpenFoodFacts(foodName: string, country: string): Promise<string[] | null> {
  try {
    logStep(`Querying OpenFoodFacts for "${foodName}"`);
    
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/lookup-openfoodfacts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ 
          query: foodName,
          country: country || 'BR',
          saveToDatabase: true // Ativa cache progressivo
        }),
      }
    );
    
    if (!response.ok) {
      logStep(`OpenFoodFacts lookup failed for "${foodName}"`, { status: response.status });
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && result.ingredients?.length > 0) {
      logStep(`OpenFoodFacts found ingredients for "${foodName}"`, { 
        ingredients: result.ingredients,
        productName: result.product_name,
        savedToDatabase: result.saved_to_database
      });
      return result.ingredients;
    }
    
    return null;
  } catch (err) {
    logStep(`OpenFoodFacts error for "${foodName}"`, { error: String(err) });
    return null;
  }
}

// Função para decompor alimento processado em ingredientes base (PRIORIZA banco de dados)
async function decomposeProcessedFoodAsync(name: string, country?: string): Promise<string[]> {
  const normalized = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // 1. PRIORIDADE: Consultar banco de dados food_decomposition_mappings primeiro
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const dbDecomposition = await getDecompositionFromDatabase(name, supabaseUrl, serviceRoleKey, country);
  if (dbDecomposition) {
    logStep(`Using DB decomposition for "${name}"`, { ingredients: dbDecomposition });
    return dbDecomposition;
  }
  
  // 2. Fallback local: Tentar match exato no DECOMPOSITION_MAP
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      logStep(`Using local fallback for "${name}" → matched "${key}"`);
      return ingredients;
    }
  }
  
  // 3. Fallback local: Tentar match parcial por palavras-chave
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const keyWords = keyNormalized.split(' ');
    if (keyWords.some(word => word.length > 3 && normalized.includes(word))) {
      logStep(`Using local partial match for "${name}" → "${key}"`);
      return ingredients;
    }
  }
  
  // 4. Fallback: Consultar OpenFoodFacts API (cache progressivo)
  const offDecomposition = await getDecompositionFromOpenFoodFacts(name, country || 'BR');
  if (offDecomposition) {
    return offDecomposition;
  }
  
  return [name]; // Retorna o nome original se não conseguir decompor
}

// Função síncrona mantida para compatibilidade (usa apenas mapa local)
function decomposeProcessedFood(name: string): string[] {
  const normalized = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Tentar match exato primeiro
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return ingredients;
    }
  }
  
  // Tentar match parcial por palavras-chave
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const keyWords = keyNormalized.split(' ');
    if (keyWords.some(word => word.length > 3 && normalized.includes(word))) {
      return ingredients;
    }
  }
  
  return [name]; // Retorna o nome original se não conseguir decompor
}

// Conhecimento enciclopédico de produtos industrializados conhecidos
// (mantido para enriquecimento de produtos por embalagem/marca)
const PRODUTOS_CONHECIDOS: Record<string, { contem: string[], marcasTipicas: string[] }> = {
  margarina: {
    contem: ['soro de leite', 'lactose', 'gordura vegetal'],
    marcasTipicas: ['qualy', 'delícia', 'primor', 'claybom']
  },
  iogurte: {
    contem: ['leite', 'lactose', 'açúcar'],
    marcasTipicas: ['danone', 'activia', 'vigor', 'batavo', 'nestlé']
  },
  molho_shoyu: {
    contem: ['trigo', 'glúten', 'soja'],
    marcasTipicas: ['sakura', 'kikkoman', 'hinomoto']
  },
  maionese: {
    contem: ['ovo', 'óleo de soja'],
    marcasTipicas: ['hellmanns', 'heinz', 'quero', 'liza']
  },
  nuggets: {
    contem: ['farinha de trigo', 'glúten', 'soja'],
    marcasTipicas: ['sadia', 'seara', 'perdigão', 'aurora']
  },
  salsicha: {
    contem: ['amido de trigo', 'glúten', 'lactose'],
    marcasTipicas: ['sadia', 'seara', 'perdigão', 'swift']
  },
  presunto: {
    contem: ['amido', 'lactose', 'glúten'],
    marcasTipicas: ['sadia', 'seara', 'aurora', 'frimesa']
  },
  requeijao: {
    contem: ['leite', 'lactose', 'gordura de leite'],
    marcasTipicas: ['catupiry', 'polenguinho', 'vigor', 'polenghi']
  },
  chocolate: {
    contem: ['leite', 'lactose', 'açúcar', 'lecitina de soja'],
    marcasTipicas: ['nestlé', 'lacta', 'garoto', 'hersheys']
  },
  biscoito: {
    contem: ['farinha de trigo', 'glúten', 'açúcar', 'gordura vegetal'],
    marcasTipicas: ['bauducco', 'marilan', 'nestlé', 'piraquê']
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("[DEBUG] Function started");
    const googleAIApiKey = await getGeminiApiKey();
    logStep("[DEBUG] Gemini API key fetched", { hasKey: !!googleAIApiKey, keyLength: googleAIApiKey?.length });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    logStep("[DEBUG] Auth header check", { hasAuth: !!authHeader });
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    logStep("[DEBUG] User auth result", { hasUser: !!user, error: userError?.message });
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('intolerances, dietary_preference, goal, excluded_ingredients, country')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep('Error fetching profile', profileError);
    }

    const intolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || 'comum';
    const goal = profile?.goal || 'manter';
    const excludedIngredients = profile?.excluded_ingredients || [];
    const userCountry = profile?.country || 'BR';
    
    // Get locale and nutritional context for the user's country
    const userLocale = getLocaleFromCountry(userCountry);
    const nutritionalSource = getNutritionalSource(userCountry);
    const globalNutritionPrompt = getGlobalNutritionPrompt(userCountry);

    logStep('Profile loaded', { intolerances, dietaryPreference, goal, userCountry, userLocale });

    // Load global safety database for validation
    const safetyDatabase = await loadSafetyDatabase(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const normalizedIntolerances = normalizeUserIntolerances(intolerances, safetyDatabase);
    
    // Build user restrictions for safety engine
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference,
      excludedIngredients,
    };

    logStep('Safety database loaded', { 
      intoleranceMappings: safetyDatabase.intoleranceMappings.size,
      dietaryForbidden: safetyDatabase.dietaryForbidden.size,
      normalizedIntolerances
    });

    const body = await req.json();
    logStep("[DEBUG] Request body parsed", { 
      hasImageBase64: !!body.imageBase64, 
      imageSize: body.imageBase64?.length,
      additionalImagesCount: body.additionalImages?.length || 0,
      areas: body.areas
    });
    
    const { imageBase64, additionalImages, areas } = body;
    
    if (!imageBase64) {
      throw new Error('Image data required');
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const additionalBase64 = (additionalImages || []).map((img: string) => 
      img.replace(/^data:image\/\w+;base64,/, '')
    );
    
    const areaLabels = areas || ['Geladeira'];
    logStep('Analyzing fridge photo', { areas: areaLabels, imageCount: 1 + additionalBase64.length });

    // Build personalized prompt
    let dietaryContext = '';
    if (dietaryPreference === 'vegetariana') {
      dietaryContext = 'O usuário é VEGETARIANO - sugira apenas receitas sem carne.';
    } else if (dietaryPreference === 'vegana') {
      dietaryContext = 'O usuário é VEGANO - sugira apenas receitas sem ingredientes de origem animal.';
    } else if (dietaryPreference === 'low_carb') {
      dietaryContext = 'O usuário segue dieta LOW CARB - priorize receitas com baixo carboidrato.';
    }

    let intoleranceContext = '';
    if (intolerances.length > 0) {
      intoleranceContext = `ATENÇÃO CRÍTICA - SEGURANÇA ALIMENTAR:
O usuário tem as seguintes intolerâncias/alergias: ${intolerances.join(', ')}.

REGRAS DE SEGURANÇA:
1. NÃO sugira receitas que contenham esses ingredientes ou derivados
2. Para CADA ingrediente identificado na geladeira, avalie o nível de confiança
3. Se um produto for identificado apenas pela embalagem/marca (sem ver o rótulo), marque confiança como "baixa"
4. Adicione alertas de segurança para produtos que PODEM conter alérgenos mesmo que não confirmado`;
    }

    let goalContext = '';
    if (goal === 'emagrecer') {
      goalContext = 'O usuário quer EMAGRECER - priorize receitas leves e com menos calorias.';
    } else if (goal === 'ganhar_peso') {
      goalContext = 'O usuário quer GANHAR PESO - sugira receitas mais calóricas e nutritivas.';
    }

    // Removed complexity and context - not available in profiles table
    const complexityContext = '';
    const contextInfo = '';

    const systemPrompt = `You are a WORLD-CLASS EXPERT in FOOD SAFETY and GLOBAL CUISINE with encyclopedic knowledge of products from all countries.

=== LANGUAGE & OUTPUT RULES ===
- REASON internally in English for maximum accuracy
- OUTPUT all user-facing text in: ${userLocale}
- Use culturally appropriate food names for the user's region (${userCountry})
- JSON KEYS: always English. TEXT VALUES shown to user: ${userLocale}

=== GLOBAL NUTRITION CONTEXT ===
${globalNutritionPrompt}

User country: ${userCountry}
User locale: ${userLocale}
Primary nutritional database: ${nutritionalSource.sourceName}

=== STEP ZERO - IMAGE CLASSIFICATION (EXECUTE FIRST!) ===

BEFORE analyzing any fridge contents, you MUST classify what type of image this is.

POSSIBLE CATEGORIES:
- "geladeira_aberta": Open refrigerator showing contents inside
- "despensa_armario": Pantry, cabinet, or food storage area
- "freezer": Freezer compartment or standalone freezer
- "pessoa_corpo": Person, body part (hand, face, leg, arm, torso, foot, selfie)
- "animal_pet": Pet, animal, wildlife (dog, cat, bird, etc.)
- "objeto_domestico": Furniture, electronics, household item (NOT fridge)
- "paisagem_ambiente": Landscape, room without fridge focus, outdoor environment
- "documento_tela": Screen, phone, document, food label (use label analyzer instead)
- "prato_comida": Prepared food/meal on a plate (use food photo analyzer instead)
- "veiculo": Car, motorcycle, bicycle, any vehicle
- "imagem_abstrata": Blurry, unclear, too dark, too bright to identify

⚠️ IF NOT "geladeira_aberta", "despensa_armario", OR "freezer", return IMMEDIATELY:

{
  "erro": "imagem_invalida",
  "categoria_detectada": "[exact category from list above]",
  "objeto_identificado": "[Describe EXACTLY what you see: e.g., 'perna humana', 'cachorro na cozinha', 'prato de comida pronto', 'sala de estar']",
  "confianca": "alta|media|baixa",
  "mensagem": "Esta imagem não parece ser de uma geladeira ou despensa. Parece ser [description in Portuguese]. Por favor, tire uma foto do interior da sua geladeira ou despensa.",
  "dica": "Abra a geladeira e fotografe o interior mostrando os produtos nas prateleiras."
}

CRITICAL RULES:
- NEVER try to analyze fridge contents if the image is not a fridge/pantry
- NEVER suggest recipes based on non-fridge images
- BE STRICT: If you see a person, pet, prepared meal, or anything that is NOT a fridge interior, return the error format above
- When in doubt, return the error format rather than guessing

=== IF AND ONLY IF THE IMAGE IS A FRIDGE/PANTRY, CONTINUE BELOW ===

${dietaryContext}
${intoleranceContext}
${goalContext}
${complexityContext}
${contextInfo}

=== GLOBAL PRODUCT RECOGNITION ===

You MUST recognize products from ALL regions including:
- **Americas**: US brands (Kraft, General Mills, Tyson), Brazilian brands (Sadia, Seara, Nestlé BR), Mexican, Argentine
- **Europe**: UK, German (Dr. Oetker), French, Italian, Spanish, Portuguese brands
- **Asia**: Japanese (Ajinomoto, Kikkoman), Korean (CJ, Ottogi), Chinese, Thai, Indian brands
- **Middle East**: Halal products, Arabic brands
- **Oceania**: Australian, New Zealand brands

=== MULTI-LANGUAGE ALLERGEN DETECTION ===

Recognize allergens in products from any language:

**LACTOSE/DAIRY in different languages:**
- EN: milk, whey, casein, lactose | PT: leite, soro de leite, caseína | ES: leche, suero | DE: Milch, Molke | FR: lait, lactosérum | JA: 乳, ホエイ

**GLUTEN in different languages:**
- EN: wheat, gluten, barley, malt | PT: trigo, glúten, cevada, malte | ES: trigo, gluten | DE: Weizen, Gluten | FR: blé, gluten | JA: 小麦, グルテン

**PEANUTS/TREE NUTS in different languages:**
- EN: peanut, almond, cashew, walnut | PT: amendoim, amêndoa, castanha | ES: cacahuete, almendra | DE: Erdnuss, Mandel | FR: arachide, amande | JA: 落花生, アーモンド

**EGGS in different languages:**
- EN: egg, albumin | PT: ovo, albumina | ES: huevo | DE: Ei | FR: œuf | JA: 卵

**SEAFOOD in different languages:**
- EN: fish, shrimp, crab, shellfish | PT: peixe, camarão, marisco | ES: pescado, camarón | DE: Fisch, Garnele | FR: poisson, crevette | JA: 魚, えび, かに

**SOY in different languages:**
- EN: soy, soya, lecithin | PT: soja, lecitina | ES: soja | DE: Soja | FR: soja | JA: 大豆

=== GLOBAL PRODUCT KNOWLEDGE ===

Known products and their typical allergens (from any country):
- **Margarine/Spreads** (any brand): typically contains whey/lactose
- **Soy Sauce** (Kikkoman, Sakura, any): contains wheat/gluten + soy
- **Mayonnaise** (Hellmann's, Kewpie, any): contains egg + soy
- **Breaded products** (nuggets, schnitzel, tonkatsu): contains gluten + soy
- **Processed meats** (sausages, ham, bacon): may contain gluten, lactose
- **Yogurt** (any brand unless labeled): contains lactose
- **Chocolate** (any brand): typically contains milk + soy lecithin
- **Ice cream** (any brand unless labeled): contains lactose

=== IDENTIFICATION GUIDELINES ===

1. VISUAL CONTEXT IDENTIFICATION:
   - Use branding, colors, logos, packaging shape, and typical fridge position
   - Even without seeing label clearly, identify product by brand/packaging
   - Consider the COUNTRY of the user when identifying products

2. ENCYCLOPEDIC KNOWLEDGE:
   - Retrieve TYPICAL ingredients from identified product in your knowledge base
   - If you identify "Margarine" → assume IMMEDIATELY presence of whey/lactose
   - If you identify "Soy Sauce" → assume presence of wheat/gluten

3. HIDDEN ALLERGEN DETECTION:
   Signal hidden substances in technical names:
   - LACTOSE: casein, caseinate, whey, lactalbumin, lactoglobulin
   - GLUTEN: maltodextrin, wheat starch, wheat protein, malt, seitan
   - EGG: albumin, ovalbumin, egg lecithin, lysozyme
   - SOY: soy lecithin, PVT, TVP, hydrolyzed vegetable protein

4. SAFETY PESSIMISM (FAIL-SAFE):
   - IF IN DOUBT = CLASSIFY AS UNSAFE
   - Better a false-negative than a health risk
   - If confidence < 85%, add alert to check manually

=== RECIPE SUGGESTION RULES ===

⚠️ NEVER USE UNIDENTIFIED INGREDIENTS IN RECIPES:
- If an item has "baixa" confidence or confianca_percentual < 70%, DO NOT include it in recipes
- ONLY suggest recipes with HIGH CONFIDENCE and SAFE ingredients

⚠️ CONSIDER GLOBAL CUISINES:
- Suggest recipes from the user's likely culture AND international options
- Brazilian user? Include Brazilian recipes but also global options
- Consider what makes sense with the identified ingredients

=== RESPONSE FORMAT (JSON required) ===

REMEMBER: If the image is NOT a fridge/pantry, you MUST return the "erro": "imagem_invalida" format from STEP ZERO above. Never try to analyze non-fridge images.

FOR VALID FRIDGE/PANTRY IMAGES, respond with:

{
  "ingredientes_identificados": [
    {
      "nome": "ingredient name",
      "nome_original": "name in original product language if different",
      "quantidade_estimada": "approximate quantity",
      "confianca": "alta|media|baixa",
      "confianca_percentual": 0-100,
      "pode_usar_em_receita": true|false,
      "motivo_restricao": "If pode_usar_em_receita=false, explain why",
      "alerta_seguranca": "Alert if applicable, or null",
      "tipo": "in_natura|industrializado|nao_identificado",
      "pais_origem_provavel": "Country code if identifiable",
      "substancias_detectadas": ["List of detected or presumed allergens"],
      "identificado_por": "rotulo|embalagem|marca|contexto|incerto",
      "recomendacao_verificacao": "Text suggesting user verify label, if applicable"
    }
  ],
  "receitas_sugeridas": [
    {
      "nome": "Recipe Name",
      "nome_original": "Original name if from specific cuisine",
      "culinaria_origem": "Cuisine of origin (Brazilian, Italian, Japanese, etc.)",
      "descricao": "Brief description",
      "tempo_preparo": 30,
      "dificuldade": "fácil|média|difícil",
      "ingredientes_da_geladeira": ["ONLY high confidence and safe ingredients"],
      "ingredientes_extras": ["needed ingredients with safe version spec if applicable"],
      "calorias_estimadas": 350,
      "instrucoes_resumidas": ["Step 1", "Step 2", "Step 3"],
      "seguro_para_usuario": true|false,
      "alerta_receita": "General alert about recipe if applicable, or null"
    }
  ],
  "ingredientes_nao_utilizados": [
    {
      "nome": "unused ingredient name",
      "motivo": "Why not included in recipes"
    }
  ],
  "alertas_gerais": ["List of important food safety alerts"],
  "resumo_seguranca": {
    "ingredientes_seguros": 0,
    "ingredientes_risco": 0,
    "ingredientes_verificar": 0,
    "mensagem": "Clear summary about ingredient safety"
  },
  "dica": "A quick tip about the ingredients"
}`;

    logStep("[DEBUG] Calling Gemini API", { 
      model: 'gemini-2.5-flash-lite',
      imageSize: base64Data.length,
      additionalImagesCount: additionalBase64.length
    });
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${googleAIApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.4, // Mais conservador para segurança
          topP: 0.95,
          maxOutputTokens: 8192, // Increased to prevent JSON truncation
        }
      })
    });

    logStep("[DEBUG] Gemini API response status", { status: response.status, ok: response.ok });
    
    if (!response.ok) {
      const errorText = await response.text();
      logStep('[DEBUG] Gemini API error details', { status: response.status, error: errorText });
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    logStep('[DEBUG] AI response received', { 
      hasCandidates: !!aiResponse.candidates,
      candidatesCount: aiResponse.candidates?.length
    });

    const textContent = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    logStep('[DEBUG] Text content extracted', { 
      hasText: !!textContent,
      textLength: textContent?.length,
      preview: textContent?.slice(0, 200)
    });
    
    if (!textContent) {
      throw new Error('No response from AI');
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    // Try to parse JSON, with recovery for truncated responses
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logStep('JSON parse error, attempting recovery', { error: String(parseError) });
      
      // Try to fix common truncation issues
      let fixedJson = jsonMatch[0];
      
      // Count open and close braces/brackets
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;
      
      // Add missing closing characters
      const missingBrackets = openBrackets - closeBrackets;
      const missingBraces = openBraces - closeBraces;
      
      // Remove trailing incomplete content and close properly
      // Find the last complete property
      const lastCompleteIndex = Math.max(
        fixedJson.lastIndexOf('}'),
        fixedJson.lastIndexOf(']'),
        fixedJson.lastIndexOf('"')
      );
      
      if (lastCompleteIndex > 0) {
        fixedJson = fixedJson.substring(0, lastCompleteIndex + 1);
        
        // Try to close arrays and objects properly
        for (let i = 0; i < missingBrackets; i++) {
          fixedJson += ']';
        }
        for (let i = 0; i < missingBraces; i++) {
          fixedJson += '}';
        }
      }
      
      try {
        analysis = JSON.parse(fixedJson);
        logStep('JSON recovered successfully');
      } catch (secondError) {
        // If still failing, return a minimal valid response
        logStep('JSON recovery failed, returning minimal response');
        analysis = {
          ingredientes_identificados: [],
          receitas_sugeridas: [],
          alertas_gerais: ["Houve um problema ao processar a imagem. Por favor, tente novamente com uma foto mais clara."],
          erro_processamento: true
        };
      }
    }
    
    // Check for error response from AI (not fridge detected)
    if (analysis.erro) {
      logStep('Not a fridge image - structured error', { 
        erro: analysis.erro,
        categoria: analysis.categoria_detectada,
        objeto: analysis.objeto_identificado 
      });
      
      return new Response(JSON.stringify({
        notFridge: true,
        categoryError: true,
        categoria_detectada: analysis.categoria_detectada || "desconhecido",
        objeto_identificado: analysis.objeto_identificado || "",
        message: analysis.mensagem || "Esta imagem não parece ser de uma geladeira ou despensa.",
        dica: analysis.dica || "Abra a geladeira e fotografe o interior mostrando os produtos."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Legacy format fallback
    if (analysis.notFridge) {
      logStep('Not a fridge image - legacy');
      return new Response(JSON.stringify({
        notFridge: true,
        message: analysis.message || "Por favor, fotografe o interior da sua geladeira ou despensa."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========== PÓS-PROCESSAMENTO: CÁLCULO DE MACROS REAIS PARA RECEITAS SUGERIDAS ==========
    // Usa a tabela foods para macros reais, com fallback para estimativas da IA
    
    if (analysis.receitas_sugeridas && Array.isArray(analysis.receitas_sugeridas)) {
      logStep('Calculating real macros for suggested recipes', { count: analysis.receitas_sugeridas.length });
      
      // Create service client for database queries
      const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      
      for (const receita of analysis.receitas_sugeridas) {
        // Build foods array from recipe ingredients
        const ingredientesReceita = [
          ...(receita.ingredientes_da_geladeira || []),
          ...(receita.ingredientes_extras || [])
        ];
        
        if (ingredientesReceita.length > 0) {
        // Parse ingredients to extract names and estimate grams
          const foodsForCalculation = ingredientesReceita.map((ing: string) => {
            // Try to extract quantity from ingredient string (e.g., "200g de frango")
            const gramsMatch = ing.match(/(\d+)\s*g(?:ramas)?/i);
            const grams = gramsMatch ? parseInt(gramsMatch[1]) : 100; // Default to 100g if no quantity
            
            // Clean ingredient name
            const name = ing
              .replace(/\d+\s*g(?:ramas)?/gi, '')
              .replace(/de\s+/gi, '')
              .trim();
            
            return {
              name,
              grams,
              // Keep AI estimates as fallback (use undefined instead of null)
              estimated_calories: receita.calorias_estimadas ? Math.round(receita.calorias_estimadas / ingredientesReceita.length) : undefined,
              estimated_protein: undefined,
              estimated_carbs: undefined,
              estimated_fat: undefined
            };
          });
          
          try {
            const { items, matchRate, fromDb, fromAi } = await calculateRealMacrosForFoods(serviceClient, foodsForCalculation);
            
            // Calculate totals
            const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
            const totalProtein = items.reduce((sum, item) => sum + item.protein, 0);
            const totalCarbs = items.reduce((sum, item) => sum + item.carbs, 0);
            const totalFat = items.reduce((sum, item) => sum + item.fat, 0);
            
            // Update recipe with real macros
            receita.calorias = Math.round(totalCalories);
            receita.proteinas = Math.round(totalProtein);
            receita.carboidratos = Math.round(totalCarbs);
            receita.gorduras = Math.round(totalFat);
            receita.calorias_estimadas = undefined; // Remove old field
            
            // Add macro calculation metadata
            receita.macro_source = {
              match_rate: Math.round(matchRate),
              from_database: fromDb,
              from_ai_estimate: fromAi
            };
            
            // Add detailed ingredients with macros
            receita.ingredientes_detalhados = items.map(item => ({
              nome: item.name,
              gramas: item.grams,
              calorias: Math.round(item.calories),
              proteinas: Math.round(item.protein),
              carboidratos: Math.round(item.carbs),
              gorduras: Math.round(item.fat),
              fonte: item.source
            }));
            
            logStep('Recipe macros calculated', { 
              recipe: receita.nome, 
              matchRate: Math.round(matchRate),
              fromDb,
              fromAi
            });
          } catch (calcError) {
            logStep('Error calculating recipe macros', { recipe: receita.nome, error: String(calcError) });
            // Keep original AI estimates if calculation fails
          }
        }
      }
    }

    // ========== PÓS-PROCESSAMENTO: ENRIQUECIMENTO COM PRODUTOS_CONHECIDOS ==========
    // Esta etapa usa conhecimento enciclopédico para GARANTIR detecção de alérgenos
    
    if (analysis.ingredientes_identificados) {
      logStep('Starting post-processing with PRODUTOS_CONHECIDOS');
      
      for (const ingrediente of analysis.ingredientes_identificados) {
        const nomeNormalizado = ingrediente.nome.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, '');
        
        // 1. BUSCAR NO MAPA DE PRODUTOS CONHECIDOS
        let produtoEncontrado: { contem: string[], marcasTipicas: string[] } | null = null;
        let produtoKey = '';
        
        for (const [key, value] of Object.entries(PRODUTOS_CONHECIDOS)) {
          const keyNormalizado = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          // Verificar se o nome do ingrediente corresponde à chave do produto
          if (nomeNormalizado.includes(keyNormalizado) || keyNormalizado.includes(nomeNormalizado)) {
            produtoEncontrado = value;
            produtoKey = key;
            break;
          }
          // Verificar também pelas marcas típicas
          const matchesMarca = value.marcasTipicas.some(marca => 
            nomeNormalizado.includes(marca.toLowerCase())
          );
          if (matchesMarca) {
            produtoEncontrado = value;
            produtoKey = key;
            break;
          }
        }
        
        // 2. SE ENCONTROU PRODUTO CONHECIDO, ENRIQUECER COM INFORMAÇÕES
        if (produtoEncontrado) {
          logStep('Product matched in PRODUTOS_CONHECIDOS', { produto: produtoKey, ingrediente: ingrediente.nome });
          
          // Adicionar substâncias detectadas se não existir
          if (!ingrediente.substancias_detectadas || ingrediente.substancias_detectadas.length === 0) {
            ingrediente.substancias_detectadas = produtoEncontrado.contem;
          } else {
            // Mesclar com as substâncias já detectadas pela IA
            const substanciasExistentes = new Set(ingrediente.substancias_detectadas.map((s: string) => s.toLowerCase()));
            for (const substancia of produtoEncontrado.contem) {
              if (!substanciasExistentes.has(substancia.toLowerCase())) {
                ingrediente.substancias_detectadas.push(substancia);
              }
            }
          }
          
          // 3. VERIFICAR CONFLITOS COM INTOLERÂNCIAS DO USUÁRIO USANDO GLOBAL SAFETY ENGINE
          if (normalizedIntolerances.length > 0) {
            const substanciasDoIngrediente = ingrediente.substancias_detectadas || [];
            
            // Use globalSafetyEngine to validate the substances
            const safetyCheck = validateIngredientList(substanciasDoIngrediente, userRestrictions, safetyDatabase);
            
            // 4. ADICIONAR ALERTA DE SEGURANÇA SE HOUVER CONFLITO
            if (!safetyCheck.isSafe && safetyCheck.conflicts.length > 0) {
              const restricoesLabel = safetyCheck.conflicts.map(c => 
                getIntoleranceLabel(c.key, safetyDatabase)
              ).join(', ');
              
              const alertaAtual = ingrediente.alerta_seguranca || '';
              const novoAlerta = `🔴 CONTÉM ${restricoesLabel.toUpperCase()} (baseado em conhecimento do produto "${produtoKey}")`;
              
              if (!alertaAtual.includes(restricoesLabel)) {
                ingrediente.alerta_seguranca = alertaAtual 
                  ? `${alertaAtual} | ${novoAlerta}`
                  : novoAlerta;
              }
              
              // Marcar como industrializado se não estiver
              if (!ingrediente.tipo) {
                ingrediente.tipo = 'industrializado';
              }
              
              // Baixar confiança se IA tinha dado alta mas não viu rótulo
              if (ingrediente.confianca === 'alta' && ingrediente.identificado_por !== 'rotulo') {
                ingrediente.confianca = 'media';
                ingrediente.confianca_percentual = Math.min(ingrediente.confianca_percentual || 75, 75);
              }
            }
          }
        }
        
        // 5. VERIFICAÇÃO ADICIONAL USANDO GLOBAL SAFETY ENGINE (mesmo sem match em PRODUTOS_CONHECIDOS)
        // AGORA COM DECOMPOSIÇÃO DE ALIMENTOS PROCESSADOS + FALLBACK OPENFOODFACTS
        if (normalizedIntolerances.length > 0) {
          // Verificar se é alimento processado e decompor (com fallback para DB e OpenFoodFacts)
          let ingredientsToValidate: string[] = [ingrediente.nome];
          
          if (isProcessedFood(ingrediente.nome)) {
            const decomposed = await decomposeProcessedFoodAsync(ingrediente.nome, userCountry);
            ingredientsToValidate = decomposed;
            logStep('Decomposed processed food for safety check', { 
              original: ingrediente.nome, 
              decomposed 
            });
          }
          
          const ingredientCheck = validateIngredientList(ingredientsToValidate, userRestrictions, safetyDatabase);
          
          if (!ingredientCheck.isSafe) {
            // Se encontrou conflito, adicionar alerta
            const conflictLabel = ingredientCheck.conflicts.length > 0 
              ? getIntoleranceLabel(ingredientCheck.conflicts[0].key, safetyDatabase)
              : '';
            
            // Para alimentos processados com conflito, sempre adicionar alerta
            if (!ingrediente.alerta_seguranca) {
              if (isProcessedFood(ingrediente.nome)) {
                ingrediente.alerta_seguranca = `🔴 CONTÉM ${conflictLabel.toUpperCase()} (produto processado com ingredientes restritos)`;
                ingrediente.pode_usar_em_receita = false;
              } else if (ingrediente.tipo === 'industrializado' && ingrediente.confianca !== 'alta') {
                const versaoSegura = conflictLabel ? `sem ${conflictLabel.toLowerCase()}` : 'adequada';
                ingrediente.alerta_seguranca = `⚠️ Verifique se este produto é a versão ${versaoSegura} antes de usar.`;
              }
            }
          }
        }
      }
      
      // 6. ALERTAS GERAIS
      const produtosBaixaConfianca = analysis.ingredientes_identificados.filter(
        (i: any) => i.confianca === 'baixa' && i.tipo === 'industrializado'
      );
      
      if (produtosBaixaConfianca.length > 0) {
        if (!analysis.alertas_gerais) {
          analysis.alertas_gerais = [];
        }
        analysis.alertas_gerais.push(
          `⚠️ ${produtosBaixaConfianca.length} produto(s) não puderam ter o rótulo verificado. Por segurança, confirme que são adequados para suas restrições antes de usar.`
        );
      }
      
      // 7. CONTAR ENRIQUECIMENTOS REALIZADOS
      const ingredientesEnriquecidos = analysis.ingredientes_identificados.filter(
        (i: any) => i.substancias_detectadas && i.substancias_detectadas.length > 0
      ).length;
      
      logStep('Post-processing complete', { 
        ingredientesEnriquecidos,
        totalIngredientes: analysis.ingredientes_identificados.length
      });
    }

    // ========== ARQUITETURA CORRETA: PERFIL DERIVA DO SAFETY ENGINE ==========
    // O Safety Engine já validou cada ingrediente durante o pós-processamento acima.
    // Agora apenas DERIVAMOS os alertas do que já foi marcado com alerta_seguranca.
    // NÃO fazemos nova validação - apenas refletimos o que o Safety Engine decidiu.
    
    const alertasPersonalizados: Array<{
      ingrediente: string;
      restricao: string;
      status: "seguro" | "risco_potencial" | "contem";
      mensagem: string;
      icone: string;
    }> = [];
    
    // Função auxiliar para normalizar texto
    const normalizeTextLocal = (text: string): string => {
      return text.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    
    // Para cada intolerância do usuário, verificar se há ingredientes já marcados com conflito
    for (const userIntolerance of normalizedIntolerances) {
      // Obter todas as formas normalizadas desta intolerância
      const normalizedKeys: string[] = safetyDatabase 
        ? (safetyDatabase.keyNormalization.get(userIntolerance.toLowerCase()) || [userIntolerance.toLowerCase()])
        : [userIntolerance.toLowerCase()];
      
      const intoleranceKey = normalizedKeys[0];
      const restricaoLabel = getIntoleranceLabel(intoleranceKey, safetyDatabase);
      
      // Criar set de todas as formas normalizadas para matching
      const allNormalizedForms = new Set<string>();
      allNormalizedForms.add(normalizeTextLocal(userIntolerance));
      allNormalizedForms.add(normalizeTextLocal(restricaoLabel));
      for (const key of normalizedKeys) {
        allNormalizedForms.add(normalizeTextLocal(key));
        const keyLabel = getIntoleranceLabel(key, safetyDatabase);
        allNormalizedForms.add(normalizeTextLocal(keyLabel));
      }
      
      let found = false;
      let foundStatus: "seguro" | "risco_potencial" | "contem" = "seguro";
      let foundIngredient = "";
      
      // ========== ÚNICA FONTE DE VERDADE: ingredientes com alerta_seguranca ==========
      if (analysis.ingredientes_identificados) {
        for (const ing of analysis.ingredientes_identificados) {
          // Se o Safety Engine já marcou este ingrediente com alerta
          if (ing.alerta_seguranca) {
            const alertaNorm = normalizeTextLocal(ing.alerta_seguranca);
            
            // Verificar se o alerta corresponde a esta intolerância
            const matchesThisIntolerance = Array.from(allNormalizedForms).some(form => 
              alertaNorm.includes(form) || form.includes(alertaNorm.split(' ').slice(1, 3).join(' '))
            );
            
            if (matchesThisIntolerance) {
              found = true;
              foundIngredient = ing.nome;
              foundStatus = alertaNorm.includes('🔴') ? "contem" : "risco_potencial";
              
              logStep("Perfil DERIVANDO do Safety Engine (Fridge)", {
                ingredient: ing.nome,
                alerta_original: ing.alerta_seguranca,
                intolerance_usuario: userIntolerance,
                status_derivado: foundStatus
              });
              
              if (foundStatus === "contem") break; // Pior caso
            }
          }
        }
      }
      
      if (found) {
        alertasPersonalizados.push({
          ingrediente: foundIngredient,
          restricao: restricaoLabel,
          status: foundStatus,
          mensagem: foundStatus === "contem" 
            ? `⚠️ "${foundIngredient}" contém ${restricaoLabel.toUpperCase()} - na sua lista de restrições`
            : `⚡ Verificar "${foundIngredient}" - pode conter ${restricaoLabel}`,
          icone: foundStatus === "contem" ? "🔴" : "🟡"
        });
      } else {
        alertasPersonalizados.push({
          ingrediente: "",
          restricao: restricaoLabel,
          status: "seguro",
          mensagem: `✅ Nenhum produto com ${restricaoLabel} identificado na geladeira`,
          icone: "🟢"
        });
      }
    }
    
    // Adicionar verificação de preferência alimentar
    // Database now stores: "omnivore" | "vegetarian" | "vegan" | etc.
    if (dietaryPreference === "vegetarian" || dietaryPreference === "vegan") {
      const dietLabel = dietaryPreference === "vegan" ? "Veganismo" : "Vegetarianismo";
      const meatKeywords = ["carne", "frango", "peixe", "camarão", "bacon", "linguiça", "presunto", "salsicha", "boi"];
      const animalKeywords = [...meatKeywords, "leite", "queijo", "ovo", "manteiga", "iogurte", "mel"];
      const keywordsToCheck = dietaryPreference === "vegan" ? animalKeywords : meatKeywords;
      
      let foundIngredients: string[] = [];
      
      if (analysis.ingredientes_identificados) {
        for (const ing of analysis.ingredientes_identificados) {
          const ingName = ing.nome?.toLowerCase() || "";
          if (keywordsToCheck.some(keyword => ingName.includes(keyword))) {
            foundIngredients.push(ing.nome);
          }
        }
      }
      
      alertasPersonalizados.push({
        ingrediente: foundIngredients.join(", "),
        restricao: dietLabel,
        status: foundIngredients.length > 0 ? "contem" : "seguro",
        mensagem: foundIngredients.length > 0 
          ? `⚠️ ${foundIngredients.length} item(s) incompatível(s) com ${dietLabel.toLowerCase()}`
          : `✅ Ingredientes compatíveis com ${dietLabel.toLowerCase()}`,
        icone: foundIngredients.length > 0 ? "🔴" : "🟢"
      });
    }
    
    // Ordenar alertas: primeiro os problemas, depois os seguros
    alertasPersonalizados.sort((a, b) => {
      const order = { "contem": 0, "risco_potencial": 1, "seguro": 2 };
      return order[a.status] - order[b.status];
    });
    
    // Adicionar ao response
    const perfilUsuarioAplicado = {
      intolerances: intolerances,
      dietary_preference: dietaryPreference,
      alertas_personalizados: alertasPersonalizados,
      resumo: alertasPersonalizados.some(a => a.status === "contem")
        ? "Sua geladeira contém itens que requerem atenção"
        : alertasPersonalizados.some(a => a.status === "risco_potencial")
        ? "Alguns itens precisam de verificação"
        : "Todos os itens parecem seguros para seu perfil"
    };

    logStep('Analysis complete with safety checks and profile cross-check', { 
      ingredientCount: analysis.ingredientes_identificados?.length,
      recipeCount: analysis.receitas_sugeridas?.length,
      alertCount: analysis.alertas_gerais?.length || 0,
      personalizedAlerts: alertasPersonalizados.length,
      profileApplied: true
    });

    return new Response(JSON.stringify({ 
      analysis,
      perfil_usuario_aplicado: perfilUsuarioAplicado
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

