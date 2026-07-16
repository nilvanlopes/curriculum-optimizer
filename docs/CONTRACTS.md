# Contratos: Entradas, Saídas e Comunicação entre Etapas

Este documento define os contratos formais para todas as interfaces de dados do CV Optimizer: schemas de entrada e saída, exemplos de payload, regras de validação e tratamento de erros.

---

## Índice

- [1. Visão Geral dos Contratos](#1-visão-geral-dos-contratos)
- [2. Contrato: Entrada CLI → Workflow](#2-contrato-entrada-cli--workflow)
- [3. Contrato: Análise de Vaga (Etapa 1)](#3-contrato-análise-de-vaga-etapa-1)
- [4. Contrato: Seleção de Conteúdo (Etapa 2)](#4-contrato-seleção-de-conteúdo-etapa-2)
- [5. Contrato: Montagem HTML (Etapa 3)](#5-contrato-montagem-html-etapa-3)
- [6. Contrato: Validação ATS (Etapa 5)](#6-contrato-validação-ats-etapa-5)
- [7. Contrato: Persistência (Etapa 6)](#7-contrato-persistência-etapa-6)
- [8. Contrato: Interface do AI Provider](#8-contrato-interface-do-ai-provider)
- [9. Tratamento de Erros](#9-tratamento-de-erros)

---

## 1. Visão Geral dos Contratos

O fluxo de dados entre as etapas segue este padrão:

```
CLI Params ─→ [Etapa 1] JobAnalysisResult ─→ [Etapa 2] ContentSelectionResult ─→ [Etapa 3] HTML
                                                                                      │
                                              [Etapa 5] ValidationResult ←─── PDF ←──┘
```

Cada etapa consome a saída da anterior e produz um tipo bem definido em `src/types.ts`.

---

## 2. Contrato: Entrada CLI → Workflow

### Schema de Entrada

```typescript
interface CLIGenerateOptions {
  role: string;               // Obrigatório — título do currículo
  jobFile?: string;           // Caminho para .txt ou .md
  jobDescription?: string;    // Texto direto da vaga
  outputName?: string;        // Nome do arquivo de saída
  formats?: string;           // "html,pdf,markdown" (separados por vírgula)
  template?: string;          // Caminho para template HTML base
  verbose?: boolean;          // Logs detalhados
}
```

### Regras de Validação

| Campo | Regra | Erro |
|-------|-------|------|
| `role` | Não pode ser vazio | `requiredOption` (Commander.js) |
| `jobFile` | Se fornecido: deve existir, extensão `.txt` ou `.md`, conteúdo não-vazio | `"Formato de arquivo não suportado"` / `"Arquivo vazio"` |
| `formats` | Cada formato deve ser `html`, `pdf` ou `markdown` | `"Formatos inválidos: ..."` |
| `jobDescription` + `jobFile` | Se ambos fornecidos: `jobFile` tem prioridade | Warning no log |

### Exemplo de Uso

```bash
# Com vaga
npm run dev -- generate \
  --job-file input/job.txt \
  --role "Tech Lead Frontend" \
  --output-name candidatura \
  --formats pdf,html,markdown

# Sem vaga (currículo genérico)
npm run dev -- generate \
  --role "Senior Frontend Developer"
```

---

## 3. Contrato: Análise de Vaga (Etapa 1)

### Entrada para a IA

**Prompt:** `prompts/01-analise-vaga.md`

| Placeholder | Tipo | Descrição |
|-------------|------|-----------|
| `{jobDescription}` | `string` | Texto completo da descrição da vaga |
| `{candidateProfile}` | `string` | Perfil extraído do template HTML |

**Configuração da chamada:**

```typescript
{
  maxTokens: 4096,
  temperature: 0.3  // Baixa para respostas consistentes
}
```

### Schema de Saída: `JobAnalysisResult`

**Definição:** `src/types.ts` linhas 45-63

```typescript
interface JobAnalysisResult {
  keywords: string[];                    // 5-15 keywords críticas
  requirements: {
    mandatory: string[];                 // Requisitos obrigatórios
    desirable: string[];                 // Requisitos desejáveis
  };
  matchScore: number;                    // 0-100
  matchScoreJustification: string;       // Justificativa do score
  gaps: Array<{
    keyword: string;
    importance: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  highlights: {
    mainResponsibilities: string[];
    differentiators: string[];
  };
  suggestions: string[];
}
```

### Exemplo de Payload Real

```json
{
  "keywords": [
    "React", "TypeScript", "Next.js", "Node.js", "AWS",
    "CI/CD", "Git", "Liderança Técnica", "Scrum", "REST APIs"
  ],
  "requirements": {
    "mandatory": [
      "React com 5+ anos de experiência",
      "TypeScript avançado",
      "Experiência com Next.js",
      "Testes unitários (Jest, React Testing Library)"
    ],
    "desirable": [
      "Experiência com microfrontends",
      "AWS (Lambda, S3, CloudFront)",
      "Liderança técnica de equipe"
    ]
  },
  "matchScore": 87,
  "matchScoreJustification": "Candidato possui 90% das tecnologias obrigatórias (React, TypeScript, Next.js, Node.js) e experiência relevante em liderança técnica. Faltam conhecimentos específicos em microfrontends mencionados como desejável.",
  "gaps": [
    {
      "keyword": "Microfrontends",
      "importance": "medium",
      "suggestion": "Adicionar experiência com Module Federation ou menção a arquitetura modular frontend"
    }
  ],
  "highlights": {
    "mainResponsibilities": [
      "Liderar time de frontend de 5+ desenvolvedores",
      "Arquitetar soluções frontend escaláveis",
      "Mentorar desenvolvedores"
    ],
    "differentiators": [
      "Trabalho 100% remoto",
      "Tecnologias de ponta",
      "Empresa em crescimento acelerado"
    ]
  },
  "suggestions": [
    "Destacar mais experiências de liderança técnica",
    "Mencionar projetos com arquitetura escalável",
    "Enfatizar conquistas com métricas quantificáveis"
  ]
}
```

### Regras de Validação

| Campo | Regra | Tratamento |
|-------|-------|-----------|
| `keywords` | Array não-vazio | Erro se vazio |
| `matchScore` | Inteiro entre 0-100 | Parse do JSON falha se inválido |
| `gaps[].importance` | Enum: `high`, `medium`, `low` | Aceita qualquer string (validação relaxada) |

### Persistência

Salvo automaticamente no SQLite via `storage.saveJobAnalysis()`:
- Tabela `jobs`: título, empresa, descrição
- Tabela `job_analyses`: keywords (JSON), requirements (JSON), matchScore, gaps (JSON)

---

## 4. Contrato: Seleção de Conteúdo (Etapa 2)

### Entrada para a IA

**Prompt:** `prompts/02-selecao-conteudo-e-apresentacao.md`

| Placeholder | Tipo | Descrição |
|-------------|------|-----------|
| `{jobAnalysis}` | `string` (JSON) | Resultado da Etapa 1 serializado |
| `{curriculumHtml}` | `string` | Template HTML base completo |
| `{candidateProfile}` | `string` | Perfil extraído do template |
| `{sectionPriorities}` | `string` | Prioridades de seção formatadas |
| `{role}` | `string` | Título do currículo |

**Configuração da chamada:**

```typescript
{
  maxTokens: 8192,
  temperature: 0.4
}
```

### Schema de Saída: `ContentSelectionResult`

**Definição:** `src/types.ts` linhas 68-88

```typescript
interface ContentSelectionResult {
  selectedExperiences: Array<{
    companyId: string;               // ID da empresa no template HTML
    priority: number;                // 1 = mais relevante
    achievementsToHighlight: number[]; // Índices das conquistas a manter
  }>;
  selectedSkills?: {
    categories: Array<{
      categoryId: string;            // ID da categoria (ex: "frontend")
      categoryName: string;          // Nome exibido (ex: "Frontend")
      skills: string[];              // Lista de tecnologias
    }>;
  };
  selectedCertifications?: Array<{
    index?: number;                  // Índice no template
    text?: string;                   // Texto completo para matching
  }>;
  presentationText: string;          // OBRIGATÓRIO: 200-400 caracteres
  keywordsUsed?: string[];           // Keywords incluídas no texto
}
```

### Exemplo de Payload Real

```json
{
  "selectedExperiences": [
    {
      "companyId": "empresa-atual",
      "priority": 1,
      "achievementsToHighlight": [0, 1, 2, 3, 4],
      "reason": "Experiência mais recente e relevante — React 18, TypeScript, liderança técnica"
    },
    {
      "companyId": "empresa-anterior",
      "priority": 2,
      "achievementsToHighlight": [0, 1, 2],
      "reason": "E-commerce com +500k produtos — sistema de alto volume relevante para a vaga"
    }
  ],
  "selectedSkills": {
    "categories": [
      {
        "categoryId": "frontend",
        "categoryName": "Frontend",
        "skills": ["React 18", "Next.js 14", "TypeScript", "JavaScript ES6+", "Tailwind CSS"]
      },
      {
        "categoryId": "backend",
        "categoryName": "Backend & APIs",
        "skills": ["Node.js", "GraphQL", "REST APIs", "NestJS"]
      }
    ]
  },
  "selectedCertifications": [
    {
      "text": "React: The Complete Guide (incl Hooks, React Router, Redux) - Udemy (2022)",
      "relevanceScore": 95,
      "reason": "Match com keywords obrigatórias da vaga"
    }
  ],
  "presentationText": "Tech Lead Frontend com 6+ anos de experiência especializado em React, TypeScript e Node.js. Expertise comprovada em arquitetura de microsserviços (-50% erros sistema), otimização de performance (+20% conversões) e liderança de equipes de 5+ desenvolvedores.",
  "keywordsUsed": ["React", "TypeScript", "Node.js", "microsserviços", "performance"]
}
```

### Regras de Validação

| Campo | Regra | Severidade |
|-------|-------|------------|
| `presentationText` | Não pode ser vazio | **Erro** — aborta etapa |
| `presentationText` | Entre 200-400 caracteres | Warning (log) |
| `selectedExperiences[].achievementsToHighlight` | Não pode ser vazio | Warning (log) |
| `selectedExperiences` | Ordenado por `priority` crescente | Auto-corrigido pelo código |
| `selectedSkills.categories` | Não pode ser array vazio | Warning (log) |

---

## 5. Contrato: Montagem HTML (Etapa 3)

### Entrada para a IA

**Prompt:** `prompts/03-montagem-html.md`

| Placeholder | Tipo | Descrição |
|-------------|------|-----------|
| `{role}` | `string` | Título do currículo |
| `{contentSelection}` | `string` (JSON) | Resultado da Etapa 2 serializado |
| `{jobAnalysis}` | `string` (JSON/null) | Resultado da Etapa 1 |
| `{templateHtml}` | `string` | Template HTML base completo |
| `{sectionPriorities}` | `string` | Prioridades de seção formatadas |
| `{regenerationFeedback}` | `string` (JSON/null) | Feedback do loop iterativo |

**Configuração da chamada:**

```typescript
{
  maxTokens: 8192,
  temperature: 0.3  // Baixa para HTML consistente
}
```

### Schema de Saída

A saída é **HTML puro** (não JSON). Deve:

| Regra | Validação |
|-------|-----------|
| Começar com `<!DOCTYPE html>` ou `<html>` | Verificação de string |
| Terminar com `</html>` | Verificação de string |
| Conter tag `<html>` | Cheerio parse |
| Conter tag `<head>` | Cheerio parse |
| Conter tag `<body>` | Cheerio parse |
| Conter `.header` | Cheerio parse |
| Conter `.summary` | Cheerio parse |
| Conter pelo menos um `.experience-item` | Cheerio parse |
| Máximo 5 `.experience-item` | Warning (não bloqueia) |
| Máximo 6 `.skill-category` | Warning (não bloqueia) |

### Contrato do Loop Iterativo

**Schema de Feedback:** `HTMLRegenerationFeedback`

**Definição:** `src/types.ts` linhas 106-128

```typescript
interface HTMLRegenerationFeedback {
  currentHeightPages: number;   // Altura atual em páginas (ex: 1.5)
  currentHeightMm: number;      // Altura em mm
  targetMinPages: number;       // Mínimo desejado (1.9)
  targetMaxPages: number;       // Máximo desejado (2.2)
  adjustment: 'expand' | 'reduce';
  attemptNumber: number;        // 1-5
  maxAttempts: number;          // 5
  missingAchievements?: Array<{
    companyId: string;
    achievementIndices: number[];
  }>;
  instructions: string;         // Instruções textuais para a IA
}
```

**Schema de Medição:** `PDFMeasurement`

```typescript
interface PDFMeasurement {
  pageCount: number;       // Número inteiro de páginas
  heightMm: number;        // Altura total em milímetros
  heightInPages: number;   // Altura em páginas (ex: 1.95)
}
```

**Configuração do Loop:**

```typescript
{
  maxIterations: 5,
  minPages: 1.9,
  maxPages: 2.2,
  pageHeightMm: 277  // Altura útil de 1 página A4 com margens
}
```

---

## 6. Contrato: Validação ATS (Etapa 5)

### Schema de Saída: `ValidationResult`

**Definição:** `src/types.ts` linhas 5-18

```typescript
interface ValidationResult {
  score: number;        // 0-100 (média ponderada)
  passed: boolean;      // true se score >= 70 E ats compatible
  warnings: string[];   // Avisos não-bloqueantes
  errors: string[];     // Erros críticos
  details: {
    atsCompatible: boolean;     // PDF tem texto extraível
    keywordDensity: number;     // Porcentagem (ex: 7.5)
    pageCount: number;          // Número de páginas
    hasExtractableText: boolean;
    wordCount?: number;
    charCount?: number;
  };
}
```

### Scoring

| Componente | Peso | Critério |
|------------|:----:|----------|
| ATS Score | 50% | Texto extraível, sem imagens como texto |
| Length Score | 30% | 300-1000 palavras, ≤2 páginas |
| Keyword Density | 20% | 5-10% de densidade de keywords |

**Threshold de aprovação:** `score >= 70 AND atsCompatible == true`

### Exemplo de Payload

```json
{
  "score": 85,
  "passed": true,
  "warnings": [
    "Densidade de keywords (4.5%) está levemente abaixo do ideal (5-10%)"
  ],
  "errors": [],
  "details": {
    "atsCompatible": true,
    "keywordDensity": 4.5,
    "pageCount": 2,
    "hasExtractableText": true,
    "wordCount": 650,
    "charCount": 3800
  }
}
```

---

## 7. Contrato: Persistência (Etapa 6)

### Schema de Entrada para `saveGeneratedCV`

```typescript
interface SaveGeneratedCVInput {
  jobId?: number;              // FK para tabela jobs (nullable)
  jobAnalysisId?: number;      // FK para tabela job_analyses (nullable)
  role: string;                // Título do currículo
  outputName: string;          // Nome do arquivo
  formats: string[];           // Formatos gerados ["html", "pdf"]
  matchScore?: number;         // Score de match (nullable)
  filePathHtml?: string;       // Caminho absoluto do HTML
  filePathPdf?: string;        // Caminho absoluto do PDF
  filePathMarkdown?: string;   // Caminho absoluto do Markdown
}
```

### Schema do Banco de Dados

```sql
-- Vagas analisadas
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  company TEXT,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Análises de vagas
CREATE TABLE job_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  keywords TEXT NOT NULL,        -- JSON array
  requirements TEXT NOT NULL,    -- JSON object
  match_score INTEGER NOT NULL,
  match_score_justification TEXT,
  gaps TEXT,                     -- JSON array
  highlights TEXT,               -- JSON object
  suggestions TEXT,              -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Currículos gerados
CREATE TABLE generated_cvs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES jobs(id),
  job_analysis_id INTEGER REFERENCES job_analyses(id),
  template TEXT NOT NULL,        -- role
  output_name TEXT NOT NULL,
  formats TEXT NOT NULL,         -- JSON array
  match_score INTEGER,
  file_path_html TEXT,
  file_path_pdf TEXT,
  file_path_markdown TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tratamento de Erro

Falhas ao salvar histórico **não interrompem** o workflow. Um warning é logado se `--verbose` estiver ativo.

---

## 8. Contrato: Interface do AI Provider

### Interface `IAProvider`

**Definição:** `src/utils/ai-providers/interface.ts`

```typescript
interface IAProvider {
  call(
    prompt: string,
    options?: {
      maxTokens?: number;        // Limite de tokens na resposta
      temperature?: number;      // Criatividade (0.0 = determinístico, 1.0 = criativo)
      enableWebSearch?: boolean; // Busca web (apenas alguns providers)
      jsonResponse?: boolean;    // Solicitar resposta em JSON
    }
  ): Promise<string>;
}
```

### Contrato do `AIClient`

**Definição:** `src/utils/ai-client.ts`

```typescript
class AIClient {
  // Carrega prompt e substitui placeholders
  async call(
    promptFileName: string,                   // Ex: "01-analise-vaga.md"
    placeholders: Record<string, string>,      // Ex: { jobDescription: "...", candidateProfile: "..." }
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;

  // Carrega prompt, chama IA e faz parse do JSON
  async callJSON<T>(
    promptFileName: string,
    placeholders: Record<string, string>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<T>;
}
```

### Extração de JSON da Resposta

O `callJSON` tenta extrair JSON da resposta da IA em duas fases:

1. **Code block markdown:** ```` ```json { ... } ``` ````
2. **JSON solto:** `{ ... }` (primeiro match de `\{[\s\S]*\}`)

Se nenhum JSON encontrado: lança erro com preview da resposta (500 chars).

### Providers Suportados

| Provider | Variável de Ambiente | API Key |
|----------|---------------------|---------|
| `openrouter` | `AI_PROVIDER=openrouter` | `OPENROUTER_API_KEY` |
| `claude` | `AI_PROVIDER=claude` | `ANTHROPIC_API_KEY` |
| `openai` | `AI_PROVIDER=openai` | `OPENAI_API_KEY` |
| `gemini` | `AI_PROVIDER=gemini` | `GOOGLE_API_KEY` |
| `lmstudio` | `AI_PROVIDER=lmstudio` | `LMSTUDIO_API_KEY` (padrão: `lm-studio`) |

---

## 9. Tratamento de Erros

### Erros por Etapa

| Etapa | Erro | Ação |
|-------|------|------|
| Validação CLI | Parâmetro inválido | `process.exit(1)` com mensagem |
| Análise de Vaga | API de IA falha | Propaga erro, `process.exit(1)` |
| Análise de Vaga | Resposta sem JSON | Lança `Error` com preview da resposta |
| Seleção de Conteúdo | `presentationText` vazio | Lança `Error` |
| Seleção de Conteúdo | `presentationText` fora de 200-400 chars | Warning (não bloqueia) |
| Montagem HTML | Resposta sem HTML | Lança `Error` com preview |
| Montagem HTML | HTML sem seções obrigatórias | Lança `Error` com lista de erros |
| Montagem HTML | HTML com avisos (>5 exp, >6 skills) | Warning (não bloqueia) |
| Loop Iterativo | Não convergiu em 5 tentativas | Usa melhor resultado (não bloqueia) |
| Loop Iterativo | Sem melhoria em 2 tentativas | Encerra cedo, usa melhor resultado |
| Geração PDF | Puppeteer falha | Propaga erro |
| Validação ATS | PDF não legível | Retorna score baixo, erros no array |
| Persistência | SQLite falha | Warning (não bloqueia workflow) |

### Formato de Erro Padrão

```typescript
// Todos os erros seguem este padrão:
throw new Error(
  `Erro ao [ação]: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
);
```

O CLI captura erros no `try/catch` de cada comando e:
1. Exibe mensagem com `logger.error()`
2. Se `--verbose`: exibe stack trace com `logger.debug(error.stack)`
3. Finaliza com `process.exit(1)`
