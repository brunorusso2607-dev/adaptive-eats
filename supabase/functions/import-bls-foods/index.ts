import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, data?: any) {
  console.log(`[${new Date().toISOString()}] [BLS] ${step}`, data ? JSON.stringify(data) : '');
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'Fleisch': 'Carnes',
    'Fisch': 'Peixes e Frutos do Mar',
    'Milch': 'Laticínios',
    'Eier': 'Ovos',
    'Gemüse': 'Vegetais',
    'Obst': 'Frutas',
    'Getreide': 'Cereais e Grãos',
    'Brot': 'Pães e Padaria',
    'Kuchen': 'Bolos e Doces',
    'Zucker': 'Açúcares',
    'Fett': 'Óleos e Gorduras',
    'Getränke': 'Bebidas',
    'Nüsse': 'Oleaginosas',
    'Hülsenfrüchte': 'Leguminosas',
    'Kartoffeln': 'Tubérculos',
    'Wurst': 'Embutidos',
    'Käse': 'Queijos',
  };
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return 'Outros';
}

// Curated dataset based on BLS 3.02 German Food Composition Database
// Source: https://www.blsdb.de/
const BLS_FOODS_DATA = [
  // Fleisch (Carnes)
  { name: 'Rindfleisch, mager', category: 'Fleisch', calories: 121, protein: 21.0, carbs: 0, fat: 4.0, fiber: 0 },
  { name: 'Schweinefleisch, mager', category: 'Fleisch', calories: 143, protein: 21.5, carbs: 0, fat: 6.5, fiber: 0 },
  { name: 'Hähnchenbrust, ohne Haut', category: 'Fleisch', calories: 110, protein: 23.1, carbs: 0, fat: 1.2, fiber: 0 },
  { name: 'Putenbrust, ohne Haut', category: 'Fleisch', calories: 107, protein: 24.0, carbs: 0, fat: 1.0, fiber: 0 },
  { name: 'Lammfleisch, mager', category: 'Fleisch', calories: 162, protein: 20.0, carbs: 0, fat: 9.0, fiber: 0 },
  { name: 'Kalbfleisch', category: 'Fleisch', calories: 98, protein: 20.0, carbs: 0, fat: 2.0, fiber: 0 },
  { name: 'Entenbrust', category: 'Fleisch', calories: 132, protein: 19.5, carbs: 0, fat: 6.0, fiber: 0 },
  { name: 'Kaninchenfleisch', category: 'Fleisch', calories: 136, protein: 21.0, carbs: 0, fat: 5.5, fiber: 0 },
  { name: 'Hirschfleisch', category: 'Fleisch', calories: 120, protein: 22.0, carbs: 0, fat: 3.0, fiber: 0 },
  { name: 'Wildschwein', category: 'Fleisch', calories: 122, protein: 21.5, carbs: 0, fat: 4.0, fiber: 0 },
  
  // Wurst (Embutidos)
  { name: 'Bratwurst', category: 'Wurst', calories: 274, protein: 12.0, carbs: 1.5, fat: 24.0, fiber: 0 },
  { name: 'Frankfurter Würstchen', category: 'Wurst', calories: 250, protein: 12.5, carbs: 1.0, fat: 22.0, fiber: 0 },
  { name: 'Leberwurst', category: 'Wurst', calories: 326, protein: 14.0, carbs: 2.0, fat: 29.0, fiber: 0 },
  { name: 'Salami', category: 'Wurst', calories: 397, protein: 19.0, carbs: 1.0, fat: 35.0, fiber: 0 },
  { name: 'Schinken, gekocht', category: 'Wurst', calories: 107, protein: 19.0, carbs: 1.0, fat: 3.5, fiber: 0 },
  { name: 'Bierschinken', category: 'Wurst', calories: 154, protein: 15.0, carbs: 2.0, fat: 9.5, fiber: 0 },
  { name: 'Weißwurst', category: 'Wurst', calories: 285, protein: 12.0, carbs: 0.5, fat: 26.0, fiber: 0 },
  { name: 'Currywurst', category: 'Wurst', calories: 218, protein: 11.5, carbs: 4.0, fat: 17.5, fiber: 0 },
  { name: 'Bockwurst', category: 'Wurst', calories: 275, protein: 11.0, carbs: 1.0, fat: 25.0, fiber: 0 },
  { name: 'Thüringer Rostbratwurst', category: 'Wurst', calories: 280, protein: 13.0, carbs: 1.0, fat: 25.0, fiber: 0 },
  { name: 'Nürnberger Bratwurst', category: 'Wurst', calories: 290, protein: 14.0, carbs: 1.5, fat: 25.5, fiber: 0 },
  { name: 'Blutwurst', category: 'Wurst', calories: 379, protein: 14.5, carbs: 1.0, fat: 35.0, fiber: 0 },
  { name: 'Mettwurst', category: 'Wurst', calories: 350, protein: 16.0, carbs: 1.0, fat: 31.0, fiber: 0 },
  { name: 'Teewurst', category: 'Wurst', calories: 385, protein: 13.0, carbs: 0.5, fat: 37.0, fiber: 0 },
  
  // Fisch (Peixes)
  { name: 'Lachs, frisch', category: 'Fisch', calories: 206, protein: 20.0, carbs: 0, fat: 13.5, fiber: 0 },
  { name: 'Forelle', category: 'Fisch', calories: 103, protein: 19.5, carbs: 0, fat: 2.7, fiber: 0 },
  { name: 'Kabeljau', category: 'Fisch', calories: 82, protein: 18.0, carbs: 0, fat: 0.7, fiber: 0 },
  { name: 'Hering', category: 'Fisch', calories: 217, protein: 17.8, carbs: 0, fat: 15.7, fiber: 0 },
  { name: 'Thunfisch, frisch', category: 'Fisch', calories: 144, protein: 23.3, carbs: 0, fat: 5.0, fiber: 0 },
  { name: 'Makrele', category: 'Fisch', calories: 205, protein: 18.6, carbs: 0, fat: 14.5, fiber: 0 },
  { name: 'Seelachs', category: 'Fisch', calories: 81, protein: 17.8, carbs: 0, fat: 0.9, fiber: 0 },
  { name: 'Scholle', category: 'Fisch', calories: 91, protein: 18.8, carbs: 0, fat: 1.7, fiber: 0 },
  { name: 'Garnelen', category: 'Fisch', calories: 99, protein: 20.3, carbs: 0.9, fat: 1.7, fiber: 0 },
  { name: 'Muscheln', category: 'Fisch', calories: 86, protein: 11.9, carbs: 3.7, fat: 2.2, fiber: 0 },
  { name: 'Matjeshering', category: 'Fisch', calories: 238, protein: 14.0, carbs: 0, fat: 20.0, fiber: 0 },
  { name: 'Räucherlachs', category: 'Fisch', calories: 170, protein: 22.0, carbs: 0, fat: 9.0, fiber: 0 },
  { name: 'Karpfen', category: 'Fisch', calories: 115, protein: 18.0, carbs: 0, fat: 4.5, fiber: 0 },
  { name: 'Zander', category: 'Fisch', calories: 84, protein: 19.0, carbs: 0, fat: 0.8, fiber: 0 },
  
  // Milch (Laticínios)
  { name: 'Vollmilch', category: 'Milch', calories: 64, protein: 3.3, carbs: 4.7, fat: 3.5, fiber: 0 },
  { name: 'Fettarme Milch', category: 'Milch', calories: 47, protein: 3.4, carbs: 4.9, fat: 1.5, fiber: 0 },
  { name: 'Joghurt, natur', category: 'Milch', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.2, fiber: 0 },
  { name: 'Quark, mager', category: 'Milch', calories: 67, protein: 12.0, carbs: 4.0, fat: 0.2, fiber: 0 },
  { name: 'Sahne, süß', category: 'Milch', calories: 292, protein: 2.4, carbs: 3.2, fat: 30.0, fiber: 0 },
  { name: 'Saure Sahne', category: 'Milch', calories: 115, protein: 2.9, carbs: 3.6, fat: 10.0, fiber: 0 },
  { name: 'Buttermilch', category: 'Milch', calories: 38, protein: 3.5, carbs: 4.0, fat: 0.5, fiber: 0 },
  { name: 'Kefir', category: 'Milch', calories: 56, protein: 3.3, carbs: 4.0, fat: 3.0, fiber: 0 },
  { name: 'Schmand', category: 'Milch', calories: 240, protein: 2.6, carbs: 3.5, fat: 24.0, fiber: 0 },
  { name: 'Crème fraîche', category: 'Milch', calories: 292, protein: 2.4, carbs: 2.5, fat: 30.0, fiber: 0 },
  
  // Käse (Queijos)
  { name: 'Gouda', category: 'Käse', calories: 356, protein: 24.9, carbs: 0.1, fat: 28.5, fiber: 0 },
  { name: 'Emmentaler', category: 'Käse', calories: 401, protein: 28.7, carbs: 0.1, fat: 31.5, fiber: 0 },
  { name: 'Camembert', category: 'Käse', calories: 297, protein: 20.5, carbs: 0.5, fat: 24.0, fiber: 0 },
  { name: 'Brie', category: 'Käse', calories: 334, protein: 20.7, carbs: 0.5, fat: 28.0, fiber: 0 },
  { name: 'Frischkäse', category: 'Käse', calories: 267, protein: 5.5, carbs: 3.0, fat: 26.0, fiber: 0 },
  { name: 'Mozzarella', category: 'Käse', calories: 280, protein: 22.0, carbs: 2.2, fat: 21.0, fiber: 0 },
  { name: 'Parmesan', category: 'Käse', calories: 431, protein: 35.6, carbs: 0.1, fat: 32.0, fiber: 0 },
  { name: 'Feta', category: 'Käse', calories: 264, protein: 14.2, carbs: 4.1, fat: 21.3, fiber: 0 },
  { name: 'Tilsiter', category: 'Käse', calories: 340, protein: 25.0, carbs: 0.5, fat: 26.0, fiber: 0 },
  { name: 'Limburger', category: 'Käse', calories: 327, protein: 20.0, carbs: 0.5, fat: 27.0, fiber: 0 },
  { name: 'Harzer Käse', category: 'Käse', calories: 126, protein: 30.0, carbs: 0.5, fat: 0.5, fiber: 0 },
  { name: 'Handkäse', category: 'Käse', calories: 130, protein: 28.0, carbs: 0.5, fat: 1.0, fiber: 0 },
  
  // Eier (Ovos)
  { name: 'Hühnerei, ganz', category: 'Eier', calories: 154, protein: 12.6, carbs: 0.7, fat: 11.2, fiber: 0 },
  { name: 'Eigelb', category: 'Eier', calories: 353, protein: 16.1, carbs: 0.3, fat: 31.9, fiber: 0 },
  { name: 'Eiweiß', category: 'Eier', calories: 47, protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: 'Wachtelei', category: 'Eier', calories: 158, protein: 13.1, carbs: 0.4, fat: 11.1, fiber: 0 },
  
  // Gemüse (Vegetais)
  { name: 'Kartoffeln, gekocht', category: 'Gemüse', calories: 73, protein: 2.0, carbs: 15.4, fat: 0.1, fiber: 1.4 },
  { name: 'Karotten', category: 'Gemüse', calories: 39, protein: 1.0, carbs: 8.7, fat: 0.2, fiber: 2.9 },
  { name: 'Brokkoli', category: 'Gemüse', calories: 35, protein: 3.3, carbs: 2.7, fat: 0.4, fiber: 3.0 },
  { name: 'Blumenkohl', category: 'Gemüse', calories: 28, protein: 2.5, carbs: 2.3, fat: 0.3, fiber: 2.9 },
  { name: 'Spinat', category: 'Gemüse', calories: 23, protein: 2.5, carbs: 1.6, fat: 0.4, fiber: 2.6 },
  { name: 'Tomaten', category: 'Gemüse', calories: 19, protein: 0.9, carbs: 3.5, fat: 0.2, fiber: 1.3 },
  { name: 'Gurken', category: 'Gemüse', calories: 14, protein: 0.6, carbs: 2.2, fat: 0.2, fiber: 0.9 },
  { name: 'Paprika, rot', category: 'Gemüse', calories: 37, protein: 1.0, carbs: 6.0, fat: 0.4, fiber: 3.6 },
  { name: 'Zucchini', category: 'Gemüse', calories: 19, protein: 1.6, carbs: 2.1, fat: 0.4, fiber: 1.1 },
  { name: 'Aubergine', category: 'Gemüse', calories: 24, protein: 1.0, carbs: 2.5, fat: 0.2, fiber: 3.4 },
  { name: 'Zwiebeln', category: 'Gemüse', calories: 28, protein: 1.3, carbs: 5.0, fat: 0.3, fiber: 1.4 },
  { name: 'Knoblauch', category: 'Gemüse', calories: 139, protein: 6.1, carbs: 28.4, fat: 0.1, fiber: 1.8 },
  { name: 'Rotkohl', category: 'Gemüse', calories: 27, protein: 1.5, carbs: 3.5, fat: 0.2, fiber: 2.5 },
  { name: 'Weißkohl', category: 'Gemüse', calories: 24, protein: 1.3, carbs: 4.2, fat: 0.2, fiber: 3.0 },
  { name: 'Sauerkraut', category: 'Gemüse', calories: 17, protein: 1.1, carbs: 1.8, fat: 0.2, fiber: 2.2 },
  { name: 'Spargel, weiß', category: 'Gemüse', calories: 18, protein: 1.9, carbs: 2.0, fat: 0.1, fiber: 1.4 },
  { name: 'Kohlrabi', category: 'Gemüse', calories: 27, protein: 1.7, carbs: 3.7, fat: 0.1, fiber: 1.5 },
  { name: 'Rote Beete', category: 'Gemüse', calories: 43, protein: 1.5, carbs: 8.4, fat: 0.1, fiber: 2.5 },
  { name: 'Sellerie', category: 'Gemüse', calories: 19, protein: 1.2, carbs: 2.3, fat: 0.2, fiber: 1.8 },
  { name: 'Lauch', category: 'Gemüse', calories: 31, protein: 2.2, carbs: 3.4, fat: 0.3, fiber: 2.3 },
  { name: 'Grünkohl', category: 'Gemüse', calories: 37, protein: 4.3, carbs: 2.5, fat: 0.9, fiber: 4.2 },
  { name: 'Rosenkohl', category: 'Gemüse', calories: 43, protein: 4.5, carbs: 3.5, fat: 0.5, fiber: 4.4 },
  { name: 'Wirsing', category: 'Gemüse', calories: 26, protein: 2.0, carbs: 3.3, fat: 0.3, fiber: 2.8 },
  
  // Obst (Frutas)
  { name: 'Äpfel', category: 'Obst', calories: 54, protein: 0.3, carbs: 11.4, fat: 0.4, fiber: 2.0 },
  { name: 'Birnen', category: 'Obst', calories: 52, protein: 0.5, carbs: 12.4, fat: 0.3, fiber: 2.8 },
  { name: 'Bananen', category: 'Obst', calories: 93, protein: 1.2, carbs: 20.0, fat: 0.2, fiber: 2.0 },
  { name: 'Orangen', category: 'Obst', calories: 42, protein: 1.0, carbs: 8.3, fat: 0.2, fiber: 2.0 },
  { name: 'Zitronen', category: 'Obst', calories: 35, protein: 0.8, carbs: 3.2, fat: 0.6, fiber: 1.3 },
  { name: 'Weintrauben', category: 'Obst', calories: 70, protein: 0.7, carbs: 15.6, fat: 0.3, fiber: 1.5 },
  { name: 'Erdbeeren', category: 'Obst', calories: 32, protein: 0.8, carbs: 5.5, fat: 0.4, fiber: 1.6 },
  { name: 'Himbeeren', category: 'Obst', calories: 34, protein: 1.3, carbs: 4.8, fat: 0.3, fiber: 4.7 },
  { name: 'Heidelbeeren', category: 'Obst', calories: 36, protein: 0.6, carbs: 6.0, fat: 0.6, fiber: 4.9 },
  { name: 'Kirschen', category: 'Obst', calories: 57, protein: 0.9, carbs: 12.3, fat: 0.3, fiber: 1.3 },
  { name: 'Pfirsiche', category: 'Obst', calories: 41, protein: 0.8, carbs: 8.9, fat: 0.1, fiber: 1.9 },
  { name: 'Pflaumen', category: 'Obst', calories: 47, protein: 0.6, carbs: 10.2, fat: 0.2, fiber: 1.7 },
  { name: 'Aprikosen', category: 'Obst', calories: 43, protein: 0.9, carbs: 8.5, fat: 0.1, fiber: 1.5 },
  { name: 'Johannisbeeren', category: 'Obst', calories: 33, protein: 1.1, carbs: 5.0, fat: 0.2, fiber: 3.5 },
  { name: 'Stachelbeeren', category: 'Obst', calories: 37, protein: 0.8, carbs: 7.0, fat: 0.2, fiber: 3.0 },
  { name: 'Zwetschgen', category: 'Obst', calories: 50, protein: 0.6, carbs: 11.0, fat: 0.2, fiber: 1.6 },
  
  // Getreide (Cereais)
  { name: 'Haferflocken', category: 'Getreide', calories: 372, protein: 13.5, carbs: 58.7, fat: 7.0, fiber: 10.0 },
  { name: 'Reis, weiß, gekocht', category: 'Getreide', calories: 127, protein: 2.7, carbs: 28.2, fat: 0.2, fiber: 0.4 },
  { name: 'Vollkornreis, gekocht', category: 'Getreide', calories: 123, protein: 2.7, carbs: 25.6, fat: 1.0, fiber: 1.6 },
  { name: 'Spaghetti, gekocht', category: 'Getreide', calories: 157, protein: 5.5, carbs: 30.9, fat: 0.9, fiber: 1.8 },
  { name: 'Vollkornnudeln, gekocht', category: 'Getreide', calories: 144, protein: 5.6, carbs: 26.9, fat: 1.5, fiber: 3.9 },
  { name: 'Weizenmehl', category: 'Getreide', calories: 348, protein: 10.0, carbs: 72.3, fat: 1.0, fiber: 4.0 },
  { name: 'Roggenmehl', category: 'Getreide', calories: 326, protein: 8.3, carbs: 65.0, fat: 1.7, fiber: 13.5 },
  { name: 'Dinkel', category: 'Getreide', calories: 338, protein: 14.6, carbs: 62.0, fat: 2.7, fiber: 8.8 },
  { name: 'Quinoa', category: 'Getreide', calories: 368, protein: 14.1, carbs: 64.2, fat: 6.1, fiber: 7.0 },
  { name: 'Couscous, gekocht', category: 'Getreide', calories: 112, protein: 3.8, carbs: 23.2, fat: 0.2, fiber: 1.4 },
  { name: 'Spätzle', category: 'Getreide', calories: 135, protein: 4.5, carbs: 25.0, fat: 1.5, fiber: 1.2 },
  { name: 'Knödel', category: 'Getreide', calories: 130, protein: 3.5, carbs: 24.0, fat: 2.0, fiber: 1.5 },
  
  // Brot (Pães)
  { name: 'Vollkornbrot', category: 'Brot', calories: 213, protein: 7.0, carbs: 40.0, fat: 1.3, fiber: 6.0 },
  { name: 'Weißbrot', category: 'Brot', calories: 258, protein: 8.2, carbs: 49.0, fat: 2.5, fiber: 3.0 },
  { name: 'Roggenbrot', category: 'Brot', calories: 218, protein: 5.8, carbs: 43.0, fat: 1.1, fiber: 6.5 },
  { name: 'Pumpernickel', category: 'Brot', calories: 181, protein: 4.8, carbs: 35.0, fat: 1.0, fiber: 6.5 },
  { name: 'Brötchen', category: 'Brot', calories: 270, protein: 8.0, carbs: 52.0, fat: 2.5, fiber: 3.0 },
  { name: 'Brezel', category: 'Brot', calories: 296, protein: 8.5, carbs: 58.0, fat: 2.5, fiber: 2.5 },
  { name: 'Laugenbrötchen', category: 'Brot', calories: 280, protein: 8.0, carbs: 54.0, fat: 2.8, fiber: 2.8 },
  { name: 'Schwarzbrot', category: 'Brot', calories: 200, protein: 6.0, carbs: 38.0, fat: 1.2, fiber: 7.0 },
  { name: 'Bauernbrot', category: 'Brot', calories: 225, protein: 6.5, carbs: 44.0, fat: 1.5, fiber: 5.0 },
  
  // Hülsenfrüchte (Leguminosas)
  { name: 'Linsen, gekocht', category: 'Hülsenfrüchte', calories: 116, protein: 9.0, carbs: 16.3, fat: 0.5, fiber: 8.0 },
  { name: 'Kichererbsen, gekocht', category: 'Hülsenfrüchte', calories: 139, protein: 8.9, carbs: 16.8, fat: 2.6, fiber: 5.4 },
  { name: 'Kidneybohnen, gekocht', category: 'Hülsenfrüchte', calories: 127, protein: 8.7, carbs: 18.0, fat: 0.5, fiber: 6.4 },
  { name: 'Weiße Bohnen, gekocht', category: 'Hülsenfrüchte', calories: 114, protein: 7.6, carbs: 16.6, fat: 0.5, fiber: 6.3 },
  { name: 'Erbsen, grün', category: 'Hülsenfrüchte', calories: 82, protein: 5.4, carbs: 12.3, fat: 0.4, fiber: 4.7 },
  { name: 'Sojabohnen, gekocht', category: 'Hülsenfrüchte', calories: 173, protein: 16.6, carbs: 6.4, fat: 9.0, fiber: 6.0 },
  { name: 'Tofu', category: 'Hülsenfrüchte', calories: 144, protein: 15.5, carbs: 1.9, fat: 8.7, fiber: 0.3 },
  
  // Nüsse (Oleaginosas)
  { name: 'Mandeln', category: 'Nüsse', calories: 611, protein: 24.0, carbs: 5.7, fat: 53.0, fiber: 11.8 },
  { name: 'Walnüsse', category: 'Nüsse', calories: 654, protein: 14.4, carbs: 10.6, fat: 62.5, fiber: 5.2 },
  { name: 'Haselnüsse', category: 'Nüsse', calories: 644, protein: 12.0, carbs: 10.5, fat: 61.6, fiber: 8.2 },
  { name: 'Cashewnüsse', category: 'Nüsse', calories: 572, protein: 17.2, carbs: 26.7, fat: 42.2, fiber: 3.0 },
  { name: 'Erdnüsse', category: 'Nüsse', calories: 599, protein: 29.8, carbs: 7.5, fat: 48.1, fiber: 11.7 },
  { name: 'Pistazien', category: 'Nüsse', calories: 594, protein: 17.6, carbs: 18.0, fat: 51.6, fiber: 6.5 },
  { name: 'Sonnenblumenkerne', category: 'Nüsse', calories: 584, protein: 22.8, carbs: 12.3, fat: 49.6, fiber: 6.3 },
  { name: 'Kürbiskerne', category: 'Nüsse', calories: 565, protein: 24.5, carbs: 14.7, fat: 45.6, fiber: 4.3 },
  { name: 'Leinsamen', category: 'Nüsse', calories: 534, protein: 18.3, carbs: 29.0, fat: 42.2, fiber: 27.3 },
  { name: 'Chiasamen', category: 'Nüsse', calories: 486, protein: 17.0, carbs: 42.0, fat: 31.0, fiber: 34.0 },
  
  // Fett (Gorduras)
  { name: 'Butter', category: 'Fett', calories: 741, protein: 0.7, carbs: 0.6, fat: 83.2, fiber: 0 },
  { name: 'Margarine', category: 'Fett', calories: 722, protein: 0.3, carbs: 0.4, fat: 80.0, fiber: 0 },
  { name: 'Olivenöl', category: 'Fett', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  { name: 'Sonnenblumenöl', category: 'Fett', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  { name: 'Rapsöl', category: 'Fett', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  { name: 'Kokosöl', category: 'Fett', calories: 862, protein: 0, carbs: 0, fat: 99.0, fiber: 0 },
  { name: 'Schmalz', category: 'Fett', calories: 891, protein: 0, carbs: 0, fat: 99.0, fiber: 0 },
  { name: 'Leinöl', category: 'Fett', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  
  // Getränke (Bebidas)
  { name: 'Bier, Pils', category: 'Getränke', calories: 43, protein: 0.5, carbs: 3.1, fat: 0, fiber: 0 },
  { name: 'Weißwein', category: 'Getränke', calories: 69, protein: 0.1, carbs: 0.6, fat: 0, fiber: 0 },
  { name: 'Rotwein', category: 'Getränke', calories: 71, protein: 0.1, carbs: 0.3, fat: 0, fiber: 0 },
  { name: 'Apfelsaft', category: 'Getränke', calories: 46, protein: 0.1, carbs: 10.4, fat: 0.1, fiber: 0.1 },
  { name: 'Orangensaft', category: 'Getränke', calories: 42, protein: 0.5, carbs: 9.4, fat: 0.1, fiber: 0.2 },
  { name: 'Kaffee, schwarz', category: 'Getränke', calories: 2, protein: 0.2, carbs: 0, fat: 0, fiber: 0 },
  { name: 'Tee, schwarz', category: 'Getränke', calories: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0 },
  { name: 'Weizenbier', category: 'Getränke', calories: 47, protein: 0.6, carbs: 4.0, fat: 0, fiber: 0 },
  { name: 'Apfelschorle', category: 'Getränke', calories: 22, protein: 0, carbs: 5.0, fat: 0, fiber: 0 },
  { name: 'Radler', category: 'Getränke', calories: 35, protein: 0.3, carbs: 5.0, fat: 0, fiber: 0 },
  
  // Kuchen (Doces)
  { name: 'Apfelstrudel', category: 'Kuchen', calories: 274, protein: 3.5, carbs: 38.0, fat: 12.0, fiber: 1.5 },
  { name: 'Schwarzwälder Kirschtorte', category: 'Kuchen', calories: 264, protein: 3.8, carbs: 32.0, fat: 13.5, fiber: 0.8 },
  { name: 'Käsekuchen', category: 'Kuchen', calories: 321, protein: 6.5, carbs: 25.0, fat: 22.0, fiber: 0.5 },
  { name: 'Berliner Pfannkuchen', category: 'Kuchen', calories: 330, protein: 6.0, carbs: 45.0, fat: 14.0, fiber: 1.0 },
  { name: 'Bienenstich', category: 'Kuchen', calories: 335, protein: 5.5, carbs: 35.0, fat: 19.0, fiber: 1.0 },
  { name: 'Lebkuchen', category: 'Kuchen', calories: 354, protein: 5.2, carbs: 70.0, fat: 7.0, fiber: 2.5 },
  { name: 'Stollen', category: 'Kuchen', calories: 389, protein: 5.8, carbs: 52.0, fat: 17.0, fiber: 2.0 },
  { name: 'Marzipan', category: 'Kuchen', calories: 493, protein: 9.0, carbs: 47.0, fat: 28.0, fiber: 4.0 },
  { name: 'Streuselkuchen', category: 'Kuchen', calories: 365, protein: 5.0, carbs: 48.0, fat: 17.0, fiber: 1.5 },
  { name: 'Donauwelle', category: 'Kuchen', calories: 340, protein: 4.5, carbs: 40.0, fat: 18.0, fiber: 1.0 },
  { name: 'Frankfurter Kranz', category: 'Kuchen', calories: 380, protein: 5.0, carbs: 42.0, fat: 21.0, fiber: 0.8 },
  { name: 'Pflaumenkuchen', category: 'Kuchen', calories: 190, protein: 3.5, carbs: 30.0, fat: 6.0, fiber: 1.5 },
  { name: 'Mohnkuchen', category: 'Kuchen', calories: 340, protein: 7.0, carbs: 38.0, fat: 18.0, fiber: 2.0 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, batchSize = 200, dryRun = false } = await req.json().catch(() => ({}));
    
    log('Starting BLS Germany import', { offset, batchSize, dryRun });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const batch = BLS_FOODS_DATA.slice(offset, offset + batchSize);
    log('Processing batch', { batchStart: offset, batchEnd: offset + batch.length, totalFoods: BLS_FOODS_DATA.length });

    const foodsToInsert = batch.map(food => ({
      name: food.name,
      name_normalized: normalizeText(food.name),
      calories_per_100g: food.calories,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      fiber_per_100g: food.fiber,
      category: mapCategory(food.category),
      source: 'BLS Germany',
      cuisine_origin: 'DE',
      is_verified: true,
      confidence: 0.95
    }));

    if (dryRun) {
      log('Dry run - would insert foods', { count: foodsToInsert.length });
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        wouldInsert: foodsToInsert.length,
        sample: foodsToInsert.slice(0, 5)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('foods')
      .upsert(foodsToInsert, { 
        onConflict: 'name_normalized',
        ignoreDuplicates: false 
      })
      .select('id');

    if (insertError) {
      log('Insert error', { error: insertError.message });
      throw insertError;
    }

    const insertedCount = insertedData?.length || 0;
    log('Batch completed', { inserted: insertedCount });

    return new Response(JSON.stringify({
      success: true,
      source: 'BLS Germany',
      note: 'Using curated dataset based on BLS 3.02 German food composition tables',
      offset,
      batchSize,
      processedInBatch: batch.length,
      inserted: insertedCount,
      totalFoods: BLS_FOODS_DATA.length,
      hasMore: offset + batchSize < BLS_FOODS_DATA.length,
      nextOffset: offset + batchSize,
      errors: 0,
      errorMessages: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error during import', { error: errorMessage });
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

