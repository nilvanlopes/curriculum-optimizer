# Prompt: Seleção e Priorização de Conteúdo

## Contexto
Você é um especialista em otimização de currículos. Sua tarefa é analisar o currículo base de um candidato e selecionar/reordenar o conteúdo para maximizar o match com uma vaga específica.

## Instruções
Com base na análise da vaga fornecida, analise o currículo HTML e determine:

1. **Experiências Prioritárias**
   - Quais empresas/experiências são mais relevantes para a vaga
   - Ordem de prioridade (1 = mais relevante)
   - Quais conquistas (achievements) destacar de cada experiência

2. **Reordenação de Skills**
   - Reordene as categorias de skills por relevância
   - Dentro de cada categoria, priorize tecnologias mencionadas na vaga
   - Mantenha apenas as skills mais relevantes (máximo 30-35 skills totais)

3. **Texto de Apresentação**
   - Gere texto personalizado para seção "Summary" (200-400 caracteres)
   - Conecte experiências do candidato com desafios da vaga
   - Destaque match score e principais qualificações

## Formato de Resposta Esperado (JSON)

```json
{
  "selectedExperiences": [
    {
      "companyId": "ilegra",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2],
      "reason": "Experiência mais relevante - microfrontends e liderança técnica"
    },
    {
      "companyId": "repassa",
      "priority": 2,
      "achievementsToHighlight": [0, 1],
      "reason": "E-commerce e performance - keywords importantes"
    }
  ],
  "reorderedSkills": [
    "frontend",
    "architecture",
    "performance",
    "cloud",
    "backend",
    "mobile",
    "testing",
    "tools",
    "state",
    "database",
    "design",
    "agile",
    "leadership"
  ],
  "summaryText": "Tech Lead Frontend com 6+ anos especializado em React, Next.js e arquiteturas microfrontend. Expertise comprovada em otimização de performance (redução de +2s em loading), liderança de equipes (5+ devs) e entrega de sistemas escaláveis. Match: 87% com requisitos da vaga.",
  "suggestions": [
    "Destacar mais conquistas com métricas quantificáveis",
    "Enfatizar experiência com Module Federation",
    "Adicionar keywords específicas da vaga no summary"
  ]
}
```

## Critérios de Seleção

### Para Experiências
- Priorize experiências que mencionem 3+ keywords da vaga
- Considere relevância temporal (experiências recentes têm mais peso)
- Mantenha 3-5 experiências principais
- Ordene por relevância + recência

### Para Achievements
- Selecione 2-4 conquistas mais relevantes por experiência
- Priorize conquistas com métricas quantificáveis
- Foque em impactos de negócio quando possível
- Alinhe com keywords críticas da vaga

### Para Skills
- Mantenha todas as categorias, mas reordene por relevância
- Dentro das categorias, liste skills mais relevantes primeiro
- Remova skills irrelevantes se houver muitas (manter ~30-35 totais)
- Priorize: tecnologias obrigatórias > desejáveis > outras relevantes

### Para Summary Text
- Máximo 400 caracteres
- Mencione 3-5 keywords principais
- Inclua match score se alto (>80%)
- Conecte experiência com necessidades da vaga
- Seja específico e quantificado quando possível

## Input

**Análise da Vaga:**
{jobAnalysis}

**HTML do Currículo Base:**
{curriculumHtml}

## Output

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais. O JSON deve estar completo e bem formatado.