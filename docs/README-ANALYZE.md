# Comando `analyze`

Analisa uma descrição de vaga sem gerar currículo.

```bash
cv-optimizer analyze \
  (--job-file <txt|md> | --job-description <texto>) \
  [--provider <provider>] \
  [--verbose]
```

`--job-file` tem prioridade quando as duas entradas são fornecidas. Com `--provider`, a análise usa somente aquele provider e não faz fallback. Sem `--provider`, a análise percorre `PROVIDERS_ORDER`.

A resposta estruturada é salva em `output/job-analysis-<timestamp>.json`, junto com provider, modelo e data de geração. O terminal mostra somente metadados e caminho do arquivo, sem imprimir keywords, requisitos, gaps, sugestões ou outros dados gerados. Gaps descrevem ausência em relação à fonte disponível; eles nunca autorizam adicionar experiência que o candidato não possui.

Exemplo Docker:

```bash
docker compose run --rm optimizer analyze \
  --provider ollama \
  --job-file /app/input/job.txt
```

A análise é salva no SQLite quando concluída com sucesso.
