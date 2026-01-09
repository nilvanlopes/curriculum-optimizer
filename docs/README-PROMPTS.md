# Sistema de Prompts

O CV Optimizer utiliza um sistema de prompts de IA para processar e otimizar currículos. Este documento explica como os prompts funcionam e quando cada um é usado.

## Visão Geral

Os prompts são arquivos Markdown localizados em `prompts/` que contêm instruções detalhadas para a IA processar diferentes aspectos da otimização de currículos. Cada prompt é carregado dinamicamente e seus placeholders são substituídos com dados reais antes de ser enviado à API.

## Como Funciona

1. **Carregamento**: O prompt é carregado do arquivo `.md` em `prompts/`
2. **Substituição**: Placeholders `{nomeVariavel}` são substituídos por valores reais
3. **Chamada à API**: O prompt completo é enviado para a API de IA configurada
4. **Resposta JSON**: A IA retorna um JSON estruturado conforme especificado no prompt

## Prompts Disponíveis

### 01-analise-vaga.md

**Quando é usado:**
- Comando `analyze` - Para analisar descrição de vaga
- Comando `generate` - Primeiro passo na geração de currículo

**Classe que usa:** `JobAnalyzer`

**O que faz:**
- Extrai keywords críticas da vaga (10-15 palavras-chave)
- Identifica requisitos obrigatórios vs desejáveis
- Calcula match score preliminar (0-100%)
- Identifica gaps (competências faltantes)
- Extrai destaques e responsabilidades principais
- Fornece sugestões de melhoria

**Placeholders:**
- `{jobDescription}` - Descrição completa da vaga
- `{candidateProfile}` - Perfil resumido do candidato

**Formato de resposta:**
```json
{
  "keywords": ["React", "TypeScript", ...],
  "requirements": {
    "mandatory": [...],
    "desirable": [...]
  },
  "matchScore": 87,
  "matchScoreJustification": "...",
  "gaps": [...],
  "highlights": {...},
  "suggestions": [...]
}
```

**Configuração:**
- `maxTokens`: 4096
- `temperature`: 0.3 (baixa para respostas consistentes)

---

### 02-selecao-conteudo.md

**Quando é usado:**
- Comando `generate` - Segundo passo na geração de currículo

**Classe que usa:** `ContentSelector`

**O que faz:**
- Seleciona experiências mais relevantes para a vaga
- Prioriza e reordena experiências por relevância
- Seleciona achievements (conquistas) a destacar de cada experiência
- Reordena categorias de skills por relevância
- Prioriza tecnologias dentro de cada categoria
- Remove skills irrelevantes (mantém ~30-35 totais)
- Gera texto de summary personalizado (200-400 caracteres)

**Placeholders:**
- `{jobAnalysis}` - Análise completa da vaga (JSON)
- `{curriculumHtml}` - HTML do currículo base

**Formato de resposta:**
```json
{
  "selectedExperiences": [
    {
      "companyId": "ilegra",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2],
      "reason": "..."
    }
  ],
  "reorderedSkills": ["frontend", "architecture", ...],
  "summaryText": "...",
  "suggestions": [...]
}
```

**Configuração:**
- `maxTokens`: 4096
- `temperature`: 0.4 (moderada para balancear criatividade e consistência)

---

### 03-gerador-apresente-se.md

**Quando é usado:**
- Comando `generate` - Terceiro passo na geração de currículo

**Classe que usa:** `PresentationGenerator`

**O que faz:**
- Gera texto de apresentação personalizado (200-400 caracteres)
- Cria variações para diferentes plataformas:
  - `short`: Versão ultra-concisa (150-200 chars)
  - `medium`: Versão padrão (250-350 chars) para Gupy
  - `linkedin`: Versão elaborada (400-500 chars) para LinkedIn
- Inclui 3-5 keywords críticas naturalmente
- Conecta experiências do candidato com desafios da vaga
- Menciona métricas quando possível

**Placeholders:**
- `{jobAnalysis}` - Análise completa da vaga (JSON)
- `{candidateProfile}` - Resumo do perfil do candidato
- `{additionalContext}` - Contexto adicional (opcional)

**Formato de resposta:**
```json
{
  "presentationText": "...",
  "keywordsUsed": ["React", "Next.js", ...],
  "length": 287,
  "variations": {
    "short": "...",
    "medium": "...",
    "linkedin": "..."
  }
}
```

**Configuração:**
- `maxTokens`: 2048
- `temperature`: 0.7 (maior para textos mais naturais)

---

### 04-variacoes-estrategicas.md

**Quando é usado:**
- Comando `generate` - Quarto passo na geração de currículo

**Classe que usa:** `StrategyOptimizer`

**O que faz:**
- Adapta conteúdo baseado no template escolhido:
  - **tech-lead**: Foca em liderança, arquitetura, decisões estratégicas
  - **senior-frontend**: Foca em React, performance, UI/UX
  - **fullstack**: Equilibra frontend, backend e infra
- Fornece ajustes estratégicos por seção
- Sugere reordenação de conteúdo
- Identifica o que enfatizar ou minimizar

**Placeholders:**
- `{template}` - Template escolhido (tech-lead, senior-frontend, fullstack)
- `{jobAnalysis}` - Análise completa da vaga (JSON)
- `{curriculumContent}` - Conteúdo atual do currículo

**Formato de resposta:**
```json
{
  "template": "tech-lead",
  "adjustments": [
    {
      "section": "summary",
      "action": "emphasize",
      "details": "..."
    }
  ],
  "rationale": "..."
}
```

**Configuração:**
- `maxTokens`: 2048
- `temperature`: 0.5 (moderada)

---

### 05-analise-salarial.md

**Quando é usado:**
- Pode ser usado para análise inteligente de propostas salariais (funcionalidade futura)

**Classe que usa:** `SalaryAnalyzer`

**O que faz:**
- Compara proposta com mercado
- Analisa qualidade dos benefícios
- Identifica pontos de negociação
- Sugere contra-proposta com justificativa
- Fornece estratégia de apresentação

**Placeholders:**
- `{proposalType}` - Tipo de proposta (clt ou pj)
- `{proposalDetails}` - Detalhes da proposta (JSON)
- `{jobAnalysis}` - Análise da vaga (JSON, opcional)
- `{salaryComparison}` - Comparação CLT vs PJ (JSON, opcional)

**Formato de resposta:**
```json
{
  "marketComparison": {
    "position": "...",
    "marketRange": {...},
    "proposalLevel": "na-media",
    "comparison": "..."
  },
  "benefitsAnalysis": {...},
  "negotiationPoints": [...],
  "counterProposal": {...},
  "recommendation": "..."
}
```

**Configuração:**
- `maxTokens`: 4096
- `temperature`: 0.6 (moderada)

---

### 06-import-curriculum.md

**Quando é usado:**
- Para importar e estruturar currículos existentes (funcionalidade futura)

**O que faz:**
- Extrai informações de currículos em PDF, HTML ou texto
- Converte para formato HTML estruturado do template
- Preserva todas as informações (experiências, skills, conquistas)
- Adiciona metadados necessários para seleção inteligente
- Estrutura dados com atributos `data-*` para processamento

**Placeholders:**
- `{curriculumContent}` - Conteúdo do currículo a processar
- `{fileFormat}` - Formato do arquivo original (pdf, html, text)

**Formato de resposta:**
HTML completo e válido do `base-curriculum.html` estruturado.

**Nota:** Este prompt retorna HTML puro, não JSON.

---

## Fluxo de Uso no Comando Generate

Quando você executa `generate`, os prompts são usados nesta ordem:

```
1. 01-analise-vaga.md
   ↓
2. 02-selecao-conteudo.md
   ↓
3. 03-gerador-apresente-se.md
   ↓
4. 04-variacoes-estrategicas.md
   ↓
5. Geração HTML/PDF/Markdown
```

## Estrutura de um Prompt

Cada prompt segue esta estrutura:

```markdown
# Título do Prompt

## Contexto
[Papel que a IA deve assumir]

## Instruções
[O que a IA deve fazer, passo a passo]

## Formato de Resposta Esperado (JSON)
[Exemplo do JSON esperado]

## Critérios
[Critérios específicos de qualidade]

## Input
**Variável1:**
{variável1}

**Variável2:**
{variável2}

## Output
[Instruções sobre o formato de saída]
```

## Placeholders e Substituição

Os placeholders são substituídos automaticamente pelo `AIClient`:

```typescript
// Exemplo de uso
await aiClient.callJSON<ResultType>(
  '01-analise-vaga.md',
  {
    jobDescription: "Descrição da vaga...",
    candidateProfile: "Perfil do candidato..."
  }
);
```

O sistema busca por `{jobDescription}` e `{candidateProfile}` no prompt e substitui pelos valores fornecidos.

## Customização

Para modificar o comportamento da IA:

1. **Edite o arquivo do prompt** em `prompts/`
2. **Ajuste instruções** conforme necessário
3. **Teste** com `npm run dev -- generate ...`

**Cuidado:** Modificações nos prompts podem afetar a qualidade dos resultados. Teste sempre após alterações.

## Configurações de API

Cada prompt pode ter configurações específicas:

- **maxTokens**: Número máximo de tokens na resposta
- **temperature**: Criatividade (0.0 = determinístico, 1.0 = criativo)

Configurações são definidas na classe que usa o prompt.

## Ver Também

- [README-GENERATE.md](README-GENERATE.md) - Como os prompts são usados na geração
- [README-ANALYZE.md](README-ANALYZE.md) - Como o prompt de análise é usado
- Arquivos em `../prompts/` - Código fonte dos prompts
