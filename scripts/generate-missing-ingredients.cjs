// Script para gerar os 36 ingredientes faltantes formatados
const fs = require('fs');
const path = require('path');

const missingIngredients = `
  // PROTEÍNAS - ADICIONAIS
  chickpeas: { kcal: 164, prot: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, portion: 100, contains: [], display_name_pt: "Grão-de-bico cozido", display_name_en: "Boiled chickpeas", display_name_es: "Garbanzos cocidos" },
  tofu: { kcal: 76, prot: 8.1, carbs: 1.9, fat: 4.8, fiber: 0.3, portion: 100, contains: [], display_name_pt: "Tofu", display_name_en: "Tofu", display_name_es: "Tofu" },
  beef_chuck: { kcal: 178, prot: 26, carbs: 0, fat: 8, fiber: 0, portion: 120, contains: [], display_name_pt: "Músculo bovino", display_name_en: "Beef chuck", display_name_es: "Músculo de res" },
  beef_rump_steak: { kcal: 158, prot: 27, carbs: 0, fat: 5, fiber: 0, portion: 120, contains: [], display_name_pt: "Coxão mole grelhado", display_name_en: "Grilled rump steak", display_name_es: "Filete de cadera" },
  pork_loin: { kcal: 171, prot: 27, carbs: 0, fat: 6.5, fiber: 0, portion: 120, contains: [], display_name_pt: "Lombo de porco assado", display_name_en: "Roasted pork loin", display_name_es: "Lomo de cerdo" },
  pork_chop: { kcal: 231, prot: 25, carbs: 0, fat: 14, fiber: 0, portion: 120, contains: [], display_name_pt: "Costeleta de porco grelhada", display_name_en: "Grilled pork chop", display_name_es: "Chuleta de cerdo" },
  turkey_breast: { kcal: 135, prot: 29, carbs: 0, fat: 1.7, fiber: 0, portion: 120, contains: [], display_name_pt: "Peito de peru assado", display_name_en: "Roasted turkey breast", display_name_es: "Pechuga de pavo" },
  tuna_steak: { kcal: 144, prot: 30, carbs: 0, fat: 1.5, fiber: 0, portion: 120, contains: [], display_name_pt: "Atum fresco grelhado", display_name_en: "Grilled tuna steak", display_name_es: "Filete de atún" },

  // CARBOIDRATOS - ADICIONAIS
  yam: { kcal: 97, prot: 1.5, carbs: 23.2, fat: 0.2, fiber: 1.5, portion: 150, contains: [], display_name_pt: "Inhame cozido", display_name_en: "Boiled yam", display_name_es: "Ñame cocido", carb_category: 'accepted_whole' },
  rice_noodles: { kcal: 109, prot: 1.8, carbs: 24.9, fat: 0.1, fiber: 0.4, portion: 100, contains: [], display_name_pt: "Macarrão de arroz cozido", display_name_en: "Cooked rice noodles", display_name_es: "Fideos de arroz", carb_category: 'neutral_base' },
  sweet_corn: { kcal: 96, prot: 3.4, carbs: 21, fat: 1.5, fiber: 2, portion: 100, contains: [], display_name_pt: "Milho verde cozido", display_name_en: "Boiled sweet corn", display_name_es: "Maíz dulce", carb_category: 'accepted_whole' },
  plantain: { kcal: 122, prot: 1.3, carbs: 31.9, fat: 0.4, fiber: 2.3, portion: 150, contains: [], display_name_pt: "Banana-da-terra cozida", display_name_en: "Boiled plantain", display_name_es: "Plátano cocido", carb_category: 'neutral_base' },
  barley: { kcal: 123, prot: 2.3, carbs: 28.2, fat: 0.4, fiber: 3.8, portion: 100, contains: ["gluten"], display_name_pt: "Cevada cozida", display_name_en: "Cooked barley", display_name_es: "Cebada cocida", carb_category: 'accepted_whole' },

  // LEGUMINOSAS - ADICIONAIS
  black_beans: { kcal: 77, prot: 4.5, carbs: 14, fat: 0.5, fiber: 8.4, portion: 100, contains: [], display_name_pt: "Feijão preto", display_name_en: "Black beans", display_name_es: "Frijoles negros" },

  // VEGETAIS - ADICIONAIS
  boiled_asparagus: { kcal: 20, prot: 2.2, carbs: 3.9, fat: 0.1, fiber: 2, portion: 80, contains: [], display_name_pt: "Aspargos cozidos", display_name_en: "Boiled asparagus", display_name_es: "Espárragos cocidos" },
  sauteed_mushroom: { kcal: 22, prot: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, portion: 80, contains: [], display_name_pt: "Cogumelos refogados", display_name_en: "Sautéed mushrooms", display_name_es: "Champiñones salteados" },
  radish: { kcal: 16, prot: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6, portion: 50, contains: [], display_name_pt: "Rabanete", display_name_en: "Radish", display_name_es: "Rábano" },

  // FRUTAS - ADICIONAIS
  peach: { kcal: 39, prot: 0.9, carbs: 9.5, fat: 0.3, fiber: 1.5, portion: 150, contains: [], display_name_pt: "Pêssego", display_name_en: "Peach", display_name_es: "Durazno" },
  plum: { kcal: 46, prot: 0.7, carbs: 11.4, fat: 0.3, fiber: 1.4, portion: 100, contains: [], display_name_pt: "Ameixa", display_name_en: "Plum", display_name_es: "Ciruela" },
  fig: { kcal: 74, prot: 0.8, carbs: 19.2, fat: 0.3, fiber: 2.9, portion: 100, contains: [], display_name_pt: "Figo", display_name_en: "Fig", display_name_es: "Higo" },
  blueberry: { kcal: 57, prot: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, portion: 100, contains: [], display_name_pt: "Mirtilo", display_name_en: "Blueberry", display_name_es: "Arándano" },
  raspberry: { kcal: 52, prot: 1.2, carbs: 11.9, fat: 0.7, fiber: 6.5, portion: 100, contains: [], display_name_pt: "Framboesa", display_name_en: "Raspberry", display_name_es: "Frambuesa" },
  blackberry: { kcal: 43, prot: 1.4, carbs: 9.6, fat: 0.5, fiber: 5.3, portion: 100, contains: [], display_name_pt: "Amora", display_name_en: "Blackberry", display_name_es: "Mora" },
  cherry: { kcal: 63, prot: 1.1, carbs: 16, fat: 0.2, fiber: 2.1, portion: 100, contains: [], display_name_pt: "Cereja", display_name_en: "Cherry", display_name_es: "Cereza" },
  passion_fruit: { kcal: 97, prot: 2.2, carbs: 23.4, fat: 0.7, fiber: 10.4, portion: 100, contains: [], display_name_pt: "Maracujá", display_name_en: "Passion fruit", display_name_es: "Maracuyá" },

  // LATICÍNIOS - ADICIONAIS
  butter: { kcal: 717, prot: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, portion: 10, contains: ["lactose"], display_name_pt: "Manteiga", display_name_en: "Butter", display_name_es: "Mantequilla" },
  parmesan_cheese: { kcal: 392, prot: 35.8, carbs: 3.2, fat: 25.6, fiber: 0, portion: 20, contains: ["lactose"], display_name_pt: "Queijo parmesão", display_name_en: "Parmesan cheese", display_name_es: "Queso parmesano" },
  cheddar_cheese: { kcal: 403, prot: 24.9, carbs: 1.3, fat: 33.1, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Queijo cheddar", display_name_en: "Cheddar cheese", display_name_es: "Queso cheddar" },

  // BEBIDAS - ADICIONAIS
  apple_juice: { kcal: 46, prot: 0.1, carbs: 11.3, fat: 0.1, fiber: 0.2, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de maçã natural", display_name_en: "Fresh apple juice", display_name_es: "Jugo de manzana" },
  grape_juice: { kcal: 61, prot: 0.6, carbs: 15.2, fat: 0.1, fiber: 0.3, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de uva natural", display_name_en: "Fresh grape juice", display_name_es: "Jugo de uva" },
  tomato_juice: { kcal: 17, prot: 0.8, carbs: 3.9, fat: 0.1, fiber: 0.5, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de tomate", display_name_en: "Tomato juice", display_name_es: "Jugo de tomate" },
  ginger_tea: { kcal: 2, prot: 0, carbs: 0.4, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de gengibre", display_name_en: "Ginger tea", display_name_es: "Té de jengibre" },
  peppermint_tea: { kcal: 1, prot: 0, carbs: 0.2, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de hortelã", display_name_en: "Peppermint tea", display_name_es: "Té de menta" },

  // GORDURAS - ADICIONAIS
  almonds: { kcal: 579, prot: 21.2, carbs: 21.7, fat: 49.9, fiber: 12.5, portion: 20, contains: [], display_name_pt: "Amêndoas", display_name_en: "Almonds", display_name_es: "Almendras" },
  olives: { kcal: 115, prot: 0.8, carbs: 6.3, fat: 10.7, fiber: 3.2, portion: 30, contains: [], display_name_pt: "Azeitonas", display_name_en: "Olives", display_name_es: "Aceitunas" },

  // SEMENTES - ADICIONAIS
  sunflower_seeds: { kcal: 584, prot: 20.8, carbs: 20, fat: 51.5, fiber: 8.6, portion: 20, contains: [], display_name_pt: "Sementes de girassol", display_name_en: "Sunflower seeds", display_name_es: "Semillas de girasol" },
  pumpkin_seeds: { kcal: 559, prot: 30.2, carbs: 14.7, fat: 49, fiber: 6, portion: 20, contains: [], display_name_pt: "Sementes de abóbora", display_name_en: "Pumpkin seeds", display_name_es: "Semillas de calabaza" },
`;

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('📝 36 INGREDIENTES FALTANTES - CÓDIGO FORMATADO');
console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log(missingIngredients);
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('✅ Copie e cole este código no local correto do meal-ingredients-db.ts');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Salvar em arquivo
const outputPath = path.join(__dirname, '..', 'INGREDIENTES_FALTANTES.txt');
fs.writeFileSync(outputPath, missingIngredients.trim());
console.log(`📁 Código salvo em: ${outputPath}\n`);
