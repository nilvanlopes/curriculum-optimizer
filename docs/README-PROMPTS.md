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

### 02-selecao-conteudo-e-apresentacao.md

**Quando é usado:**
- Comando `generate` - Segundo passo na geração de currículo

**Classe que usa:** `ContentSelector`

**O que faz:**
- **Seleção de conteúdo:**
  - Seleciona experiências mais relevantes para a vaga (máximo 5)
  - Prioriza e reordena experiências por relevância
  - Seleciona achievements (conquistas) a destacar de cada experiência (2-4 por experiência)
  - Seleciona categorias de skills mais relevantes (máximo 6)
  - Coleta e filtra tecnologias do template HTML (não inventa)
  - Seleciona certificações mais relevantes (máximo 5-8)
- **Geração de apresentação:**
  - Gera texto de apresentação personalizado (200-400 caracteres) para a seção Summary
  - Inclui 3-5 keywords críticas naturalmente (se houver análise de vaga)
  - Conecta experiências do candidato com desafios da vaga/role
  - Menciona métricas quando possível

**Placeholders:**
- `{jobAnalysis}` - Análise completa da vaga (JSON) ou análise mínima baseada no role
- `{role}` - Título do currículo fornecido pelo usuário (opcional)
- `{candidateProfile}` - Perfil do candidato extraído do template HTML
- `{curriculumHtml}` - HTML do currículo base

**Formato de resposta:**
```json
{
  "selectedExperiences": [
    {
      "companyId": "ilegra-zenvia",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2],
      "reason": "..."
    }
  ],
  "selectedSkills": {
    "categories": [
      {
        "categoryId": "frontend",
        "categoryName": "Frontend",
        "skills": ["React", "Next.js", "TypeScript"]
      }
    ]
  },
  "selectedCertifications": [
    {
      "index": 0,
      "text": "..."
    }
  ],
  "presentationText": "...",
  "keywordsUsed": ["React", "Next.js", ...],
  "suggestions": [...]
}
```

**Configuração:**
- `maxTokens`: 8192 (aumentado para suportar geração de apresentação também)
- `temperature`: 0.4 (moderada para balancear criatividade e consistência)

---

### 03-montagem-html.md

**Quando é usado:**
- Comando `generate` - Terceiro passo na geração de currículo

**Classe que usa:** `HTMLComposer`

**O que faz:**
- Recebe o resultado da seleção de conteúdo e monta HTML completo
- Extrai seções do template base conforme seleção
- **Monta HTML completo:**
  - Atualiza Header com role fornecido
  - Insere presentationText na seção Summary
  - Extrai e ordena experiências selecionadas (máximo 5)
  - Mantém apenas conquistas destacadas de cada experiência
  - Monta categorias de skills selecionadas com tecnologias coletadas
  - Seleciona certificações conforme critérios
  - Mantém Education e Languages do template original
- **Garante 2 páginas A4:**
  - Estima tamanho por seção (~800-1000 palavras totais)
  - Ajusta espaçamentos e reduz conteúdo se necessário
  - Prioriza conteúdo mais relevante
- **Valida coerência:**
  - Keywords da vaga aparecem no HTML
  - Skills alinhadas com experiências
  - Ordem lógica: Header → Summary → Experience → Skills → Education → Certifications → Languages

**Placeholders:**
- `{role}` - Título do currículo fornecido pelo usuário
- `{contentSelection}` - Resultado da seleção de conteúdo (JSON)
- `{jobAnalysis}` - Análise completa da vaga (JSON, opcional)
- `{templateHtml}` - HTML completo do template base

**Formato de resposta:**
HTML completo e válido (string), não JSON. Retorna HTML pronto para uso, começando com `<!DOCTYPE html>` e terminando com `</html>`.

**Configuração:**
- `maxTokens`: 8192 (template grande + resposta HTML)
- `temperature`: 0.3 (baixa para HTML consistente)

**Nota:** Este prompt retorna HTML puro, não JSON. A IA monta o HTML completo garantindo que caiba em 2 páginas A4.

---

### 05-analise-salarial.md

**Quando é usado:**
- Funcionalidade futura para análise inteligente de propostas salariais
- Atualmente não está em uso

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
1. 01-analise-vaga.md (opcional - apenas se houver descrição de vaga)
   ↓
2. 02-selecao-conteudo-e-apresentacao.md (combinado: seleção + apresentação)
   ↓
3. 03-montagem-html.md (monta HTML completo garantindo 2 páginas)
   ↓
4. Geração PDF/Markdown
```

**Nota:** O fluxo foi simplificado de 4 para 2-3 prompts:
- Prompt 1 (análise) continua opcional
- Prompt 2 (seleção + apresentação) combina duas etapas em uma
- Prompt 3 (montagem HTML) substitui a manipulação DOM anterior
- StrategyOptimizer foi removido (lógica incorporada na montagem HTML)

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
