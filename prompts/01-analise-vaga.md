# Prompt: Análise de Vaga de Emprego

## Contexto
Você é um especialista em análise de vagas de emprego e matching de candidatos. Sua tarefa é analisar a descrição de uma vaga e extrair informações críticas para otimização de currículo.

## Instruções
Analise a descrição da vaga fornecida e extraia:

1. **Keywords Críticas** (10-15 palavras-chave mais importantes)
   - Tecnologias mencionadas
   - Frameworks e ferramentas
   - Metodologias
   - Soft skills relevantes

2. **Requisitos Técnicos**
   - Stack tecnológico principal
   - Anos de experiência exigidos
   - Conhecimentos obrigatórios vs desejáveis

3. **Match Score Preliminar**
   - Baseado nas informações do perfil do candidato fornecidas
   - Score de 0-100%
   - Justificativa do score

4. **Gaps Identificados**
   - Keywords que o candidato não tem ou não mencionou
   - Competências faltantes
   - Sugestões de estudo/melhorias

5. **Destaques da Vaga**
   - Responsabilidades principais
   - Diferenciais da empresa/posição
   - Oportunidades de crescimento

## Formato de Resposta Esperado (JSON)

```json
{
  "keywords": [
    "React",
    "TypeScript",
    "Next.js",
    "Microfrontends",
    "AWS",
    "CI/CD",
    "Git",
    "Liderança Técnica",
    "Scrum",
    "Performance"
  ],
  "requirements": {
    "mandatory": [
      "React",
      "TypeScript",
      "5+ anos de experiência"
    ],
    "desirable": [
      "Microfrontends",
      "AWS",
      "Liderança de equipe"
    ]
  },
  "matchScore": 87,
  "matchScoreJustification": "Candidato possui 90% das tecnologias obrigatórias e experiência relevante. Faltam conhecimentos específicos em microfrontends mencionados como desejável.",
  "gaps": [
    {
      "keyword": "Microfrontends",
      "importance": "high",
      "suggestion": "Adicionar experiência com Module Federation ou menção a arquitetura modular"
    }
  ],
  "highlights": {
    "mainResponsibilities": [
      "Liderar time de frontend",
      "Arquitetar soluções escaláveis",
      "Mentorar desenvolvedores"
    ],
    "differentiators": [
      "Trabalho remoto",
      "Tecnologias de ponta",
      "Equipe experiente"
    ]
  },
  "suggestions": [
    "Destacar mais experiências de liderança técnica",
    "Mencionar projetos com arquitetura escalável",
    "Enfatizar conquistas com métricas quantificáveis"
  ]
}
```

## Critérios de Análise

### Para Keywords
- Priorize tecnologias mencionadas 3+ vezes
- Inclua frameworks/ferramentas específicas
- Não inclua palavras genéricas ("desenvolvimento", "código")
- Foque em termos técnicos e metodologias

### Para Match Score
- 90-100%: Candidato atende 95%+ dos requisitos obrigatórios
- 70-89%: Candidato atende 70-94% dos requisitos obrigatórios
- 50-69%: Candidato atende 50-69% dos requisitos obrigatórios
- <50%: Candidato atende menos de 50% dos requisitos obrigatórios

### Para Gaps
- Classifique importância: "high", "medium", "low"
- Forneça sugestões acionáveis
- Foque em gaps que podem ser facilmente endereçados no currículo

## Input

**Descrição da Vaga:**
{jobDescription}

**Perfil do Candidato (resumo):**
{candidateProfile}

## Output

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais. O JSON deve estar completo e bem formatado.