import { useState, useRef, useEffect, KeyboardEvent, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Search, AlertTriangle, Check, Loader2, Lightbulb, ChefHat, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIntoleranceWarning, ConflictType } from "@/hooks/useIntoleranceWarning";
import IngredientConflictDialog from "@/components/IngredientConflictDialog";
import { useIngredientCombinationValidation, ValidationResult } from "@/hooks/useIngredientCombinationValidation";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { FALLBACK_RESTRICTION_LABELS } from "@/lib/safetyFallbacks";

// Lista de ingredientes comuns para autocomplete - extensa e detalhada
const COMMON_INGREDIENTS = [
  // Proteínas - Aves
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "file de frango",
  "frango desfiado", "frango inteiro", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  
  // Proteínas - Carnes Bovinas
  "carne", "carne moída", "carne bovina", "patinho", "patinho moído", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "t-bone", "coxão mole", "coxão duro", "lagarto", "paleta",
  "ossobuco", "rabo", "rabada", "mocotó", "carne seca", "carne de sol", "charque",
  "bife", "bife de fígado", "fígado bovino", "bucho", "dobradinha", "língua bovina",
  
  // Proteínas - Suínos
  "carne de porco", "lombo", "lombo de porco", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo", "linguiça",
  "linguiça calabresa", "linguiça toscana", "linguiça de frango", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "salsicha frankfurt", "salsicha viena",
  "presunto", "presunto parma", "presunto serrano", "copa", "salame", "mortadela",
  "tender", "leitão", "pernil defumado",
  
  // Proteínas - Peixes
  "peixe", "filé de peixe", "salmão", "filé de salmão", "salmão defumado", "salmão fresco",
  "atum", "atum em lata", "atum fresco", "tilápia", "filé de tilápia", "bacalhau",
  "bacalhau dessalgado", "sardinha", "sardinha em lata", "sardinha fresca", "merluza",
  "pescada", "pescada amarela", "robalo", "dourado", "pintado", "tambaqui", "pacu",
  "pirarucu", "truta", "linguado", "badejo", "namorado", "corvina", "tainha",
  "anchova", "cavalinha", "arenque", "carpa",
  
  // Proteínas - Frutos do Mar
  "camarão", "camarão rosa", "camarão cinza", "camarão seco", "camarão grande", "camarão médio",
  "lagosta", "lagostim", "lula", "anéis de lula", "polvo", "marisco", "mexilhão", "ostra",
  "vieira", "siri", "caranguejo", "casquinha de siri", "sururu", "camarão descascado",
  
  // Ovos
  "ovo", "ovos", "ovo de galinha", "ovo caipira", "ovo de codorna", "gema", "clara de ovo",
  "ovo cozido", "ovo frito",
  
  // Laticínios - Queijos
  "queijo", "queijo mussarela", "mussarela", "mussarela de búfala", "queijo mussarela de búfala",
  "queijo parmesão", "parmesão", "parmesão ralado", "queijo coalho", "queijo minas",
  "queijo minas frescal", "queijo minas padrão", "queijo minas curado", "queijo cheddar",
  "queijo prato", "queijo provolone", "provolone", "queijo gorgonzola", "gorgonzola",
  "queijo brie", "brie", "queijo camembert", "camembert", "queijo roquefort", "roquefort",
  "queijo gruyère", "gruyère", "queijo emmental", "emmental", "queijo suíço",
  "queijo cottage", "cottage", "queijo ricota", "ricota", "queijo feta", "feta",
  "queijo de cabra", "queijo colonial", "queijo serrano", "queijo canastra",
  "queijo do reino", "queijo estepe", "queijo gouda", "gouda", "queijo pecorino",
  "requeijão", "requeijão cremoso", "cream cheese", "catupiry", "queijo cremoso",
  "queijo ralado", "queijo branco", "queijo fresco", "queijo curado", "queijo defumado",
  "burrata", "mascarpone", "queijo azul", "queijo fundido",
  
  // Laticínios - Leites e Derivados
  "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
  "leite condensado", "leite evaporado", "leite de cabra", "leite fermentado",
  "creme de leite", "creme de leite fresco", "chantilly", "nata", "coalhada",
  "iogurte", "iogurte natural", "iogurte grego", "iogurte desnatado", "iogurte integral",
  "iogurte de morango", "iogurte de frutas", "kefir", "leitelho", "buttermilk",
  "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
  "margarina", "creme de ricota",
  
  // ===== ALTERNATIVAS SEM LACTOSE =====
  "leite sem lactose", "leite integral sem lactose", "leite desnatado sem lactose",
  "leite semidesnatado sem lactose", "leite em pó sem lactose",
  "creme de leite sem lactose", "chantilly sem lactose", "nata sem lactose",
  "iogurte sem lactose", "iogurte natural sem lactose", "iogurte grego sem lactose",
  "queijo sem lactose", "queijo mussarela sem lactose", "mussarela sem lactose",
  "queijo parmesão sem lactose", "parmesão sem lactose", "queijo minas sem lactose",
  "queijo cottage sem lactose", "queijo ricota sem lactose", "ricota sem lactose",
  "queijo cheddar sem lactose", "queijo prato sem lactose",
  "requeijão sem lactose", "cream cheese sem lactose", "catupiry sem lactose",
  "manteiga sem lactose", "doce de leite sem lactose",
  "leite condensado sem lactose", "pudim sem lactose", "sorvete sem lactose",
  "chocolate ao leite sem lactose", "achocolatado sem lactose",
  
  // Leites Vegetais
  "leite de coco", "leite de amêndoas", "leite de aveia", "leite de soja", "leite de arroz",
  "leite de castanha", "leite de avelã", "creme de coco",
  
  // Carboidratos - Arroz e Grãos
  "arroz", "arroz branco", "arroz integral", "arroz parboilizado", "arroz arbóreo",
  "arroz basmati", "arroz jasmine", "arroz negro", "arroz selvagem", "arroz cateto",
  "arroz para sushi", "risoto",
  
  // Carboidratos - Massas
  "macarrão", "macarrão espaguete", "espaguete", "macarrão penne", "penne",
  "macarrão fusilli", "fusilli", "macarrão farfalle", "farfalle", "macarrão rigatoni",
  "macarrão talharim", "talharim", "macarrão fettuccine", "fettuccine", "macarrão cabelo de anjo",
  "macarrão integral", "macarrão parafuso", "macarrão conchinha", "macarrão padre nosso",
  "lasanha", "massa de lasanha", "canelone", "ravióli", "capeletti", "tortellini",
  "nhoque", "gnocchi", "massa folhada", "massa de pastel", "massa de pizza",
  "massa de torta", "massa de empada", "massa wonton", "macarrão instantâneo", "miojo",
  "macarrão de arroz", "bifum", "udon", "soba", "ramen", "lámen",
  
  // ===== ALTERNATIVAS SEM GLÚTEN =====
  "farinha sem glúten", "farinha de trigo sem glúten", "mix de farinhas sem glúten",
  "macarrão sem glúten", "espaguete sem glúten", "penne sem glúten", "fusilli sem glúten",
  "lasanha sem glúten", "massa de lasanha sem glúten", "massa sem glúten",
  "pão sem glúten", "pão de forma sem glúten", "pão francês sem glúten",
  "torrada sem glúten", "biscoito sem glúten", "bolacha sem glúten",
  "massa de pizza sem glúten", "massa de torta sem glúten", "massa folhada sem glúten",
  "cerveja sem glúten", "molho de soja sem glúten", "shoyu sem glúten",
  "aveia sem glúten", "aveia certificada sem glúten",
  
  // Carboidratos - Pães e Farinhas
  "pão", "pão francês", "pão de forma", "pão integral", "pão de leite", "pão sírio",
  "pão árabe", "pão ciabatta", "pão italiano", "pão australiano", "pão brioche",
  "pão de queijo", "pão de alho", "pão de hot dog", "pão de hambúrguer", "baguete",
  "croissant", "torrada", "biscoito", "bolacha", "cream cracker", "biscoito água e sal",
  "farinha de trigo", "farinha de trigo integral", "farinha de rosca", "farinha de milho",
  "farinha de mandioca", "farinha de tapioca", "tapioca", "polvilho", "polvilho azedo",
  "polvilho doce", "fubá", "amido de milho", "maisena", "fécula de batata",
  "farinha de aveia", "farinha de arroz", "farinha de amêndoas", "farinha de coco",
  "farinha de centeio", "farinha de grão de bico", "semolina",
  
  // Carboidratos - Tubérculos
  "batata", "batata inglesa", "batata doce", "batata doce roxa", "batata baroa",
  "mandioquinha", "mandioca", "aipim", "macaxeira", "inhame", "cará", "taro",
  "batata palha", "batata frita", "purê de batata",
  
  // Leguminosas
  "feijão", "feijão preto", "feijão carioca", "feijão branco", "feijão vermelho",
  "feijão fradinho", "feijão jalo", "feijão de corda", "feijão azuki", "feijão rajado",
  "feijão rosinha", "feijão mulatinho", "feijoada",
  "lentilha", "lentilha verde", "lentilha vermelha", "grão de bico", "ervilha",
  "ervilha seca", "ervilha fresca", "ervilha em conserva", "ervilha torta",
  "soja", "grão de soja", "edamame", "tofu", "tofu firme", "tofu macio",
  "fava", "tremoço",
  
  // Cereais e Grãos
  "aveia", "aveia em flocos", "aveia flocos finos", "farelo de aveia",
  "quinoa", "quinoa branca", "quinoa vermelha", "quinoa preta",
  "trigo", "trigo para quibe", "bulgur", "triguilho", "cuscuz", "cuscuz marroquino",
  "granola", "muesli", "gérmen de trigo", "linhaça", "linhaça dourada", "linhaça marrom",
  "chia", "semente de chia", "gergelim", "gergelim branco", "gergelim preto",
  "painço", "milhete", "amaranto", "centeio", "cevada", "sorgo",
  "milho", "milho verde", "milho em conserva", "milho de pipoca", "pipoca",
  "espiga de milho", "canjica", "canjiquinha", "xerém", "polenta",
  
  // Vegetais - Folhosos
  "alface", "alface americana", "alface crespa", "alface roxa", "alface romana",
  "rúcula", "agrião", "espinafre", "couve", "couve manteiga", "couve mineira",
  "couve kale", "kale", "repolho", "repolho verde", "repolho roxo", "acelga",
  "chicória", "escarola", "endívia", "almeirão", "mostarda", "folha de mostarda",
  "broto de alfafa", "broto de feijão", "moyashi", "microgreens",
  
  // Vegetais - Crucíferos
  "brócolis", "brócolis americano", "brócolis ninja", "brócolis ramoso",
  "couve-flor", "couve-flor branca", "couve-flor roxa", "romanesco",
  "couve de bruxelas", "nabo", "rabanete",
  
  // Vegetais - Frutas (usados como legumes)
  "tomate", "tomate italiano", "tomate cereja", "tomate grape", "tomate caqui",
  "tomate holandês", "tomate seco", "tomate seco em conserva", "tomate pelado",
  "tomate em conserva", "pimentão", "pimentão verde", "pimentão vermelho",
  "pimentão amarelo", "pimentão laranja", "pepino", "pepino japonês",
  "abobrinha", "abobrinha italiana", "abobrinha brasileira", "abobrinha paulista",
  "abóbora", "abóbora cabotiã", "abóbora moranga", "abóbora japonesa", "abóbora menina",
  "abóbora seca", "berinjela", "berinjela japonesa", "jiló", "quiabo", "maxixe", "chuchu",
  
  // Vegetais - Raízes
  "cenoura", "cenoura baby", "beterraba", "rabanete", "nabo",
  
  // Vegetais - Bulbos e Talos
  "cebola", "cebola branca", "cebola roxa", "cebola pérola", "cebola caramelizada",
  "alho", "alho picado", "alho frito", "dente de alho", "cabeça de alho",
  "alho-poró", "cebolinha", "cebolinha verde", "cebola de verdeo", "chalota", "echalote",
  "erva-doce", "funcho", "aipo", "salsão", "palmito", "palmito pupunha", "palmito juçara",
  "aspargo", "aspargo verde", "aspargo branco", "bambu", "broto de bambu",
  
  // Vegetais - Cogumelos
  "cogumelo", "champignon", "champignon fresco", "champignon em conserva",
  "shimeji", "shimeji branco", "shimeji preto", "shiitake", "shiitake seco",
  "portobello", "funghi", "funghi seco", "cogumelo paris", "cogumelo do sol",
  "trufa", "trufa negra", "trufa branca",
  
  // Vegetais - Outros
  "vagem", "ervilha torta", "milho verde", "alcachofra", "coração de alcachofra",
  "azeitona", "azeitona verde", "azeitona preta", "azeitona kalamata",
  "alcaparra", "pepino em conserva", "picles", "pimenta jalapeño", "pimenta dedo de moça",
  
  // Frutas - Cítricas
  "limão", "limão taiti", "limão siciliano", "limão galego", "limão cravo",
  "laranja", "laranja pera", "laranja bahia", "laranja lima", "laranja seleta",
  "tangerina", "mexerica", "ponkan", "clementina", "bergamota",
  "lima", "lima da pérsia", "toranja", "grapefruit", "cidra", "kumquat", "kinkan",
  
  // Frutas - Tropicais
  "banana", "banana prata", "banana nanica", "banana maçã", "banana da terra", "banana ouro",
  "abacaxi", "abacaxi pérola", "manga", "manga tommy", "manga palmer", "manga espada", "manga rosa",
  "mamão", "mamão papaya", "mamão formosa", "maracujá", "maracujá doce", "polpa de maracujá",
  "coco", "coco verde", "coco seco", "coco ralado", "água de coco",
  "goiaba", "goiaba vermelha", "goiaba branca", "açaí", "polpa de açaí",
  "cupuaçu", "graviola", "pitanga", "acerola", "caju", "castanha de caju", "carambola",
  "lichia", "pitaya", "fruta do conde", "ata", "jaca", "abiu", "sapoti",
  "cacau", "jabuticaba", "seriguela", "cajá", "umbu", "mangaba", "murici",
  
  // Frutas - Temperadas
  "maçã", "maçã fuji", "maçã gala", "maçã verde", "pera", "pera williams", "pera danjou",
  "uva", "uva verde", "uva roxa", "uva itália", "uva thompson", "uva passa", "passas",
  "morango", "framboesa", "amora", "mirtilo", "blueberry", "cereja",
  "pêssego", "nectarina", "damasco", "damasco seco", "ameixa", "ameixa seca",
  "figo", "figo fresco", "figo seco", "kiwi", "kiwi verde", "kiwi gold",
  "melancia", "melão", "melão cantaloupe", "melão honeydew",
  "romã", "caqui", "nêspera", "marmelo",
  
  // Frutas Secas e Oleaginosas
  "castanha", "castanha de caju", "castanha do pará", "castanha portuguesa",
  "amendoim", "amendoim torrado", "paçoca", "nozes", "nozes pecã",
  "amêndoa", "amêndoa laminada", "amêndoa farinha", "avelã", "pistache",
  "macadâmia", "pinhão", "coco seco", "tâmara", "frutas secas", "mix de castanhas",
  
  // Ervas Frescas
  "salsinha", "salsa", "coentro", "cebolinha", "manjericão", "manjericão roxo",
  "hortelã", "menta", "alecrim", "tomilho", "orégano fresco", "sálvia",
  "estragão", "endro", "dill", "louro", "folha de louro", "capim limão",
  "capim santo", "erva-cidreira", "lavanda", "erva-doce folha",
  "curry leaves", "folha de curry", "nirá", "cheiro verde",
  
  // Temperos Secos e Especiarias
  "sal", "sal grosso", "sal marinho", "sal rosa", "flor de sal", "sal defumado",
  "pimenta", "pimenta do reino", "pimenta preta", "pimenta branca", "pimenta rosa",
  "pimenta calabresa", "pimenta caiena", "pimenta síria", "pimenta jamaica",
  "pimenta dedo de moça", "pimenta malagueta", "pimenta biquinho", "pimenta habanero",
  "páprica", "páprica doce", "páprica picante", "páprica defumada",
  "cominho", "cominho em pó", "cúrcuma", "açafrão da terra", "gengibre", "gengibre em pó",
  "canela", "canela em pau", "canela em pó", "cravo", "cravo da índia",
  "noz-moscada", "cardamomo", "anis estrelado", "erva-doce semente", "funcho semente",
  "curry", "curry em pó", "garam masala", "tandoori", "za'atar", "ras el hanout",
  "chimichurri", "tempero baiano", "tempero sírio",
  "orégano", "tomilho seco", "alecrim seco", "sálvia seca", "manjericão seco",
  "louro seco", "colorau", "urucum", "açafrão", "saffron",
  "mostarda em grão", "mostarda em pó", "semente de coentro", "semente de cominho",
  "pimenta em flocos", "chili flakes", "sumac", "feno grego",
  
  // Molhos e Condimentos
  "azeite", "azeite de oliva", "azeite extra virgem", "azeite de dendê",
  "óleo", "óleo de soja", "óleo de canola", "óleo de girassol", "óleo de milho",
  "óleo de gergelim", "óleo de coco", "óleo de abacate",
  "vinagre", "vinagre de maçã", "vinagre de vinho tinto", "vinagre de vinho branco",
  "vinagre balsâmico", "vinagre de arroz", "vinagre de álcool",
  "molho de soja", "shoyu", "molho shoyu", "tamari", "molho inglês", "worcestershire",
  "molho de ostra", "molho de peixe", "fish sauce", "molho teriyaki", "molho hoisin",
  "molho de tomate", "extrato de tomate", "passata", "polpa de tomate",
  "catchup", "ketchup", "mostarda", "mostarda dijon", "mostarda amarela",
  "maionese", "maionese caseira", "molho tártaro", "molho rosé",
  "molho barbecue", "molho pesto", "molho chimichurri", "molho tahine", "tahine",
  "pasta de amendoim", "manteiga de amendoim", "pasta de gergelim",
  "pesto", "pesto de manjericão", "harissa", "sriracha", "tabasco",
  "molho buffalo", "molho ranch", "molho caesar",
  "leite de coco", "creme de leite de coco",
  
  // Açúcares e Adoçantes
  "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
  "açúcar de confeiteiro", "açúcar de coco", "açúcar light",
  "mel", "mel silvestre", "mel de abelha", "melado", "melado de cana",
  "xarope de bordo", "maple syrup", "xarope de agave", "xarope de milho",
  "glucose", "açúcar invertido", "stevia", "adoçante", "eritritol", "xilitol",
  
  // ===== ALTERNATIVAS SEM AÇÚCAR =====
  "chocolate sem açúcar", "chocolate ao leite sem açúcar", "chocolate meio amargo sem açúcar",
  "achocolatado sem açúcar", "doce de leite sem açúcar", "geleia sem açúcar",
  "sorvete sem açúcar", "pudim sem açúcar", "biscoito sem açúcar",
  "refrigerante zero", "refrigerante sem açúcar", "suco sem açúcar",
  
  // Chocolates e Cacau
  "chocolate", "chocolate ao leite", "chocolate meio amargo", "chocolate amargo",
  "chocolate branco", "chocolate em pó", "cacau", "cacau em pó", "nibs de cacau",
  "achocolatado", "nutella", "creme de avelã", "gotas de chocolate", "chocolate granulado",
  
  // Café e Chás
  "café", "café em pó", "café solúvel", "café expresso", "chá", "chá verde",
  "chá preto", "chá de hibisco", "chá de camomila", "chá mate", "erva mate",
  
  // Fermentos e Leveduras
  "fermento", "fermento biológico", "fermento biológico seco", "fermento fresco",
  "fermento químico", "fermento em pó", "bicarbonato", "bicarbonato de sódio",
  "cremor de tártaro", "levedura nutricional",
  
  // Conservas e Enlatados
  "milho em conserva", "ervilha em conserva", "palmito em conserva", "aspargo em conserva",
  "atum em lata", "sardinha em lata", "grão de bico em conserva", "feijão em conserva",
  "tomate pelado em lata", "cogumelo em conserva",
  
  // Bebidas para Culinária
  "vinho branco", "vinho tinto", "vinho do porto", "vinho marsala",
  "cerveja", "champagne", "conhaque", "rum", "cachaça", "licor",
  "saquê", "mirin",
  
  // Ingredientes Asiáticos
  "gengibre", "wasabi", "nori", "alga nori", "wakame", "kombu", "missô", "pasta de missô",
  "tofu", "tempeh", "leite de coco", "curry paste", "pasta de curry",
  "macarrão de arroz", "papel de arroz", "wonton", "gyoza",
  
  // Proteínas Vegetais e Plant-Based
  "carne de soja", "carne vegetal", "carne moída vegetal", "carne moída de soja",
  "proteína de soja", "proteína texturizada de soja", "pts", "proteína vegetal",
  "hambúrguer de soja", "hambúrguer vegetal", "hambúrguer de grão de bico",
  "hambúrguer de lentilha", "hambúrguer de feijão", "hambúrguer de quinoa",
  "almôndega de soja", "almôndega vegetal", "almôndega de lentilha",
  "salsicha de soja", "salsicha vegetal", "linguiça de soja", "linguiça vegetal",
  "frango de soja", "frango vegetal", "nuggets vegetal", "nuggets de soja",
  "steak vegetal", "bife vegetal", "bife de soja", "carne desfiada vegetal",
  "seitan", "glúten de trigo", "jaca verde", "jaca desfiada",
  "grão de bico", "falafel", "homus", "hummus", "pasta de grão de bico",
  "lentilha", "ervilha", "edamame", "tempeh", "natto",
  
  // Laticínios Vegetais e Plant-Based
  "queijo vegano", "queijo de castanha", "queijo de amendoim", "queijo de caju",
  "queijo vegetal", "mussarela vegana", "parmesão vegano", "cheddar vegano",
  "cream cheese vegano", "requeijão vegano", "ricota vegana",
  "iogurte vegano", "iogurte de coco", "iogurte de soja", "iogurte de amêndoas",
  "iogurte de castanha", "iogurte vegetal",
  "manteiga vegana", "manteiga de coco", "manteiga vegetal",
  "creme de leite vegano", "creme de leite de coco", "creme vegetal",
  "chantilly vegano", "nata vegana", "nata de coco",
  "leite vegetal", "bebida vegetal", "bebida de aveia", "bebida de amêndoas",
  "bebida de soja", "bebida de arroz", "bebida de coco", "bebida de castanha",
  
  // Ovos Vegetais (Substitutos)
  "ovo vegano", "substituto de ovo", "ovo de linhaça", "ovo de chia",
  "aquafaba", "água do grão de bico",
  
  // Embutidos e Frios Vegetais
  "presunto vegano", "presunto vegetal", "presunto de soja",
  "mortadela vegana", "mortadela vegetal", "peito de peru vegano",
  "bacon vegano", "bacon vegetal", "bacon de coco",
  "salame vegano", "pepperoni vegano", "copa vegana",
  
  // Peixes e Frutos do Mar Vegetais
  "atum vegano", "atum vegetal", "salmão vegano", "salmão vegetal",
  "camarão vegano", "camarão vegetal", "peixe vegano", "peixe vegetal",
  "frutos do mar vegano",
  
  // Outros Ingredientes
  "gelatina", "gelatina em pó", "gelatina em folha", "ágar-ágar",
  "corante alimentício", "essência de baunilha", "extrato de baunilha", "baunilha",
  "raspas de limão", "raspas de laranja", "zest",
];

// Categorização de ingredientes por tipo para filtragem inteligente
const MEAT_INGREDIENTS = new Set([
  // Aves
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "file de frango",
  "frango desfiado", "frango inteiro", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  // Bovinos
  "carne", "carne moída", "carne bovina", "patinho", "patinho moído", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "t-bone", "coxão mole", "coxão duro", "lagarto", "paleta",
  "ossobuco", "rabo", "rabada", "mocotó", "carne seca", "carne de sol", "charque",
  "bife", "bife de fígado", "fígado bovino", "bucho", "dobradinha", "língua bovina",
  // Suínos
  "carne de porco", "lombo", "lombo de porco", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo", "linguiça",
  "linguiça calabresa", "linguiça toscana", "linguiça de frango", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "salsicha frankfurt", "salsicha viena",
  "presunto", "presunto parma", "presunto serrano", "copa", "salame", "mortadela",
  "tender", "leitão", "pernil defumado",
]);

const FISH_SEAFOOD_INGREDIENTS = new Set([
  // Peixes
  "peixe", "filé de peixe", "salmão", "filé de salmão", "salmão defumado", "salmão fresco",
  "atum", "atum em lata", "atum fresco", "tilápia", "filé de tilápia", "bacalhau",
  "bacalhau dessalgado", "sardinha", "sardinha em lata", "sardinha fresca", "merluza",
  "pescada", "pescada amarela", "robalo", "dourado", "pintado", "tambaqui", "pacu",
  "pirarucu", "truta", "linguado", "badejo", "namorado", "corvina", "tainha",
  "anchova", "cavalinha", "arenque", "carpa",
  // Frutos do Mar
  "camarão", "camarão rosa", "camarão cinza", "camarão seco", "camarão grande", "camarão médio",
  "lagosta", "lagostim", "lula", "anéis de lula", "polvo", "marisco", "mexilhão", "ostra",
  "vieira", "siri", "caranguejo", "casquinha de siri", "sururu", "camarão descascado",
  // Molhos com peixe
  "molho de ostra", "molho de peixe", "fish sauce",
]);

const DAIRY_INGREDIENTS = new Set([
  // Queijos
  "queijo", "queijo mussarela", "mussarela", "mussarela de búfala", "queijo mussarela de búfala",
  "queijo parmesão", "parmesão", "parmesão ralado", "queijo coalho", "queijo minas",
  "queijo minas frescal", "queijo minas padrão", "queijo minas curado", "queijo cheddar",
  "queijo prato", "queijo provolone", "provolone", "queijo gorgonzola", "gorgonzola",
  "queijo brie", "brie", "queijo camembert", "camembert", "queijo roquefort", "roquefort",
  "queijo gruyère", "gruyère", "queijo emmental", "emmental", "queijo suíço",
  "queijo cottage", "cottage", "queijo ricota", "ricota", "queijo feta", "feta",
  "queijo de cabra", "queijo colonial", "queijo serrano", "queijo canastra",
  "queijo do reino", "queijo estepe", "queijo gouda", "gouda", "queijo pecorino",
  "requeijão", "requeijão cremoso", "cream cheese", "catupiry", "queijo cremoso",
  "queijo ralado", "queijo branco", "queijo fresco", "queijo curado", "queijo defumado",
  "burrata", "mascarpone", "queijo azul", "queijo fundido",
  // Leites e Derivados
  "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
  "leite condensado", "leite evaporado", "leite de cabra", "leite fermentado",
  "creme de leite", "creme de leite fresco", "chantilly", "nata", "coalhada",
  "iogurte", "iogurte natural", "iogurte grego", "iogurte desnatado", "iogurte integral",
  "iogurte de morango", "iogurte de frutas", "kefir", "leitelho", "buttermilk",
  "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
  "creme de ricota",
  // Derivados com lactose
  "chocolate ao leite", "achocolatado", "sorvete", "pudim", "doce de leite",
]);

const EGG_INGREDIENTS = new Set([
  "ovo", "ovos", "ovo de galinha", "ovo caipira", "ovo de codorna", "gema", "clara de ovo",
  "ovo cozido", "ovo frito",
]);

const HONEY_INGREDIENTS = new Set([
  "mel", "mel silvestre", "mel de abelha",
]);

// Ingredientes que contêm gelatina animal
const GELATIN_INGREDIENTS = new Set([
  "gelatina", "gelatina em pó", "gelatina em folha",
]);

// Ingredientes que contêm glúten
const GLUTEN_INGREDIENTS = new Set([
  "farinha de trigo", "farinha de trigo integral", "trigo", "trigo para quibe",
  "pão", "pão francês", "pão de forma", "pão integral", "pão de leite", "pão sírio",
  "pão árabe", "pão ciabatta", "pão italiano", "pão brioche", "baguete", "croissant",
  "torrada", "biscoito", "bolacha", "cream cracker", "biscoito água e sal",
  "macarrão", "macarrão espaguete", "espaguete", "macarrão penne", "penne",
  "macarrão fusilli", "macarrão farfalle", "macarrão talharim", "talharim",
  "macarrão fettuccine", "lasanha", "massa de lasanha", "canelone", "ravióli",
  "capeletti", "tortellini", "nhoque", "gnocchi", "massa folhada", "massa de pastel",
  "massa de pizza", "massa de torta", "massa de empada", "miojo", "macarrão instantâneo",
  "cerveja", "cevada", "centeio", "aveia", "aveia em flocos", "farelo de aveia",
  "bulgur", "triguilho", "cuscuz", "semolina", "seitan",
  "molho de soja", "shoyu",
]);

// Ingredientes que contêm açúcar
const SUGAR_INGREDIENTS = new Set([
  "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
  "açúcar de confeiteiro", "mel", "mel silvestre", "melado", "melado de cana",
  "xarope de bordo", "maple syrup", "xarope de agave", "xarope de milho", "glucose",
  "leite condensado", "doce de leite", "chocolate ao leite", "chocolate branco",
  "achocolatado", "nutella", "gotas de chocolate",
]);

// Ingredientes com amendoim
const PEANUT_INGREDIENTS = new Set([
  "amendoim", "amendoim torrado", "pasta de amendoim", "manteiga de amendoim",
  "paçoca", "óleo de amendoim",
]);

// Mapeamento de restrições para seus ingredientes
const RESTRICTION_INGREDIENTS_MAP: Record<string, Set<string>> = {
  lactose: DAIRY_INGREDIENTS,
  gluten: GLUTEN_INGREDIENTS,
  acucar: SUGAR_INGREDIENTS,
  amendoim: PEANUT_INGREDIENTS,
  frutos_mar: FISH_SEAFOOD_INGREDIENTS,
  ovo: EGG_INGREDIENTS,
};

// Labels amigáveis para as restrições são importados de @/lib/safetyFallbacks

// Função para verificar se ingrediente é compatível com a dieta
const isIngredientCompatible = (ingredient: string, dietaryPreference: string | null | undefined): boolean => {
  const lowerIngredient = ingredient.toLowerCase();
  
  // Se não tem preferência ou é "omnivore", mostra tudo
  if (!dietaryPreference || dietaryPreference === "omnivore" || dietaryPreference === "comum") {
    return true;
  }
  
  // Vegetariano: sem carnes, peixes e frutos do mar
  if (dietaryPreference === "vegetarian" || dietaryPreference === "vegetariana") {
    if (MEAT_INGREDIENTS.has(lowerIngredient)) return false;
    if (FISH_SEAFOOD_INGREDIENTS.has(lowerIngredient)) return false;
    return true;
  }
  
  // Vegano: sem carnes, peixes, frutos do mar, laticínios, ovos, mel e gelatina
  if (dietaryPreference === "vegan" || dietaryPreference === "vegana") {
    if (MEAT_INGREDIENTS.has(lowerIngredient)) return false;
    if (FISH_SEAFOOD_INGREDIENTS.has(lowerIngredient)) return false;
    if (DAIRY_INGREDIENTS.has(lowerIngredient)) return false;
    if (EGG_INGREDIENTS.has(lowerIngredient)) return false;
    if (HONEY_INGREDIENTS.has(lowerIngredient)) return false;
    if (GELATIN_INGREDIENTS.has(lowerIngredient)) return false;
    return true;
  }
  
  // Low carb/Ketogenic: mostra tudo (é sobre macros, não restrições de ingredientes)
  if (dietaryPreference === "low_carb" || dietaryPreference === "ketogenic" || dietaryPreference === "cetogenica") {
    return true;
  }
  
  return true;
};

// Função para verificar se ingrediente tem conflito com intolerância
const checkIntoleranceConflict = (
  ingredient: string, 
  intolerances: string[] | null | undefined
): string | null => {
  if (!intolerances || intolerances.length === 0) return null;
  
  const lowerIngredient = ingredient.toLowerCase();
  
  for (const intolerance of intolerances) {
    if (intolerance === "nenhuma") continue;
    
    const restrictedIngredients = RESTRICTION_INGREDIENTS_MAP[intolerance];
    if (restrictedIngredients && restrictedIngredients.has(lowerIngredient)) {
      return intolerance;
    }
  }
  
  return null;
};

// Tipo para ingrediente processado
type ProcessedIngredient = {
  name: string;
  hasConflict: boolean;
  conflictType: string | null;
  conflictLabel: string | null;
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

interface IngredientTagInputProps {
  value: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  userProfile?: UserProfile | null;
  enableCombinationValidation?: boolean;
}

export default function IngredientTagInput({
  value,
  onChange,
  placeholder = "Digite um ingrediente...",
  disabled = false,
  onSubmit,
  userProfile = null,
  enableCombinationValidation = true,
}: IngredientTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estado para o diálogo de conflito
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictType | null>(null);
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  
  // Hook de verificação de conflitos (intolerâncias)
  const { checkConflict } = useIntoleranceWarning();
  
  // Hook de validação de combinações culinárias
  const {
    isValidating: isCombinationValidating,
    result: combinationResult,
    feedbackSent: combinationFeedbackSent,
    validateWithDebounce,
    sendFeedback: sendCombinationFeedback,
    clearValidation,
  } = useIngredientCombinationValidation();

  // Normaliza string removendo acentos para comparação
  const normalizeString = (str: string) => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Processa e agrupa ingredientes
  const processedSuggestions = useMemo(() => {
    if (inputValue.length < 1) return { safe: [], conflicting: [] };
    
    const normalizedInput = normalizeString(inputValue);
    
    const filtered = COMMON_INGREDIENTS.filter(
      (ingredient) =>
        normalizeString(ingredient).startsWith(normalizedInput) &&
        !value.includes(ingredient) &&
        isIngredientCompatible(ingredient, userProfile?.dietary_preference)
    );
    
    const processed: ProcessedIngredient[] = filtered.map(ingredient => {
      const conflictType = checkIntoleranceConflict(ingredient, userProfile?.intolerances);
      return {
        name: ingredient,
        hasConflict: !!conflictType,
        conflictType,
        conflictLabel: conflictType ? FALLBACK_RESTRICTION_LABELS[conflictType] || conflictType : null,
      };
    });
    
    // Separa em seguros e conflitantes
    const safe = processed.filter(i => !i.hasConflict);
    const conflicting = processed.filter(i => i.hasConflict);
    
    return {
      safe: safe.slice(0, 6),
      conflicting: conflicting.slice(0, 4),
    };
  }, [inputValue, value, userProfile]);

  // Lista combinada para navegação por teclado
  const allSuggestions = useMemo(() => {
    return [...processedSuggestions.safe, ...processedSuggestions.conflicting];
  }, [processedSuggestions]);

  // Adiciona ingrediente (após verificação ou confirmação)
  const doAddIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      const newIngredients = [...value, trimmed];
      onChange(newIngredients);
      
      // Validar combinação de ingredientes com debounce
      if (enableCombinationValidation && newIngredients.length >= 2) {
        validateWithDebounce(value, trimmed, 800);
      }
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  // Tenta adicionar ingrediente (verifica conflitos primeiro)
  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) {
      setInputValue("");
      return;
    }
    
    // Verificar conflitos
    const conflict = checkConflict(trimmed);
    if (conflict) {
      setPendingIngredient(trimmed);
      setCurrentConflict(conflict);
      setConflictDialogOpen(true);
    } else {
      doAddIngredient(trimmed);
    }
  };
  
  // Confirmar adição após conflito
  const handleConflictConfirm = () => {
    if (pendingIngredient) {
      doAddIngredient(pendingIngredient);
    }
    setConflictDialogOpen(false);
    setCurrentConflict(null);
    setPendingIngredient(null);
  };
  
  // Cancelar adição após conflito
  const handleConflictCancel = () => {
    setConflictDialogOpen(false);
    setCurrentConflict(null);
    setPendingIngredient(null);
    setInputValue("");
    inputRef.current?.focus();
  };

  // Remove ingrediente
  const removeIngredient = (ingredientToRemove: string) => {
    const newIngredients = value.filter((i) => i !== ingredientToRemove);
    onChange(newIngredients);
    
    // Re-validar combinação após remover ingrediente
    if (enableCombinationValidation && newIngredients.length >= 2) {
      validateWithDebounce(newIngredients, undefined, 500);
    } else if (newIngredients.length < 2) {
      clearValidation();
    }
    
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && allSuggestions.length > 0) {
        addIngredient(allSuggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        addIngredient(inputValue);
      } else if (value.length > 0 && onSubmit) {
        onSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, allSuggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeIngredient(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Only close suggestions when clicking outside the container AND the input is empty
  // Otherwise, keep suggestions open so user can scroll and select
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Only close if input is empty - otherwise keep open for selection
        if (!inputValue.trim()) {
          setShowSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [allSuggestions.length]);

  const hasSuggestions = processedSuggestions.safe.length > 0 || processedSuggestions.conflicting.length > 0;
  const hasIntolerances = userProfile?.intolerances && userProfile.intolerances.length > 0 && !userProfile.intolerances.includes("nenhuma");

  // Flag global para controlar se scroll está bloqueado
  const isScrollLockedRef = useRef(false);
  
  // Função para ativar/desativar lock
  const setScrollLock = (locked: boolean) => {
    isScrollLockedRef.current = locked;
    const html = document.documentElement;
    const body = document.body;
    
    if (locked) {
      html.classList.add('ingredients-scroll-lock');
      body.classList.add('ingredients-scroll-lock');
    } else {
      html.classList.remove('ingredients-scroll-lock');
      body.classList.remove('ingredients-scroll-lock');
    }
  };

  // Handlers globais - criados UMA VEZ, consultam a ref para decidir
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      // Se não está bloqueado, permite tudo
      if (!isScrollLockedRef.current) return;
      
      const target = e.target as HTMLElement;
      // Permite scroll apenas dentro do dropdown de sugestões
      if (!target.closest('.ios-scroll-fix')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (!isScrollLockedRef.current) return;
      
      const target = e.target as HTMLElement;
      if (!target.closest('.ios-scroll-fix')) {
        e.preventDefault();
      }
    };
    
    // Adiciona listeners UMA VEZ no mount
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    // Remove apenas no unmount do componente
    return () => {
      document.removeEventListener('touchmove', handleTouchMove, { capture: true } as EventListenerOptions);
      document.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
      document.documentElement.classList.remove('ingredients-scroll-lock');
      document.body.classList.remove('ingredients-scroll-lock');
    };
  }, []); // Array vazio = roda apenas no mount/unmount

  // Atualiza lock baseado em showSuggestions
  useEffect(() => {
    setScrollLock(showSuggestions);
  }, [showSuggestions]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ zIndex: showSuggestions ? 100 : 'auto' }}>
      {/* Input container with tags */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-3 py-2 min-h-[48px] rounded-xl border border-border bg-background/50",
          "focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map((ingredient) => (
          <Badge
            key={ingredient}
            variant="secondary"
            className="gap-1 py-1 px-2.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {ingredient}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeIngredient(ingredient);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {/* Input */}
        <div className="flex-1 min-w-[120px] flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              // Removido scrollIntoView que interferia com o bloqueio de scroll
            }}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : "Adicionar mais..."}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Suggestions dropdown with grouping - optimized for mobile keyboard */}
      {showSuggestions && hasSuggestions && (
        <div 
          className="absolute z-[9999] w-full mt-2 bg-popover border border-border rounded-xl shadow-xl"
          style={{ 
            maxHeight: '40dvh',
            display: 'flex',
            flexDirection: 'column',
            touchAction: 'pan-y',
          }}
        >
          <div
            className="py-2 overflow-y-scroll flex-1 ios-scroll-fix"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              minHeight: 0,
            }}
            onTouchStart={(e) => {
              const el = e.currentTarget;
              (el as any)._startY = e.touches[0].clientY;
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              const startY = (el as any)._startY || 0;
              const currentY = e.touches[0].clientY;
              const deltaY = startY - currentY;
              const isScrollingDown = deltaY > 0;
              const isScrollingUp = deltaY < 0;
              const isAtTop = el.scrollTop <= 0;
              const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
              
              // Always prevent page scroll when touching inside the dropdown
              if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                e.preventDefault();
              }
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
          
          {/* Seção: Opções seguras */}
          {processedSuggestions.safe.length > 0 && (
            <>
              {hasIntolerances && (
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-medium text-green-600">Opções seguras para você</span>
                </div>
              )}
              {processedSuggestions.safe.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => addIngredient(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  <span className="capitalize flex-1">{item.name}</span>
                  <span className="text-xs text-muted-foreground">adicionar</span>
                </button>
              ))}
            </>
          )}
          
          {/* Separador */}
          {processedSuggestions.safe.length > 0 && processedSuggestions.conflicting.length > 0 && (
            <div className="my-2 border-t border-border" />
          )}
          
          {/* Seção: Contém restrição */}
          {processedSuggestions.conflicting.length > 0 && (
            <>
              <div className="px-4 py-1.5 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">Contém restrição</span>
              </div>
              {processedSuggestions.conflicting.map((item, index) => {
                const globalIndex = processedSuggestions.safe.length + index;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => addIngredient(item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      globalIndex === highlightedIndex
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "hover:bg-muted"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="capitalize flex-1 text-foreground">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                      {item.conflictLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-1">adicionar</span>
                  </button>
                );
              })}
            </>
          )}
          </div>
        </div>
      )}

      {/* Helper text - Medical typography: 12px gray */}
      {value.length === 0 && (
        <p className="mt-2 text-xs text-[hsl(215,16%,47%)] tracking-wide">
          Digite e selecione ingredientes da lista
        </p>
      )}

      {/* Validação de combinação de ingredientes - Feedback da IA */}
      {enableCombinationValidation && value.length >= 2 && (
        <div className="mt-3 animate-in fade-in duration-300">
          {isCombinationValidating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando combinação...</span>
            </div>
          ) : combinationResult && !combinationResult.isValid ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Combinação incomum detectada
                  </p>
                  {combinationResult.message && (
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-0.5">
                      {combinationResult.message}
                    </p>
                  )}
                  {combinationResult.problematicPair && (
                    <p className="text-xs text-amber-500 dark:text-amber-600 mt-1">
                      Conflito: <span className="font-medium">{combinationResult.problematicPair[0]}</span> + <span className="font-medium">{combinationResult.problematicPair[1]}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Sugestões de substituição */}
              {combinationResult.suggestions && combinationResult.suggestions.length > 0 && (
                <div className="border-t border-amber-200 dark:border-amber-800/50 pt-2 mt-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Ingredientes que combinariam melhor:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {combinationResult.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          // Adicionar sugestão substituindo o último ingrediente problemático
                          if (combinationResult.problematicPair) {
                            const problematicIngredient = combinationResult.problematicPair[1];
                            const newIngredients = value.filter(i => i !== problematicIngredient);
                            onChange(newIngredients);
                            // Adicionar o novo ingrediente após um pequeno delay
                            setTimeout(() => {
                              doAddIngredient(suggestion);
                            }, 100);
                          } else {
                            doAddIngredient(suggestion);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium",
                          "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
                          "hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors",
                          "border border-amber-200 dark:border-amber-700/50"
                        )}
                      >
                        <Plus className="w-3 h-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Feedback buttons for invalid combinations */}
              <div className="border-t border-amber-200 dark:border-amber-800/50 pt-2 mt-2 flex items-center justify-between">
                {!combinationFeedbackSent && combinationResult.validationId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400">Este aviso foi útil?</span>
                    <button
                      type="button"
                      onClick={() => sendCombinationFeedback('helpful')}
                      className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                      title="Sim, foi útil"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendCombinationFeedback('not_helpful')}
                      className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                      title="Não foi útil"
                    >
                      <ThumbsDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </button>
                  </div>
                ) : combinationFeedbackSent ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Obrigado pelo feedback!
                  </span>
                ) : null}
              </div>
            </div>
          ) : combinationResult && combinationResult.isValid ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <ChefHat className="w-4 h-4" />
                <span>Ótima combinação! Esses ingredientes funcionam bem juntos.</span>
              </div>
              {/* Feedback buttons for valid combinations */}
              {!combinationFeedbackSent && combinationResult.validationId && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Útil?</span>
                  <button
                    type="button"
                    onClick={() => sendCombinationFeedback('helpful')}
                    className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    title="Sim, foi útil"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCombinationFeedback('not_helpful')}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Não foi útil"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              )}
              {combinationFeedbackSent && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3" /> Obrigado!
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}
      
      {/* Diálogo de conflito */}
      <IngredientConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflict={currentConflict}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}
