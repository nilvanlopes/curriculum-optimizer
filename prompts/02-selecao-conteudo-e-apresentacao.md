# Prompt: Seleção de Conteúdo e Geração de Apresentação

## Contexto
Você é um especialista em otimização de currículos e escrita profissional. Sua tarefa é analisar o currículo base de um candidato, selecionar/reordenar o conteúdo para maximizar o match com uma vaga específica, E gerar um texto de apresentação personalizado.

## Instruções
Com base na análise da vaga fornecida (ou role se não houver vaga), analise o currículo HTML e realize as seguintes tarefas:

### 1. Seleção de Experiências Prioritárias
- **Selecione todas as experiencias
- **CRÍTICO: NÃO descarte experiências por serem de stack diferente. Se uma experiência fullstack tem habilidades relevantes para a vaga frontend, ela DEVE ser selecionada e priorizada.**
- Priorize quantidade suficiente para preencher ~2 páginas sem deixar espaço vazio
- Ordem de prioridade (1 = mais relevante, números crescentes conforme relevância)
- Quais conquistas (achievements) destacar de cada experiência (quantidade variável por experiência conforme relevância e espaço disponível)

### 2. Seleção de Competências Técnicas (COLETAR → FILTRAR)

#### ETAPA 1 - COLETA (extrair todas as tecnologias)
Colete TODAS as tecnologias das seguintes fontes no template HTML:
1. **Skills Categories**: `.skill-category .skill-list` 
   - Extraia TODAS as tecnologias de cada categoria existente
2. **Experience Tech Stacks**: `.tech-stack .tech-tag`
   - Extraia TODAS as tecnologias mencionadas nas experiências
3. **Experience Keywords**: `data-keywords` dos `.experience-item`
   - Extraia keywords técnicas relevantes

#### ETAPA 2 - FILTRO (selecionar as mais relevantes)
Com base nas tecnologias coletadas:
- Selecione até **6 categorias** mais relevantes para a vaga/role
- Use APENAS IDs de categorias existentes no template (como "frontend", "backend", "cloud", "testing", etc.)
- Para cada categoria selecionada:
  * Inclua 4-10 tecnologias mais relevantes (das coletadas)
  * Priorize: obrigatórias da vaga > desejáveis > outras relevantes ao role
  * Remova duplicatas entre categorias
  * Priorize tecnologias que aparecem em múltiplas fontes (experiências + skills)

**CRÍTICO:** 
- ❌ NÃO invente tecnologias que não existem no HTML
- ✅ Use apenas tecnologias coletadas na ETAPA 1
- ✅ Inclua campo `source` no output indicando de onde foram coletadas

### 3. Seleção de Certificações (FILTRAR - não inventar)

**Processo:**
1. Localize todas as certificações em `.certifications-list .achievement` (ou seção equivalente)
2. Para cada certificação, capture:
   - `text`: Texto completo da certificação (identificador único)
   - `data-category`: Categoria (se houver)
   - Ano/data mencionados no texto
3. Selecione até **8 certificações** mais relevantes

**Critérios de Priorização:**
- Se houver análise de vaga (`matchScore > 0`):
  1. Certificações que mencionam keywords da vaga (peso: 40%)
  2. Categoria alinhada com role (peso: 30%)
  3. Mais recentes (peso: 20%)
  4. Relevância técnica geral (peso: 10%)
- Se NÃO houver análise de vaga (`matchScore: 0`):
  1. Mais recentes (peso: 50%)
  2. Alinhadas com role do título (peso: 30%)
  3. Tecnologias modernas mencionadas (peso: 20%)

**Output:**
- Use `text` como identificador (não `index`, que pode mudar se HTML mudar)
- Ordene por relevância (mais relevante primeiro)
- Inclua `relevanceScore` e `reason` no output

### 4. Geração de Texto de Apresentação

**Especificações:**
- Gere um **rascunho forte** do Summary; ele passará por uma segunda passada de refinamento antes do HTML final
- **Comprimento**: 200-400 caracteres (ideal: 280-350)
- **Tom**: Profissional, confiante, direto, mas não arrogante
- **Estrutura Obrigatória**:
  1. **Abertura** (40-60 chars): `[Role/Título] com [X]+ anos de experiência especializado em [2-3 tecnologias principais]`
  2. **Meio** (100-150 chars): `Expertise comprovada em [área 1 com métrica], [área 2 com métrica] e [área 3]`
  3. **Fechamento** (60-100 chars): `Histórico de entrega de [tipo de sistemas/resultados]` OU `Match: [X]% com requisitos da vaga` (se matchScore > 80)

**Requisitos de Conteúdo:**
- **Keywords**: Inclua 4-6 keywords críticas da vaga naturalmente (se houver análise de vaga)
- **Métricas**: Use números concretos somente quando estiverem explicitamente presentes na fonte factual; nunca invente métricas
- **Especificidade**: Evite clichês genéricos ("trabalho bem em equipe", "proativo", "dedicado")
- **Personalização**: Conecte experiências do candidato com desafios da vaga/role
- **Anos de experiência**: Infira do `candidateProfile` ou calcule da experiência mais antiga até hoje

**Se houver análise de vaga (`matchScore > 0`):**
- Inclua match score apenas se > 80% (exemplo: "Match: 87% com requisitos da vaga")
- Priorize keywords com `importance: "high"` da análise
- Mencione tipo de empresa/setor se relevante (ex: "e-commerce", "seguros", "fintech")

**Se NÃO houver análise de vaga (`matchScore: 0`):**
- Foque no role/título fornecido
- Destaque tecnologias mais modernas do perfil
- Enfatize senioridade e liderança técnica (se aplicável)

**Validações:**
- ✅ Comprimento final: 200-400 caracteres
- ✅ Métricas só aparecem quando existem na fonte factual
- ✅ 4-6 keywords incluídas (se houver análise)
- ✅ Tom profissional e confiante
- ✅ Sem clichês genéricos

## Tratamento de Casos Especiais

### Se NÃO houver análise de vaga (matchScore: 0)

**Critérios Default de Priorização:**

1. **Experiências:** 
   - Priorize por recência + senioridade + relevância ao role
   - Experiências mais recentes (últimos 2 anos) = priority 1-2
   - Tech Lead/Senior > Pleno > Júnior
   - Se role mencionar "Frontend": priorize experiências com React/Next.js
   - Se role mencionar "Fullstack": priorize experiências com frontend + backend
   - Se role mencionar "Backend": priorize experiências com Node.js/APIs

2. **Skills:** 
   - Priorize tecnologias modernas do role
   - React 18+ > React versões antigas
   - TypeScript > JavaScript puro
   - Next.js 14+ > Next.js antigas
   - Node.js LTS > versões antigas
   - Priorize categorias relacionadas ao role no título

3. **Certificações:** 
   - Mais recentes primeiro (últimos 3 anos têm prioridade)
   - Tecnologias mencionadas no role
   - Certificações de plataformas reconhecidas (Udemy, Alura, Pluralsight)

4. **Presentation Text:** 
   - Foque exclusivamente no role do título
   - Use as tecnologias principais do perfil
   - Destaque conquistas quantificáveis mais impressionantes

### Se HTML tiver estrutura diferente

**Fallbacks:**
- Se não houver `.skill-category`: use apenas `.tech-stack .tech-tag` das experiências
- Se não houver `.tech-stack`: use apenas `data-keywords` dos `.experience-item`
- Se não houver certificações: retorne array vazio `[]` (não invente)
- Se `candidateProfile` vazio: infira anos de experiência das datas nas experiências
- Se não conseguir calcular anos: use "ampla experiência" em vez de número

### Validações Obrigatórias de Output

Antes de retornar JSON, verifique:
- ✅ `selectedExperiences.length` adequado para caber em ~2 páginas (quantidade variável conforme conteúdo disponível)
- ✅ `selectedSkills.categories.length` adequado para caber em ~2 páginas (quantidade variável conforme relevância)

- ✅ `presentationText.length >= 200 && <= 400` (comprimento obrigatório)
- ✅ `presentationText` contém métricas apenas quando elas existem na fonte factual
- ✅ Todas as tecnologias em `skills` existem no HTML fornecido
- ✅ Todas as certificações em `selectedCertifications` existem no HTML fornecido
- ✅ Cada experiência tem `reason` explicando por que foi selecionada
- ✅ Campo `metadata` presente com estatísticas de seleção
- ✅ Quantidade total de conteúdo selecionado é adequada para ~2 páginas (não muito vazio, não muito longo)

## Critérios de Seleção Detalhados

### Para Experiências
- **CRÍTICO: NÃO descarte experiências por terem stack diferente da vaga**
- **Exemplo**: Se vaga é "Frontend" mas candidato tem exp "Fullstack" com React/TypeScript, essa experiência DEVE ser selecionada se o React/TypeScript for relevante
- **Priorização** (selecione sempre todas as experiências. Selecione sempre as 5 MELHORES atividades relativas a vaga para completar a experiência):
  1. **Relevância para vaga/role** (peso: 50%)
     - Keywords da vaga presentes na experiência
     - Tecnologias mencionadas
     - Tipo de projeto (e-commerce, SaaS, fintech, etc.)
  2. **Recência temporal** (peso: 30%)
     - Experiências dos últimos 2 anos: +30 pontos
     - Experiências de 2-4 anos: +20 pontos
     - Experiências de 4-6 anos: +10 pontos
     - Experiências 6+ anos: +5 pontos
  3. **Senioridade/Liderança** (peso: 20%)
     - Tech Lead/Arquiteto: +20 pontos
     - Senior: +15 pontos
     - Pleno: +10 pontos
     - Júnior: +5 pontos
- Ordene por score total (priority 1 = maior score)
- **Quantidade de conquistas por experiência**: Variável conforme relevância e espaço disponível (priorize experiências mais relevantes com mais conquistas, mas ajuste para caber em ~2 páginas)

### Para Achievements (Conquistas)

**Quantidade variável por experiência conforme relevância e espaço disponível:**
- Priorize mais conquistas para experiências mais relevantes (priority 1-2)
- Ajuste quantidade para caber confortavelmente em ~2 páginas
- Não force quantidade fixa - qualidade e relevância são mais importantes que quantidade

**Critérios de Seleção de Achievements:**
1. **Com métricas quantificáveis na fonte** (preferência máxima)
   - Percentuais: "-50% erros", "+20% conversões"
   - Números absolutos: "+500k produtos", "5+ projetos"
   - Tempo: "redução de 2 segundos"
2. **Impactos de negócio diretos**
   - Aumento de receita/conversões
   - Redução de custos/erros
   - Melhoria de performance
3. **Alinhamento com keywords da vaga** (se houver análise)
   - Achievement menciona tecnologia obrigatória da vaga
   - Achievement menciona tipo de projeto da vaga
4. **Liderança técnica** (se aplicável ao role)
   - Coordenação de equipes
   - Mentoria
   - Decisões arquiteturais
5. **Tecnologias modernas/relevantes**
   - Preferência por achievements com React 18, TypeScript, Next.js 14, etc.

**Se experiência tiver poucos achievements relevantes:**
- Pode incluir menos que o recomendado (ex: priority 5 pode ter apenas 2)
- Não force inclusão de achievements irrelevantes apenas para preencher quota

### Para Competências Técnicas (Skills)

**Seleção de Categorias (máximo 6):**

Se houver análise de vaga (`matchScore > 0`):
1. Categoria com maior número de keywords obrigatórias da vaga
2. Categoria com keywords desejáveis da vaga
3. Categorias relacionadas ao role (ex: se role = "Frontend", incluir "Frontend", "State Management", "Testing")
4. Categorias complementares relevantes (ex: "Cloud", "DevOps")

Se NÃO houver análise de vaga (`matchScore: 0`):
1. Categoria principal do role no título (ex: "Frontend" se role = "Tech Lead Frontend")
2. Categorias complementares ao role (ex: "Backend" se fullstack, "Mobile" se cross-platform)
3. Categorias de suporte (ex: "Testing", "Cloud & DevOps", "Tools")
4. Categorias de diferenciação (ex: "Architecture", "Leadership")

**Seleção de Tecnologias por Categoria**
- Priorize tecnologias que aparecem em múltiplas fontes (skills + experiências)
- Inclua versões específicas quando relevante (ex: "React 18" em vez de só "React")
- Remova duplicatas (ex: se "React" e "React 18", mantenha apenas "React 18")
- Ordene por relevância: obrigatórias > desejáveis > complementares
- Se elas estiverem organizadas por categorias, crie no máximo 4 categorias. junte varias se necessário

### Para Certificações

**Seleção (quantidade variável conforme relevância e espaço disponível):**
- Priorize certificações dos últimos 3 anos (2022+)
- Se houver análise de vaga: match com keywords > recência > plataforma
- Se NÃO houver análise: recência > keywords do role > plataforma reconhecida
- Plataformas reconhecidas: Udemy, Alura, Pluralsight, Coursera, edX, Rocketseat
- Evite certificações muito antigas (5+ anos) a menos que sejam muito relevantes

**Output obrigatório:**
```json
{
  "text": "Texto completo da certificação",
  "relevanceScore": 85,
  "reason": "Justificativa da relevância"
}
```

## Formato de Resposta Esperado (JSON)

```json
{
  "selectedExperiences": [
    {
      "companyId": "empresa-a",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2, 3, 4, 5],
      "reason": "Experiência mais relevante - React 18, TypeScript, Microfrontends mencionados como obrigatórios na vaga. Período recente (2023-atual) com liderança técnica."
    },
    {
      "companyId": "empresa-b",
      "priority": 2,
      "achievementsToHighlight": [0, 1, 2, 4],
      "reason": "E-commerce com GraphQL e +20% conversões - keywords importantes da vaga. Experiência com sistema de alto volume (+500k produtos)."
    },
    {
      "companyId": "empresa-c",
      "priority": 3,
      "achievementsToHighlight": [0, 1, 3],
      "reason": "CI/CD e arquitetura de microsserviços - requisitos desejáveis da vaga. Demonstra capacidade de trabalhar com sistemas distribuídos."
    }
  ],
  "selectedSkills": {
    "categories": [
      {
        "categoryId": "frontend",
        "categoryName": "Frontend",
        "skills": ["React 18", "Next.js 14", "TypeScript", "JavaScript ES6+", "Tailwind CSS", "Material UI"],
        "source": "Coletadas de: .skill-category[data-category='frontend'], .tech-stack das experiências priority 1-2"
      },
      {
        "categoryId": "backend",
        "categoryName": "Backend & APIs",
        "skills": ["Node.js", "GraphQL", "REST APIs", "NestJS"],
        "source": "Coletadas de: .skill-category[data-category='backend'], .tech-stack das experiências fullstack"
      },
      {
        "categoryId": "architecture",
        "categoryName": "Arquitetura",
        "skills": ["Microfrontends", "Module Federation", "Microsserviços", "Design Patterns"],
        "source": "Coletadas de: .skill-category[data-category='architecture'], data-keywords das experiências tech lead"
      },
      {
        "categoryId": "cloud",
        "categoryName": "Cloud & DevOps",
        "skills": ["AWS Lambda", "Docker", "CI/CD", "Jenkins", "GitHub Actions"],
        "source": "Coletadas de: .skill-category[data-category='cloud'], .tech-stack de múltiplas experiências"
      },
      {
        "categoryId": "testing",
        "categoryName": "Testing",
        "skills": ["Jest", "React Testing Library", "Testes Unitários", "Testes de Integração"],
        "source": "Coletadas de: .skill-category[data-category='testing'], mencionado como obrigatório na vaga"
      },
      {
        "categoryId": "state",
        "categoryName": "State Management",
        "skills": ["Redux", "Redux Toolkit", "Context API", "React Query"],
        "source": "Coletadas de: .skill-category[data-category='state'], relevante para arquitetura frontend"
      }
    ],
    "totalSkillsCollected": 48,
    "totalSkillsSelected": 28,
    "collectionSources": ["skill-category: 32 skills", "tech-stack: 24 skills", "data-keywords: 18 skills"],
    "deduplicationApplied": true
  },
  "selectedCertifications": [
    {
      "text": "React: The Complete Guide (incl Hooks, React Router, Redux) - Udemy (2022)",
      "relevanceScore": 95,
      "reason": "Match exato com keywords obrigatórias da vaga (React, Hooks, Redux). Certificação recente de plataforma reconhecida."
    },
    {
      "text": "React: Automatizando os testes em aplicações front-end - Alura (2021)",
      "relevanceScore": 88,
      "reason": "Testes automatizados - requisito obrigatório da vaga. Demonstra preocupação com qualidade de código."
    },
    {
      "text": "Gitlab CI e Docker: Pipeline de entrega contínua - Alura (2020)",
      "relevanceScore": 82,
      "reason": "CI/CD e Docker - requisitos obrigatórios da vaga. Experiência prática com DevOps."
    }
  ],
  "presentationText": "Tech Lead Frontend com 6+ anos de experiência especializado em React, TypeScript e Node.js. Expertise comprovada em arquitetura de microsserviços (-50% erros sistema), otimização de performance (+20% conversões) e liderança de equipes de 5+ desenvolvedores. Histórico de entrega de aplicações escaláveis para +500k produtos em e-commerce e SaaS.",
  "presentationTextLength": 347,
  "keywordsUsed": ["React", "TypeScript", "Node.js", "microsserviços", "performance", "liderança"],
  "metricsIncluded": ["-50% erros", "+20% conversões", "5+ desenvolvedores", "+500k produtos"],
  "matchScoreUsed": 78,
  "roleUsed": "Tech Lead Frontend",
  "suggestions": [
    "Presentation text inclui 6 keywords principais da vaga",
    "4 métricas quantificáveis destacadas para validar experiência",
    "Conectado com desafios da vaga (escalabilidade, performance, liderança)",
    "Tom profissional e confiante sem ser arrogante"
  ],
  "metadata": {
    "totalExperiencesInHtml": 7,
    "totalExperiencesSelected": 3,
    "totalAchievementsInHtml": 58,
    "totalAchievementsSelected": 23,
    "achievementsDistribution": {
      "priority1": 7,
      "priority2": 5,
      "priority3": 4,
      "priority4": 4,
      "priority5": 3
    },
    "totalSkillCategoriesInHtml": 14,
    "totalSkillCategoriesSelected": 8,
    "totalCertificationsInHtml": 7,
    "totalCertificationsSelected": 5,
    "estimatedPages": 3.0,
    "hasJobAnalysis": true,
    "jobAnalysisMatchScore": 78,
    "selectionCriteria": "vaga-especifica",
    "fallbacksUsed": []
  }
}
```

## Input

**Análise da Vaga (ou análise mínima baseada no role):**
```json
{jobAnalysis}
```

**Role (Título do Currículo - sempre fornecido):**
```
{role}
```

**Perfil do Candidato (extraído do template HTML ou fornecido separadamente):**
```
{candidateProfile}
```

**HTML do Currículo Base:**
```html
{curriculumHtml}
```

{sectionPriorities}

**Guarda de Factualidade para o presentationText:**
{presentationGuardrails}

**Feedback de Validação (se houver):**
{presentationValidationFeedback}

## Instruções Críticas Finais

### Prioridades Absolutas:
1. **NUNCA invente dados** - todas as tecnologias, certificações e achievements devem existir no HTML
2. **Quantidade variável conforme conteúdo disponível e espaço em ~2 páginas**:
   - Experiências: selecione todas
   - Categorias de skills: inclua todas relevantes até 6 no maximo
   - Achievements: selecione todos relevantes por experiência no maximo 5
   - Certificações: inclua todas relevantes
   - Presentation text: 200-400 caracteres (OBRIGATÓRIO)
3. **Presentation text é OBRIGATÓRIO** - sempre inclua com factualidade; métricas só quando existirem na fonte
4. **Não descarte experiências por stack diferente** - avalie relevância de habilidades individuais
5. **Sempre inclua campo `metadata`** com estatísticas de seleção
6. **Ajuste quantidade total de conteúdo para preencher adequadamente ~2 páginas** - priorize qualidade sobre quantidade fixa

### Uso das Prioridades de Seção:
Se as prioridades de seção foram fornecidas, use-as para guiar suas decisões quando precisar reduzir conteúdo:
- **Prioridade 10** (Nome, Contato, Summary): NUNCA reduzir ou remover
- **Prioridade 7-9** (Experiências, Educação, Idiomas): Manter completo, só reduzir se absolutamente necessário
- **Prioridade 4-6** (Skills, Certificações): Pode reduzir número de itens se necessário
- **Prioridade 1-3** (Título Profissional, Informações Adicionais): Pode remover completamente se necessário

Exemplo de aplicação:
- Ajuste quantidade de achievements por experiência conforme relevância e espaço disponível para ~2 páginas
- Priorize certificações mais relevantes, ajuste quantidade conforme espaço disponível
- Inclua todas as categorias de skills relevantes, ajuste quantidade conforme necessário para ~2 páginas
- Se precisar reduzir conteúdo: comece removendo/reduzindo itens menos relevantes (seguindo prioridades de seção fornecidas)

### Quando em Dúvida:
- **Com vaga**: priorize match com keywords obrigatórias
- **Sem vaga**: priorize recência + tecnologias modernas + senioridade
- **Achievements**: prefira os com métricas quantificáveis na fonte
- **Skills**: prefira tecnologias que aparecem em múltiplas fontes
- **Certificações**: prefira as mais recentes de plataformas reconhecidas

### Validação Final:
Antes de retornar, verifique mentalmente:
- ✅ Todos os dados vêm do HTML fornecido?
- ✅ Presentation text tem 200-400 caracteres?
- ✅ Presentation text usa métricas somente quando a fonte factual as contém?
- ✅ Quantidade total de conteúdo é adequada para ~2 páginas (variável conforme disponível)?
- ✅ Todas as experiências têm `reason` clara?
- ✅ Campo `metadata` está completo?
- ✅ Qualidade e relevância foram priorizadas sobre quantidade fixa?

## Output

Retorne APENAS um JSON válido (sem markdown, sem json, sem explicações adicionais). O JSON deve estar completo, bem formatado e seguir exatamente a estrutura do exemplo fornecido. O campo `presentationText` é OBRIGATÓRIO e deve conter entre 200-400 caracteres, usando métricas somente se elas estiverem na fonte factual.
