# Comando `analyze`

Analisa uma descrição de vaga sem gerar currículo.

```bash
cv-optimizer analyze \
  (--job-file <txt|md> | --job-description <texto>) \
  [--provider <provider>] \
  [--verbose]
```

`--job-file` tem prioridade quando as duas entradas são fornecidas. O override de provider vale somente para aquela execução; sem ele ou `AI_PROVIDER`, o comando falha.

A resposta estruturada contém keywords, requisitos obrigatórios/desejáveis, match score, gaps, destaques e sugestões. Gaps descrevem ausência em relação à fonte disponível; eles nunca autorizam adicionar experiência que o candidato não possui.

Exemplo Docker:

```bash
docker compose run --rm optimizer analyze \
  --provider ollama \
  --job-file /app/input/job.txt
```

A análise é salva no SQLite quando concluída com sucesso.
