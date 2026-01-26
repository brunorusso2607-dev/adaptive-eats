// Script para importar dados exportados do ReceitAI
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 IMPORTANDO DADOS EXPORTADOS DO RECEITAI\n");
console.log("Total esperado: 1.669 mapeamentos + 628 neutralizadores\n");

// Dados exportados do ReceitAI
const exportedData = {
  intolerances: {
    fodmap: {
      blocked: ["adzuki beans", "agave", "agave syrup", "alcachofra", "alho", "alho frito", "alho picado", "alho-poró", "ameixa", "anise", "apple", "apple juice", "apricot", "artichoke", "asparagus", "aspargo", "banana", "banana madura", "banana nanica", "banana prata", "barley", "bean sprout", "beans", "beer", "beet", "beterraba", "black beans", "black garlic", "black-eyed peas", "blackberry", "bok choy", "broccoli", "brócolis", "brussels sprouts", "butternut squash", "cabbage", "calabrian chili pepper", "caqui", "cashew nut", "cassava", "cauliflower", "cebola", "cebola branca", "cebola refogada", "cebola roxa", "cebolote fish", "celery", "centeio", "cereja", "cevada", "champignon", "cherry", "chickpea", "chickpea flour", "chickpeas", "chiclete sem açúcar", "chicória", "chicória em pó", "chicory", "chicory leaf", "chicory root", "cogumelo", "condensed milk", "corn syrup", "cottage cheese", "couve-flor", "cow's milk", "cream", "cream cheese", "creme de leite", "curdled milk", "curry", "damasco", "dandelion root", "date", "dehydrated garlic", "dehydrated onion", "dough", "dragon fruit", "dried apricot", "dried chickpeas", "dried fig", "dried jackfruit", "dried mung beans", "dried pea", "durian", "ervilha", "fava", "feijão", "feijão branco", "feijão vermelho", "feijão-carioca", "feijão-preto", "fennel", "fig", "finger hot chili pepper", "FOS", "fresh cheese", "fructose", "frutose", "galia melon", "garlic", "garlic leaf", "garlic powder", "gherkin", "gluten-free oats", "goat milk", "grão de bico", "grão-de-bico", "grape", "green beans", "guava", "honey", "honeydew melon", "inulin", "iogurte", "isomaltitol", "isomaltose", "italian pumpkin", "jackfruit", "jilo", "leek", "leite", "leite desnatado", "leite integral", "lentilha", "lentils", "lichia", "lime", "longan", "loquat", "lupini beans", "lychee", "maçã", "maçã fuji", "maçã gala", "maçã verde", "macarrão", "macaxeira", "malabar spinach", "maltitol", "manga", "mango", "mango juice", "manitol", "mannitol", "massa", "mel", "melancia", "melão", "milk", "mushroom", "mustard", "napa cabbage", "nectarina", "nectarine", "nuts", "octopus", "okra", "onion", "onion powder", "ora-pro-nóbis", "pak choi", "pão", "pão de forma", "pão francês", "papaya", "pea", "pea protein", "pea shoot", "peach", "pear", "pear juice", "pecan nuts", "pera", "persimmon", "pêssego", "pinto beans", "pistachio", "plum", "portobello mushroom", "powdered milk", "prune", "queijo fresco", "radicchio", "raisin", "rambutan", "raspberry", "red guava", "red kidney beans", "red lentils", "red onion", "repolho", "requeijão", "ricota", "ricotta", "ricotta cheese", "ripe banana", "rye", "sapote", "sautéed onion", "shallot", "sheep milk", "shiitake", "shiitake mushroom", "shitake", "skimmed milk", "soja", "sorbitol", "sorvete", "soybean", "squid", "star fruit", "suco de maçã", "sugar-free candy", "sweet potato", "taioba", "tamarind", "tangerine", "trigo", "wasabi", "watermelon", "wheat", "wheat flour", "white beans", "white onion", "whole milk", "wild garlic", "xarope de agave", "xarope de milho", "xilitol", "xylitol", "yellow pea"],
      caution: ["avocado (até 30g)", "balsamic vinegar", "blueberry (até 30g)", "chia", "cocoa powder (até 30g)", "coconut", "coconut milk (até 100g)", "macadamia (até 30g)", "sweet corn (até 30g)"],
      safe: ["acerola", "arracacha", "arugula", "bamboo shoot", "basil", "basmati rice", "bay leaf", "beef", "bell pepper", "black pepper", "brown rice", "butter", "cantaloupe melon", "caper", "cardamom", "carrot", "chard", "chicken", "chuchu", "cinnamon", "clove", "coconut oil", "coriander", "cornmeal", "cornstarch", "cucumber", "cumin", "eggplant", "eggs", "endive", "firm tofu", "fish", "flaxseed", "fresh tuna", "ghee", "ginger", "infused garlic oil", "jasmine rice", "kale", "kiwi", "lamb", "lard", "lemon", "lettuce", "mint", "mustard leaf", "nutmeg", "olive", "olive oil", "onion infused oil", "orange", "oregano", "paprika", "parsley", "passion fruit", "peanut", "pineapple", "pitaya", "polenta", "pork", "potato", "potato starch", "pumpkin seed", "quinoa", "radish", "rice flour", "rosemary", "saffron", "sardine", "scallion", "seafood", "sesame", "shrimp", "Sicilian lemon", "spinach", "strawberry", "sunflower seed", "tapioca", "thyme", "tomato", "turmeric", "turnip", "vanilla", "watercress", "white rice", "yam", "zucchini"],
      neutralizers: ["abacaxi", "açúcar de mesa", "alho infusionado", "arroz", "asafoetida", "assa-fétida", "azeite com alho", "baixo fodmap", "banana firme", "banana verde", "batata", "bebida vegetal", "brie", "camembert", "cebola infusionada", "cebolinha verde", "cheddar", "deslactosado", "dextrose", "estévia", "fodmap seguro", "folhas verdes", "glicose", "infusionada", "infusionado", "iogurte sem lactose", "kiwi", "laranja", "leite de amêndoa", "leite de arroz", "leite de coco", "leite de macadâmia", "leite sem lactose", "low fodmap", "maracujá", "melão cantaloupe", "milho", "mirtilos", "morango", "óleo de alho", "óleo de alho infusionado", "óleo de cebola", "óleo de cebola infusionado", "óleo infusionado", "papaia", "parmesão", "parte verde", "parte verde da cebolinha", "parte verde do alho-poró", "queijo brie", "queijo camembert", "queijo cheddar", "queijo curado", "queijo envelhecido", "queijo maturado", "queijo parmesão", "queijo suíço", "quinoa", "sacarose", "sem lactose", "stevia", "tempeh", "tofu extra firme", "tofu firme", "tofu prensado", "uvas", "zero lactose"]
    },
    fructose: {
      blocked: ["açaí", "agave", "agave nectar", "agave syrup", "apple", "apple juice", "apricot", "artichoke", "asparagus", "beet", "brown rice syrup", "brown sugar", "brussels sprouts", "candied fruit", "cherry", "cider", "coconut nectar", "coconut sugar", "concentrated apple juice", "concentrated grape juice", "concentrated juice", "concentrated pear juice", "corn syrup", "currant", "date", "doce de fruta", "dried apricot", "dried date", "dried fig", "dried fruit", "fig", "fructose", "fruit juice", "frutose", "geleia", "grape", "grape juice", "guava", "honey", "invert sugar", "jackfruit", "lychee", "maçã", "manga", "mango", "maple syrup", "mel", "melancia", "molasses", "nectarine", "papaya", "pea", "peach", "pear", "pear juice", "pera", "persimmon", "plum", "pomegranate", "prune", "raisin", "ripe banana", "sorghum syrup", "suco de fruta", "suco de maçã", "suco de uva", "tamarillo", "tamarind", "uva", "watermelon", "xarope de milho"],
      caution: ["blackberry", "blueberry", "cabbage", "corn", "dextrose", "glucose", "grapefruit", "kiwi", "lemon", "lime", "maltodextrin", "melon", "passion fruit", "pineapple", "raspberry", "star fruit", "strawberry"],
      neutralizers: ["açúcar de mesa", "adoçado com glicose", "alho em óleo", "arroz", "baixa frutose", "baixo fodmap", "baixo frutose", "banana da terra", "banana verde", "batata", "cebola em óleo", "cebolinha francesa", "cebolinha verde", "dextrose", "eritritol", "estévia", "fodmap seguro", "folhas de cebolinha", "glicose pura", "livre de frutose", "maltodextrina", "óleo de alho", "óleo infusionado", "parte verde da cebolinha", "sacarose", "sem adição de frutose", "sem frutose", "stevia", "zero frutose"]
    },
    gluten: {
      blocked: ["aveia", "barley", "barley flour", "barley malt", "beer", "bolacha", "brewer's yeast", "brioche", "bulgur", "bulgur wheat", "calzone", "cannelloni", "capellini", "centeio", "cerveja", "cevada", "chopp", "churros", "couscous", "cuscuz marroquino", "dough", "doughnut", "einkorn", "empadão", "empadinha", "empanado", "farfalle", "farinha de trigo", "farro", "fermento de cerveja", "fettuccine", "focaccia", "fusilli", "gluten", "glúten", "grissini", "instant noodles", "kamut", "linguine", "macaron", "macarrão", "malt", "malt extract", "malt syrup", "malte", "massa", "massa de pastel", "milanesa", "molho de soja", "molho shoyu", "pão", "pão de forma", "pão francês", "pasta", "penne", "ramen", "ravioli", "rigatoni", "rissole", "rye", "rye flour", "seitan", "semolina", "soba", "soy sauce", "spaghetti", "spelt", "spelt flour", "spring roll", "tabbouleh", "tagliatelle", "trigo", "triticale", "udon", "vital gluten", "vital wheat gluten", "wheat", "wheat bran", "wheat fiber", "wheat flour", "wheat germ", "wheat gluten", "wheat protein", "wheat semolina", "wheat starch", "wheat vodka", "whiskey", "white flour", "white wheat flour", "whole flour", "whole wheat flour", "whole wheat pasta"],
      caution: ["buckwheat", "oat flour", "oats"],
      neutralizers: ["amaranto", "amido de milho", "araruta", "arroz", "aveia certificada", "aveia não contaminada", "aveia pura", "aveia sem glúten", "biscoito sem glúten", "bolacha sem glúten", "bolo sem glúten", "celiac safe", "certificado sem glúten", "coconut aminos", "coeliac safe", "farinha de amaranto", "farinha de amêndoa", "farinha de amêndoas", "farinha de arroz", "farinha de aveia sem glúten", "farinha de banana", "farinha de batata", "farinha de castanha", "farinha de coco", "farinha de grão-de-bico", "farinha de linhaça", "farinha de mandioca", "farinha de milho", "farinha de quinoa", "farinha de sorgo", "farinha de tapioca", "fécula de batata", "fécula de mandioca", "goma xantana", "isento de glúten", "livre de glúten", "macarrão de arroz", "macarrão sem glúten", "massa sem glúten", "milho", "molho de soja sem glúten", "não contém glúten", "painço", "pão sem glúten", "pizza sem glúten", "polvilho azedo", "polvilho doce", "quinoa", "sem glúten", "shoyu sem glúten", "sorgo", "tamari", "tapioca", "teff", "torrada sem glúten", "trigo sarraceno", "zero glúten"]
    },
    lactose: {
      blocked: ["bottled butter", "buffalo cheese", "buffalo milk", "buffalo mozzarella", "burrata", "butter", "butterfat", "buttermilk", "calcium caseinate", "camembert cheese", "canjica", "casein", "caseinate", "catupiry", "chantilly", "cheese", "clarified butter", "colonial cheese", "condensed milk", "cottage cheese", "cream", "cream cheese", "creme de leite", "doce de leite", "evaporated milk", "fermented milk", "feta cheese", "fresh cream", "goat cheese", "goat milk", "gorgonzola cheese", "iogurte", "lactoalbumin", "lactoglobulin", "lactose", "leite", "leite condensado", "leite de vaca", "leite em pó", "leite integral", "long-life milk", "manteiga", "mascarpone cheese", "milk", "milk fat", "milk flavor", "milk protein", "milk solids", "mozzarella", "mozzarella cheese", "nata", "pasteurized milk", "petit suisse", "powdered milk", "prato cheese", "pudim", "quark cheese", "queijo", "queijo canastra", "queijo coalho", "queijo minas", "queijo minas frescal", "requeijão", "ricotta cheese", "roquefort cheese", "semi-skimmed milk", "serro cheese", "sheep milk", "skimmed milk", "skimmed milk powder", "sodium caseinate", "soro de leite", "sorvete", "UHT milk", "whey", "whey powder", "whey protein", "whipped cream", "whole milk", "whole milk powder"],
      caution: ["brie cheese", "cheddar cheese", "curdled milk", "cured gouda cheese", "edam cheese", "emmental cheese", "ghee", "gouda cheese", "gruyère cheese", "kefir", "parmesan cheese", "pecorino cheese", "provolone cheese", "swiss cheese", "unsalted butter"],
      neutralizers: ["à base de plantas", "almond milk", "bebida de amêndoa", "bebida de arroz", "bebida de aveia", "bebida de coco", "bebida de soja", "bebida vegetal", "cashew milk", "chantilly vegano", "coconut milk", "cream cheese vegano", "creme de coco", "creme de leite de coco", "delactosado", "deslactosado", "iogurte de amêndoa", "iogurte de coco", "iogurte de soja", "iogurte vegano", "iogurte vegetal", "isento de lactose", "leite de amêndoa", "leite de amêndoas", "leite de amendoim", "leite de arroz", "leite de aveia", "leite de avelã", "leite de cânhamo", "leite de castanha", "leite de castanhas", "leite de coco", "leite de gergelim", "leite de inhame", "leite de linhaça", "leite de macadâmia", "leite de noz", "leite de nozes", "leite de pistache", "leite de quinoa", "leite de soja", "leite vegetal", "livre de lactose", "livre de laticínios", "manteiga de coco", "manteiga vegana", "não contém lactose", "nata de coco", "oat milk", "origem vegetal", "plant milk", "proteína vegetal", "queijo de amendoim", "queijo de castanha", "queijo vegano", "queijo vegetal", "requeijão vegano", "rice milk", "sem lactose", "sem laticínios", "sorvete de coco", "sorvete sem lactose", "sorvete vegano", "soy milk", "vegana", "vegano", "zero lactose"]
    },
    sorbitol: {
      blocked: ["abacate", "ameixa", "apple", "apricot", "avocado", "beet", "black plum", "blackberry", "carob", "cauliflower", "cereja", "champignon", "cherry", "chiclete", "coconut oil", "cranberry", "currant", "damasco", "diet candies", "diet gelatin", "dried apple", "dried apricot", "dried cherry", "dried peach", "erythritol", "fennel", "fresh apricot", "fresh cherry", "green apple", "isomaltitol", "loquat", "lychee", "maçã", "maltitol", "mannitol", "mushroom", "mushrooms", "nectarina", "nectarine", "peach", "pear", "pera", "pêssego", "plum", "prune", "raspberry", "shiitake", "sorbitol", "sorbitol sweetener", "sorbitol syrup", "sugar-free candies", "xylitol"],
      neutralizers: ["açúcar", "adoçado com stevia", "adoçado com sucralose", "aspartame", "baixo fodmap", "estévia", "fodmap seguro", "glicose", "livre de polióis", "livre de sorbitol", "porção pequena", "porção reduzida", "sacarina", "sacarose", "sem adoçantes polióis", "sem álcoois de açúcar", "sem álcool de açúcar", "sem polióis", "sem sorbitol", "stevia", "sucralose", "zero sorbitol"]
    }
  },
  allergies: {
    eggs: {
      blocked: ["advocaat", "albumin", "béarnaise", "chicken egg", "clara de ovo", "dehydrated egg", "duck egg", "egg", "egg albumin", "egg globulin", "egg lecithin", "egg powder", "egg protein", "egg punch", "egg solids", "egg white", "egg yolk", "eggs", "florentine egg", "free-range egg", "freeze-dried egg", "fried egg", "gema", "gema de ovo", "gemada", "globulin", "goose egg", "hard-boiled egg", "hot egg", "ladyfingers", "lysozyme", "maionese", "marshmallow", "merengue", "meringue", "organic egg", "ostrich egg", "ovalbumin", "ovo", "ovo cozido", "ovo frito", "ovo mexido", "ovoglobulin", "ovomaltine", "ovomucoid", "ovos", "ovotransferrin", "ovovitellin", "partridge egg", "pasteurized egg", "poached egg", "potato tortilla", "quail egg", "quindão", "quindim", "raw egg", "raw egg white", "raw egg yolk", "raw quail egg", "scrambled egg", "scrambled eggs", "soft-boiled egg", "soft-boiled eggs", "spanish tortilla", "vitellin", "yolk"],
      caution: ["e322", "egg substitute", "lecithin e322"],
      neutralizers: ["amido de milho", "aquafaba", "banana amassada", "berinjela", "chia como ovo", "chia egg", "egg replacer", "farinha de grão-de-bico", "farinha de linhaça", "fécula de batata", "flax egg", "gel de chia", "gel de linhaça", "goma xantana", "linhaça como ovo", "livre de ovo", "livre de ovos", "maçã ralada", "não contém ovo", "não contém ovos", "ovo de chia", "ovo de linhaça", "ovo vegano", "psyllium", "purê de maçã", "sem ovo", "sem ovos", "substituto de ovo", "tofu sedoso"]
    },
    fish: {
      blocked: ["abrotea", "acará", "albacore", "anchovies", "anchovy", "badejo fish", "beijupirá fish", "bijupirá", "blackspot seabream", "bodó", "bonito", "bottarga", "cachara", "caçonete", "camarupim", "cambucu", "canned sardine", "caranha", "caranx crysos", "carp", "cascudo fish", "catfish", "cavalinha fish", "caviar", "cherne fish", "chicharro fish", "cioba fish", "cod liver oil", "codfish", "codfish casserole", "conger eel", "croaker", "curimatã fish", "curimba fish", "curimbatá fish", "dashi", "desalted codfish", "dogfish", "dourada fish", "dourado amazônico", "dourado fish", "dried fish", "enchova", "filhote", "fish", "fish bait", "fish collagen", "fish concentrate", "fish extract", "fish fat", "fish fillet", "fish gelatin", "fish glue", "fish oil", "fish omega 3", "fish protein", "fish roe", "fish sauce", "fish skin", "fish steak", "fish steaks", "fresh tuna", "fumet", "gravlax", "grouper", "hake", "herring", "hydrolyzed fish", "ikura", "jaú", "john dory", "jundiá", "kani", "kani kama", "lambari fish", "large trahira fish", "mackerel", "masago", "matrinxã fish", "monkfish", "moray eel", "mullet", "namorado fish", "needlefish", "nuoc mam", "omega 3", "pacu", "pangasius", "peacock bass", "peixada", "piaba", "piau", "piava", "pintado", "piracanjuba", "piracuí", "piracuí defumado", "piraíba", "piramutaba", "pirapitinga", "piraputanga", "pirarara", "pirarucu", "ray", "red", "red mullet", "red snapper", "roe", "salmon", "salmon trout", "sardine", "sawfish", "sea bream", "small hake", "smoked fish", "smoked herring", "smoked salmon", "smoked sardine", "snapper", "snook", "sole", "sororoca", "surimi", "surubim", "swordfish", "tambaqui", "taramasalata", "taramosalata", "tilapia", "tilapia fillet", "tobiko", "trahira fish", "trout", "tuna", "white hake", "yellow hake"],
      neutralizers: ["alga kombu", "alga nori", "alga wakame", "algas marinhas", "carne bovina", "carne suína", "cogumelo", "cogumelo shiitake", "cogumelo shimeji", "frango", "jaca desfiada", "livre de peixe", "livre de pescado", "não contém peixe", "nori", "palmito pupunha", "peixe vegano", "peru", "proteína vegetal", "sabor mar", "seitan", "sem frutos do mar", "sem peixe", "sem pescado", "tempeh", "tofu", "tofu defumado", "wakame"]
    },
    peanut: {
      blocked: ["amendoim", "candied peanut", "caramelized peanut", "crushed peanuts", "farinha de amendoim", "ground peanuts", "hydrolyzed peanut protein", "Japanese peanut", "manteiga de amendoim", "natural peanut butter", "óleo de amendoim", "paçoca", "pasta de amendoim", "pé de moça", "pé de moleque", "peanut", "peanut butter", "peanut concentrate", "peanut extract", "peanut flavor", "peanut flour", "peanut kernel", "peanut meal", "peanut milk", "peanut oil", "peanut praline", "peanut protein", "peanut residue", "peanut shell", "peanuts", "raw peanut", "reeses", "salted peanuts", "shelled peanut", "shelled peanuts", "skinned peanuts", "snickers", "sprouted peanut"],
      neutralizers: ["creme de avelã", "creme de macadâmia", "livre de amendoim", "manteiga de amêndoa", "manteiga de avelã", "manteiga de caju", "manteiga de castanha", "manteiga de coco", "manteiga de girassol", "manteiga de macadâmia", "manteiga de semente", "não contém amendoim", "pasta de amêndoa", "pasta de caju", "pasta de castanha", "pasta de gergelim", "pasta de girassol", "pasta de semente de abóbora", "sem amendoim", "semente de abóbora", "semente de girassol", "tahine"]
    },
    seafood: {
      blocked: ["aratu crab", "blue crab", "camarão na moranga", "caruru", "cataplana", "choco", "clam", "clams", "cockle", "cockles", "crab", "crab meat", "crab stew", "crabs", "crayfish", "crustacean", "crustacean extract", "crustaceans", "cuttlefish", "dried shrimp", "fresh oyster", "fresh shrimp", "freshwater crayfish", "freshwater shrimp", "goose barnacle", "gratinéed oyster", "grey shrimp", "grilled lobster", "guaiamum", "kani kama", "king crab", "krill", "krill oil", "lagosta", "lagostim", "lagostinha", "lagostins", "lambreta", "lobster", "lobster tail", "mangrove crab", "mariscada", "mussel", "mussels", "navalheira fish", "octopus", "octopus tentacle", "octopuses", "oyster", "oysters", "picked crab meat", "picked shrimp", "pink shrimp", "pistol shrimp", "pitu", "polvinho", "quahog", "raw shrimp", "red crab", "red lobster", "red shrimp", "scallop", "scallops", "sea snail", "seafood", "seven-bar shrimp", "shell", "shellfish", "shellfish extract", "shells", "shrimp", "shrimp oil", "shrimps", "smoked shrimp", "snail", "snails", "soft-shell crab", "spider crab", "spiny lobster", "squid", "swimmer crab meat", "uçá", "velvet crab", "vg shrimp", "whelk", "whelks", "white shrimp"],
      neutralizers: ["alga kombu", "alga nori", "alga wakame", "algas marinhas", "camarão vegano", "cogumelo king trumpet", "cogumelo ostra", "cogumelo shiitake", "cogumelo shimeji", "jaca desfiada", "livre de crustáceos", "livre de frutos do mar", "livre de moluscos", "mollusks-free", "não contém crustáceos", "não contém moluscos", "oyster mushroom", "palmito pupunha", "proteína vegetal", "sabor mar", "sem camarão", "sem caranguejo", "sem crustáceos", "sem frutos do mar", "sem lagosta", "sem lula", "sem mexilhão", "sem moluscos", "sem ostra", "sem pescados", "sem polvo", "vegan shrimp"]
    },
    sesame: {
      blocked: ["baba ganoush", "black sesame", "furikake", "gersal", "gomashio", "gomasio", "gomassio", "halva", "halvah", "hummus", "sesame", "sesame oil", "sesame seed", "tahini", "white sesame"],
      neutralizers: ["sem gergelim", "sunflower tahini", "tahine de girassol"]
    },
    soy: {
      blocked: ["aburaage", "atsuage", "concentrated soy protein", "cooked soybean", "daidzein", "doenjang", "e322 soy", "edamame", "firm tofu", "genistein", "gochujang", "green soybean", "isoflavone", "isolated soy protein", "kecap manis", "kinako", "lecitina de soja", "leite de soja", "marinated tofu", "miso", "missô", "molho shoyu", "moyashi", "natto", "okara", "óleo de soja", "phytoestrogen", "ponzu", "proteína de soja", "PTS", "requeijão de soja", "roasted soybean", "shoyu", "silken tofu", "smoked tofu", "soft tofu", "soja", "soy butter", "soy cheese", "soy concentrate", "soy cream", "soy drink", "soy extract", "soy fiber", "soy flour", "soy germ", "soy granules", "soy grits", "soy hull", "soy isoflavones", "soy isolate", "soy lecithin", "soy margarine", "soy milk", "soy protein", "soy pulp", "soy sauce", "soy sausage", "soy sprout", "soy sprouts", "soy whey", "soybean", "soybean in grain", "soybean meal", "soybean oil", "soybean pods", "tamari", "tempeh", "teriyaki", "textured protein", "textured soy protein", "textured vegetable protein", "tofu", "tofu skin", "whole soy flour"],
      neutralizers: ["creme de castanha", "creme de coco", "iogurte de coco", "leite de amêndoa", "leite de amêndoas", "leite de arroz", "leite de aveia", "leite de coco", "livre de soja", "manteiga de coco", "molho de coco aminos", "não contém soja", "óleo de coco", "óleo de girassol", "óleo de oliva", "pasta de amendoim", "proteína de arroz", "proteína de ervilha", "sem lecitina de soja", "sem proteína de soja", "sem soja", "shoyu de coco", "tahine", "tamari sem soja", "tempeh de grão-de-bico"]
    },
    nuts: {
      blocked: ["almond", "almond butter", "almond extract", "almond flour", "almond milk", "almond oil", "almonds", "amaretto", "amêndoa", "amêndoas", "avelã", "baklava", "baru nut", "bocaiúva", "brazil nut", "cajuína", "candied chestnut", "caramelized nut", "caramelized nuts", "cashew", "cashew flour", "cashew nut", "cashew nut milk", "castanha", "castanha de baru", "castanha de caju", "castanha do pará", "chestnut", "chestnut flour", "dried fruit", "dried fruits", "farinha de amêndoa", "filbert", "frangelico", "frangipane", "gianduja", "glazed nut", "ground almond", "hazelnut", "hazelnut flour", "hazelnut milk", "hazelnut oil", "hazelnuts", "leite de amêndoa", "licuri", "licuri nut", "macadamia", "macadâmia", "macadamia milk", "macadamia nut", "macaúba palm fruit", "marzipan", "nocino", "nougat", "nozes", "nut", "nut butter", "nut cheese", "nut milk", "nut nougat", "nut praline", "nut roll", "nutella", "nutmeg", "nuts", "oilseed", "oilseeds", "ouricuri", "paradise nut", "pecã", "pecan", "pecan nut", "pequi", "pine nut", "pine nuts", "pistache", "pistachio", "pistachios", "portuguese chestnut", "praline", "raw almond", "sapucaia nut", "toasted almond", "walnut", "walnut milk", "walnut oil", "walnuts"],
      neutralizers: ["açúcar de coco", "água de coco", "castanha do pará", "coco fresco", "coco ralado", "creme de coco", "farinha de coco", "leite de coco", "livre de oleaginosas", "manteiga de girassol", "manteiga de semente", "não contém castanhas", "não contém nozes", "noz-moscada", "óleo de coco", "pasta de girassol", "sem amêndoas", "sem avelã", "sem castanha de caju", "sem castanha do pará", "sem castanhas", "sem macadâmia", "sem nozes", "sem oleaginosas", "sem pecã", "sem pistache", "semente de abóbora", "semente de chia", "semente de gergelim", "semente de girassol", "semente de linhaça", "tahine"]
    }
  },
  sensitivities: {
    caffeine: {
      blocked: ["arabic coffee", "black tea", "café", "café com leite", "café expresso", "caffeine", "cappuccino", "chá mate", "chá preto", "chá verde", "chimarrão", "cocoa", "cocoa powder", "coffee", "cola", "cola soda", "drip coffee", "energético", "energy drink", "erva mate", "erva-mate", "espresso coffee", "green tea", "guaraná", "guaraná powder", "macchiato", "matcha", "mate tea", "oolong tea", "refrigerante de cola", "ristretto coffee", "tereré", "thermogenic supplement", "turkish coffee", "white tea", "yerba mate"],
      caution: ["chocolate", "chocolate powder", "decaffeinated coffee", "decaffeinated tea", "guarana soda", "Ovomaltine", "toddy"],
      neutralizers: ["alfarroba", "café descafeinado", "camomila", "canela", "capim-limão", "carob", "chá descafeinado", "cidreira", "descafeinado", "erva cidreira", "erva doce", "erva-doce", "gengibre", "hibisco", "hortelã", "livre de cafeína", "maçã seca", "não contém cafeína", "rooibos", "sem cafeína"]
    },
    corn: {
      blocked: ["amido de milho", "baby corn", "beer", "canjica", "canjiquinha", "chicha", "coarsely ground corn", "corn", "corn cob", "corn flakes", "corn flour", "corn fructose", "corn germ", "corn glucose", "corn oil", "corn on the cob", "corn snack", "corn starch", "corn syrup", "cornmeal", "cornmeal porridge", "cornstarch", "cracked corn", "dextrose", "doritos", "espiga de milho", "fine cornmeal", "fructose syrup", "fubá", "glucose", "glucose syrup", "gourmet popcorn", "grain alcohol", "green corn", "maisena", "maltodextrin", "milho", "milho verde", "milled cornmeal", "modified starch", "mungunzá", "mustard", "óleo de milho", "pamonha", "pipoca", "polenta", "popcorn", "popcorn kernels", "snack", "sweet corn", "tortilha", "tortilla", "vanilla extract", "xarope de milho"],
      caution: ["baking powder", "bourbon", "citric acid", "corn whiskey", "dextrin", "fermento químico", "soy lecithin", "vitamin C"],
      safe: ["tapioca"],
      neutralizers: ["amido de batata", "araruta", "aveia", "farinha de amêndoa", "farinha de arroz", "farinha de aveia", "farinha de coco", "farinha de mandioca", "farinha de trigo", "fécula de batata", "livre de milho", "não contém milho", "polvilho", "quinoa", "sem amido de milho", "sem milho", "sem xarope de milho", "tapioca"]
    },
    histamine: {
      blocked: ["abacate", "anchova", "anchovy", "atum", "avocado", "bacon", "balsamic vinegar", "beer", "berinjela", "blue cheese", "brie cheese", "cacau", "camarão", "camembert", "camembert cheese", "cerveja", "champagne", "cheddar cheese", "chucrute", "citrus fruits", "copa", "cured cheese", "cured ham", "cured meat", "cured meats", "dried meat", "dried salted meat", "eggplant", "embutido", "emmental cheese", "espinafre", "fermented foods", "fermented tofu", "food coloring", "glutamate", "gorgonzola", "gorgonzola cheese", "gouda cheese", "gruyère cheese", "ham", "herring", "histamine", "kefir", "kimchi", "kombucha", "kombuchá", "linguiça", "mackerel", "miso", "molho de tomate", "monosodium glutamate", "morango", "mortadella", "mustard", "natto", "pancetta", "parmesan cheese", "pastrami", "pecorino cheese", "pepperoni", "pickles", "pork", "preservative", "preserve", "presunto", "provolone cheese", "queijo curado", "red wine", "ripe banana", "roquefort", "roquefort cheese", "salame", "salami", "sardine", "sardinha", "sauerkraut", "sausage", "seafood", "shellfish", "shrimp", "smoked fish", "smoked salmon", "soy sauce", "sparkling wine", "spinach", "swiss cheese", "tempeh", "tomate", "tomato", "tuna", "vinagre", "vinegar", "vinho", "white wine", "wine", "wine vinegar"],
      caution: ["banana", "black tea", "cheese", "chili pepper", "chocolate", "cinnamon", "clove", "cocoa", "coffee", "cured", "egg white", "eggs", "green tea", "kiwi", "legumes", "lemon", "nuts", "orange", "papaya", "peanut", "pineapple", "strawberry", "walnut"],
      neutralizers: ["abobrinha", "arroz branco", "baixa histamina", "batata", "batata cozida", "carne fresca", "cenoura", "congelado imediatamente", "congelado rapidamente", "cream cheese", "frango fresco", "fresco", "frescos", "frutas frescas", "legumes frescos", "leite fresco", "maçã", "manga", "melancia", "melão", "mussarela de búfala", "não fermentado", "ovo fresco", "peixe fresco", "pepino", "pera", "queijo fresco", "recém cozido", "recém preparado", "recém-cozido", "ricota fresca", "sem envelhecimento", "sem fermentação"]
    },
    nickel: {
      blocked: ["almond", "almonds", "amendoim", "asparagus", "aveia", "avocado", "barley", "beans", "beet", "broccoli", "brócolis", "brown rice", "cacau", "canned pea", "canned pear", "canned sardine", "cashew nut", "castanha", "chard", "cherry", "chia", "chickpea", "chickpeas", "chocolate", "cocoa", "cogumelo", "couve", "dark chocolate", "edamame", "espinafre", "feijão", "flaxseed", "grão-de-bico", "hazelnut", "herring", "kale", "kiwi", "lentilha", "lentils", "mackerel", "mollusks", "mushroom", "mushrooms", "nozes", "nuts", "oat", "oats", "oysters", "pea", "peanut", "pear", "pineapple", "pistachio", "plum", "potato", "pumpkin seed", "quinoa", "rye", "seafood", "sesame", "sesame seed", "shellfish", "soja", "soybean", "spinach", "sunflower seed", "tofu", "tomate", "tomato", "walnut", "whole wheat"],
      caution: ["butter", "chicken", "corn", "eggs", "fresh cheese", "fresh fish", "fresh fruits", "fresh meat", "milk", "polished rice", "root vegetables", "white rice"],
      neutralizers: ["abobrinha", "arroz branco", "baixo níquel", "banana", "batata", "carne bovina", "carne suína", "cenoura", "frango", "iogurte", "leite", "maçã", "melancia", "ovo", "ovos", "pão branco", "peixe branco", "pepino", "pera", "peru", "pobre em níquel", "queijo", "queijo fresco", "uva"]
    },
    salicylate: {
      blocked: ["abacaxi", "abobrinha", "almond", "almonds", "amora", "apple", "apricot", "asparagus", "azeite", "basil", "bell pepper", "black tea", "blackberry", "blueberry", "broccoli", "brócolis", "café", "canela", "chá", "champignon", "cherry", "chiclete", "chili pepper", "cinnamon", "clove", "coffee", "cucumber", "curry", "eggplant", "especiarias", "espinafre", "framboesa", "frutas vermelhas", "ginger", "grape", "green tea", "honey", "hortelã", "kiwi", "laranja", "lemon", "licorice", "mel", "mint", "mirtilo", "morango", "mustard", "nuts", "olive", "olive oil", "orange", "oregano", "paprika", "peanut", "pepino", "pimentão", "pine nut", "pineapple", "pistachio", "plum", "raspberry", "rosemary", "spices", "strawberry", "tangerina", "tangerine", "tea", "thyme", "tomate", "tomato", "turmeric", "uva", "vinegar", "wine", "zucchini"],
      caution: ["cabbage", "carrot", "cauliflower", "chicken", "eggs", "fish", "lettuce", "mango", "meat", "milk", "oats", "papaya", "peeled golden apple", "peeled pear", "peeled potato", "potato", "rice", "ripe banana", "ripe mango"],
      neutralizers: ["alface", "alface iceberg", "arroz", "arroz branco", "aveia", "baixo salicilato", "banana madura", "banana verde", "batata cozida", "batata descascada", "carne", "carne fresca", "couve", "couve-flor", "feijão verde", "frango", "grão de bico", "leite", "lentilha", "manga madura", "ovo", "papaia", "peixe", "pera descascada", "pobre em salicilato", "queijo", "queijo cottage", "repolho"]
    },
    sulfite: {
      blocked: ["balsamic vinegar", "beer", "bottled lemon juice", "brown sugar", "calcium sulfite", "camarão", "candied fruit", "caper", "cerveja", "champagne", "cider", "crab", "damasco seco", "dried apricot", "dried banana", "dried coconut", "dried fig", "dried fruit", "dried mango", "E220", "E221", "E222", "E223", "E224", "E225", "E226", "E227", "E228", "embutidos", "fresh sausage", "fresh shrimp", "frozen potato", "frutas secas", "gelatin", "grape juice", "grated coconut", "lobster", "melado", "molasses", "mussel", "mustard", "pickles", "potassium metabisulfite", "potassium sulfite", "prosecco", "prune", "raisin", "red wine", "rosé wine", "sausage", "sodium bisulfite", "sodium metabisulfite", "sodium sulfite", "sparkling wine", "suco industrializado", "sulfite", "sulfites", "sulfur dioxide", "uva passa", "vinagre", "vinagre balsâmico", "vinegar", "vinho", "vinho branco", "vinho tinto", "white wine", "wine", "wine vinegar"],
      caution: ["fresh fruits", "frozen shrimp", "natural juice", "peeled potato"],
      neutralizers: ["artesanal", "carne fresca", "caseiro", "fresco", "frutas frescas", "legumes frescos", "limão", "livre de sulfito", "não contém sulfito", "natural", "orgânico", "peixe fresco", "sem aditivos", "sem conservantes", "sem sulfito", "sem sulfitos", "suco caseiro", "suco natural", "vegetais frescos", "vinagre de maçã", "vinagre orgânico", "vinho orgânico"]
    }
  }
};

// Função para detectar idioma
function detectLanguage(ingredient) {
  // Palavras-chave em português
  const ptKeywords = ['ã', 'õ', 'ç', 'á', 'é', 'í', 'ó', 'ú', 'â', 'ê', 'ô'];
  
  for (const keyword of ptKeywords) {
    if (ingredient.includes(keyword)) {
      return 'pt';
    }
  }
  
  return 'en';
}

async function importData() {
  let totalMappings = 0;
  let totalKeywords = 0;
  let errors = 0;

  try {
    console.log("📊 1. Importando intolerance_mappings...\n");
    
    // Processar intolerâncias
    for (const [intoleranceKey, data] of Object.entries(exportedData.intolerances)) {
      console.log(`\n  Processando: ${intoleranceKey}`);
      
      // Bloqueados (high)
      if (data.blocked && data.blocked.length > 0) {
        const mappings = data.blocked.map(ingredient => ({
          intolerance_key: intoleranceKey,
          ingredient: ingredient.trim(),
          severity_level: 'high',
          language: detectLanguage(ingredient)
        }));
        
        // Inserir em lotes de 100
        for (let i = 0; i < mappings.length; i += 100) {
          const batch = mappings.slice(i, i + 100);
          const { error } = await supabase
            .from('intolerance_mappings')
            .insert(batch);
          
          if (error) {
            console.error(`    ❌ Erro no lote bloqueados ${Math.floor(i/100) + 1}:`, error.message);
            errors++;
          } else {
            totalMappings += batch.length;
            console.log(`    ✅ Bloqueados: ${batch.length} inseridos`);
          }
        }
      }
      
      // Atenção (low)
      if (data.caution && data.caution.length > 0) {
        const mappings = data.caution.map(ingredient => ({
          intolerance_key: intoleranceKey,
          ingredient: ingredient.trim(),
          severity_level: 'low',
          language: detectLanguage(ingredient)
        }));
        
        const { error } = await supabase
          .from('intolerance_mappings')
          .insert(mappings);
        
        if (error) {
          console.error(`    ❌ Erro em atenção:`, error.message);
          errors++;
        } else {
          totalMappings += mappings.length;
          console.log(`    ✅ Atenção: ${mappings.length} inseridos`);
        }
      }
      
      // Seguros (safe)
      if (data.safe && data.safe.length > 0) {
        const mappings = data.safe.map(ingredient => ({
          intolerance_key: intoleranceKey,
          ingredient: ingredient.trim(),
          severity_level: 'safe',
          language: detectLanguage(ingredient)
        }));
        
        for (let i = 0; i < mappings.length; i += 100) {
          const batch = mappings.slice(i, i + 100);
          const { error } = await supabase
            .from('intolerance_mappings')
            .insert(batch);
          
          if (error) {
            console.error(`    ❌ Erro no lote seguros ${Math.floor(i/100) + 1}:`, error.message);
            errors++;
          } else {
            totalMappings += batch.length;
            console.log(`    ✅ Seguros: ${batch.length} inseridos`);
          }
        }
      }
    }
    
    // Processar alergias
    for (const [allergyKey, data] of Object.entries(exportedData.allergies)) {
      console.log(`\n  Processando: ${allergyKey}`);
      
      // Bloqueados
      if (data.blocked && data.blocked.length > 0) {
        const mappings = data.blocked.map(ingredient => ({
          intolerance_key: allergyKey,
          ingredient: ingredient.trim(),
          severity_level: 'high',
          language: detectLanguage(ingredient)
        }));
        
        for (let i = 0; i < mappings.length; i += 100) {
          const batch = mappings.slice(i, i + 100);
          const { error } = await supabase
            .from('intolerance_mappings')
            .insert(batch);
          
          if (error) {
            console.error(`    ❌ Erro no lote ${Math.floor(i/100) + 1}:`, error.message);
            errors++;
          } else {
            totalMappings += batch.length;
            console.log(`    ✅ Bloqueados: ${batch.length} inseridos`);
          }
        }
      }
      
      // Atenção
      if (data.caution && data.caution.length > 0) {
        const mappings = data.caution.map(ingredient => ({
          intolerance_key: allergyKey,
          ingredient: ingredient.trim(),
          severity_level: 'low',
          language: detectLanguage(ingredient)
        }));
        
        const { error } = await supabase
          .from('intolerance_mappings')
          .insert(mappings);
        
        if (error) {
          console.error(`    ❌ Erro em atenção:`, error.message);
          errors++;
        } else {
          totalMappings += mappings.length;
          console.log(`    ✅ Atenção: ${mappings.length} inseridos`);
        }
      }
    }
    
    // Processar sensibilidades
    for (const [sensitivityKey, data] of Object.entries(exportedData.sensitivities)) {
      console.log(`\n  Processando: ${sensitivityKey}`);
      
      // Bloqueados
      if (data.blocked && data.blocked.length > 0) {
        const mappings = data.blocked.map(ingredient => ({
          intolerance_key: sensitivityKey,
          ingredient: ingredient.trim(),
          severity_level: 'high',
          language: detectLanguage(ingredient)
        }));
        
        for (let i = 0; i < mappings.length; i += 100) {
          const batch = mappings.slice(i, i + 100);
          const { error } = await supabase
            .from('intolerance_mappings')
            .insert(batch);
          
          if (error) {
            console.error(`    ❌ Erro no lote ${Math.floor(i/100) + 1}:`, error.message);
            errors++;
          } else {
            totalMappings += batch.length;
            console.log(`    ✅ Bloqueados: ${batch.length} inseridos`);
          }
        }
      }
      
      // Atenção
      if (data.caution && data.caution.length > 0) {
        const mappings = data.caution.map(ingredient => ({
          intolerance_key: sensitivityKey,
          ingredient: ingredient.trim(),
          severity_level: 'low',
          language: detectLanguage(ingredient)
        }));
        
        const { error } = await supabase
          .from('intolerance_mappings')
          .insert(mappings);
        
        if (error) {
          console.error(`    ❌ Erro em atenção:`, error.message);
          errors++;
        } else {
          totalMappings += mappings.length;
          console.log(`    ✅ Atenção: ${mappings.length} inseridos`);
        }
      }
      
      // Seguros
      if (data.safe && data.safe.length > 0) {
        const mappings = data.safe.map(ingredient => ({
          intolerance_key: sensitivityKey,
          ingredient: ingredient.trim(),
          severity_level: 'safe',
          language: detectLanguage(ingredient)
        }));
        
        const { error } = await supabase
          .from('intolerance_mappings')
          .insert(mappings);
        
        if (error) {
          console.error(`    ❌ Erro em seguros:`, error.message);
          errors++;
        } else {
          totalMappings += mappings.length;
          console.log(`    ✅ Seguros: ${mappings.length} inseridos`);
        }
      }
    }
    
    console.log("\n\n📊 2. Importando intolerance_safe_keywords...\n");
    
    // Processar neutralizadores
    const allNeutralizers = [];
    
    // Intolerâncias
    for (const [key, data] of Object.entries(exportedData.intolerances)) {
      if (data.neutralizers) {
        data.neutralizers.forEach(keyword => {
          allNeutralizers.push({
            intolerance_key: key,
            keyword: keyword.trim()
          });
        });
      }
    }
    
    // Alergias
    for (const [key, data] of Object.entries(exportedData.allergies)) {
      if (data.neutralizers) {
        data.neutralizers.forEach(keyword => {
          allNeutralizers.push({
            intolerance_key: key,
            keyword: keyword.trim()
          });
        });
      }
    }
    
    // Sensibilidades
    for (const [key, data] of Object.entries(exportedData.sensitivities)) {
      if (data.neutralizers) {
        data.neutralizers.forEach(keyword => {
          allNeutralizers.push({
            intolerance_key: key,
            keyword: keyword.trim()
          });
        });
      }
    }
    
    // Inserir neutralizadores em lotes
    for (let i = 0; i < allNeutralizers.length; i += 100) {
      const batch = allNeutralizers.slice(i, i + 100);
      const { error } = await supabase
        .from('intolerance_safe_keywords')
        .insert(batch);
      
      if (error) {
        console.error(`  ❌ Erro no lote ${Math.floor(i/100) + 1}:`, error.message);
        errors++;
      } else {
        totalKeywords += batch.length;
        console.log(`  ✅ Lote ${Math.floor(i/100) + 1}: ${batch.length} neutralizadores inseridos`);
      }
    }
    
    console.log("\n\n🎉 IMPORTAÇÃO CONCLUÍDA!");
    console.log("=" .repeat(80));
    console.log(`\n📊 RESUMO:`);
    console.log(`  ✅ ${totalMappings} mapeamentos de intolerância inseridos`);
    console.log(`  ✅ ${totalKeywords} neutralizadores inseridos`);
    console.log(`  ❌ ${errors} erros encontrados`);
    console.log(`\n  Total esperado: 1.669 mapeamentos + 628 neutralizadores`);
    console.log(`  Total inserido: ${totalMappings} mapeamentos + ${totalKeywords} neutralizadores`);
    
    if (totalMappings >= 1600 && totalKeywords >= 600) {
      console.log("\n✅ SUCESSO! Sistema populado com dados completos!");
    } else {
      console.log("\n⚠️  ATENÇÃO: Alguns dados podem não ter sido inseridos.");
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal na importação:', error);
  }
}

importData();
