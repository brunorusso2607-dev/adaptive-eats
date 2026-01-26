# Roadmap: Expansão Global de Segurança Alimentar

## 📊 Estado Atual (Dezembro 2024)

| Tabela | Registros |
|--------|-----------|
| `intolerance_mappings` | 2.846 ingredientes |
| `intolerance_safe_keywords` | 366 keywords |
| `dietary_forbidden_ingredients` | 351 ingredientes |
| `dynamic_safe_ingredients` | 33 ingredientes |
| `intolerance_key_normalization` | 19 normalizações |

---

## 🎯 Meta: Cobertura Global

Para ter segurança 100% global, precisamos cobrir:

### 1. **Ingredientes por Região**
- 🇧🇷 Brasil (TACO/TBCA)
- 🇺🇸 EUA (USDA) - já em importação automática
- 🇪🇺 Europa (CIQUAL - França, BLS - Alemanha)
- 🇲🇽 México (BAM)
- 🇬🇧 Reino Unido (McCance & Widdowson)
- 🇯🇵 Japão
- 🇮🇳 Índia
- 🇨🇳 China

### 2. **Sinônimos Multilíngues**
| Ingrediente Base | PT-BR | EN-US | ES | FR |
|------------------|-------|-------|----|----|
| Leite | leite | milk | leche | lait |
| Queijo | queijo | cheese | queso | fromage |
| Manteiga | manteiga | butter | mantequilla | beurre |

### 3. **Derivados e Compostos**
- Lacticínios ocultos: caseína, lactose, soro de leite, whey
- Glúten oculto: malte, amido modificado, proteína vegetal hidrolisada
- Nomes industriais: E-numbers europeus, aditivos

---

## 🚀 Estratégias de Expansão

### Estratégia 1: Geração por IA (Rápida)
```
1. Usar Gemini para gerar listas extensivas por intolerância
2. Processar em lotes de 500 ingredientes
3. Inserir no banco com revisão automática
4. Validar via AI (review-blocked-ingredients)
```

### Estratégia 2: Importação de Bases Públicas
```
1. USDA (em andamento - 500 items/hora)
2. CIQUAL (França) - arquivo já existe no projeto
3. McCance & Widdowson (UK) - arquivo já existe
4. BAM México - arquivo já existe
5. OpenFoodFacts API (crowdsourced global)
```

### Estratégia 3: Crowdsourcing Inteligente
```
1. Usuário reporta falso positivo
2. Sistema adiciona automaticamente a dynamic_safe_ingredients
3. Admin revisa periodicamente
4. Ingredientes validados vão para intolerance_mappings
```

### Estratégia 4: Crawling de Receitas
```
1. Usar Firecrawl para extrair ingredientes de sites de receitas
2. Processar com IA para classificar por intolerância
3. Inserir no banco após validação
```

---

## 📋 Plano de Execução

### Fase 1: Expansão por IA (Semana 1)
- [ ] Criar edge function `expand-intolerance-mappings`
- [ ] Gerar 500+ ingredientes por intolerância via Gemini
- [ ] Meta: 10.000+ ingredientes mapeados

### Fase 2: Sinônimos Multilíngues (Semana 2)
- [ ] Criar tabela `ingredient_translations`
- [ ] Gerar traduções para ES, EN, FR, DE, IT
- [ ] Normalizar busca para aceitar qualquer idioma

### Fase 3: Importação de Bases (Semana 3-4)
- [ ] Processar CIQUAL (França)
- [ ] Processar McCance & Widdowson (UK)
- [ ] Processar BAM México
- [ ] Integrar OpenFoodFacts API

### Fase 4: Validação Contínua (Ongoing)
- [ ] Monitorar falsos positivos/negativos
- [ ] Expandir safe_keywords conforme necessário
- [ ] Revisar dynamic_safe_ingredients semanalmente

---

## 🔢 Meta Final

| Métrica | Atual | Meta |
|---------|-------|------|
| Ingredientes mapeados | 2.846 | 50.000+ |
| Safe keywords | 366 | 2.000+ |
| Idiomas cobertos | 1 (PT) | 6+ |
| Cobertura regional | Brasil | Global |

---

## ⚠️ Princípios de Segurança

1. **Fail-safe**: Ingrediente desconhecido = BLOQUEAR
2. **Validação dupla**: IA + banco de dados
3. **Transparência**: Mostrar fonte do dado
4. **Revisão humana**: Admin valida edge cases
