# Contratos públicos

## CLI de geração

```typescript
interface CLIGenerateOptions {
  role: string;
  curriculumFile?: string;
  refreshBase?: boolean;
  provider?: 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'lmstudio' | 'ollama' | 'claude';
  jobFile?: string;
  jobDescription?: string;
  outputName?: string;
  formats?: string; // pdf, html e/ou txt; padrão pdf
  verbose?: boolean;
}
```

- `--provider` usa somente o provider informado naquela execução e não faz fallback.
- Sem `--provider`, o comando lê `PROVIDERS_ORDER` e tenta os providers em ordem.
- Providers sem configuração obrigatória são pulados no modo `PROVIDERS_ORDER`; no modo `--provider`, configuração ausente é erro fatal.
- `claude` normaliza para `anthropic`.
- `--template` e o formato `markdown` são inválidos.
- A ausência, ambiguidade, extensão inválida ou conteúdo vazio da fonte interrompem o fluxo antes da análise da vaga.

## Fonte do currículo

Precedência: `--curriculum-file`, `CURRICULUM_FILE`, exatamente um `input/original-curriculum.{pdf,html,htm,md,txt}`.

```typescript
interface CurriculumSource {
  path: string;
  format: 'pdf' | 'html' | 'md' | 'txt';
  content: string;
  sha256: string; // bytes originais
  size: number;
}
```

PDF precisa conter texto. HTML é sanitizado: scripts, estilos da fonte, elementos executáveis, eventos `on*`, `srcdoc` e URLs executáveis não seguem para a IA.

## Cache do base

Arquivos fixos:

- `input/base-curriculum.html`;
- `input/base-curriculum.meta.json`.

```typescript
interface BaseCurriculumMetadata {
  version: 1;
  source: { path: string; format: string; sha256: string; size: number };
  promptSha256: string;
  layoutSha256: string;
  baseSha256: string;
  provider: string;
  model: string;
  createdAt: string;
}
```

Fonte, prompt, layout, hash do base e estrutura HTML devem continuar válidos para cache hit. Provider/model são auditáveis, mas não entram na chave. Uma resposta inválida recebe uma tentativa corretiva. Nenhum resultado inválido sobrescreve um cache anterior.

O HTML exige documento completo, header, título, contato, summary, experiências, skills e os atributos `data-*` consumidos pelo seletor. Métricas e competências ausentes da fonte são bloqueadas.

## Providers

```typescript
type AIResponseMode = 'text' | 'json';

interface IAProvider {
  readonly provider: 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'lmstudio' | 'ollama';
  readonly model: string;
  readonly endpoint: string; // sanitizado
  call(prompt: string, options?: { mode?: AIResponseMode; maxTokens?: number; temperature?: number }): Promise<string>;
}
```

- OpenRouter, OpenAI, LM Studio e Ollama usam `response_format` em JSON.
- Gemini usa MIME `application/json`.
- Anthropic recebe instrução estrutural estrita e passa pelo parser comum.
- Importação usa modo texto; não há instrução sistêmica para responder JSON.
- Truncamento por limite de tokens é erro explícito.

Cada chamada registra etapa, provider, modelo, endpoint seguro, modo, tentativa, duração, status e erro redigido quando houver. Prompt, resposta e credenciais não são registrados. Erro de chamada, quota, rede, resposta vazia, truncamento ou JSON inválido torna o provider indisponível para as próximas etapas da mesma execução e aciona fallback no modo `PROVIDERS_ORDER`.

O comando `analyze` não imprime a análise gerada no terminal. O resultado completo fica em `output/job-analysis-<timestamp>.json`, com provider e modelo usados.

## Análise e seleção

`JobAnalysisResult` e `ContentSelectionResult` permanecem definidos em `src/types.ts`. Um único `AIClient` é injetado no importador, `JobAnalyzer` e `ContentSelector` durante cada execução.

O resumo final passa pelos guardrails factuais antes da composição. A montagem é programática no `HTMLComposer`; `prompts/03-montagem-html.md` não é uma chamada obrigatória do runtime atual.

## Saídas e histórico

```typescript
type OutputFormat = 'pdf' | 'html' | 'txt';
```

Os nomes são `<output-name>.pdf`, `<output-name>.html` e `<output-name>.txt`. Somente formatos efetivamente persistidos entram no array `formats` e nos caminhos SQLite.

`generated_cvs.file_path_txt` é uma migração aditiva. `file_path_markdown` permanece somente para leitura de históricos antigos.
