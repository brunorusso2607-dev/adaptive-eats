// Script para importar decomposição de alimentos processados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 IMPORTANDO DECOMPOSIÇÃO DE ALIMENTOS\n");
console.log("Total esperado: 554 alimentos processados\n");

// Dados completos de decomposição
const foodDecomposition = {
  en: [
    { name: "5-hour energy", ingredients: ["cafeína", "vitaminas do complexo b"], category: "Shot energético" },
    { name: "À milanesa", ingredients: ["trigo", "ovo", "farinha de rosca", "óleo"], category: "Preparo" },
    { name: "A2 milk", ingredients: ["leite"], category: "Laticínio" },
    { name: "Achocolatado", ingredients: ["cacau", "açúcar", "leite"], category: "Bebida" },
    { name: "Açúcar de confeiteiro", ingredients: ["açúcar", "amido de milho"], category: "Ingrediente" },
    { name: "Aged cheese", ingredients: ["leite", "coalho", "sal"], category: "Queijo" },
    { name: "Agridoce", ingredients: ["açúcar", "vinagre", "tomate"], category: "Molho" },
    { name: "Aioli", ingredients: ["alho", "ovo", "azeite"], category: "Molho" },
    { name: "Alho frito", ingredients: ["alho", "óleo"], category: "Preparo simples" },
    { name: "Almond butter", ingredients: ["amêndoa"], category: "Pasta" },
    { name: "Almond milk", ingredients: ["amêndoa", "água"], category: "Leite vegetal" },
    { name: "Almôndega de soja", ingredients: ["proteína de soja", "cebola", "alho"], category: "Proteína vegetal" },
    { name: "American cheese", ingredients: ["leite", "soro de leite", "emulsificantes"], category: "Queijo processado" },
    { name: "Amp energy", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Arepa", ingredients: ["farinha de milho", "água", "sal"], category: "Pão" },
    { name: "Baba ghanoush", ingredients: ["berinjela", "tahine", "alho", "azeite", "limão"], category: "Pasta árabe" },
    { name: "Bagel", ingredients: ["trigo", "fermento"], category: "Pão" },
    { name: "Bagels", ingredients: ["farinha de trigo", "fermento", "sal", "malte"], category: "Pão" },
    { name: "Baklava", ingredients: ["massa filo", "nozes", "pistache", "mel", "manteiga"], category: "Doce árabe" },
    { name: "Banana bread", ingredients: ["banana", "trigo", "açúcar", "ovo"], category: "Bolo" },
    { name: "Bang energy", ingredients: ["cafeína", "aminoácidos"], category: "Energético" },
    { name: "Barbecue", ingredients: ["tomate", "açúcar", "vinagre", "especiarias"], category: "Molho" },
    { name: "Beer", ingredients: ["barley", "malt", "hops", "yeast"], category: "Bebida alcoólica" },
    { name: "Beignet", ingredients: ["trigo", "ovo", "leite", "açúcar"], category: "Doce" },
    { name: "Bhaji", ingredients: ["cebola", "grão de bico", "especiarias"], category: "Frito" },
    { name: "Biryani", ingredients: ["arroz", "especiarias", "carne"], category: "Prato indiano" },
    { name: "Biscoito", ingredients: ["trigo", "açúcar", "manteiga"], category: "Biscoito" },
    { name: "Blue cheese", ingredients: ["leite", "penicillium", "sal"], category: "Queijo azul" },
    { name: "Boiled eggs", ingredients: ["ovo"], category: "Preparo simples" },
    { name: "Brioche", ingredients: ["trigo", "manteiga", "ovo", "açúcar"], category: "Pão doce" },
    { name: "Brownie", ingredients: ["chocolate", "manteiga", "açúcar", "ovo", "trigo"], category: "Doce" },
    { name: "Buñuelo", ingredients: ["trigo", "ovo", "açúcar"], category: "Doce" },
    { name: "Burrito", ingredients: ["trigo", "feijão", "arroz", "carne"], category: "Prato mexicano" },
    { name: "Buttercream", ingredients: ["manteiga", "açúcar"], category: "Cobertura" },
    { name: "Butterfinger", ingredients: ["amendoim", "chocolate", "açúcar"], category: "Chocolate" },
    { name: "Buttermilk", ingredients: ["leite", "bactérias lácticas"], category: "Leitelho" },
    { name: "Caffeinated candy", ingredients: ["sugar", "caffeine"], category: "Bala" },
    { name: "Caffeinated gum", ingredients: ["cafeína", "goma base", "açúcar"], category: "Chiclete" },
    { name: "Caffeinated mints", ingredients: ["cafeína", "açúcar", "menta"], category: "Bala" },
    { name: "Candy", ingredients: ["sugar", "corn syrup"], category: "Doce" },
    { name: "Canned fruit in syrup", ingredients: ["fruit", "sugar", "water"], category: "Conserva" },
    { name: "Cannoli", ingredients: ["trigo", "ricota", "açúcar", "chocolate"], category: "Doce italiano" },
    { name: "Cappelletti", ingredients: ["trigo", "ovo", "carne"], category: "Massa" },
    { name: "Cappuccino", ingredients: ["café", "leite", "espuma de leite"], category: "Bebida" },
    { name: "Carpaccio", ingredients: ["carne crua", "azeite", "limão"], category: "Prato" },
    { name: "Carrot cake", ingredients: ["cenoura", "trigo", "açúcar", "ovo", "nozes"], category: "Bolo" },
    { name: "Cashew butter", ingredients: ["castanha de caju"], category: "Pasta" },
    { name: "Cashew cheese", ingredients: ["castanha de caju", "fermento nutricional"], category: "Queijo vegano" },
    { name: "Cashew milk", ingredients: ["castanha de caju", "água"], category: "Leite vegetal" },
    { name: "Cereal", ingredients: ["milho", "trigo", "açúcar"], category: "Cereal" },
    { name: "Ceviche", ingredients: ["peixe", "limão", "cebola"], category: "Prato" },
    { name: "Challah", ingredients: ["trigo", "ovo", "mel"], category: "Pão" },
    { name: "Challah bread", ingredients: ["wheat flour", "egg", "sugar", "yeast"], category: "Pão" },
    { name: "Chapati", ingredients: ["farinha de trigo integral", "água", "óleo"], category: "Pão indiano" },
    { name: "Charlotte", ingredients: ["biscoito", "creme", "frutas"], category: "Sobremesa" },
    { name: "Cheddar cheese", ingredients: ["leite", "coalho", "sal"], category: "Queijo" },
    { name: "Cheesecake", ingredients: ["cream cheese", "açúcar", "ovo", "biscoito"], category: "Torta" },
    { name: "Chimichanga", ingredients: ["tortilha", "carne", "feijão", "queijo"], category: "Prato mexicano" },
    { name: "Chimichurri", ingredients: ["salsa", "alho", "orégano", "vinagre", "azeite"], category: "Molho" },
    { name: "Chocolate", ingredients: ["cacau", "açúcar", "leite"], category: "Chocolate" },
    { name: "Churro", ingredients: ["trigo", "açúcar", "óleo"], category: "Doce" },
    { name: "Chutney", ingredients: ["frutas", "especiarias", "açúcar"], category: "Molho" },
    { name: "Coca-cola", ingredients: ["cafeína", "açúcar", "ácido fosfórico"], category: "Refrigerante" },
    { name: "Coca-cola zero", ingredients: ["cafeína", "aspartame", "ácido fosfórico"], category: "Refrigerante diet" },
    { name: "Condensed milk", ingredients: ["leite", "açúcar"], category: "Leite condensado" },
    { name: "Cookie", ingredients: ["trigo", "manteiga", "açúcar", "ovo", "chocolate"], category: "Biscoito" },
    { name: "Crackers", ingredients: ["wheat flour", "oil", "salt"], category: "Biscoito" },
    { name: "Crème brûlée", ingredients: ["creme de leite", "ovo", "açúcar", "baunilha"], category: "Sobremesa" },
    { name: "Crostini", ingredients: ["pão", "azeite"], category: "Aperitivo" },
    { name: "Cupcake", ingredients: ["trigo", "ovo", "açúcar", "manteiga"], category: "Bolo" },
    { name: "Curry", ingredients: ["especiarias", "leite de coco"], category: "Molho" },
    { name: "Dal", ingredients: ["lentilha", "especiarias"], category: "Prato indiano" },
    { name: "Donut", ingredients: ["trigo", "açúcar", "ovo", "leite"], category: "Doce" },
    { name: "Dosa", ingredients: ["arroz", "lentilha"], category: "Prato indiano" },
    { name: "Dulce de leche", ingredients: ["leite", "açúcar"], category: "Doce de leite" },
    { name: "Éclair", ingredients: ["trigo", "ovo", "manteiga", "creme", "chocolate"], category: "Doce" },
    { name: "Edamame", ingredients: ["soja"], category: "Leguminosa" },
    { name: "Empanada", ingredients: ["trigo", "carne"], category: "Salgado" },
    { name: "Enchilada", ingredients: ["milho", "carne", "queijo", "molho"], category: "Prato mexicano" },
    { name: "Energy drinks", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Energy shots", ingredients: ["cafeína", "vitaminas"], category: "Energético" },
    { name: "Evaporated milk", ingredients: ["leite"], category: "Leite evaporado" },
    { name: "Fajita", ingredients: ["carne", "pimentão", "cebola", "tortilha"], category: "Prato mexicano" },
    { name: "Falafel", ingredients: ["grão de bico", "especiarias"], category: "Frito" },
    { name: "Fermented soy products", ingredients: ["soja fermentada", "sal"], category: "Soja" },
    { name: "Fettuccine", ingredients: ["trigo", "ovo"], category: "Massa" },
    { name: "Flan", ingredients: ["leite", "ovo", "açúcar"], category: "Sobremesa" },
    { name: "Flavored yogurt", ingredients: ["milk", "sugar", "flavoring"], category: "Iogurte" },
    { name: "Fondant", ingredients: ["açúcar", "glucose"], category: "Cobertura" },
    { name: "French toast", ingredients: ["pão", "leite", "ovo", "açúcar", "canela"], category: "Prato" },
    { name: "Fruit preserves", ingredients: ["frutas", "açúcar", "sulfito"], category: "Conserva" },
    { name: "Fruit roll-ups", ingredients: ["fruit", "sugar", "corn syrup"], category: "Doce" },
    { name: "Fruit-flavored yogurt", ingredients: ["milk", "fruit", "sugar"], category: "Iogurte" },
    { name: "Ganache", ingredients: ["chocolate", "creme de leite"], category: "Cobertura" },
    { name: "Gelato", ingredients: ["leite", "açúcar", "ovo"], category: "Sorvete" },
    { name: "Gianduja", ingredients: ["avelã", "chocolate", "açúcar"], category: "Chocolate" },
    { name: "Gnocchi", ingredients: ["batata", "farinha de trigo", "ovo"], category: "Massa" },
    { name: "Groundnut butter", ingredients: ["amendoim"], category: "Pasta" },
    { name: "Gyoza", ingredients: ["trigo", "carne", "repolho"], category: "Massa" },
    { name: "Hummus", ingredients: ["grão de bico", "tahine", "limão", "alho"], category: "Pasta" },
    { name: "Idli", ingredients: ["arroz", "lentilha"], category: "Prato indiano" },
    { name: "Kebab", ingredients: ["carne", "especiarias"], category: "Prato" },
    { name: "Korma", ingredients: ["creme", "castanha", "especiarias"], category: "Molho indiano" },
    { name: "Lupin bread", ingredients: ["lupin flour", "wheat flour", "yeast"], category: "Pão" },
    { name: "Lupin crackers", ingredients: ["lupin flour", "wheat flour"], category: "Biscoito" },
    { name: "Lupin milk", ingredients: ["tremoço", "água"], category: "Leite vegetal" },
    { name: "Lupin pasta", ingredients: ["lupin flour", "wheat flour"], category: "Massa" },
    { name: "Macaron", ingredients: ["amêndoa", "açúcar", "clara de ovo"], category: "Doce" },
    { name: "Malasada", ingredients: ["trigo", "ovo", "açúcar", "leite"], category: "Doce" },
    { name: "Malted milk", ingredients: ["leite", "malte de cevada"], category: "Bebida" },
    { name: "Marzipan", ingredients: ["amêndoa", "açúcar"], category: "Doce" },
    { name: "Massaman", ingredients: ["especiarias", "leite de coco", "amendoim"], category: "Molho tailandês" },
    { name: "Merengue", ingredients: ["clara de ovo", "açúcar"], category: "Doce" },
    { name: "Milk shake", ingredients: ["leite", "sorvete", "açúcar"], category: "Bebida" },
    { name: "Mixed nuts", ingredients: ["amêndoa", "castanha de caju", "noz", "avelã", "macadâmia"], category: "Mix" },
    { name: "Mocha", ingredients: ["café", "chocolate", "leite"], category: "Bebida" },
    { name: "Monster energy", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Muffin", ingredients: ["trigo", "ovo", "açúcar", "manteiga"], category: "Bolo" },
    { name: "Naan", ingredients: ["trigo", "iogurte", "fermento"], category: "Pão indiano" },
    { name: "Nachos", ingredients: ["milho", "queijo"], category: "Salgado" },
    { name: "Nos energy drink", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Nougat", ingredients: ["amêndoa", "mel", "clara de ovo"], category: "Doce" },
    { name: "Nuggets", ingredients: ["frango", "trigo"], category: "Frito" },
    { name: "Nut-flavored", ingredients: ["nuts", "flavoring"], category: "Sabor" },
    { name: "Pad thai", ingredients: ["macarrão de arroz", "amendoim", "ovo", "camarão"], category: "Prato tailandês" },
    { name: "Pakora", ingredients: ["grão de bico", "legumes"], category: "Frito indiano" },
    { name: "Palak", ingredients: ["espinafre", "especiarias"], category: "Prato indiano" },
    { name: "Palmier", ingredients: ["trigo", "manteiga", "açúcar"], category: "Doce" },
    { name: "Paneer", ingredients: ["leite", "coalho"], category: "Queijo indiano" },
    { name: "Panna cotta", ingredients: ["creme de leite", "açúcar", "gelatina"], category: "Sobremesa" },
    { name: "Papadum", ingredients: ["farinha de lentilha", "óleo", "sal"], category: "Biscoito indiano" },
    { name: "Parfait", ingredients: ["iogurte", "granola", "frutas"], category: "Sobremesa" },
    { name: "Pavlova", ingredients: ["clara de ovo", "açúcar", "creme", "frutas"], category: "Sobremesa" },
    { name: "Peanut butter", ingredients: ["amendoim"], category: "Pasta" },
    { name: "Penne", ingredients: ["trigo"], category: "Massa" },
    { name: "Pepsi", ingredients: ["cafeína", "açúcar", "ácido fosfórico"], category: "Refrigerante" },
    { name: "Pepsi max", ingredients: ["cafeína", "aspartame"], category: "Refrigerante diet" },
    { name: "Pesto", ingredients: ["manjericão", "pinhão", "parmesão", "azeite", "alho"], category: "Molho" },
    { name: "Pizza", ingredients: ["trigo", "fermento", "queijo", "tomate", "azeite"], category: "Pizza" },
    { name: "Poke", ingredients: ["peixe", "arroz", "alga"], category: "Prato havaiano" },
    { name: "Pound cake", ingredients: ["trigo", "manteiga", "açúcar", "ovo"], category: "Bolo" },
    { name: "Praline", ingredients: ["amêndoa", "açúcar"], category: "Doce" },
    { name: "Prawn crackers", ingredients: ["shrimp", "tapioca starch"], category: "Biscoito" },
    { name: "Pre-workout supplements", ingredients: ["cafeína", "beta-alanina", "creatina"], category: "Suplemento" },
    { name: "Pretzel", ingredients: ["trigo", "fermento", "sal"], category: "Biscoito" },
    { name: "Profiterole", ingredients: ["trigo", "ovo", "manteiga", "creme"], category: "Doce" },
    { name: "Pumpernickel bread", ingredients: ["rye flour", "wheat flour", "yeast"], category: "Pão" },
    { name: "Pupusa", ingredients: ["milho", "queijo", "feijão"], category: "Prato" },
    { name: "Quesadilla", ingredients: ["trigo", "queijo"], category: "Prato mexicano" },
    { name: "Raita", ingredients: ["iogurte", "pepino", "especiarias"], category: "Molho indiano" },
    { name: "Ramen", ingredients: ["trigo", "ovo", "carne", "shoyu"], category: "Sopa japonesa" },
    { name: "Red bull", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Red velvet", ingredients: ["trigo", "cacau", "ovo", "cream cheese"], category: "Bolo" },
    { name: "Ricotta cheese", ingredients: ["soro de leite", "leite"], category: "Queijo" },
    { name: "Rockstar energy", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Roux", ingredients: ["farinha de trigo", "manteiga"], category: "Base" },
    { name: "Rye bread", ingredients: ["rye flour", "wheat flour", "yeast"], category: "Pão" },
    { name: "Sabayon", ingredients: ["ovo", "açúcar", "vinho"], category: "Creme" },
    { name: "Samosa", ingredients: ["trigo", "batata", "ervilha", "especiarias"], category: "Frito indiano" },
    { name: "Scrambled eggs", ingredients: ["ovo", "leite", "manteiga"], category: "Preparo" },
    { name: "Seafood flavoring", ingredients: ["extrato de peixe", "extrato de crustáceos"], category: "Tempero" },
    { name: "Seafood sticks", ingredients: ["peixe", "amido", "clara de ovo"], category: "Processado" },
    { name: "Seafood stock", ingredients: ["peixe", "crustáceos", "sal"], category: "Caldo" },
    { name: "Sesame bagel", ingredients: ["farinha de trigo", "gergelim", "fermento"], category: "Pão" },
    { name: "Sesame bread", ingredients: ["wheat flour", "sesame seeds", "yeast"], category: "Pão" },
    { name: "Sesame crackers", ingredients: ["wheat flour", "sesame seeds"], category: "Biscoito" },
    { name: "Sfogliatella", ingredients: ["trigo", "ricota", "laranja"], category: "Doce italiano" },
    { name: "Shawarma", ingredients: ["carne", "pão pita", "especiarias"], category: "Prato árabe" },
    { name: "Shortcake", ingredients: ["trigo", "manteiga", "açúcar", "creme", "morango"], category: "Bolo" },
    { name: "Shoyu", ingredients: ["soja", "trigo", "sal"], category: "Molho" },
    { name: "Smoothie", ingredients: ["fruta", "iogurte", "leite"], category: "Bebida" },
    { name: "Soft cheeses", ingredients: ["leite", "coalho", "creme"], category: "Queijo" },
    { name: "Sopapilla", ingredients: ["trigo", "fermento", "mel"], category: "Doce" },
    { name: "Sourdough bread", ingredients: ["wheat flour", "yeast", "salt"], category: "Pão" },
    { name: "Soy cheese", ingredients: ["soja", "óleo vegetal"], category: "Queijo vegano" },
    { name: "Soy milk", ingredients: ["soja", "água"], category: "Leite vegetal" },
    { name: "Soy yogurt", ingredients: ["soy milk", "cultures"], category: "Iogurte vegetal" },
    { name: "Spring roll", ingredients: ["arroz", "legumes"], category: "Rolinho" },
    { name: "Strudel", ingredients: ["trigo", "maçã", "açúcar", "canela"], category: "Doce" },
    { name: "Sushi", ingredients: ["arroz", "peixe", "alga"], category: "Prato japonês" },
    { name: "Sweetened beverages", ingredients: ["water", "sugar"], category: "Bebida" },
    { name: "Sweetened condensed milk", ingredients: ["milk", "sugar"], category: "Leite condensado" },
    { name: "Sweetened yogurt", ingredients: ["milk", "sugar", "cultures"], category: "Iogurte" },
    { name: "Swiss cheese", ingredients: ["leite", "coalho", "sal"], category: "Queijo" },
    { name: "Taco", ingredients: ["milho", "carne", "queijo"], category: "Prato mexicano" },
    { name: "Tamale", ingredients: ["milho", "carne", "especiarias"], category: "Prato mexicano" },
    { name: "Tandoori", ingredients: ["iogurte", "especiarias"], category: "Tempero indiano" },
    { name: "Tartar", ingredients: ["maionese", "pepino", "alcaparra"], category: "Molho" },
    { name: "Tartare", ingredients: ["carne crua", "alcaparra", "cebola"], category: "Prato" },
    { name: "Temaki", ingredients: ["arroz", "peixe", "alga"], category: "Prato japonês" },
    { name: "Teriyaki", ingredients: ["shoyu", "açúcar", "mirin", "gengibre"], category: "Molho" },
    { name: "Tikka masala", ingredients: ["tomate", "creme", "especiarias"], category: "Molho indiano" },
    { name: "Tiramisu", ingredients: ["mascarpone", "café", "ovo", "biscoito", "cacau"], category: "Sobremesa" },
    { name: "Tortellini", ingredients: ["farinha de trigo", "ovo", "recheio"], category: "Massa" },
    { name: "Trifle", ingredients: ["bolo", "creme", "frutas"], category: "Sobremesa" },
    { name: "Vindaloo", ingredients: ["carne", "vinagre", "especiarias"], category: "Prato indiano" },
    { name: "Vodka", ingredients: ["trigo", "batata"], category: "Bebida alcoólica" },
    { name: "Wafer", ingredients: ["farinha de trigo", "açúcar", "gordura vegetal"], category: "Biscoito" },
    { name: "Walnut butter", ingredients: ["noz"], category: "Pasta" },
    { name: "Whisky", ingredients: ["cevada", "malte"], category: "Bebida alcoólica" },
    { name: "Whole grain bread", ingredients: ["whole wheat flour", "yeast", "salt"], category: "Pão" },
    { name: "Whole grain pasta", ingredients: ["whole wheat flour"], category: "Massa" },
    { name: "Wonton", ingredients: ["farinha de trigo", "carne", "temperos"], category: "Massa" },
    { name: "Yakisoba", ingredients: ["macarrão", "legumes", "shoyu", "carne"], category: "Prato japonês" },
    { name: "Zabaglione", ingredients: ["ovo", "açúcar", "marsala"], category: "Creme" },
    { name: "Zeppole", ingredients: ["trigo", "ovo", "ricota"], category: "Doce italiano" }
  ],
  pt: [
    { name: "Açaí", ingredients: ["polpa de açaí", "açúcar", "xarope de guaraná"], category: "Sobremesa" },
    { name: "Acarajé", ingredients: ["feijão fradinho", "dendê", "camarão"], category: "Prato baiano" },
    { name: "Amendoim cozido", ingredients: ["amendoim", "sal"], category: "Preparo simples" },
    { name: "Arroz carreteiro", ingredients: ["arroz", "carne seca"], category: "Prato" },
    { name: "Arroz doce", ingredients: ["arroz", "leite", "açúcar", "canela"], category: "Sobremesa" },
    { name: "Babaganoush", ingredients: ["berinjela", "tahine", "alho"], category: "Pasta" },
    { name: "Bacon", ingredients: ["porco", "sal"], category: "Carne" },
    { name: "Baguete", ingredients: ["trigo", "fermento", "sal"], category: "Pão" },
    { name: "Baião de dois", ingredients: ["arroz", "feijão verde", "queijo coalho"], category: "Prato nordestino" },
    { name: "Barra de gergelim", ingredients: ["gergelim", "açúcar", "mel"], category: "Doce" },
    { name: "Beijinho", ingredients: ["leite condensado", "coco", "manteiga"], category: "Doce" },
    { name: "Biscoito cream cracker", ingredients: ["trigo", "sal", "gordura vegetal"], category: "Biscoito" },
    { name: "Biscoito de maisena", ingredients: ["trigo", "maisena", "açúcar", "manteiga", "ovo"], category: "Biscoito" },
    { name: "Bobó de camarão", ingredients: ["camarão", "aipim", "leite de coco", "azeite de dendê", "cebola", "alho", "pimentão"], category: "Prato baiano" },
    { name: "Bolacha", ingredients: ["trigo", "açúcar", "manteiga"], category: "Biscoito" },
    { name: "Bolo de rolo", ingredients: ["trigo", "açúcar", "ovo", "goiabada"], category: "Bolo" },
    { name: "Brigadeiro", ingredients: ["leite condensado", "chocolate", "manteiga", "leite"], category: "Doce" },
    { name: "Broa de milho", ingredients: ["fubá", "farinha de trigo", "fermento"], category: "Pão" },
    { name: "Bruschetta", ingredients: ["pão", "tomate", "azeite", "alho"], category: "Aperitivo" },
    { name: "Cajuzinho", ingredients: ["amendoim", "leite condensado", "chocolate"], category: "Doce" },
    { name: "Camarão à paulista", ingredients: ["camarão", "alho", "manteiga"], category: "Prato" },
    { name: "Camarão ao alho", ingredients: ["camarão", "alho", "azeite"], category: "Prato" },
    { name: "Camarão cozido", ingredients: ["camarão", "sal"], category: "Preparo simples" },
    { name: "Camarão grelhado", ingredients: ["camarão"], category: "Preparo simples" },
    { name: "Canjica", ingredients: ["milho branco", "leite", "açúcar"], category: "Sobremesa" },
    { name: "Carne de sol", ingredients: ["carne bovina", "sal"], category: "Carne" },
    { name: "Caruru", ingredients: ["quiabo", "camarão", "dendê"], category: "Prato baiano" },
    { name: "Castanha de baru torrada", ingredients: ["castanha de baru"], category: "Castanha" },
    { name: "Catchup", ingredients: ["tomate", "açúcar", "vinagre"], category: "Molho" },
    { name: "Cerveja", ingredients: ["cevada", "lúpulo", "fermento"], category: "Bebida alcoólica" },
    { name: "Chantilly", ingredients: ["creme de leite", "açúcar"], category: "Cobertura" },
    { name: "Charque", ingredients: ["carne bovina", "sal"], category: "Carne" },
    { name: "Chocolate ao leite", ingredients: ["cacau", "açúcar", "leite"], category: "Chocolate" },
    { name: "Chocolate branco", ingredients: ["manteiga de cacau", "açúcar", "leite"], category: "Chocolate" },
    { name: "Chopp", ingredients: ["cevada", "malte", "lúpulo", "fermento"], category: "Bebida alcoólica" },
    { name: "Churros", ingredients: ["trigo", "açúcar", "ovo", "doce de leite"], category: "Doce" },
    { name: "Ciabatta", ingredients: ["trigo", "fermento", "azeite"], category: "Pão" },
    { name: "Cocada", ingredients: ["coco", "açúcar"], category: "Doce" },
    { name: "Cottage cheese", ingredients: ["leite", "coalho", "sal"], category: "Queijo" },
    { name: "Coxinha", ingredients: ["trigo", "frango", "cebola", "alho"], category: "Salgado" },
    { name: "Cream cheese", ingredients: ["leite", "creme de leite"], category: "Queijo" },
    { name: "Cream cheese de soja", ingredients: ["soja", "óleo vegetal"], category: "Queijo vegano" },
    { name: "Creme de amêndoa", ingredients: ["amêndoa", "açúcar"], category: "Pasta" },
    { name: "Creme de amendoim", ingredients: ["amendoim", "açúcar", "óleo"], category: "Pasta" },
    { name: "Creme de avelã", ingredients: ["avelã", "açúcar", "cacau"], category: "Pasta" },
    { name: "Creme de leite", ingredients: ["leite", "gordura"], category: "Laticínio" },
    { name: "Creme de pistache", ingredients: ["pistache", "açúcar"], category: "Pasta" },
    { name: "Crepe", ingredients: ["trigo", "ovo", "leite"], category: "Massa" },
    { name: "Croissant", ingredients: ["trigo", "manteiga", "fermento", "leite"], category: "Pão" },
    { name: "Curau", ingredients: ["milho verde", "leite", "açúcar"], category: "Sobremesa" },
    { name: "Cuscuz", ingredients: ["milho", "sal"], category: "Prato" },
    { name: "Cuscuz de milho", ingredients: ["fubá", "água", "sal"], category: "Prato" },
    { name: "Cuscuz de trigo", ingredients: ["sêmola de trigo", "água"], category: "Prato" },
    { name: "Doce de amendoim", ingredients: ["amendoim", "açúcar"], category: "Doce" },
    { name: "Doce de leite", ingredients: ["leite", "açúcar"], category: "Doce" },
    { name: "Empada", ingredients: ["trigo", "manteiga", "ovo"], category: "Salgado" },
    { name: "Empadão", ingredients: ["trigo", "frango", "palmito", "azeitona"], category: "Torta salgada" },
    { name: "Escondidinho", ingredients: ["mandioca", "carne", "queijo"], category: "Prato" },
    { name: "Esfiha", ingredients: ["trigo", "fermento", "carne"], category: "Salgado" },
    { name: "Farofa", ingredients: ["mandioca", "manteiga"], category: "Acompanhamento" },
    { name: "Feijoada", ingredients: ["feijão preto", "porco", "linguiça"], category: "Prato" },
    { name: "Focaccia", ingredients: ["trigo", "azeite", "fermento"], category: "Pão" },
    { name: "Galinhada", ingredients: ["arroz", "frango", "açafrão"], category: "Prato" },
    { name: "Goiabada", ingredients: ["goiaba", "açúcar"], category: "Doce" },
    { name: "Goma de mascar", ingredients: ["goma base", "açúcar", "aromatizante"], category: "Chiclete" },
    { name: "Granola", ingredients: ["aveia", "mel", "castanhas"], category: "Cereal" },
    { name: "Guacamole", ingredients: ["abacate", "limão", "cebola", "tomate"], category: "Molho" },
    { name: "Heineken", ingredients: ["cevada", "malte", "lúpulo", "fermento"], category: "Cerveja" },
    { name: "Iogurte desnatado", ingredients: ["leite desnatado", "fermentos"], category: "Iogurte" },
    { name: "Iogurte grego", ingredients: ["leite", "creme de leite", "fermentos"], category: "Iogurte" },
    { name: "Iogurte natural", ingredients: ["leite", "fermentos"], category: "Iogurte" },
    { name: "Jabá", ingredients: ["carne bovina", "sal"], category: "Carne" },
    { name: "Ketchup", ingredients: ["tomate", "açúcar", "vinagre"], category: "Molho" },
    { name: "Lasanha", ingredients: ["trigo", "ovo", "queijo", "leite", "carne"], category: "Massa" },
    { name: "Leite condensado", ingredients: ["leite", "açúcar"], category: "Laticínio" },
    { name: "Leite de soja", ingredients: ["soja", "água"], category: "Leite vegetal" },
    { name: "Linguiça", ingredients: ["porco", "sal", "páprica"], category: "Carne" },
    { name: "Maionese", ingredients: ["ovo", "óleo", "vinagre"], category: "Molho" },
    { name: "Maionese caseira", ingredients: ["ovo", "óleo", "limão"], category: "Molho" },
    { name: "Maionese de soja", ingredients: ["soja", "óleo vegetal"], category: "Molho vegano" },
    { name: "Manteiga", ingredients: ["leite", "sal"], category: "Laticínio" },
    { name: "Maria mole", ingredients: ["açúcar", "clara de ovo", "coco"], category: "Doce" },
    { name: "Mingau", ingredients: ["leite", "amido"], category: "Bebida" },
    { name: "Mingau de fubá", ingredients: ["fubá", "leite", "açúcar"], category: "Bebida" },
    { name: "Mingau de milho", ingredients: ["milho", "leite", "açúcar"], category: "Bebida" },
    { name: "Molho bechamel", ingredients: ["leite", "manteiga", "trigo"], category: "Molho" },
    { name: "Molho branco", ingredients: ["leite", "manteiga", "trigo"], category: "Molho" },
    { name: "Molho de soja", ingredients: ["soja", "trigo", "sal"], category: "Molho" },
    { name: "Molho de tomate", ingredients: ["tomate", "cebola", "alho", "azeite"], category: "Molho" },
    { name: "Molho pesto", ingredients: ["manjericão", "parmesão", "alho", "azeite", "castanha"], category: "Molho" },
    { name: "Molho rosé", ingredients: ["tomate", "creme de leite"], category: "Molho" },
    { name: "Molho teriyaki", ingredients: ["shoyu", "açúcar", "gengibre"], category: "Molho" },
    { name: "Moqueca", ingredients: ["peixe", "leite de coco", "dendê", "pimentão"], category: "Prato baiano" },
    { name: "Moqueca de camarão", ingredients: ["camarão", "leite de coco", "azeite de dendê", "tomate", "pimentão", "cebola", "coentro"], category: "Prato baiano" },
    { name: "Moqueca de peixe", ingredients: ["peixe", "leite de coco", "azeite de dendê", "tomate", "pimentão", "cebola", "coentro"], category: "Prato baiano" },
    { name: "Mortadela", ingredients: ["carne", "porco", "sal"], category: "Embutido" },
    { name: "Mostarda", ingredients: ["semente de mostarda", "vinagre"], category: "Molho" },
    { name: "Muesli", ingredients: ["aveia", "frutas secas", "castanhas"], category: "Cereal" },
    { name: "Nhoque", ingredients: ["batata", "trigo", "ovo"], category: "Massa" },
    { name: "Nougat de amendoim", ingredients: ["amendoim", "açúcar", "clara de ovo"], category: "Doce" },
    { name: "Omelete", ingredients: ["ovo", "óleo", "sal"], category: "Preparo" },
    { name: "Paçoca", ingredients: ["amendoim", "açúcar", "sal"], category: "Doce" },
    { name: "Paçoca de colher", ingredients: ["amendoim", "açúcar", "farinha"], category: "Doce" },
    { name: "Pamonha", ingredients: ["milho verde", "leite"], category: "Doce" },
    { name: "Pamonha doce", ingredients: ["milho", "açúcar", "leite"], category: "Doce" },
    { name: "Pão de forma", ingredients: ["trigo", "fermento", "sal", "açúcar"], category: "Pão" },
    { name: "Pão de mel", ingredients: ["mel", "trigo", "chocolate", "especiarias"], category: "Doce" },
    { name: "Pão de queijo", ingredients: ["polvilho", "queijo", "ovo", "leite"], category: "Pão" },
    { name: "Pão francês", ingredients: ["trigo", "fermento", "sal"], category: "Pão" },
    { name: "Pão integral", ingredients: ["trigo integral", "fermento", "sal"], category: "Pão" },
    { name: "Pastel", ingredients: ["trigo", "sal", "óleo"], category: "Salgado" },
    { name: "Pato no tucupi", ingredients: ["pato", "tucupi", "jambu"], category: "Prato amazônico" },
    { name: "Pé de moleque", ingredients: ["amendoim", "açúcar"], category: "Doce" },
    { name: "Pecan butter", ingredients: ["noz-pecã"], category: "Pasta" },
    { name: "Pirão de peixe", ingredients: ["farinha de mandioca", "caldo de peixe"], category: "Acompanhamento" },
    { name: "Polenta", ingredients: ["milho"], category: "Acompanhamento" },
    { name: "Pudim", ingredients: ["leite", "ovo", "açúcar", "leite condensado"], category: "Sobremesa" },
    { name: "Quiche", ingredients: ["trigo", "ovo", "leite", "queijo"], category: "Torta salgada" },
    { name: "Quindim", ingredients: ["ovo", "açúcar", "coco"], category: "Doce" },
    { name: "Ravioli", ingredients: ["trigo", "ovo", "queijo"], category: "Massa" },
    { name: "Requeijão", ingredients: ["leite", "creme de leite"], category: "Queijo" },
    { name: "Risole", ingredients: ["farinha de trigo", "ovo", "recheio"], category: "Salgado" },
    { name: "Romeu e julieta", ingredients: ["queijo", "goiabada"], category: "Sobremesa" },
    { name: "Rosca", ingredients: ["farinha de trigo", "açúcar", "fermento"], category: "Pão" },
    { name: "Sabor amendoim", ingredients: ["amendoim", "aromatizante"], category: "Sabor" },
    { name: "Sonho", ingredients: ["trigo", "fermento", "ovo", "creme"], category: "Doce" },
    { name: "Strogonoff", ingredients: ["carne", "creme de leite", "cogumelo"], category: "Prato" },
    { name: "Suco de laranja", ingredients: ["laranja"], category: "Bebida" },
    { name: "Suco de uva", ingredients: ["uva"], category: "Bebida" },
    { name: "Suflê", ingredients: ["ovo", "queijo", "leite"], category: "Prato" },
    { name: "Tacacá", ingredients: ["tucupi", "jambu", "camarão", "goma"], category: "Prato amazônico" },
    { name: "Tahine", ingredients: ["gergelim"], category: "Pasta" },
    { name: "Tapioca", ingredients: ["mandioca"], category: "Pão" },
    { name: "Tempeh", ingredients: ["soja"], category: "Proteína vegetal" },
    { name: "Tofu", ingredients: ["soja"], category: "Proteína vegetal" },
    { name: "Tofu frito", ingredients: ["tofu", "óleo"], category: "Preparo simples" },
    { name: "Tofu grelhado", ingredients: ["tofu"], category: "Preparo simples" },
    { name: "Torrone de amendoim", ingredients: ["amendoim", "açúcar", "mel", "clara de ovo"], category: "Doce" },
    { name: "Tropeiro", ingredients: ["feijão", "farinha de mandioca", "ovo", "linguiça"], category: "Prato" },
    { name: "Tutu", ingredients: ["feijão", "farinha de mandioca"], category: "Prato" },
    { name: "Vatapá", ingredients: ["pão", "amendoim", "castanha", "camarão", "dendê"], category: "Prato baiano" },
    { name: "Vinagrete", ingredients: ["tomate", "cebola", "pimentão", "vinagre"], category: "Molho" },
    { name: "Vitamina de frutas", ingredients: ["frutas", "leite", "açúcar"], category: "Bebida" },
    { name: "Waffle", ingredients: ["trigo", "ovo", "leite", "manteiga", "açúcar"], category: "Doce" }
  ]
};

async function importDecomposition() {
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;
  const errors = [];
  
  try {
    console.log("📊 Iniciando importação de decomposição...\n");
    
    // Processar inglês
    console.log("🇺🇸 Processando alimentos em inglês...");
    for (const food of foodDecomposition.en) {
      try {
        const { error } = await supabase
          .from('food_decomposition')
          .upsert({
            processed_food_name: food.name,
            base_ingredients: food.ingredients,
            category: food.category || 'other',
            language: 'en',
            is_active: true
          }, {
            onConflict: 'processed_food_name,language'
          });
        
        if (error) {
          totalErrors++;
          errors.push({ food: food.name, error: error.message });
        } else {
          totalInserted++;
        }
        
        totalProcessed++;
        
        if (totalProcessed % 50 === 0) {
          console.log(`  ✅ ${totalProcessed} processados...`);
        }
      } catch (err) {
        totalErrors++;
        errors.push({ food: food.name, error: err.message });
      }
    }
    
    console.log(`✅ Inglês: ${foodDecomposition.en.length} alimentos processados\n`);
    
    // Processar português
    console.log("🇧🇷 Processando alimentos em português...");
    for (const food of foodDecomposition.pt) {
      try {
        const { error } = await supabase
          .from('food_decomposition')
          .upsert({
            processed_food_name: food.name,
            base_ingredients: food.ingredients,
            category: food.category || 'other',
            language: 'pt',
            is_active: true
          }, {
            onConflict: 'processed_food_name,language'
          });
        
        if (error) {
          totalErrors++;
          errors.push({ food: food.name, error: error.message });
        } else {
          totalInserted++;
        }
        
        totalProcessed++;
        
        if (totalProcessed % 50 === 0) {
          console.log(`  ✅ ${totalProcessed} processados...`);
        }
      } catch (err) {
        totalErrors++;
        errors.push({ food: food.name, error: err.message });
      }
    }
    
    console.log(`✅ Português: ${foodDecomposition.pt.length} alimentos processados\n`);
    
    // Verificação final
    console.log("\n📊 Verificação final...\n");
    
    const { count: finalCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true });
    
    const { count: enCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');
    
    const { count: ptCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    // Relatório final
    console.log("\n" + "=".repeat(80));
    console.log("🎉 IMPORTAÇÃO DE DECOMPOSIÇÃO CONCLUÍDA!");
    console.log("=".repeat(80));
    
    console.log(`\n📊 RESUMO:`);
    console.log(`  📝 Total processados: ${totalProcessed}`);
    console.log(`  ✅ Total inseridos: ${totalInserted}`);
    console.log(`  ❌ Total erros: ${totalErrors}`);
    
    console.log(`\n📊 DISTRIBUIÇÃO:`);
    console.log(`  🇺🇸 Inglês: ${enCount || 0} registros`);
    console.log(`  🇧🇷 Português: ${ptCount || 0} registros`);
    console.log(`  📈 Total no banco: ${finalCount || 0} registros`);
    
    if (totalErrors > 0) {
      console.log(`\n❌ ERROS ENCONTRADOS:`);
      errors.slice(0, 5).forEach(({ food, error }) => {
        console.log(`  ${food}: ${error}`);
      });
      if (errors.length > 5) {
        console.log(`  ... e mais ${errors.length - 5} erros`);
      }
    }
    
    // Status final
    if (finalCount && finalCount >= 500) {
      console.log(`\n✅ SUCESSO! Sistema de decomposição completamente populado!`);
      console.log(`   ${finalCount} alimentos processados com ingredientes base.`);
      console.log(`   Sistema pronto para validação de intolerâncias.`);
    } else if (finalCount && finalCount > 0) {
      console.log(`\n🟡 SUCESSO PARCIAL! ${finalCount} alimentos importados.`);
      console.log(`   Alguns alimentos podem estar faltando.`);
    } else {
      console.log(`\n❌ FALHA NA IMPORTAÇÃO! Verificar erros.`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal na importação:', error);
  }
}

importDecomposition();
