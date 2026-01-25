# Memory: security/multilingual-safety-validation-architecture
Updated: 2026-01-05

## Arquitetura de Validação de Segurança Multilíngue

### Princípio Base: English-Only para Ingredientes Universais

O sistema utiliza uma arquitetura "English-Base" onde ingredientes universais (mustard, sesame, celery, etc.) são cadastrados **APENAS em inglês** na tabela `intolerance_mappings`. **NÃO é necessário traduzir** esses termos para outros idiomas.

### Por que funciona:

1. **IA Gemini é Multilíngue Nativa**
   - A IA entende que "mostarda" = "mustard" = "moutarde" = "senf"
   - Ela faz correlação semântica automática internamente
   - Não depende de traduções literais no banco de dados

2. **Fluxo de Geração (AI → Usuário)**
   - A IA recebe a chave da intolerância (ex: `mustard`) no prompt
   - Ela **evita gerar** receitas com mostarda em **qualquer idioma**
   - Não precisa de mapeamento PT porque a IA já sabe evitar

3. **Fluxo de Análise (Usuário → Sistema)**
   - Rótulos/Fotos: A IA recebe as intolerâncias do usuário como labels legíveis
   - Ela lê o texto em qualquer idioma e faz comparação semântica
   - Exemplo: usuário tem "MOSTARDA" → IA lê "moutarde" no rótulo → detecta conflito

### Papel da tabela `intolerance_mappings`:

- É uma **rede de segurança secundária** (pós-processamento/dupla checagem)
- **NÃO é a fonte primária** de validação - a IA é
- Termos regionais específicos (ex: "pequi", "cupuaçu") podem ser adicionados quando necessário

### Exceções (quando adicionar termos regionais):

- Ingredientes que SÓ existem em determinada região/cultura
- Ingredientes com nomes completamente diferentes da versão inglesa
- Produtos processados regionais com nomes únicos

### Regra de Ouro:

> Se o ingrediente existe globalmente e tem um nome em inglês reconhecido, **basta o termo inglês**. A IA cuida do resto.
