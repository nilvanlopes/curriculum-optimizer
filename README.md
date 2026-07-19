# CV Optimizer

Sistema de otimização de currículos para vagas específicas de tecnologia, com análise semântica via IA, seleção factual de conteúdo, paginação A4 e validação ATS.

## Contexto e propósito

Ao se candidatar a uma vaga, o profissional normalmente precisa adaptar o currículo à oportunidade sem inventar experiência. O CV Optimizer automatiza esse processo:

1. importa o currículo original e cria um base HTML estruturado;
2. analisa a vaga, quando fornecida;
3. seleciona somente fatos existentes no currículo;
4. compõe e mede o HTML até buscar a faixa de 1,9–2,2 páginas;
5. persiste apenas os formatos solicitados e valida o PDF para ATS.

## Uso com Docker

Copie o ambiente de exemplo, configure um provider e coloque exatamente um currículo original em `input/`:

```bash
cp .env.example .env
cp /caminho/curriculo.pdf input/original-curriculum.pdf
docker compose build optimizer
docker compose run --rm optimizer generate \
  --job-file /app/input/job.txt \
  --role "Desenvolvedor Full Stack" \
  --output-name candidatura
```

O formato padrão é somente PDF, portanto o exemplo grava `output/candidatura.pdf`. Para solicitar outras combinações:

```bash
docker compose run --rm optimizer generate \
  --curriculum-file /app/input/original-curriculum.md \
  --role "Desenvolvedor Full Stack" \
  --formats pdf,html,txt
```

## Currículo original e cache

A fonte é resolvida nesta ordem:

1. `--curriculum-file`;
2. `CURRICULUM_FILE`;
3. exatamente um `input/original-curriculum.{pdf,html,htm,md,txt}`.

MD e TXT são lidos em UTF-8. HTML é sanitizado antes de chegar à IA. PDF precisa conter texto extraível; PDFs somente escaneados devem passar por OCR antes.

Antes de analisar a vaga, o prompt `06-import-curriculum.md` converte a fonte para:

- `input/base-curriculum.html`;
- `input/base-curriculum.meta.json`.

Esses arquivos são cache intermediário ignorado pelo Git. O cache só é reutilizado quando os hashes SHA-256 da fonte, do prompt, do layout neutro e do próprio base conferem e a estrutura continua válida. Provider e modelo ficam nos metadados para auditoria, mas não invalidam o cache. Use `--refresh-base` para forçar a importação.

## Providers

Sem `--provider`, o CLI usa `PROVIDERS_ORDER` e tenta os providers em ordem. Providers sem configuração obrigatória são pulados; erro de chamada, quota, rede, resposta vazia, truncamento ou JSON inválido desativa aquele provider pelo restante da execução e tenta o próximo. Use `--provider` para uma execução com provider único, sem fallback.

| Valor | Configuração obrigatória |
|---|---|
| `openrouter` | `OPENROUTER_API_KEY` e `OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free` |
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `anthropic` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`; `claude` é alias legado |
| `gemini` | `GOOGLE_API_KEY`, `GOOGLE_MODEL` |
| `lmstudio` | `LMSTUDIO_BASE_URL`, `LMSTUDIO_MODEL`; chave opcional |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`; chave opcional |

Exemplo com Ollama no host:

```env
PROVIDERS_ORDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
OLLAMA_MODEL=qwen2.5:7b
```

O Compose resolve `host.docker.internal` pelo gateway do host. Para outra máquina, use o IP dela no URL completo.

Exemplo com fallback remoto/local:

```env
PROVIDERS_ORDER=gemini,openrouter,ollama
GOOGLE_API_KEY=sua-chave
GOOGLE_MODEL=gemini-3.5-flash
OPENROUTER_API_KEY=sk-or-v1-sua-chave
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
OLLAMA_MODEL=qwen2.5:7b
```

## CLI

```text
cv-optimizer generate \
  --role <cargo> \
  [--curriculum-file <pdf|html|htm|md|txt>] \
  [--refresh-base] \
  [--provider <provider>] \
  [--formats <pdf|html|txt,...>]
```

Opções adicionais de `generate`: `--job-file`, `--job-description`, `--output-name` e `--verbose`.

O override de provider também vale para análise isolada:

```bash
docker compose run --rm optimizer analyze \
  --provider ollama \
  --job-file /app/input/job.txt
```

Outros comandos disponíveis:

- `validate <pdf>`: valida compatibilidade ATS;
- `salary-compare`: compara propostas CLT e PJ;
- `serve --file <html>`: abre o servidor de edição local.

## Prompts e composição

Os prompts ativos no fluxo principal são:

- `06-import-curriculum.md`: importa o currículo original;
- `01-analise-vaga.md`: analisa a vaga, quando presente;
- `02-selecao-conteudo-e-apresentacao.md`: seleciona conteúdo;
- `04-refinar-apresentacao.md`: corrige o resumo quando necessário.

A montagem final é feita programaticamente pelo `HTMLComposer`. `03-montagem-html.md` documenta o contrato histórico, mas não é uma chamada obrigatória da execução atual.

## Persistência

Somente os formatos pedidos são gravados:

- `<nome>.pdf`;
- `<nome>.html`;
- `<nome>.txt`.

O SQLite em `data/` registra somente os formatos e caminhos realmente persistidos. A coluna legada `file_path_markdown` continua disponível para históricos antigos; novas saídas de texto usam `file_path_txt`.

## Desenvolvimento e validação

O caminho reproduzível é Docker:

```bash
docker build --target test -t curriculum-optimizer:test .
docker run --rm curriculum-optimizer:test
```

O layout neutro versionado fica em `src/templates/curriculum-layout.html`. Dados do candidato nunca devem ser adicionados a esse arquivo.

## Licença

MIT - Douglas Fantoni
