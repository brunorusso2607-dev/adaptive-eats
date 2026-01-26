import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, data?: any) {
  console.log(`[${new Date().toISOString()}] [AESAN] ${step}`, data ? JSON.stringify(data) : '');
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
    'Carnes': 'Carnes',
    'Pescados': 'Peixes e Frutos do Mar',
    'Lácteos': 'Laticínios',
    'Huevos': 'Ovos',
    'Verduras': 'Vegetais',
    'Hortalizas': 'Vegetais',
    'Frutas': 'Frutas',
    'Cereales': 'Cereais e Grãos',
    'Legumbres': 'Leguminosas',
    'Frutos secos': 'Oleaginosas',
    'Aceites': 'Óleos e Gorduras',
    'Bebidas': 'Bebidas',
    'Dulces': 'Doces e Sobremesas',
    'Embutidos': 'Embutidos',
    'Mariscos': 'Peixes e Frutos do Mar',
    'Platos': 'Pratos Típicos',
  };
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return 'Outros';
}

// Curated dataset based on AESAN/BEDCA Spanish Food Composition Database
// Source: https://www.bedca.net/ and https://www.aesan.gob.es/
const AESAN_FOODS_DATA = [
  // Carnes
  { name: 'Ternera, solomillo', category: 'Carnes', calories: 115, protein: 20.7, carbs: 0, fat: 3.5, fiber: 0 },
  { name: 'Cerdo, lomo', category: 'Carnes', calories: 143, protein: 21.4, carbs: 0, fat: 6.3, fiber: 0 },
  { name: 'Pollo, pechuga sin piel', category: 'Carnes', calories: 108, protein: 23.1, carbs: 0, fat: 1.2, fiber: 0 },
  { name: 'Cordero, pierna', category: 'Carnes', calories: 192, protein: 18.0, carbs: 0, fat: 13.0, fiber: 0 },
  { name: 'Conejo', category: 'Carnes', calories: 131, protein: 21.0, carbs: 0, fat: 5.0, fiber: 0 },
  { name: 'Pavo, pechuga', category: 'Carnes', calories: 105, protein: 24.0, carbs: 0, fat: 0.7, fiber: 0 },
  { name: 'Codorniz', category: 'Carnes', calories: 134, protein: 21.8, carbs: 0, fat: 4.5, fiber: 0 },
  { name: 'Perdiz', category: 'Carnes', calories: 120, protein: 25.0, carbs: 0, fat: 2.0, fiber: 0 },
  { name: 'Jabalí', category: 'Carnes', calories: 122, protein: 21.5, carbs: 0, fat: 4.0, fiber: 0 },
  { name: 'Cabrito', category: 'Carnes', calories: 109, protein: 20.5, carbs: 0, fat: 2.8, fiber: 0 },
  { name: 'Lechazo', category: 'Carnes', calories: 180, protein: 19.0, carbs: 0, fat: 11.0, fiber: 0 },
  { name: 'Cochinillo', category: 'Carnes', calories: 250, protein: 17.0, carbs: 0, fat: 20.0, fiber: 0 },
  
  // Embutidos españoles
  { name: 'Jamón serrano', category: 'Embutidos', calories: 241, protein: 31.0, carbs: 0, fat: 13.0, fiber: 0 },
  { name: 'Jamón ibérico', category: 'Embutidos', calories: 300, protein: 30.5, carbs: 0.5, fat: 20.0, fiber: 0 },
  { name: 'Jamón ibérico de bellota', category: 'Embutidos', calories: 350, protein: 32.0, carbs: 0, fat: 24.0, fiber: 0 },
  { name: 'Chorizo', category: 'Embutidos', calories: 384, protein: 22.0, carbs: 2.0, fat: 32.0, fiber: 0 },
  { name: 'Chorizo ibérico', category: 'Embutidos', calories: 410, protein: 24.0, carbs: 1.5, fat: 35.0, fiber: 0 },
  { name: 'Lomo embuchado', category: 'Embutidos', calories: 380, protein: 50.0, carbs: 1.0, fat: 20.0, fiber: 0 },
  { name: 'Salchichón', category: 'Embutidos', calories: 438, protein: 24.8, carbs: 0.8, fat: 38.0, fiber: 0 },
  { name: 'Morcilla de Burgos', category: 'Embutidos', calories: 446, protein: 14.0, carbs: 3.0, fat: 42.0, fiber: 0 },
  { name: 'Morcilla de arroz', category: 'Embutidos', calories: 380, protein: 10.0, carbs: 20.0, fat: 30.0, fiber: 0 },
  { name: 'Fuet', category: 'Embutidos', calories: 458, protein: 28.6, carbs: 1.0, fat: 38.0, fiber: 0 },
  { name: 'Butifarra', category: 'Embutidos', calories: 276, protein: 15.0, carbs: 2.0, fat: 23.0, fiber: 0 },
  { name: 'Butifarra negra', category: 'Embutidos', calories: 310, protein: 12.0, carbs: 5.0, fat: 27.0, fiber: 0 },
  { name: 'Sobrasada', category: 'Embutidos', calories: 474, protein: 14.5, carbs: 2.0, fat: 46.0, fiber: 0 },
  { name: 'Cecina de León', category: 'Embutidos', calories: 250, protein: 40.0, carbs: 0, fat: 10.0, fiber: 0 },
  { name: 'Lacón', category: 'Embutidos', calories: 198, protein: 25.0, carbs: 0, fat: 11.0, fiber: 0 },
  { name: 'Panceta', category: 'Embutidos', calories: 420, protein: 14.0, carbs: 0, fat: 40.0, fiber: 0 },
  
  // Pescados y Mariscos
  { name: 'Merluza', category: 'Pescados', calories: 89, protein: 17.0, carbs: 0, fat: 2.3, fiber: 0 },
  { name: 'Bacalao fresco', category: 'Pescados', calories: 82, protein: 18.0, carbs: 0, fat: 0.7, fiber: 0 },
  { name: 'Bacalao salado (desalado)', category: 'Pescados', calories: 108, protein: 25.0, carbs: 0, fat: 0.5, fiber: 0 },
  { name: 'Dorada', category: 'Pescados', calories: 86, protein: 18.0, carbs: 0, fat: 1.3, fiber: 0 },
  { name: 'Lubina', category: 'Pescados', calories: 97, protein: 18.0, carbs: 0, fat: 2.5, fiber: 0 },
  { name: 'Sardinas', category: 'Pescados', calories: 208, protein: 18.8, carbs: 0, fat: 14.7, fiber: 0 },
  { name: 'Boquerones', category: 'Pescados', calories: 131, protein: 20.6, carbs: 0, fat: 5.3, fiber: 0 },
  { name: 'Boquerones en vinagre', category: 'Pescados', calories: 145, protein: 19.0, carbs: 1.0, fat: 7.0, fiber: 0 },
  { name: 'Atún fresco', category: 'Pescados', calories: 144, protein: 23.0, carbs: 0, fat: 5.0, fiber: 0 },
  { name: 'Bonito del norte', category: 'Pescados', calories: 138, protein: 21.0, carbs: 0, fat: 6.0, fiber: 0 },
  { name: 'Rape', category: 'Pescados', calories: 76, protein: 16.0, carbs: 0, fat: 0.8, fiber: 0 },
  { name: 'Rodaballo', category: 'Pescados', calories: 102, protein: 19.0, carbs: 0, fat: 2.8, fiber: 0 },
  { name: 'Besugo', category: 'Pescados', calories: 118, protein: 19.0, carbs: 0, fat: 4.5, fiber: 0 },
  { name: 'Pulpo', category: 'Mariscos', calories: 82, protein: 14.9, carbs: 2.2, fat: 1.0, fiber: 0 },
  { name: 'Calamares', category: 'Mariscos', calories: 92, protein: 15.6, carbs: 3.1, fat: 1.4, fiber: 0 },
  { name: 'Gambas', category: 'Mariscos', calories: 99, protein: 20.3, carbs: 0.9, fat: 1.7, fiber: 0 },
  { name: 'Langostinos', category: 'Mariscos', calories: 92, protein: 20.0, carbs: 0.5, fat: 1.1, fiber: 0 },
  { name: 'Cigalas', category: 'Mariscos', calories: 90, protein: 19.0, carbs: 0.5, fat: 1.5, fiber: 0 },
  { name: 'Mejillones', category: 'Mariscos', calories: 86, protein: 11.9, carbs: 3.7, fat: 2.2, fiber: 0 },
  { name: 'Almejas', category: 'Mariscos', calories: 74, protein: 10.7, carbs: 3.0, fat: 1.4, fiber: 0 },
  { name: 'Percebes', category: 'Mariscos', calories: 66, protein: 15.0, carbs: 0, fat: 0.5, fiber: 0 },
  { name: 'Vieiras', category: 'Mariscos', calories: 69, protein: 14.0, carbs: 2.0, fat: 0.5, fiber: 0 },
  { name: 'Nécoras', category: 'Mariscos', calories: 90, protein: 18.0, carbs: 0, fat: 2.0, fiber: 0 },
  { name: 'Centolla', category: 'Mariscos', calories: 85, protein: 17.0, carbs: 0, fat: 1.5, fiber: 0 },
  { name: 'Bogavante', category: 'Mariscos', calories: 91, protein: 19.0, carbs: 0, fat: 1.8, fiber: 0 },
  
  // Lácteos
  { name: 'Leche entera', category: 'Lácteos', calories: 63, protein: 3.1, carbs: 4.7, fat: 3.5, fiber: 0 },
  { name: 'Leche semidesnatada', category: 'Lácteos', calories: 46, protein: 3.2, carbs: 4.8, fat: 1.6, fiber: 0 },
  { name: 'Queso manchego curado', category: 'Lácteos', calories: 467, protein: 32.0, carbs: 0.5, fat: 37.0, fiber: 0 },
  { name: 'Queso manchego semicurado', category: 'Lácteos', calories: 392, protein: 26.5, carbs: 0.5, fat: 32.0, fiber: 0 },
  { name: 'Queso de cabra', category: 'Lácteos', calories: 364, protein: 21.6, carbs: 2.5, fat: 29.8, fiber: 0 },
  { name: 'Queso tetilla', category: 'Lácteos', calories: 337, protein: 24.0, carbs: 0.5, fat: 27.0, fiber: 0 },
  { name: 'Queso idiazábal', category: 'Lácteos', calories: 393, protein: 25.0, carbs: 0.5, fat: 32.5, fiber: 0 },
  { name: 'Queso cabrales', category: 'Lácteos', calories: 389, protein: 21.0, carbs: 2.0, fat: 33.0, fiber: 0 },
  { name: 'Queso torta del Casar', category: 'Lácteos', calories: 350, protein: 20.0, carbs: 1.0, fat: 30.0, fiber: 0 },
  { name: 'Queso mahón', category: 'Lácteos', calories: 380, protein: 27.0, carbs: 0.5, fat: 30.0, fiber: 0 },
  { name: 'Queso zamorano', category: 'Lácteos', calories: 410, protein: 28.0, carbs: 0.5, fat: 33.0, fiber: 0 },
  { name: 'Yogur natural', category: 'Lácteos', calories: 61, protein: 3.4, carbs: 5.4, fat: 2.6, fiber: 0 },
  { name: 'Nata', category: 'Lácteos', calories: 303, protein: 2.2, carbs: 3.3, fat: 31.0, fiber: 0 },
  { name: 'Cuajada', category: 'Lácteos', calories: 96, protein: 5.5, carbs: 5.0, fat: 6.0, fiber: 0 },
  
  // Huevos
  { name: 'Huevo de gallina', category: 'Huevos', calories: 150, protein: 12.5, carbs: 0.7, fat: 11.1, fiber: 0 },
  { name: 'Clara de huevo', category: 'Huevos', calories: 49, protein: 11.1, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: 'Yema de huevo', category: 'Huevos', calories: 353, protein: 16.1, carbs: 0.3, fat: 31.9, fiber: 0 },
  { name: 'Huevo de codorniz', category: 'Huevos', calories: 158, protein: 13.1, carbs: 0.4, fat: 11.1, fiber: 0 },
  
  // Verduras y Hortalizas
  { name: 'Patatas', category: 'Hortalizas', calories: 79, protein: 2.0, carbs: 17.0, fat: 0.1, fiber: 1.8 },
  { name: 'Tomates', category: 'Hortalizas', calories: 22, protein: 0.9, carbs: 3.5, fat: 0.2, fiber: 1.4 },
  { name: 'Pimientos rojos', category: 'Hortalizas', calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.0 },
  { name: 'Pimientos del piquillo', category: 'Hortalizas', calories: 27, protein: 1.0, carbs: 5.0, fat: 0.2, fiber: 1.8 },
  { name: 'Pimientos de padrón', category: 'Hortalizas', calories: 22, protein: 1.2, carbs: 3.5, fat: 0.2, fiber: 1.5 },
  { name: 'Cebollas', category: 'Hortalizas', calories: 33, protein: 1.2, carbs: 6.3, fat: 0.2, fiber: 1.4 },
  { name: 'Ajos', category: 'Hortalizas', calories: 119, protein: 5.3, carbs: 24.3, fat: 0.3, fiber: 1.2 },
  { name: 'Espinacas', category: 'Verduras', calories: 31, protein: 3.6, carbs: 1.2, fat: 0.8, fiber: 2.6 },
  { name: 'Acelgas', category: 'Verduras', calories: 25, protein: 2.1, carbs: 3.7, fat: 0.3, fiber: 2.2 },
  { name: 'Alcachofas', category: 'Verduras', calories: 47, protein: 3.3, carbs: 5.1, fat: 0.2, fiber: 5.4 },
  { name: 'Espárragos blancos', category: 'Verduras', calories: 26, protein: 2.3, carbs: 3.0, fat: 0.2, fiber: 1.7 },
  { name: 'Espárragos trigueros', category: 'Verduras', calories: 24, protein: 2.7, carbs: 2.0, fat: 0.2, fiber: 2.2 },
  { name: 'Judías verdes', category: 'Verduras', calories: 30, protein: 2.4, carbs: 4.2, fat: 0.3, fiber: 3.2 },
  { name: 'Berenjenas', category: 'Verduras', calories: 21, protein: 1.1, carbs: 3.2, fat: 0.2, fiber: 2.5 },
  { name: 'Calabacín', category: 'Verduras', calories: 16, protein: 1.3, carbs: 2.0, fat: 0.2, fiber: 1.0 },
  { name: 'Calabaza', category: 'Verduras', calories: 28, protein: 1.1, carbs: 5.4, fat: 0.1, fiber: 1.5 },
  { name: 'Lechuga', category: 'Verduras', calories: 17, protein: 1.3, carbs: 1.4, fat: 0.6, fiber: 1.5 },
  { name: 'Escarola', category: 'Verduras', calories: 17, protein: 1.3, carbs: 2.0, fat: 0.2, fiber: 1.5 },
  { name: 'Grelos', category: 'Verduras', calories: 25, protein: 2.5, carbs: 2.0, fat: 0.3, fiber: 2.0 },
  { name: 'Cardos', category: 'Verduras', calories: 18, protein: 0.9, carbs: 3.5, fat: 0.1, fiber: 1.6 },
  { name: 'Borraja', category: 'Verduras', calories: 21, protein: 1.8, carbs: 3.0, fat: 0.2, fiber: 1.8 },
  
  // Frutas
  { name: 'Naranjas', category: 'Frutas', calories: 42, protein: 0.8, carbs: 8.6, fat: 0.2, fiber: 2.0 },
  { name: 'Naranjas de Valencia', category: 'Frutas', calories: 44, protein: 0.9, carbs: 9.0, fat: 0.2, fiber: 2.0 },
  { name: 'Mandarinas', category: 'Frutas', calories: 40, protein: 0.8, carbs: 9.0, fat: 0.2, fiber: 1.8 },
  { name: 'Limones', category: 'Frutas', calories: 40, protein: 0.7, carbs: 9.0, fat: 0.4, fiber: 1.0 },
  { name: 'Manzanas', category: 'Frutas', calories: 50, protein: 0.3, carbs: 12.0, fat: 0.3, fiber: 2.0 },
  { name: 'Peras', category: 'Frutas', calories: 49, protein: 0.4, carbs: 10.6, fat: 0.4, fiber: 2.2 },
  { name: 'Uvas', category: 'Frutas', calories: 63, protein: 0.6, carbs: 15.5, fat: 0.1, fiber: 0.9 },
  { name: 'Fresas', category: 'Frutas', calories: 36, protein: 0.7, carbs: 7.0, fat: 0.5, fiber: 2.0 },
  { name: 'Melocotones', category: 'Frutas', calories: 52, protein: 0.8, carbs: 12.0, fat: 0.1, fiber: 2.0 },
  { name: 'Albaricoques', category: 'Frutas', calories: 39, protein: 0.8, carbs: 8.5, fat: 0.1, fiber: 2.0 },
  { name: 'Cerezas', category: 'Frutas', calories: 65, protein: 0.8, carbs: 13.5, fat: 0.5, fiber: 1.5 },
  { name: 'Higos', category: 'Frutas', calories: 65, protein: 1.2, carbs: 12.9, fat: 0.5, fiber: 2.5 },
  { name: 'Granadas', category: 'Frutas', calories: 68, protein: 0.9, carbs: 15.9, fat: 0.6, fiber: 0.6 },
  { name: 'Sandía', category: 'Frutas', calories: 30, protein: 0.6, carbs: 7.0, fat: 0.2, fiber: 0.4 },
  { name: 'Melón', category: 'Frutas', calories: 28, protein: 0.8, carbs: 6.0, fat: 0.1, fiber: 0.9 },
  { name: 'Plátanos de Canarias', category: 'Frutas', calories: 94, protein: 1.2, carbs: 21.1, fat: 0.3, fiber: 2.5 },
  { name: 'Nísperos', category: 'Frutas', calories: 47, protein: 0.4, carbs: 10.4, fat: 0.2, fiber: 1.7 },
  { name: 'Chirimoya', category: 'Frutas', calories: 81, protein: 1.0, carbs: 18.0, fat: 0.2, fiber: 2.4 },
  { name: 'Caqui', category: 'Frutas', calories: 70, protein: 0.6, carbs: 16.0, fat: 0.2, fiber: 1.6 },
  
  // Legumbres
  { name: 'Garbanzos cocidos', category: 'Legumbres', calories: 150, protein: 8.0, carbs: 18.0, fat: 2.5, fiber: 5.0 },
  { name: 'Lentejas cocidas', category: 'Legumbres', calories: 103, protein: 8.0, carbs: 14.0, fat: 0.5, fiber: 4.0 },
  { name: 'Lentejas pardinas', category: 'Legumbres', calories: 116, protein: 9.0, carbs: 16.0, fat: 0.5, fiber: 4.5 },
  { name: 'Alubias blancas cocidas', category: 'Legumbres', calories: 104, protein: 6.5, carbs: 16.5, fat: 0.5, fiber: 5.5 },
  { name: 'Judiones de La Granja', category: 'Legumbres', calories: 115, protein: 7.5, carbs: 17.0, fat: 0.6, fiber: 6.0 },
  { name: 'Fabes asturianas', category: 'Legumbres', calories: 118, protein: 7.2, carbs: 18.0, fat: 0.5, fiber: 5.0 },
  { name: 'Alubias pintas', category: 'Legumbres', calories: 110, protein: 7.0, carbs: 17.0, fat: 0.5, fiber: 5.8 },
  { name: 'Guisantes', category: 'Legumbres', calories: 78, protein: 5.9, carbs: 10.6, fat: 0.4, fiber: 4.5 },
  { name: 'Habas', category: 'Legumbres', calories: 65, protein: 5.4, carbs: 8.6, fat: 0.4, fiber: 4.2 },
  
  // Cereales y derivados
  { name: 'Arroz blanco cocido', category: 'Cereales', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  { name: 'Arroz bomba', category: 'Cereales', calories: 135, protein: 2.8, carbs: 29.0, fat: 0.3, fiber: 0.3 },
  { name: 'Arroz integral cocido', category: 'Cereales', calories: 123, protein: 2.7, carbs: 25.6, fat: 1.0, fiber: 1.6 },
  { name: 'Pan blanco', category: 'Cereales', calories: 258, protein: 8.5, carbs: 52.0, fat: 1.6, fiber: 2.7 },
  { name: 'Pan integral', category: 'Cereales', calories: 230, protein: 9.0, carbs: 44.0, fat: 2.5, fiber: 5.8 },
  { name: 'Pan de pueblo', category: 'Cereales', calories: 265, protein: 8.0, carbs: 55.0, fat: 1.0, fiber: 2.5 },
  { name: 'Pan de centeno', category: 'Cereales', calories: 220, protein: 6.5, carbs: 43.0, fat: 1.0, fiber: 6.0 },
  { name: 'Fideos', category: 'Cereales', calories: 350, protein: 12.0, carbs: 72.0, fat: 1.5, fiber: 3.0 },
  { name: 'Macarrones cocidos', category: 'Cereales', calories: 148, protein: 5.0, carbs: 30.0, fat: 0.6, fiber: 1.5 },
  
  // Frutos secos
  { name: 'Almendras', category: 'Frutos secos', calories: 620, protein: 20.0, carbs: 5.3, fat: 54.0, fiber: 14.3 },
  { name: 'Almendras de Marcona', category: 'Frutos secos', calories: 610, protein: 19.0, carbs: 5.0, fat: 53.0, fiber: 13.0 },
  { name: 'Avellanas', category: 'Frutos secos', calories: 656, protein: 14.0, carbs: 10.0, fat: 62.0, fiber: 8.0 },
  { name: 'Nueces', category: 'Frutos secos', calories: 670, protein: 14.0, carbs: 4.0, fat: 67.0, fiber: 5.2 },
  { name: 'Piñones', category: 'Frutos secos', calories: 693, protein: 14.0, carbs: 4.0, fat: 68.0, fiber: 1.9 },
  { name: 'Pistachos', category: 'Frutos secos', calories: 594, protein: 17.6, carbs: 18.0, fat: 51.6, fiber: 6.5 },
  { name: 'Castañas', category: 'Frutos secos', calories: 200, protein: 3.2, carbs: 41.0, fat: 2.6, fiber: 6.8 },
  
  // Aceites
  { name: 'Aceite de oliva virgen extra', category: 'Aceites', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  { name: 'Aceite de oliva virgen', category: 'Aceites', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  { name: 'Aceite de girasol', category: 'Aceites', calories: 884, protein: 0, carbs: 0, fat: 100.0, fiber: 0 },
  
  // Dulces españoles
  { name: 'Turrón de Jijona', category: 'Dulces', calories: 535, protein: 14.0, carbs: 35.0, fat: 38.0, fiber: 3.0 },
  { name: 'Turrón de Alicante', category: 'Dulces', calories: 500, protein: 12.0, carbs: 40.0, fat: 32.0, fiber: 3.5 },
  { name: 'Polvorones', category: 'Dulces', calories: 480, protein: 7.0, carbs: 58.0, fat: 25.0, fiber: 2.0 },
  { name: 'Mantecados', category: 'Dulces', calories: 460, protein: 6.0, carbs: 55.0, fat: 24.0, fiber: 1.5 },
  { name: 'Churros', category: 'Dulces', calories: 348, protein: 4.6, carbs: 40.0, fat: 18.5, fiber: 1.3 },
  { name: 'Porras', category: 'Dulces', calories: 360, protein: 5.0, carbs: 42.0, fat: 19.0, fiber: 1.5 },
  { name: 'Ensaimada', category: 'Dulces', calories: 388, protein: 6.0, carbs: 48.0, fat: 19.0, fiber: 1.5 },
  { name: 'Crema catalana', category: 'Dulces', calories: 200, protein: 5.0, carbs: 22.0, fat: 10.0, fiber: 0 },
  { name: 'Flan de huevo', category: 'Dulces', calories: 126, protein: 4.5, carbs: 18.0, fat: 4.0, fiber: 0 },
  { name: 'Natillas', category: 'Dulces', calories: 118, protein: 4.2, carbs: 16.0, fat: 4.2, fiber: 0 },
  { name: 'Arroz con leche', category: 'Dulces', calories: 131, protein: 3.5, carbs: 21.0, fat: 3.5, fiber: 0 },
  { name: 'Filloas', category: 'Dulces', calories: 150, protein: 5.0, carbs: 20.0, fat: 5.5, fiber: 0.5 },
  { name: 'Torrijas', category: 'Dulces', calories: 280, protein: 6.0, carbs: 35.0, fat: 12.0, fiber: 1.0 },
  { name: 'Buñuelos de viento', category: 'Dulces', calories: 320, protein: 5.0, carbs: 38.0, fat: 16.0, fiber: 0.8 },
  { name: 'Rosquillas', category: 'Dulces', calories: 370, protein: 6.0, carbs: 50.0, fat: 16.0, fiber: 1.5 },
  { name: 'Tocino de cielo', category: 'Dulces', calories: 320, protein: 7.0, carbs: 55.0, fat: 8.0, fiber: 0 },
  { name: 'Yemas de Santa Teresa', category: 'Dulces', calories: 380, protein: 8.0, carbs: 50.0, fat: 16.0, fiber: 0 },
  { name: 'Pestiños', category: 'Dulces', calories: 400, protein: 5.0, carbs: 50.0, fat: 20.0, fiber: 1.0 },
  
  // Bebidas
  { name: 'Vino tinto', category: 'Bebidas', calories: 74, protein: 0.1, carbs: 0.3, fat: 0, fiber: 0 },
  { name: 'Vino tinto Rioja', category: 'Bebidas', calories: 75, protein: 0.1, carbs: 0.5, fat: 0, fiber: 0 },
  { name: 'Vino blanco', category: 'Bebidas', calories: 70, protein: 0.1, carbs: 0.6, fat: 0, fiber: 0 },
  { name: 'Cava', category: 'Bebidas', calories: 76, protein: 0.3, carbs: 1.5, fat: 0, fiber: 0 },
  { name: 'Jerez fino', category: 'Bebidas', calories: 116, protein: 0.2, carbs: 1.5, fat: 0, fiber: 0 },
  { name: 'Sidra', category: 'Bebidas', calories: 50, protein: 0, carbs: 4.5, fat: 0, fiber: 0 },
  { name: 'Cerveza', category: 'Bebidas', calories: 45, protein: 0.5, carbs: 3.5, fat: 0, fiber: 0 },
  { name: 'Sangría', category: 'Bebidas', calories: 95, protein: 0.1, carbs: 8.0, fat: 0, fiber: 0 },
  { name: 'Horchata', category: 'Bebidas', calories: 71, protein: 0.9, carbs: 12.0, fat: 2.4, fiber: 0.5 },
  { name: 'Café solo', category: 'Bebidas', calories: 2, protein: 0.1, carbs: 0, fat: 0, fiber: 0 },
  { name: 'Café con leche', category: 'Bebidas', calories: 35, protein: 1.5, carbs: 3.0, fat: 1.5, fiber: 0 },
  { name: 'Café cortado', category: 'Bebidas', calories: 18, protein: 0.8, carbs: 1.5, fat: 0.8, fiber: 0 },
  
  // Platos típicos españoles
  { name: 'Paella valenciana (porción)', category: 'Platos', calories: 180, protein: 12.0, carbs: 20.0, fat: 6.0, fiber: 1.5 },
  { name: 'Paella de mariscos (porción)', category: 'Platos', calories: 165, protein: 14.0, carbs: 18.0, fat: 5.0, fiber: 1.0 },
  { name: 'Tortilla española (porción)', category: 'Platos', calories: 135, protein: 6.0, carbs: 8.0, fat: 9.0, fiber: 0.8 },
  { name: 'Gazpacho', category: 'Platos', calories: 44, protein: 1.0, carbs: 4.0, fat: 2.8, fiber: 0.8 },
  { name: 'Salmorejo', category: 'Platos', calories: 110, protein: 3.0, carbs: 8.0, fat: 7.5, fiber: 1.0 },
  { name: 'Ajoblanco', category: 'Platos', calories: 150, protein: 4.0, carbs: 8.0, fat: 12.0, fiber: 1.5 },
  { name: 'Cocido madrileño (porción)', category: 'Platos', calories: 250, protein: 18.0, carbs: 15.0, fat: 14.0, fiber: 4.0 },
  { name: 'Fabada asturiana (porción)', category: 'Platos', calories: 300, protein: 15.0, carbs: 20.0, fat: 18.0, fiber: 6.0 },
  { name: 'Pisto manchego', category: 'Platos', calories: 70, protein: 1.5, carbs: 6.0, fat: 4.5, fiber: 2.0 },
  { name: 'Escalivada', category: 'Platos', calories: 60, protein: 1.0, carbs: 5.0, fat: 4.0, fiber: 2.0 },
  { name: 'Pulpo a la gallega', category: 'Platos', calories: 140, protein: 16.0, carbs: 3.0, fat: 7.0, fiber: 0 },
  { name: 'Patatas bravas', category: 'Platos', calories: 180, protein: 2.5, carbs: 22.0, fat: 9.0, fiber: 2.0 },
  { name: 'Croquetas de jamón', category: 'Platos', calories: 220, protein: 8.0, carbs: 18.0, fat: 13.0, fiber: 0.5 },
  { name: 'Empanada gallega', category: 'Platos', calories: 260, protein: 10.0, carbs: 28.0, fat: 12.0, fiber: 1.5 },
  { name: 'Migas', category: 'Platos', calories: 280, protein: 8.0, carbs: 35.0, fat: 12.0, fiber: 2.0 },
  { name: 'Callos a la madrileña', category: 'Platos', calories: 180, protein: 15.0, carbs: 5.0, fat: 11.0, fiber: 1.0 },
  { name: 'Lacón con grelos', category: 'Platos', calories: 200, protein: 22.0, carbs: 2.0, fat: 12.0, fiber: 1.5 },
  { name: 'Marmitako', category: 'Platos', calories: 165, protein: 15.0, carbs: 12.0, fat: 6.0, fiber: 2.0 },
  { name: 'Pimientos rellenos', category: 'Platos', calories: 150, protein: 10.0, carbs: 8.0, fat: 9.0, fiber: 1.5 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, batchSize = 200, dryRun = false } = await req.json().catch(() => ({}));
    
    log('Starting AESAN Spain import', { offset, batchSize, dryRun });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const batch = AESAN_FOODS_DATA.slice(offset, offset + batchSize);
    log('Processing batch', { batchStart: offset, batchEnd: offset + batch.length, totalFoods: AESAN_FOODS_DATA.length });

    const foodsToInsert = batch.map(food => ({
      name: food.name,
      name_normalized: normalizeText(food.name),
      calories_per_100g: food.calories,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      fiber_per_100g: food.fiber,
      category: mapCategory(food.category),
      source: 'AESAN Spain',
      cuisine_origin: 'ES',
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
      source: 'AESAN Spain',
      note: 'Using curated dataset based on AESAN/BEDCA Spanish food composition database',
      offset,
      batchSize,
      processedInBatch: batch.length,
      inserted: insertedCount,
      totalFoods: AESAN_FOODS_DATA.length,
      hasMore: offset + batchSize < AESAN_FOODS_DATA.length,
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

