/**
 * ============================================
 * TESTE ROBUSTO DE FALSOS POSITIVOS
 * ============================================
 * 
 * Testa todas as 18 categorias de intolerâncias, alergias e sensibilidades
 * para detectar falsos positivos (alimentos seguros bloqueados incorretamente)
 * e falsos negativos (alimentos perigosos não bloqueados).
 * 
 * Categorias testadas:
 * INTOLERÂNCIAS (5): Lactose, Glúten, Frutose, Sorbitol, FODMAP
 * ALERGIAS (6): Amendoim, Oleaginosas, Frutos do Mar, Peixe, Ovos, Soja
 * SENSIBILIDADES (7): Açúcar, Histamina, Cafeína, Sulfito, Salicilato, Milho, Níquel
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  getDatabaseStats,
  containsWholeWord,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  name: string;
  description: string;
  ingredient: string;
  intoleranceKey: string; // onboarding_key format
  expectedResult: 'block' | 'allow' | 'warning';
  category: 'false_positive' | 'false_negative' | 'edge_case' | 'true_positive' | 'true_negative';
  language?: 'pt' | 'en' | 'es' | 'fr';
}

// ============================================
// BATERIA COMPLETA DE TESTES - 18 CATEGORIAS
// ============================================

const TEST_CASES: TestCase[] = [
  // =============================================
  // CATEGORIA 1: LACTOSE (Intolerância)
  // =============================================
  
  // TRUE POSITIVES - Deve bloquear
  { name: "LACTOSE-TP1", description: "Leite integral deve bloquear", ingredient: "leite integral", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP2", description: "Queijo mussarela deve bloquear", ingredient: "queijo mussarela", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP3", description: "Iogurte natural deve bloquear", ingredient: "iogurte natural", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP4", description: "Creme de leite deve bloquear", ingredient: "creme de leite", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP5", description: "Manteiga deve bloquear", ingredient: "manteiga", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP6", description: "Requeijão deve bloquear", ingredient: "requeijao", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive" },
  { name: "LACTOSE-TP7-EN", description: "Whole milk (EN) deve bloquear", ingredient: "whole milk", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive", language: "en" },
  { name: "LACTOSE-TP8-EN", description: "Cheese (EN) deve bloquear", ingredient: "cheddar cheese", intoleranceKey: "lactose", expectedResult: "block", category: "true_positive", language: "en" },
  
  // FALSE POSITIVES - NÃO deve bloquear
  { name: "LACTOSE-FP1", description: "Arroz NÃO deve bloquear por lactose", ingredient: "arroz branco", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP2", description: "Frango NÃO deve bloquear por lactose", ingredient: "peito de frango", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP3", description: "Maçã NÃO deve bloquear por lactose", ingredient: "maçã fuji", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP4", description: "Feijão NÃO deve bloquear por lactose", ingredient: "feijão preto", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP5", description: "Banana NÃO deve bloquear por lactose", ingredient: "banana prata", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP6", description: "Alface NÃO deve bloquear por lactose", ingredient: "alface americana", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP7", description: "Leite de coco NÃO deve bloquear", ingredient: "leite de coco", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  { name: "LACTOSE-FP8", description: "Leite de amêndoas NÃO deve bloquear", ingredient: "leite de amendoas", intoleranceKey: "lactose", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 2: GLÚTEN (Intolerância)
  // =============================================
  
  // TRUE POSITIVES
  { name: "GLUTEN-TP1", description: "Pão de trigo deve bloquear", ingredient: "pao de trigo", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  { name: "GLUTEN-TP2", description: "Macarrão deve bloquear", ingredient: "macarrao espaguete", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  { name: "GLUTEN-TP3", description: "Farinha de trigo deve bloquear", ingredient: "farinha de trigo", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  { name: "GLUTEN-TP4", description: "Cerveja deve bloquear", ingredient: "cerveja pilsen", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  { name: "GLUTEN-TP5", description: "Cevada deve bloquear", ingredient: "cevada em grãos", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  { name: "GLUTEN-TP6", description: "Centeio deve bloquear", ingredient: "pao de centeio", intoleranceKey: "gluten", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "GLUTEN-FP1", description: "Arroz NÃO deve bloquear por glúten", ingredient: "arroz integral", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  { name: "GLUTEN-FP2", description: "Milho NÃO deve bloquear por glúten", ingredient: "milho verde", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  { name: "GLUTEN-FP3", description: "Quinoa NÃO deve bloquear por glúten", ingredient: "quinoa cozida", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  { name: "GLUTEN-FP4", description: "Batata NÃO deve bloquear por glúten", ingredient: "batata cozida", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  { name: "GLUTEN-FP5", description: "Mandioca NÃO deve bloquear por glúten", ingredient: "mandioca", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  { name: "GLUTEN-FP6", description: "Tapioca NÃO deve bloquear por glúten", ingredient: "tapioca", intoleranceKey: "gluten", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 3: FRUTOSE (Intolerância)
  // =============================================
  
  // TRUE POSITIVES
  { name: "FRUTOSE-TP1", description: "Mel deve bloquear", ingredient: "mel puro", intoleranceKey: "frutose", expectedResult: "block", category: "true_positive" },
  { name: "FRUTOSE-TP2", description: "Xarope de milho deve bloquear", ingredient: "xarope de milho", intoleranceKey: "frutose", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "FRUTOSE-FP1", description: "Frango NÃO deve bloquear por frutose", ingredient: "frango grelhado", intoleranceKey: "frutose", expectedResult: "allow", category: "false_positive" },
  { name: "FRUTOSE-FP2", description: "Arroz NÃO deve bloquear por frutose", ingredient: "arroz branco", intoleranceKey: "frutose", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 4: SORBITOL (Intolerância)
  // =============================================
  
  // TRUE POSITIVES (frutas com pedra)
  { name: "SORBITOL-TP1", description: "Ameixa deve bloquear", ingredient: "ameixa seca", intoleranceKey: "sorbitol", expectedResult: "block", category: "true_positive" },
  { name: "SORBITOL-TP2", description: "Pêssego deve bloquear", ingredient: "pessego maduro", intoleranceKey: "sorbitol", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "SORBITOL-FP1", description: "Arroz NÃO deve bloquear por sorbitol", ingredient: "arroz com legumes", intoleranceKey: "sorbitol", expectedResult: "allow", category: "false_positive" },
  { name: "SORBITOL-FP2", description: "Frango NÃO deve bloquear por sorbitol", ingredient: "frango assado", intoleranceKey: "sorbitol", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 5: FODMAP (Intolerância)
  // =============================================
  
  // TRUE POSITIVES
  { name: "FODMAP-TP1", description: "Cebola deve bloquear", ingredient: "cebola refogada", intoleranceKey: "fodmap", expectedResult: "block", category: "true_positive" },
  { name: "FODMAP-TP2", description: "Alho deve bloquear", ingredient: "alho frito", intoleranceKey: "fodmap", expectedResult: "block", category: "true_positive" },
  { name: "FODMAP-TP3", description: "Alho-poró deve bloquear", ingredient: "alho-poro", intoleranceKey: "fodmap", expectedResult: "block", category: "true_positive" },
  { name: "FODMAP-TP4", description: "Trigo deve bloquear", ingredient: "farinha de trigo", intoleranceKey: "fodmap", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "FODMAP-FP1", description: "Arroz NÃO deve bloquear por FODMAP", ingredient: "arroz branco", intoleranceKey: "fodmap", expectedResult: "allow", category: "false_positive" },
  { name: "FODMAP-FP2", description: "Galho de alecrim NÃO deve matchear 'alho'", ingredient: "galho de alecrim", intoleranceKey: "fodmap", expectedResult: "allow", category: "false_positive" },
  { name: "FODMAP-FP3", description: "Cenoura NÃO deve bloquear por FODMAP", ingredient: "cenoura crua", intoleranceKey: "fodmap", expectedResult: "allow", category: "false_positive" },
  { name: "FODMAP-FP4", description: "Espinafre NÃO deve bloquear por FODMAP", ingredient: "espinafre cozido", intoleranceKey: "fodmap", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 6: AMENDOIM (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "PEANUT-TP1", description: "Pasta de amendoim deve bloquear", ingredient: "pasta de amendoim", intoleranceKey: "amendoim", expectedResult: "block", category: "true_positive" },
  { name: "PEANUT-TP2", description: "Amendoim torrado deve bloquear", ingredient: "amendoim torrado", intoleranceKey: "amendoim", expectedResult: "block", category: "true_positive" },
  { name: "PEANUT-TP3-EN", description: "Peanut butter (EN) deve bloquear", ingredient: "peanut butter", intoleranceKey: "peanut", expectedResult: "block", category: "true_positive", language: "en" },
  
  // FALSE POSITIVES
  { name: "PEANUT-FP1", description: "Ameixa NÃO deve matchear amendoim", ingredient: "ameixa seca", intoleranceKey: "amendoim", expectedResult: "allow", category: "false_positive" },
  { name: "PEANUT-FP2", description: "Amora NÃO deve matchear amendoim", ingredient: "amora silvestre", intoleranceKey: "amendoim", expectedResult: "allow", category: "false_positive" },
  { name: "PEANUT-FP3", description: "Amêndoas NÃO são amendoim", ingredient: "leite de amendoas", intoleranceKey: "amendoim", expectedResult: "allow", category: "false_positive" },
  { name: "PEANUT-FP4", description: "Castanha NÃO é amendoim", ingredient: "castanha de caju", intoleranceKey: "amendoim", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 7: OLEAGINOSAS/CASTANHAS (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "NUTS-TP1", description: "Castanha de caju deve bloquear", ingredient: "castanha de caju", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  { name: "NUTS-TP2", description: "Nozes deve bloquear", ingredient: "nozes picadas", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  { name: "NUTS-TP3", description: "Amêndoas deve bloquear", ingredient: "amendoas torradas", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  { name: "NUTS-TP4", description: "Macadâmia deve bloquear", ingredient: "nozes de macadamia", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  { name: "NUTS-TP5", description: "Pistache deve bloquear", ingredient: "pistache", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  { name: "NUTS-TP6", description: "Avelã deve bloquear", ingredient: "avela", intoleranceKey: "castanhas", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "NUTS-FP1", description: "Casca de limão NÃO matcheia castanha", ingredient: "casca de limao", intoleranceKey: "castanhas", expectedResult: "allow", category: "false_positive" },
  { name: "NUTS-FP2", description: "Arroz NÃO matcheia noz", ingredient: "arroz com legumes", intoleranceKey: "castanhas", expectedResult: "allow", category: "false_positive" },
  { name: "NUTS-FP3", description: "Coco NÃO é oleaginosa", ingredient: "coco ralado", intoleranceKey: "castanhas", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 8: FRUTOS DO MAR (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "SEAFOOD-TP1", description: "Camarão deve bloquear", ingredient: "camarao ao alho", intoleranceKey: "frutos_do_mar", expectedResult: "block", category: "true_positive" },
  { name: "SEAFOOD-TP2", description: "Lagosta deve bloquear", ingredient: "lagosta grelhada", intoleranceKey: "frutos_do_mar", expectedResult: "block", category: "true_positive" },
  { name: "SEAFOOD-TP3", description: "Caranguejo deve bloquear", ingredient: "caranguejo", intoleranceKey: "frutos_do_mar", expectedResult: "block", category: "true_positive" },
  { name: "SEAFOOD-TP4", description: "Lula deve bloquear", ingredient: "lula grelhada", intoleranceKey: "frutos_do_mar", expectedResult: "block", category: "true_positive" },
  { name: "SEAFOOD-TP5", description: "Polvo deve bloquear", ingredient: "polvo a galega", intoleranceKey: "frutos_do_mar", expectedResult: "block", category: "true_positive" },
  { name: "SEAFOOD-TP6-EN", description: "Shrimp (EN) deve bloquear", ingredient: "shrimp cocktail", intoleranceKey: "seafood", expectedResult: "block", category: "true_positive", language: "en" },
  
  // FALSE POSITIVES
  { name: "SEAFOOD-FP1", description: "Frango NÃO é fruto do mar", ingredient: "frango grelhado", intoleranceKey: "frutos_do_mar", expectedResult: "allow", category: "false_positive" },
  { name: "SEAFOOD-FP2", description: "Câmara NÃO matcheia camarão", ingredient: "maca da camara", intoleranceKey: "frutos_do_mar", expectedResult: "allow", category: "false_positive" },
  { name: "SEAFOOD-FP3", description: "Carne bovina NÃO é fruto do mar", ingredient: "bife de alcatra", intoleranceKey: "frutos_do_mar", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 9: PEIXE (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "FISH-TP1", description: "Salmão deve bloquear", ingredient: "salmao grelhado", intoleranceKey: "peixe", expectedResult: "block", category: "true_positive" },
  { name: "FISH-TP2", description: "Atum deve bloquear", ingredient: "atum em lata", intoleranceKey: "peixe", expectedResult: "block", category: "true_positive" },
  { name: "FISH-TP3", description: "Bacalhau deve bloquear", ingredient: "bacalhau", intoleranceKey: "peixe", expectedResult: "block", category: "true_positive" },
  { name: "FISH-TP4", description: "Tilápia deve bloquear", ingredient: "tilapia assada", intoleranceKey: "peixe", expectedResult: "block", category: "true_positive" },
  { name: "FISH-TP5-EN", description: "Salmon (EN) deve bloquear", ingredient: "grilled salmon", intoleranceKey: "fish", expectedResult: "block", category: "true_positive", language: "en" },
  
  // FALSE POSITIVES
  { name: "FISH-FP1", description: "Frango NÃO é peixe", ingredient: "frango assado", intoleranceKey: "peixe", expectedResult: "allow", category: "false_positive" },
  { name: "FISH-FP2", description: "Carne NÃO é peixe", ingredient: "carne moida", intoleranceKey: "peixe", expectedResult: "allow", category: "false_positive" },
  { name: "FISH-FP3", description: "Dish (EN) NÃO matcheia fish", ingredient: "main dish salad", intoleranceKey: "fish", expectedResult: "allow", category: "false_positive", language: "en" },
  
  // =============================================
  // CATEGORIA 10: OVOS (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "EGG-TP1", description: "Ovo cozido deve bloquear", ingredient: "ovo cozido", intoleranceKey: "ovos", expectedResult: "block", category: "true_positive" },
  { name: "EGG-TP2", description: "Ovos mexidos deve bloquear", ingredient: "ovos mexidos", intoleranceKey: "ovos", expectedResult: "block", category: "true_positive" },
  { name: "EGG-TP3", description: "Omelete deve bloquear", ingredient: "omelete de queijo", intoleranceKey: "ovos", expectedResult: "block", category: "true_positive" },
  { name: "EGG-TP4", description: "Gema deve bloquear", ingredient: "gema de ovo", intoleranceKey: "ovos", expectedResult: "block", category: "true_positive" },
  { name: "EGG-TP5", description: "Clara de ovo deve bloquear", ingredient: "clara de ovo", intoleranceKey: "ovos", expectedResult: "block", category: "true_positive" },
  { name: "EGG-TP6-EN", description: "Eggs (EN) deve bloquear", ingredient: "scrambled eggs", intoleranceKey: "eggs", expectedResult: "block", category: "true_positive", language: "en" },
  
  // FALSE POSITIVES
  { name: "EGG-FP1", description: "Novo NÃO matcheia ovo", ingredient: "novo prato de arroz", intoleranceKey: "ovos", expectedResult: "allow", category: "false_positive" },
  { name: "EGG-FP2", description: "Couve NÃO matcheia ovo", ingredient: "couve refogada", intoleranceKey: "ovos", expectedResult: "allow", category: "false_positive" },
  { name: "EGG-FP3", description: "Feijão NÃO é ovo", ingredient: "feijao preto", intoleranceKey: "ovos", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 11: SOJA (Alergia)
  // =============================================
  
  // TRUE POSITIVES
  { name: "SOY-TP1", description: "Tofu deve bloquear", ingredient: "tofu grelhado", intoleranceKey: "soja", expectedResult: "block", category: "true_positive" },
  { name: "SOY-TP2", description: "Molho de soja deve bloquear", ingredient: "molho de soja", intoleranceKey: "soja", expectedResult: "block", category: "true_positive" },
  { name: "SOY-TP3", description: "Edamame deve bloquear", ingredient: "edamame", intoleranceKey: "soja", expectedResult: "block", category: "true_positive" },
  { name: "SOY-TP4", description: "Leite de soja deve bloquear", ingredient: "leite de soja", intoleranceKey: "soja", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "SOY-FP1", description: "Frango NÃO é soja", ingredient: "frango assado", intoleranceKey: "soja", expectedResult: "allow", category: "false_positive" },
  { name: "SOY-FP2", description: "Arroz NÃO é soja", ingredient: "arroz branco", intoleranceKey: "soja", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 12: AÇÚCAR (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "SUGAR-TP1", description: "Açúcar refinado deve bloquear", ingredient: "acucar refinado", intoleranceKey: "acucar", expectedResult: "block", category: "true_positive" },
  { name: "SUGAR-TP2", description: "Mel deve bloquear", ingredient: "mel puro", intoleranceKey: "acucar", expectedResult: "block", category: "true_positive" },
  { name: "SUGAR-TP3", description: "Xarope de açúcar deve bloquear", ingredient: "xarope de acucar", intoleranceKey: "acucar", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "SUGAR-FP1", description: "Maçã NÃO matcheia açúcar", ingredient: "maca gala", intoleranceKey: "acucar", expectedResult: "allow", category: "false_positive" },
  { name: "SUGAR-FP2", description: "Melancia NÃO matcheia mel", ingredient: "melancia fresca", intoleranceKey: "acucar", expectedResult: "allow", category: "false_positive" },
  { name: "SUGAR-FP3", description: "Frango NÃO é açúcar", ingredient: "frango grelhado", intoleranceKey: "acucar", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 13: HISTAMINA (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "HISTAMINE-TP1", description: "Queijo curado deve bloquear", ingredient: "queijo curado", intoleranceKey: "histamina", expectedResult: "block", category: "true_positive" },
  { name: "HISTAMINE-TP2", description: "Vinho deve bloquear", ingredient: "molho de vinho", intoleranceKey: "histamina", expectedResult: "block", category: "true_positive" },
  { name: "HISTAMINE-TP3", description: "Vinagre deve bloquear", ingredient: "vinagre balsamico", intoleranceKey: "histamina", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "HISTAMINE-FP1", description: "Arroz NÃO tem histamina", ingredient: "arroz branco", intoleranceKey: "histamina", expectedResult: "allow", category: "false_positive" },
  { name: "HISTAMINE-FP2", description: "Vizinho NÃO matcheia vinho", ingredient: "frango vizinho", intoleranceKey: "histamina", expectedResult: "allow", category: "false_positive" },
  { name: "HISTAMINE-FP3", description: "Frango fresco NÃO tem histamina", ingredient: "frango fresco", intoleranceKey: "histamina", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 14: CAFEÍNA (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "CAFFEINE-TP1", description: "Café deve bloquear", ingredient: "cafe expresso", intoleranceKey: "cafeina", expectedResult: "block", category: "true_positive" },
  { name: "CAFFEINE-TP2", description: "Chá preto deve bloquear", ingredient: "cha preto", intoleranceKey: "cafeina", expectedResult: "block", category: "true_positive" },
  { name: "CAFFEINE-TP3", description: "Chocolate deve bloquear", ingredient: "chocolate amargo", intoleranceKey: "cafeina", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "CAFFEINE-FP1", description: "Maçã caramelizada NÃO matcheia café", ingredient: "maca caramelizada", intoleranceKey: "cafeina", expectedResult: "allow", category: "false_positive" },
  { name: "CAFFEINE-FP2", description: "Frango NÃO tem cafeína", ingredient: "frango grelhado", intoleranceKey: "cafeina", expectedResult: "allow", category: "false_positive" },
  { name: "CAFFEINE-FP3-EN", description: "Meat NÃO matcheia tea", ingredient: "meat with vegetables", intoleranceKey: "cafeina", expectedResult: "allow", category: "false_positive", language: "en" },
  
  // =============================================
  // CATEGORIA 15: SULFITO (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "SULFITE-TP1", description: "Vinho tinto deve bloquear", ingredient: "vinho tinto", intoleranceKey: "sulfito", expectedResult: "block", category: "true_positive" },
  { name: "SULFITE-TP2", description: "Frutas secas deve bloquear", ingredient: "damasco seco", intoleranceKey: "sulfito", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "SULFITE-FP1", description: "Alface NÃO tem sulfito", ingredient: "salada de alface", intoleranceKey: "sulfito", expectedResult: "allow", category: "false_positive" },
  { name: "SULFITE-FP2", description: "Frango NÃO tem sulfito", ingredient: "frango assado", intoleranceKey: "sulfito", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 16: SALICILATO (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "SALICYLATE-TP1", description: "Tomate deve bloquear", ingredient: "tomate fresco", intoleranceKey: "salicilato", expectedResult: "block", category: "true_positive" },
  { name: "SALICYLATE-TP2", description: "Pimentão deve bloquear", ingredient: "pimentao vermelho", intoleranceKey: "salicilato", expectedResult: "block", category: "true_positive" },
  { name: "SALICYLATE-TP3", description: "Pepino deve bloquear", ingredient: "pepino", intoleranceKey: "salicilato", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "SALICYLATE-FP1", description: "Frango NÃO tem salicilato", ingredient: "frango assado", intoleranceKey: "salicilato", expectedResult: "allow", category: "false_positive" },
  { name: "SALICYLATE-FP2", description: "Arroz NÃO tem salicilato", ingredient: "arroz branco", intoleranceKey: "salicilato", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // CATEGORIA 17: MILHO (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "CORN-TP1", description: "Milho deve bloquear", ingredient: "milho cozido", intoleranceKey: "milho", expectedResult: "block", category: "true_positive" },
  { name: "CORN-TP2", description: "Fubá deve bloquear", ingredient: "polenta de fuba", intoleranceKey: "milho", expectedResult: "block", category: "true_positive" },
  { name: "CORN-TP3", description: "Amido de milho deve bloquear", ingredient: "amido de milho", intoleranceKey: "milho", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "CORN-FP1", description: "Frango NÃO é milho", ingredient: "frango com legumes", intoleranceKey: "milho", expectedResult: "allow", category: "false_positive" },
  { name: "CORN-FP2-EN", description: "Corner NÃO matcheia corn", ingredient: "corner salad", intoleranceKey: "milho", expectedResult: "allow", category: "false_positive", language: "en" },
  
  // =============================================
  // CATEGORIA 18: NÍQUEL (Sensibilidade)
  // =============================================
  
  // TRUE POSITIVES
  { name: "NICKEL-TP1", description: "Chocolate deve bloquear", ingredient: "chocolate amargo", intoleranceKey: "niquel", expectedResult: "block", category: "true_positive" },
  { name: "NICKEL-TP2", description: "Aveia deve bloquear", ingredient: "aveia em flocos", intoleranceKey: "niquel", expectedResult: "block", category: "true_positive" },
  { name: "NICKEL-TP3", description: "Feijão deve bloquear", ingredient: "feijao preto", intoleranceKey: "niquel", expectedResult: "block", category: "true_positive" },
  
  // FALSE POSITIVES
  { name: "NICKEL-FP1", description: "Frango NÃO tem níquel alto", ingredient: "frango grelhado simples", intoleranceKey: "niquel", expectedResult: "allow", category: "false_positive" },
  { name: "NICKEL-FP2", description: "Arroz branco NÃO tem níquel alto", ingredient: "arroz branco puro", intoleranceKey: "niquel", expectedResult: "allow", category: "false_positive" },
  
  // =============================================
  // EDGE CASES - Casos de borda críticos
  // =============================================
  
  // O problema original: arroz com lactose
  { name: "EDGE-1", description: "Arroz branco NUNCA deve bloquear por lactose", ingredient: "arroz branco cozido", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-2", description: "Arroz doce (receita) PODE bloquear por lactose", ingredient: "arroz doce", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case" }, // Nota: arroz doce é receita, não ingrediente
  
  // Substring matching crítico
  { name: "EDGE-3", description: "Maçã NUNCA deve bloquear", ingredient: "maca fuji", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-4", description: "Maçã NUNCA deve bloquear", ingredient: "maca", intoleranceKey: "gluten", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-5", description: "Maçã NUNCA deve bloquear", ingredient: "maca verde", intoleranceKey: "ovos", expectedResult: "allow", category: "edge_case" },
  
  // Alho vs Galho
  { name: "EDGE-6", description: "Galho de alecrim NÃO deve matchear alho", ingredient: "galho de alecrim fresco", intoleranceKey: "fodmap", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-7", description: "Alho DEVE bloquear por FODMAP", ingredient: "alho picado", intoleranceKey: "fodmap", expectedResult: "block", category: "edge_case" },
  
  // Leites vegetais
  { name: "EDGE-8", description: "Leite de coco NÃO tem lactose", ingredient: "leite de coco", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-9", description: "Leite de aveia NÃO tem lactose", ingredient: "leite de aveia", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case" },
  { name: "EDGE-10", description: "Leite integral TEM lactose", ingredient: "leite integral", intoleranceKey: "lactose", expectedResult: "block", category: "edge_case" },
  
  // Multilingual
  { name: "EDGE-11-EN", description: "Apple NÃO deve bloquear", ingredient: "apple", intoleranceKey: "lactose", expectedResult: "allow", category: "edge_case", language: "en" },
  { name: "EDGE-12-ES", description: "Manzana NÃO deve bloquear", ingredient: "manzana", intoleranceKey: "gluten", expectedResult: "allow", category: "edge_case", language: "es" },
  { name: "EDGE-13-FR", description: "Pomme NÃO deve bloquear", ingredient: "pomme", intoleranceKey: "ovos", expectedResult: "allow", category: "edge_case", language: "fr" },
  
  // Testes com múltiplas intolerâncias combinadas (serão testados separadamente)
  { name: "EDGE-14", description: "Pão de queijo - deve bloquear por lactose", ingredient: "pao de queijo", intoleranceKey: "lactose", expectedResult: "block", category: "edge_case" },
  { name: "EDGE-15", description: "Ovo de codorna - deve bloquear por ovos", ingredient: "ovo de codorna", intoleranceKey: "ovos", expectedResult: "block", category: "edge_case" },
];

// ============================================
// TESTE DO containsWholeWord (função crítica)
// ============================================
interface WholeWordTestCase {
  text: string;
  word: string;
  expected: boolean;
  description: string;
}

const WHOLE_WORD_TESTS: WholeWordTestCase[] = [
  // Casos que DEVEM dar match
  { text: "arroz branco", word: "arroz", expected: true, description: "Início da string" },
  { text: "frango com arroz", word: "arroz", expected: true, description: "Fim da string" },
  { text: "feijão e arroz e salada", word: "arroz", expected: true, description: "Meio da string" },
  { text: "leite integral", word: "leite", expected: true, description: "Palavra única" },
  { text: "leite", word: "leite", expected: true, description: "Match exato" },
  
  // Casos que NÃO devem dar match (substring)
  { text: "galho de alecrim", word: "alho", expected: false, description: "Substring em galho" },
  { text: "arroz doce caseiro", word: "arroz doce", expected: true, description: "Termo composto no início" },
  { text: "arroz branco cozido", word: "arroz doce", expected: false, description: "Arroz sem doce" },
  { text: "novo prato", word: "ovo", expected: false, description: "Substring em novo" },
  { text: "couve refogada", word: "ovo", expected: false, description: "Substring em couve" },
  { text: "macaron de chocolate", word: "maca", expected: false, description: "Substring em macaron" },
  { text: "melancia fresca", word: "mel", expected: false, description: "Substring em melancia" },
  
  // Delimitadores especiais
  { text: "arroz/feijão", word: "arroz", expected: true, description: "Delimitador /" },
  { text: "arroz-doce", word: "arroz", expected: true, description: "Delimitador -" },
  { text: "arroz, feijão", word: "arroz", expected: true, description: "Delimitador ," },
  { text: "(arroz)", word: "arroz", expected: true, description: "Delimitador ()" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[FALSE-POSITIVE-TEST] Iniciando testes robustos...`);
    
    // Carregar database de segurança
    const safetyDb = await loadSafetyDatabase();
    const dbStats = getDatabaseStats(safetyDb);
    console.log(`[FALSE-POSITIVE-TEST] Database stats: ${dbStats}`);
    
    // ============================================
    // PARTE 1: Teste do containsWholeWord
    // ============================================
    const wholeWordResults: {
      passed: number;
      failed: number;
      tests: { description: string; text: string; word: string; expected: boolean; actual: boolean; passed: boolean }[];
    } = {
      passed: 0,
      failed: 0,
      tests: [],
    };
    
    for (const test of WHOLE_WORD_TESTS) {
      const actual = containsWholeWord(test.text, test.word);
      const passed = actual === test.expected;
      
      if (passed) {
        wholeWordResults.passed++;
      } else {
        wholeWordResults.failed++;
        console.log(`[WHOLE-WORD] ❌ FAILED: ${test.description}`);
        console.log(`  Text: "${test.text}", Word: "${test.word}"`);
        console.log(`  Expected: ${test.expected}, Actual: ${actual}`);
      }
      
      wholeWordResults.tests.push({
        description: test.description,
        text: test.text,
        word: test.word,
        expected: test.expected,
        actual,
        passed,
      });
    }
    
    // ============================================
    // PARTE 2: Teste de todas as 18 categorias
    // ============================================
    const categoryResults: {
      passed: number;
      failed: number;
      byCategory: Record<string, { passed: number; failed: number; tests: any[] }>;
      byIntolerance: Record<string, { passed: number; failed: number }>;
      tests: any[];
    } = {
      passed: 0,
      failed: 0,
      byCategory: {
        true_positive: { passed: 0, failed: 0, tests: [] },
        true_negative: { passed: 0, failed: 0, tests: [] },
        false_positive: { passed: 0, failed: 0, tests: [] },
        false_negative: { passed: 0, failed: 0, tests: [] },
        edge_case: { passed: 0, failed: 0, tests: [] },
      },
      byIntolerance: {},
      tests: [],
    };
    
    for (const test of TEST_CASES) {
      // Normalizar a intolerância
      const normalizedIntolerances = normalizeUserIntolerances([test.intoleranceKey], safetyDb);
      
      // Validar ingrediente
      const result = await validateIngredientList(
        [test.ingredient],
        {
          intolerances: normalizedIntolerances,
          dietaryPreference: null,
          excludedIngredients: [],
        },
        safetyDb
      );
      
      // Determinar resultado
      const actualBlocked = !result.isSafe && result.conflicts.length > 0;
      const actualWarning = result.warnings && result.warnings.length > 0;
      
      let passed = false;
      let actualResult = 'allow';
      
      if (actualBlocked) {
        actualResult = 'block';
        passed = test.expectedResult === 'block';
      } else if (actualWarning) {
        actualResult = 'warning';
        passed = test.expectedResult === 'warning' || test.expectedResult === 'allow';
      } else {
        actualResult = 'allow';
        passed = test.expectedResult === 'allow';
      }
      
      // Registrar resultado
      if (passed) {
        categoryResults.passed++;
        categoryResults.byCategory[test.category].passed++;
      } else {
        categoryResults.failed++;
        categoryResults.byCategory[test.category].failed++;
        console.log(`[CATEGORY-TEST] ❌ FAILED: ${test.name}`);
        console.log(`  Description: ${test.description}`);
        console.log(`  Ingredient: "${test.ingredient}"`);
        console.log(`  Intolerance: ${test.intoleranceKey} -> ${normalizedIntolerances.join(', ')}`);
        console.log(`  Expected: ${test.expectedResult}, Actual: ${actualResult}`);
        if (result.conflicts.length > 0) {
          console.log(`  Conflicts: ${JSON.stringify(result.conflicts)}`);
        }
      }
      
      // Track by intolerance
      if (!categoryResults.byIntolerance[test.intoleranceKey]) {
        categoryResults.byIntolerance[test.intoleranceKey] = { passed: 0, failed: 0 };
      }
      if (passed) {
        categoryResults.byIntolerance[test.intoleranceKey].passed++;
      } else {
        categoryResults.byIntolerance[test.intoleranceKey].failed++;
      }
      
      const testResult = {
        name: test.name,
        description: test.description,
        ingredient: test.ingredient,
        intoleranceKey: test.intoleranceKey,
        normalizedKey: normalizedIntolerances.join(', '),
        expected: test.expectedResult,
        actual: actualResult,
        passed,
        category: test.category,
        language: test.language || 'pt',
        conflicts: result.conflicts,
        warnings: result.warnings || [],
      };
      
      categoryResults.tests.push(testResult);
      categoryResults.byCategory[test.category].tests.push(testResult);
    }
    
    // ============================================
    // SUMÁRIO FINAL
    // ============================================
    const summary = {
      wholeWordFunction: {
        total: WHOLE_WORD_TESTS.length,
        passed: wholeWordResults.passed,
        failed: wholeWordResults.failed,
        passRate: `${((wholeWordResults.passed / WHOLE_WORD_TESTS.length) * 100).toFixed(1)}%`,
        status: wholeWordResults.failed === 0 ? '✅ ALL PASSED' : `❌ ${wholeWordResults.failed} FAILED`,
      },
      categoryTests: {
        total: TEST_CASES.length,
        passed: categoryResults.passed,
        failed: categoryResults.failed,
        passRate: `${((categoryResults.passed / TEST_CASES.length) * 100).toFixed(1)}%`,
        status: categoryResults.failed === 0 ? '✅ ALL PASSED' : `❌ ${categoryResults.failed} FAILED`,
      },
      byCategory: {
        true_positive: categoryResults.byCategory.true_positive,
        false_positive: categoryResults.byCategory.false_positive,
        edge_case: categoryResults.byCategory.edge_case,
      },
      byIntolerance: categoryResults.byIntolerance,
      overallStatus: (wholeWordResults.failed === 0 && categoryResults.failed === 0) 
        ? '✅ ALL TESTS PASSED - NO FALSE POSITIVES DETECTED' 
        : `❌ TESTS FAILED - REVIEW REQUIRED`,
    };
    
    // Filtrar apenas testes que falharam para destaque
    const failedTests = categoryResults.tests.filter(t => !t.passed);
    const failedWholeWordTests = wholeWordResults.tests.filter(t => !t.passed);
    
    console.log(`[FALSE-POSITIVE-TEST] ===============================`);
    console.log(`[FALSE-POSITIVE-TEST] RESUMO FINAL:`);
    console.log(`[FALSE-POSITIVE-TEST] containsWholeWord: ${summary.wholeWordFunction.status}`);
    console.log(`[FALSE-POSITIVE-TEST] Category Tests: ${summary.categoryTests.status}`);
    console.log(`[FALSE-POSITIVE-TEST] Overall: ${summary.overallStatus}`);
    console.log(`[FALSE-POSITIVE-TEST] ===============================`);
    
    return new Response(JSON.stringify({
      summary,
      failedTests: {
        wholeWord: failedWholeWordTests,
        categories: failedTests,
      },
      allTests: {
        wholeWord: wholeWordResults.tests,
        categories: categoryResults.tests,
      },
      metadata: {
        totalTests: WHOLE_WORD_TESTS.length + TEST_CASES.length,
        categoriesTested: 18,
        languagesTested: ['pt', 'en', 'es', 'fr'],
        databaseStats: dbStats,
        testTypes: ['true_positive', 'false_positive', 'edge_case'],
      },
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[FALSE-POSITIVE-TEST] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

