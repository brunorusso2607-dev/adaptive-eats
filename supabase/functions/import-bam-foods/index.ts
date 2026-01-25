import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BAM data parsed from Excel - Mexico food composition database
// Source: INSP Mexico - BAM Version 18.1.1, 2021
const BAM_FOODS = [
  { name: "ACEITE, DE AJONJOLI", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE ALGODON", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE CACAHUATE", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE CANOLA", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE CARTAMO", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE COCO", calories: 892, protein: 0, carbs: 0, fat: 99.06, fiber: 0 },
  { name: "ACEITE, DE GIRASOL", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE MAIZ", calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE OLIVA", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, DE SOYA", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "ACEITE, VEGETAL (PROMEDIO)", calories: 853.9, protein: 0, carbs: 0, fat: 95.76, fiber: 0 },
  { name: "MANTEQUILLA, CON SAL", calories: 729, protein: 0, carbs: 0, fat: 80, fiber: 0 },
  { name: "MANTEQUILLA, SIN SAL", calories: 734, protein: 0.37, carbs: 0.97, fat: 80.33, fiber: 0 },
  { name: "MARGARINA, CON SAL", calories: 739.22, protein: 1.66, carbs: 1.66, fat: 80.66, fiber: 0 },
  { name: "MARGARINA, LIGHT", calories: 349, protein: 0.23, carbs: 1.52, fat: 37.98, fiber: 0 },
  { name: "MAYONESA", calories: 519.55, protein: 0.78, carbs: 2.33, fat: 54.43, fiber: 0 },
  { name: "MAYONESA, LIGHT", calories: 238, protein: 0.37, carbs: 9.23, fat: 22.22, fiber: 0 },
  { name: "LARDO", calories: 902, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "MANTECA, ANIMAL PROMEDIO", calories: 902, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "MANTECA, VEGETAL PROMEDIO", calories: 884, protein: 0, carbs: 0, fat: 99.97, fiber: 0 },
  // Azúcares y dulces
  { name: "AZUCAR, BLANCA REFINADA", calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0 },
  { name: "AZUCAR, MORENA", calories: 380, protein: 0, carbs: 98, fat: 0, fiber: 0 },
  { name: "MIEL DE ABEJA", calories: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2 },
  { name: "PILONCILLO", calories: 376, protein: 0.4, carbs: 97, fat: 0, fiber: 0 },
  { name: "CAJETA", calories: 285, protein: 5.5, carbs: 55, fat: 5, fiber: 0 },
  { name: "CHOCOLATE EN POLVO", calories: 380, protein: 4, carbs: 80, fat: 4, fiber: 5 },
  { name: "GELATINA DE AGUA", calories: 62, protein: 1.5, carbs: 13.5, fat: 0, fiber: 0 },
  { name: "GELATINA DE LECHE", calories: 120, protein: 3, carbs: 20, fat: 3, fiber: 0 },
  // Carnes
  { name: "RES, BISTEC", calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  { name: "RES, MOLIDA", calories: 254, protein: 17.2, carbs: 0, fat: 20, fiber: 0 },
  { name: "RES, MILANESA", calories: 231, protein: 21, carbs: 8, fat: 12, fiber: 0 },
  { name: "RES, HIGADO", calories: 135, protein: 20.4, carbs: 3.9, fat: 3.6, fiber: 0 },
  { name: "RES, LENGUA", calories: 224, protein: 16, carbs: 0, fat: 17, fiber: 0 },
  { name: "CERDO, CHULETA", calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 },
  { name: "CERDO, PIERNA", calories: 211, protein: 29, carbs: 0, fat: 10, fiber: 0 },
  { name: "CERDO, LOMO", calories: 143, protein: 26.7, carbs: 0, fat: 3.5, fiber: 0 },
  { name: "CERDO, COSTILLA", calories: 277, protein: 24.7, carbs: 0, fat: 19.3, fiber: 0 },
  { name: "CERDO, TOCINO", calories: 541, protein: 37, carbs: 1.4, fat: 42, fiber: 0 },
  { name: "CARNITAS", calories: 292, protein: 25.7, carbs: 0, fat: 20.5, fiber: 0 },
  { name: "CHICHARRON", calories: 544, protein: 61.3, carbs: 0, fat: 31.3, fiber: 0 },
  // Aves
  { name: "POLLO, PECHUGA CON PIEL", calories: 172, protein: 20.8, carbs: 0, fat: 9.2, fiber: 0 },
  { name: "POLLO, PECHUGA SIN PIEL", calories: 110, protein: 23.1, carbs: 0, fat: 1.2, fiber: 0 },
  { name: "POLLO, PIERNA CON PIEL", calories: 184, protein: 16, carbs: 0, fat: 13, fiber: 0 },
  { name: "POLLO, MUSLO", calories: 209, protein: 17.3, carbs: 0, fat: 15.2, fiber: 0 },
  { name: "POLLO, ALA", calories: 266, protein: 19.5, carbs: 0, fat: 20.3, fiber: 0 },
  { name: "POLLO, HIGADO", calories: 119, protein: 16.9, carbs: 0.7, fat: 4.8, fiber: 0 },
  { name: "PAVO, PECHUGA", calories: 104, protein: 24.1, carbs: 0, fat: 0.7, fiber: 0 },
  { name: "PAVO, PIERNA", calories: 144, protein: 20.4, carbs: 0, fat: 6.5, fiber: 0 },
  // Pescados y Mariscos
  { name: "ATUN, EN AGUA", calories: 116, protein: 25.5, carbs: 0, fat: 0.8, fiber: 0 },
  { name: "ATUN, EN ACEITE", calories: 198, protein: 29.1, carbs: 0, fat: 8.2, fiber: 0 },
  { name: "ATUN, FRESCO", calories: 144, protein: 23.3, carbs: 0, fat: 4.9, fiber: 0 },
  { name: "SALMON", calories: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0 },
  { name: "SARDINA, EN SALSA DE TOMATE", calories: 185, protein: 20.9, carbs: 0, fat: 10.5, fiber: 0 },
  { name: "TRUCHA", calories: 141, protein: 19.9, carbs: 0, fat: 6.2, fiber: 0 },
  { name: "ROBALO", calories: 97, protein: 18.4, carbs: 0, fat: 2, fiber: 0 },
  { name: "HUACHINANGO", calories: 100, protein: 20.5, carbs: 0, fat: 1.3, fiber: 0 },
  { name: "MOJARRA", calories: 96, protein: 19.4, carbs: 0, fat: 1.7, fiber: 0 },
  { name: "CAMARON", calories: 85, protein: 18.1, carbs: 0.9, fat: 0.5, fiber: 0 },
  { name: "PULPO", calories: 82, protein: 14.9, carbs: 2.2, fat: 1, fiber: 0 },
  { name: "CALAMAR", calories: 92, protein: 15.6, carbs: 3.1, fat: 1.4, fiber: 0 },
  { name: "JAIBA", calories: 83, protein: 18.1, carbs: 0, fat: 0.8, fiber: 0 },
  { name: "OSTIONES", calories: 68, protein: 7, carbs: 3.9, fat: 2.5, fiber: 0 },
  // Embutidos
  { name: "JAMON DE PAVO", calories: 104, protein: 17.1, carbs: 3.2, fat: 2.2, fiber: 0 },
  { name: "JAMON DE CERDO", calories: 145, protein: 18.4, carbs: 1.5, fat: 7.1, fiber: 0 },
  { name: "SALCHICHA DE PAVO", calories: 137, protein: 12, carbs: 5, fat: 7.5, fiber: 0 },
  { name: "SALCHICHA DE CERDO", calories: 268, protein: 11.2, carbs: 2.3, fat: 23.8, fiber: 0 },
  { name: "CHORIZO", calories: 455, protein: 24.1, carbs: 1.9, fat: 38.3, fiber: 0 },
  { name: "LONGANIZA", calories: 350, protein: 17, carbs: 0, fat: 31, fiber: 0 },
  { name: "MORTADELA", calories: 311, protein: 12, carbs: 3.1, fat: 28.4, fiber: 0 },
  { name: "SALAMI", calories: 336, protein: 22.6, carbs: 1.2, fat: 26.9, fiber: 0 },
  // Lácteos
  { name: "LECHE, ENTERA", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  { name: "LECHE, SEMIDESCREMADA", calories: 46, protein: 3.4, carbs: 4.9, fat: 1.5, fiber: 0 },
  { name: "LECHE, DESCREMADA", calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0 },
  { name: "LECHE, EVAPORADA", calories: 134, protein: 6.8, carbs: 10.1, fat: 7.6, fiber: 0 },
  { name: "LECHE, CONDENSADA", calories: 321, protein: 8.1, carbs: 54, fat: 8.7, fiber: 0 },
  { name: "YOGURT, NATURAL", calories: 63, protein: 5.3, carbs: 7.7, fat: 1.6, fiber: 0 },
  { name: "YOGURT, CON FRUTA", calories: 105, protein: 4.1, carbs: 19, fat: 1.2, fiber: 0 },
  { name: "YOGURT, GRIEGO", calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0 },
  { name: "QUESO, FRESCO", calories: 268, protein: 17.5, carbs: 3, fat: 21, fiber: 0 },
  { name: "QUESO, PANELA", calories: 206, protein: 18, carbs: 3, fat: 14, fiber: 0 },
  { name: "QUESO, OAXACA", calories: 274, protein: 21.6, carbs: 1.6, fat: 20.4, fiber: 0 },
  { name: "QUESO, MANCHEGO", calories: 376, protein: 24.7, carbs: 0.5, fat: 30.5, fiber: 0 },
  { name: "QUESO, CHIHUAHUA", calories: 370, protein: 23, carbs: 2, fat: 30, fiber: 0 },
  { name: "QUESO, COTIJA", calories: 393, protein: 29, carbs: 2, fat: 30, fiber: 0 },
  { name: "QUESO, CREMA", calories: 342, protein: 7.6, carbs: 4, fat: 33.1, fiber: 0 },
  { name: "CREMA ACIDA", calories: 193, protein: 2.1, carbs: 4.3, fat: 19.4, fiber: 0 },
  { name: "HUEVO, ENTERO", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  { name: "HUEVO, CLARA", calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: "HUEVO, YEMA", calories: 322, protein: 15.9, carbs: 3.6, fat: 26.5, fiber: 0 },
  // Cereales y granos
  { name: "ARROZ, BLANCO COCIDO", calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  { name: "ARROZ, INTEGRAL COCIDO", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
  { name: "AVENA, EN HOJUELAS", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
  { name: "AVENA, COCIDA", calories: 68, protein: 2.5, carbs: 12, fat: 1.4, fiber: 1.7 },
  { name: "MAIZ, GRANO COCIDO", calories: 96, protein: 3.4, carbs: 21, fat: 1.3, fiber: 2.4 },
  { name: "MAIZ, POZOLE", calories: 83, protein: 2.2, carbs: 18.1, fat: 0.5, fiber: 2.2 },
  { name: "TRIGO, INTEGRAL", calories: 339, protein: 13.7, carbs: 72.6, fat: 1.9, fiber: 12.2 },
  { name: "CEBADA, COCIDA", calories: 123, protein: 2.3, carbs: 28.2, fat: 0.4, fiber: 3.8 },
  { name: "QUINOA, COCIDA", calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8 },
  { name: "AMARANTO", calories: 371, protein: 13.6, carbs: 65.2, fat: 7, fiber: 6.7 },
  // Tortillas y panes
  { name: "TORTILLA, DE MAIZ", calories: 218, protein: 5.7, carbs: 44.6, fat: 2.5, fiber: 5.3 },
  { name: "TORTILLA, DE HARINA", calories: 312, protein: 8.3, carbs: 51.6, fat: 7.9, fiber: 2.1 },
  { name: "TOSTADA, DE MAIZ", calories: 459, protein: 6.1, carbs: 58.2, fat: 22.2, fiber: 4.5 },
  { name: "PAN, BLANCO", calories: 266, protein: 7.6, carbs: 50.6, fat: 3.3, fiber: 2.4 },
  { name: "PAN, INTEGRAL", calories: 247, protein: 12.9, carbs: 41.3, fat: 4.2, fiber: 6 },
  { name: "PAN, BOLILLO", calories: 275, protein: 8.4, carbs: 52.6, fat: 3.1, fiber: 2.5 },
  { name: "PAN, TELERA", calories: 275, protein: 8.4, carbs: 52.6, fat: 3.1, fiber: 2.5 },
  { name: "PAN DULCE, CONCHA", calories: 378, protein: 7.5, carbs: 61, fat: 12, fiber: 1.5 },
  { name: "PAN DULCE, CUERNO", calories: 406, protein: 8.4, carbs: 45.8, fat: 21.8, fiber: 1.8 },
  { name: "PAN DULCE, OREJA", calories: 420, protein: 6, carbs: 55, fat: 20, fiber: 1.5 },
  { name: "GALLETA, MARIA", calories: 436, protein: 6.4, carbs: 75.2, fat: 12.5, fiber: 2.2 },
  { name: "GALLETA, DE ANIMALITOS", calories: 430, protein: 6.5, carbs: 73, fat: 13, fiber: 2 },
  // Leguminosas
  { name: "FRIJOL, NEGRO COCIDO", calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7 },
  { name: "FRIJOL, PINTO COCIDO", calories: 143, protein: 9, carbs: 26.2, fat: 0.6, fiber: 9 },
  { name: "FRIJOL, BAYO COCIDO", calories: 127, protein: 7.5, carbs: 22.8, fat: 0.5, fiber: 6.4 },
  { name: "FRIJOL, REFRITO", calories: 108, protein: 5.4, carbs: 13.6, fat: 3.6, fiber: 4.9 },
  { name: "LENTEJAS, COCIDAS", calories: 116, protein: 9, carbs: 20.1, fat: 0.4, fiber: 7.9 },
  { name: "GARBANZO, COCIDO", calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6 },
  { name: "HABAS, COCIDAS", calories: 110, protein: 7.6, carbs: 19.7, fat: 0.4, fiber: 5.4 },
  { name: "SOYA, EN GRANO COCIDO", calories: 173, protein: 16.6, carbs: 9.9, fat: 9, fiber: 6 },
  // Frutas
  { name: "MANZANA", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
  { name: "PLATANO", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  { name: "NARANJA", calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4 },
  { name: "MANDARINA", calories: 53, protein: 0.8, carbs: 13.3, fat: 0.3, fiber: 1.8 },
  { name: "LIMON", calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8 },
  { name: "TORONJA", calories: 42, protein: 0.8, carbs: 10.7, fat: 0.1, fiber: 1.6 },
  { name: "PIÑA", calories: 50, protein: 0.5, carbs: 13.1, fat: 0.1, fiber: 1.4 },
  { name: "MANGO", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
  { name: "PAPAYA", calories: 43, protein: 0.5, carbs: 10.8, fat: 0.3, fiber: 1.7 },
  { name: "SANDIA", calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4 },
  { name: "MELON", calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2, fiber: 0.9 },
  { name: "FRESA", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { name: "UVA", calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9 },
  { name: "DURAZNO", calories: 39, protein: 0.9, carbs: 9.5, fat: 0.3, fiber: 1.5 },
  { name: "PERA", calories: 57, protein: 0.4, carbs: 15.2, fat: 0.1, fiber: 3.1 },
  { name: "GUAYABA", calories: 68, protein: 2.6, carbs: 14.3, fat: 1, fiber: 5.4 },
  { name: "AGUACATE", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: "COCO, RALLADO", calories: 354, protein: 3.3, carbs: 15.2, fat: 33.5, fiber: 9.0 },
  { name: "CIRUELA", calories: 46, protein: 0.7, carbs: 11.4, fat: 0.3, fiber: 1.4 },
  { name: "KIWI", calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5, fiber: 3 },
  { name: "TAMARINDO", calories: 239, protein: 2.8, carbs: 62.5, fat: 0.6, fiber: 5.1 },
  { name: "JICAMA", calories: 38, protein: 0.7, carbs: 8.8, fat: 0.1, fiber: 4.9 },
  { name: "TUNA", calories: 41, protein: 0.7, carbs: 9.6, fat: 0.5, fiber: 3.6 },
  { name: "TEJOCOTE", calories: 87, protein: 0.6, carbs: 22.4, fat: 0.2, fiber: 5 },
  // Verduras
  { name: "TOMATE", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: "JITOMATE", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: "CEBOLLA", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  { name: "AJO", calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1 },
  { name: "CHILE, SERRANO", calories: 32, protein: 1.7, carbs: 6.7, fat: 0.4, fiber: 3.7 },
  { name: "CHILE, JALAPEÑO", calories: 29, protein: 0.9, carbs: 6.5, fat: 0.4, fiber: 2.8 },
  { name: "CHILE, POBLANO", calories: 20, protein: 0.9, carbs: 4.4, fat: 0.2, fiber: 1.7 },
  { name: "CHILE, HABANERO", calories: 40, protein: 1.9, carbs: 8.8, fat: 0.4, fiber: 1.5 },
  { name: "CHILE, ANCHO SECO", calories: 281, protein: 11.9, carbs: 51.8, fat: 8.2, fiber: 21.3 },
  { name: "CHILE, GUAJILLO SECO", calories: 324, protein: 10.6, carbs: 59.3, fat: 5.5, fiber: 23.4 },
  { name: "LECHUGA", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  { name: "ESPINACA", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: "BROCOLI", calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  { name: "COLIFLOR", calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  { name: "ZANAHORIA", calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  { name: "PAPA", calories: 77, protein: 2, carbs: 17.5, fat: 0.1, fiber: 2.2 },
  { name: "CAMOTE", calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3 },
  { name: "CALABAZA", calories: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5 },
  { name: "CALABACITA", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1 },
  { name: "CHAYOTE", calories: 19, protein: 0.8, carbs: 4.5, fat: 0.1, fiber: 1.7 },
  { name: "NOPAL", calories: 16, protein: 1.3, carbs: 3.3, fat: 0.1, fiber: 2.2 },
  { name: "ELOTE", calories: 86, protein: 3.3, carbs: 19, fat: 1.2, fiber: 2.7 },
  { name: "EJOTES", calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4 },
  { name: "CHICHARO", calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.1 },
  { name: "PEPINO", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  { name: "RABANO", calories: 16, protein: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6 },
  { name: "BETABEL", calories: 43, protein: 1.6, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  { name: "APIO", calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6 },
  { name: "ACELGA", calories: 19, protein: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6 },
  { name: "COL", calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 },
  { name: "CILANTRO", calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
  { name: "PEREJIL", calories: 36, protein: 3, carbs: 6.3, fat: 0.8, fiber: 3.3 },
  { name: "HONGOS, CHAMPIÑONES", calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  { name: "FLOR DE CALABAZA", calories: 15, protein: 1.4, carbs: 3.3, fat: 0.1, fiber: 0.9 },
  { name: "HUITLACOCHE", calories: 55, protein: 3, carbs: 10, fat: 0.7, fiber: 3.6 },
  { name: "QUELITES", calories: 30, protein: 3.2, carbs: 4.5, fat: 0.4, fiber: 2.8 },
  { name: "VERDOLAGAS", calories: 20, protein: 2, carbs: 3.4, fat: 0.4, fiber: 0 },
  { name: "EPAZOTE", calories: 32, protein: 3.8, carbs: 3.8, fat: 0.5, fiber: 3.8 },
  // Antojitos mexicanos
  { name: "TACO, DE CARNE ASADA", calories: 226, protein: 12, carbs: 18, fat: 12, fiber: 2 },
  { name: "TACO, DE PASTOR", calories: 217, protein: 10, carbs: 20, fat: 11, fiber: 2 },
  { name: "TACO, DE CARNITAS", calories: 248, protein: 11, carbs: 17, fat: 15, fiber: 2 },
  { name: "QUESADILLA, DE QUESO", calories: 298, protein: 11, carbs: 28, fat: 16, fiber: 2 },
  { name: "GORDITA", calories: 302, protein: 9, carbs: 32, fat: 15, fiber: 3 },
  { name: "SOPE", calories: 270, protein: 8, carbs: 30, fat: 13, fiber: 3 },
  { name: "TOSTADA, CON FRIJOLES", calories: 189, protein: 6.5, carbs: 25, fat: 7.5, fiber: 4 },
  { name: "ENCHILADA, VERDE", calories: 175, protein: 8, carbs: 18, fat: 8, fiber: 2 },
  { name: "ENCHILADA, ROJA", calories: 180, protein: 8, carbs: 19, fat: 8.5, fiber: 2 },
  { name: "CHILAQUILES, VERDES", calories: 210, protein: 7, carbs: 22, fat: 11, fiber: 3 },
  { name: "CHILAQUILES, ROJOS", calories: 215, protein: 7, carbs: 23, fat: 11, fiber: 3 },
  { name: "POZOLE, ROJO", calories: 120, protein: 9, carbs: 14, fat: 3, fiber: 2 },
  { name: "POZOLE, VERDE", calories: 115, protein: 9, carbs: 13, fat: 3, fiber: 2 },
  { name: "TAMAL, DE POLLO", calories: 180, protein: 7, carbs: 20, fat: 8, fiber: 2 },
  { name: "TAMAL, DE CERDO", calories: 210, protein: 8, carbs: 21, fat: 11, fiber: 2 },
  { name: "TAMAL, DULCE", calories: 240, protein: 4, carbs: 38, fat: 9, fiber: 1 },
  { name: "ELOTE, EN VASO (ESQUITE)", calories: 165, protein: 4, carbs: 25, fat: 6, fiber: 3 },
  { name: "ELOTE, PREPARADO", calories: 210, protein: 5, carbs: 28, fat: 9, fiber: 3 },
  { name: "PAMBAZO", calories: 380, protein: 12, carbs: 42, fat: 18, fiber: 3 },
  { name: "TORTA, DE JAMON", calories: 350, protein: 15, carbs: 38, fat: 15, fiber: 2 },
  { name: "TORTA, DE MILANESA", calories: 520, protein: 22, carbs: 45, fat: 28, fiber: 3 },
  { name: "BURRITO, DE FRIJOL", calories: 295, protein: 10, carbs: 38, fat: 12, fiber: 5 },
  { name: "BURRITO, DE CARNE", calories: 370, protein: 18, carbs: 35, fat: 18, fiber: 3 },
  { name: "FLAUTAS", calories: 280, protein: 10, carbs: 25, fat: 16, fiber: 2 },
  { name: "HUARACHE", calories: 320, protein: 12, carbs: 35, fat: 15, fiber: 4 },
  { name: "TLAYUDA", calories: 450, protein: 18, carbs: 42, fat: 24, fiber: 5 },
  { name: "MEMELA", calories: 230, protein: 7, carbs: 28, fat: 10, fiber: 3 },
  { name: "MOLOTE", calories: 265, protein: 6, carbs: 30, fat: 14, fiber: 2 },
  // Bebidas
  { name: "AGUA DE JAMAICA", calories: 34, protein: 0, carbs: 8.5, fat: 0, fiber: 0 },
  { name: "AGUA DE HORCHATA", calories: 72, protein: 0.5, carbs: 15, fat: 1.2, fiber: 0 },
  { name: "AGUA DE TAMARINDO", calories: 55, protein: 0.2, carbs: 14, fat: 0, fiber: 0.2 },
  { name: "AGUA DE LIMON", calories: 40, protein: 0.1, carbs: 10, fat: 0, fiber: 0.1 },
  { name: "ATOLE, DE MAIZ", calories: 93, protein: 2.2, carbs: 18, fat: 1.5, fiber: 0.5 },
  { name: "ATOLE, DE CHOCOLATE (CHAMPURRADO)", calories: 120, protein: 3, carbs: 22, fat: 2.5, fiber: 1 },
  { name: "CAFE, NEGRO", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0 },
  { name: "CAFE, CON LECHE", calories: 67, protein: 3.4, carbs: 6.5, fat: 2.6, fiber: 0 },
  { name: "CAFE DE OLLA", calories: 45, protein: 0.2, carbs: 11, fat: 0, fiber: 0 },
  { name: "TE, SIN AZUCAR", calories: 1, protein: 0, carbs: 0.2, fat: 0, fiber: 0 },
  { name: "CHOCOLATE CALIENTE", calories: 113, protein: 3.8, carbs: 15.8, fat: 4.2, fiber: 0.8 },
  { name: "REFRESCO, COLA", calories: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0 },
  { name: "REFRESCO, NARANJA", calories: 48, protein: 0, carbs: 12.3, fat: 0, fiber: 0 },
  { name: "JUGO, DE NARANJA NATURAL", calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2 },
  { name: "JUGO, DE TORONJA", calories: 39, protein: 0.5, carbs: 9.2, fat: 0.1, fiber: 0.1 },
  { name: "LICUADO, DE PLATANO", calories: 90, protein: 3.5, carbs: 16, fat: 1.8, fiber: 0.8 },
  { name: "LICUADO, DE MAMEY", calories: 85, protein: 3, carbs: 15, fat: 1.5, fiber: 1 },
  // Salsas y condimentos
  { name: "SALSA, VERDE", calories: 30, protein: 0.8, carbs: 5.5, fat: 0.6, fiber: 1.5 },
  { name: "SALSA, ROJA", calories: 35, protein: 1, carbs: 6, fat: 0.8, fiber: 1.8 },
  { name: "SALSA, DE MOLCAJETE", calories: 32, protein: 0.9, carbs: 5.8, fat: 0.7, fiber: 1.6 },
  { name: "GUACAMOLE", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: "PICO DE GALLO", calories: 21, protein: 0.9, carbs: 4.5, fat: 0.2, fiber: 1.3 },
  { name: "MOLE, POBLANO", calories: 165, protein: 4, carbs: 14, fat: 10.5, fiber: 2.5 },
  { name: "MOLE, NEGRO", calories: 180, protein: 4.5, carbs: 16, fat: 11, fiber: 3 },
  { name: "ADOBO", calories: 85, protein: 2, carbs: 12, fat: 3.5, fiber: 2 },
  { name: "RECAUDO ROJO", calories: 78, protein: 2.5, carbs: 10, fat: 3, fiber: 2.5 },
  { name: "SALSA, DE HABANERO", calories: 45, protein: 1.5, carbs: 8, fat: 0.5, fiber: 2 },
  { name: "SALSA, INGLESA", calories: 78, protein: 0, carbs: 19.4, fat: 0, fiber: 0 },
  { name: "SALSA, DE SOYA", calories: 53, protein: 5.6, carbs: 4.9, fat: 0.1, fiber: 0.4 },
  { name: "SALSA, BOTANERA", calories: 42, protein: 1, carbs: 8, fat: 0.5, fiber: 1 },
  // Oleaginosas
  { name: "CACAHUATE", calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5 },
  { name: "NUEZ", calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
  { name: "ALMENDRA", calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5 },
  { name: "PIÑON", calories: 673, protein: 13.7, carbs: 13.1, fat: 68.4, fiber: 3.7 },
  { name: "PEPITA DE CALABAZA", calories: 559, protein: 30.2, carbs: 10.7, fat: 49.1, fiber: 6 },
  { name: "SEMILLA DE GIRASOL", calories: 584, protein: 20.8, carbs: 20, fat: 51.5, fiber: 8.6 },
  { name: "AJONJOLI", calories: 573, protein: 17.7, carbs: 23.5, fat: 49.7, fiber: 11.8 },
  { name: "CHIA", calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 },
  { name: "LINAZA", calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 },
  // Botanas
  { name: "PALOMITAS, CON SAL", calories: 387, protein: 12.9, carbs: 77.8, fat: 4.5, fiber: 14.5 },
  { name: "PALOMITAS, CON MANTEQUILLA", calories: 535, protein: 9.5, carbs: 55, fat: 30, fiber: 10 },
  { name: "PAPAS FRITAS", calories: 536, protein: 7, carbs: 53, fat: 34.6, fiber: 4.8 },
  { name: "TOTOPOS", calories: 489, protein: 7.5, carbs: 60, fat: 24.5, fiber: 5.5 },
  { name: "DORITOS", calories: 500, protein: 6.5, carbs: 58, fat: 27, fiber: 4 },
  { name: "CACAHUATES, JAPONESES", calories: 485, protein: 14, carbs: 54, fat: 24, fiber: 5 },
  { name: "FRITURAS, DE MAIZ", calories: 520, protein: 5, carbs: 55, fat: 32, fiber: 3 },
  { name: "CHURRITOS", calories: 510, protein: 6, carbs: 58, fat: 28, fiber: 4 },
  // Postres
  { name: "FLAN", calories: 145, protein: 4.5, carbs: 22, fat: 4.5, fiber: 0 },
  { name: "ARROZ CON LECHE", calories: 130, protein: 3.5, carbs: 22, fat: 3, fiber: 0.3 },
  { name: "CAPIROTADA", calories: 280, protein: 6, carbs: 45, fat: 9, fiber: 2 },
  { name: "CHURROS", calories: 380, protein: 4, carbs: 45, fat: 21, fiber: 1.5 },
  { name: "BUÑUELOS", calories: 370, protein: 5, carbs: 50, fat: 17, fiber: 1 },
  { name: "PASTEL, DE CHOCOLATE", calories: 367, protein: 5, carbs: 50, fat: 17, fiber: 2.4 },
  { name: "PASTEL, DE VAINILLA", calories: 350, protein: 4.5, carbs: 52, fat: 14, fiber: 0.5 },
  { name: "PASTEL, DE TRES LECHES", calories: 295, protein: 5, carbs: 42, fat: 12, fiber: 0 },
  { name: "HELADO, DE VAINILLA", calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0.7 },
  { name: "HELADO, DE CHOCOLATE", calories: 216, protein: 3.8, carbs: 28, fat: 11, fiber: 1.3 },
  { name: "PALETA, DE HIELO", calories: 65, protein: 0, carbs: 16, fat: 0, fiber: 0 },
  { name: "PALETA, DE LECHE", calories: 145, protein: 2.5, carbs: 24, fat: 4.5, fiber: 0 },
  { name: "NIEVE, DE LIMON", calories: 95, protein: 0.1, carbs: 24, fat: 0, fiber: 0.1 },
  { name: "RASPADO", calories: 80, protein: 0, carbs: 20, fat: 0, fiber: 0 },
  { name: "JERICALLA", calories: 180, protein: 5, carbs: 26, fat: 6.5, fiber: 0 },
  { name: "CHONGOS ZAMORANOS", calories: 165, protein: 5, carbs: 28, fat: 4, fiber: 0 },
  { name: "DULCE DE LECHE (CAJETA)", calories: 315, protein: 6.8, carbs: 55.4, fat: 7.4, fiber: 0 },
  { name: "ATE DE MEMBRILLO", calories: 264, protein: 0.2, carbs: 66, fat: 0, fiber: 1.3 },
  { name: "COCADA", calories: 365, protein: 3.5, carbs: 55, fat: 15, fiber: 2 },
  { name: "ALEGRIA", calories: 420, protein: 12, carbs: 68, fat: 12, fiber: 4 },
  { name: "PALANQUETA", calories: 465, protein: 15, carbs: 58, fat: 21, fiber: 3 },
  { name: "MAZAPAN", calories: 520, protein: 18, carbs: 40, fat: 35, fiber: 5 },
  { name: "CAMOTE ENMIELADO", calories: 180, protein: 1.2, carbs: 44, fat: 0.2, fiber: 2.5 },
  { name: "CALABAZA EN TACHA", calories: 195, protein: 0.8, carbs: 50, fat: 0.1, fiber: 1.5 },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function logStep(step: string, data?: any) {
  console.log(`[IMPORT-BAM] ${step}`, data ? JSON.stringify(data) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting BAM import...");
    
    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    // Process in batches
    for (let i = 0; i < BAM_FOODS.length; i += BATCH_SIZE) {
      const batch = BAM_FOODS.slice(i, i + BATCH_SIZE);
      
      const foodsToInsert = batch.map(food => ({
        name: food.name,
        name_normalized: normalizeText(food.name),
        calories_per_100g: food.calories || 0,
        protein_per_100g: food.protein || 0,
        carbs_per_100g: food.carbs || 0,
        fat_per_100g: food.fat || 0,
        fiber_per_100g: food.fiber || 0,
        source: 'BAM',
        category: 'ingrediente',
        is_recipe: false,
        is_verified: true,
        verified: true,
        cuisine_origin: 'mexicana'
      }));

      // Use upsert to avoid duplicates (based on name_normalized)
      const { data, error } = await supabase
        .from('foods')
        .upsert(foodsToInsert, { 
          onConflict: 'name_normalized',
          ignoreDuplicates: true 
        })
        .select();

      if (error) {
        logStep(`Batch ${i / BATCH_SIZE + 1} error:`, error);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
        skipped += batch.length - (data?.length || 0);
        logStep(`Batch ${i / BATCH_SIZE + 1} completed`, { inserted: data?.length, total: batch.length });
      }
    }

    const result = {
      success: true,
      message: `BAM import completed`,
      stats: {
        total_foods: BAM_FOODS.length,
        inserted,
        skipped,
        errors
      }
    };

    logStep("Import completed", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error during import", { error: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

