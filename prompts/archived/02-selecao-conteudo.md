# Prompt: Seleção e Priorização de Conteúdo

## Contexto
Você é um especialista em otimização de currículos. Sua tarefa é analisar o currículo base de um candidato e selecionar/reordenar o conteúdo para maximizar o match com uma vaga específica.

## Instruções
Com base na análise da vaga fornecida (ou role se não houver vaga), analise o currículo HTML e determine:

1. **Experiências Prioritárias**
   - **IMPORTANTE: Selecione EXATAMENTE no máximo 5 experiências principais** - limite rígido para manter o currículo em 2 páginas
   - Quais empresas/experiências são mais relevantes para a vaga/role
   - Ordem de prioridade (1 = mais relevante, até 5)
   - Quais conquistas (achievements) destacar de cada experiência

2. **Competências Técnicas** (COLETAR/FILTRAR - NÃO INVENTAR)
   - **CRÍTICO: Todas as tecnologias DEVEM ser coletadas/filtradas do template HTML. NÃO invente tecnologias que não existem no currículo.**
   - **COLETAR** tecnologias das seguintes fontes no template HTML:
     * Categorias de skills existentes: `.skill-category .skill-list` - extraia TODAS as tecnologias de cada categoria
     * Tecnologias das experiências: `.tech-stack .tech-tag` - extraia TODAS as tecnologias mencionadas nas experiências
     * Keywords das experiências: `data-keywords` dos `.experience-item` - extraia keywords técnicas relevantes
   - Selecionar até **6 categorias** mais relevantes (usar APENAS categorias existentes do template, como "frontend", "backend", "cloud", etc.)
   - Filtrar/priorizar tecnologias coletadas baseadas na vaga (se houver) ou role (se não houver)
   - Agrupar tecnologias coletadas nas categorias apropriadas (usar IDs de categorias existentes)
   - Cada categoria deve ter entre 3-10 tecnologias (apenas as que foram coletadas do template)
   - Remover duplicatas (mesma tecnologia em múltiplas categorias)
   - Priorizar tecnologias que aparecem em múltiplas fontes

3. **Certificações** (SELECIONAR - não gerar novas)
   - Analisar as certificações existentes no template HTML (`.certifications-list .achievement`)
   - Selecionar até 5-8 certificações mais relevantes para a vaga/role
   - Baseado em: keywords da vaga, categoria da certificação (`data-category`), relevância para o role
   - **NÃO inventar certificações** - apenas selecionar das existentes no template

4. **Texto de Apresentação**
   - Gere texto personalizado para seção "Summary" (200-400 caracteres)
   - Conecte experiências do candidato com desafios da vaga/role
   - Destaque match score e principais qualificações (se houver análise de vaga)

## Formato de Resposta Esperado (JSON)

```json
{
  "selectedExperiences": [
    {
      "companyId": "empresa-a",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2],
      "reason": "Experiência mais relevante - [tecnologias/áreas] mencionadas na vaga"
    },
    {
      "companyId": "empresa-b",
      "priority": 2,
      "achievementsToHighlight": [0, 1],
      "reason": "[Área de atuação] e [competência] - keywords importantes da vaga"
    }
  ],
  "reorderedSkills": [
    "[categoria-mais-relevante]",
    "[categoria-segunda-mais-relevante]",
    "[categoria-terceira-mais-relevante]"
  ],
  "selectedSkills": {
    "categories": [
      {
        "categoryId": "frontend",
        "categoryName": "Frontend",
        "skills": ["React", "Next.js", "TypeScript", "JavaScript"]
      },
      {
        "categoryId": "backend",
        "categoryName": "Backend & APIs",
        "skills": ["Node.js", "GraphQL", "REST APIs"]
      }
    ]
  },
  "selectedCertifications": [
    {
      "index": 0,
      "text": "React: The Complete Guide (Hooks, Router, Redux) – Udemy, 2022"
    },
    {
      "index": 1,
      "text": "React: Automatizando testes em aplicações front-end – Alura, 2021"
    }
  ],
  "summaryText": "[Role] com [X] anos de experiência especializado em [Tecnologias principais]. Expertise comprovada em [Área de destaque], [Segunda área] e entrega de [Tipo de sistemas]. Match: [X]% com requisitos da vaga.",
  "suggestions": [
    "Destacar mais conquistas com métricas quantificáveis",
    "Enfatizar experiência com [tecnologia específica da vaga]",
    "Adicionar keywords específicas da vaga no summary"
  ]
}
```

## Critérios de Seleção

### Para Experiências
- Priorize experiências que mencionem 3+ keywords da vaga
- Considere relevância temporal (experiências recentes têm mais peso)
- **IMPORTANTE: Selecione EXATAMENTE no máximo 5 experiências principais** - este é um limite rígido para garantir que o currículo não ultrapasse 2 páginas
- Se houver mais de 5 experiências relevantes, selecione apenas as 5 mais relevantes baseado em: 1) match com keywords da vaga, 2) recência, 3) relevância do cargo
- Ordene por relevância + recência (priority 1 = mais relevante)

### Para Achievements
- Selecione 2-4 conquistas mais relevantes por experiência
- Priorize conquistas com métricas quantificáveis
- Foque em impactos de negócio quando possível
- Alinhe com keywords críticas da vaga

### Para Competências Técnicas
- **CRÍTICO: Todas as tecnologias DEVEM ser coletadas do template HTML. NÃO invente tecnologias.**
- **Fontes de coleta**:
  1. `.skill-category .skill-list` - todas as categorias e tecnologias existentes
  2. `.tech-stack .tech-tag` - todas as tecnologias mencionadas nas experiências
  3. `data-keywords` dos `.experience-item` - keywords técnicas relevantes
- Selecionar até **6 categorias** mais relevantes (máximo)
- Usar apenas IDs de categorias existentes no template (ex: "frontend", "backend", "cloud", "testing", etc.)
- Filtrar/priorizar tecnologias coletadas baseadas na vaga/role
- Agrupar tecnologias coletadas nas categorias apropriadas (usar categorias existentes)
- Cada categoria deve ter entre 3-10 tecnologias (apenas as coletadas)
- Remover duplicatas
- Priorizar tecnologias que aparecem em múltiplas fontes
- Priorize: tecnologias obrigatórias da vaga > desejáveis > outras relevantes ao role

### Para Certificações
- **NÃO inventar certificações** - apenas selecionar das existentes no template
- Analisar todas as certificações em `.certifications-list .achievement`
- Selecionar até 5-8 certificações mais relevantes
- Priorizar baseado em:
  1. Keywords da vaga mencionadas na certificação
  2. Categoria da certificação (`data-category`) alinhada com o role
  3. Relevância temporal (mais recentes têm mais peso)
  4. Relevância técnica para a vaga/role

### Para Summary Text
- Máximo 400 caracteres
- Mencione 3-5 keywords principais
- Inclua match score se alto (>80%)
- Conecte experiência com necessidades da vaga
- Seja específico e quantificado quando possível

## Input

**Análise da Vaga (ou análise mínima baseada no role):**
{jobAnalysis}

**Role (Título do Currículo - se fornecido):**
{role}

**HTML do Currículo Base:**
{curriculumHtml}

**Instruções Importantes:**
- Se houver análise de vaga (`jobAnalysis` com keywords e requisitos), priorize tecnologias e certificações relevantes para a vaga
- Se não houver análise de vaga (análise mínima com `matchScore: 0`), baseie a seleção no `role` fornecido
- **NUNCA invente tecnologias ou certificações** - todas devem ser coletadas/filtradas do HTML fornecido
- Para Competências Técnicas: colete de `.skill-category .skill-list`, `.tech-stack .tech-tag` e `data-keywords` dos `.experience-item`
- Para Certificações: selecione apenas de `.certifications-list .achievement` (usar `index` ou `text` para matching)
- Máximo de 6 categorias de skills
- Máximo de 5-8 certificações selecionadas

## Output

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais. O JSON deve estar completo e bem formatado.