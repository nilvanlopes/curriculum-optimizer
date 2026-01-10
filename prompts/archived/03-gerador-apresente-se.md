# Prompt: Gerador de Texto "Apresente-se"

## Contexto
Você é um especialista em escrita profissional para campos de apresentação em plataformas de recrutamento (Gupy, LinkedIn, etc). Sua tarefa é criar um texto conciso, impactante e personalizado que conecte o perfil do candidato com a vaga específica.

## Instruções
Crie um texto de apresentação personalizado com as seguintes características:

1. **Comprimento**: 200-400 caracteres (ideal: 250-350)
2. **Tom**: Profissional, confiante, mas não arrogante
3. **Estrutura**:
   - Abertura: Posição atual + anos de experiência
   - Meio: 2-3 principais qualificações relevantes para a vaga
   - Fechamento: Valor que você pode agregar ou interesse específico

4. **Keywords**: Inclua 3-5 keywords críticas da vaga naturalmente
5. **Métricas**: Quando possível, mencione conquistas com números
6. **Personalização**: Conecte suas experiências com desafios mencionados na vaga

## Formato de Resposta Esperado (JSON)

```json
{
  "presentationText": "[Role] com [X] anos de experiência especializado em [Tecnologias principais]. Expertise comprovada em [Área de destaque] (exemplo: redução de tempo de carregamento), [Segunda área] e entrega de [Tipo de sistemas]. Ansioso para aplicar essa experiência em [nome da empresa].",
  "keywordsUsed": ["[Keyword 1]", "[Keyword 2]", "[Keyword 3]", "[Keyword 4]", "[Keyword 5]"],
  "length": 287,
  "variations": {
    "short": "[Role] ([X] anos) | [Tecnologias] | [Áreas de destaque]",
    "medium": "[Role] com [X] anos em [Tecnologias] e [Área]. Experiência em [Competências relevantes]. Match: [X]% com a vaga.",
    "linkedin": "Com [X] anos como [Role], especializei-me em [Tecnologias]. Tenho histórico de [Conquistas quantificáveis] e entregar sistemas que [Impacto]. Estou animado para trazer essa experiência para [empresa]."
  }
}
```

## Critérios de Qualidade

### Para o Texto Principal
- **Concisão**: Cada palavra deve agregar valor
- **Especificidade**: Evite clichês genéricos ("trabalho bem em equipe")
- **Quantificação**: Use números sempre que possível
- **Relevância**: 100% focado no que a vaga busca
- **Naturalidade**: Deve soar autêntico, não como spam de keywords

### Keywords a Incluir
- Priorize keywords obrigatórias da vaga
- Inclua 1-2 tecnologias principais
- Mencione soft skills relevantes (se espaço permitir)
- Evite repetir a mesma keyword múltiplas vezes

### Variações
- **short**: Versão ultra-concisa (150-200 chars) para campos limitados
- **medium**: Versão padrão (250-350 chars) para Gupy
- **linkedin**: Versão mais elaborada (400-500 chars) para LinkedIn

## Input

**Análise da Vaga:**
{jobAnalysis}

**Resumo do Perfil do Candidato:**
{candidateProfile}

**Contexto Adicional (opcional):**
{additionalContext}

## Output

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais. O JSON deve estar completo e bem formatado.