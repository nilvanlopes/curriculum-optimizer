# Comando `generate`

Importa um currículo original, seleciona conteúdo factual e persiste os formatos solicitados.

## Sintaxe

```bash
cv-optimizer generate \
  --role <cargo> \
  [--job-file <txt|md> | --job-description <texto>] \
  [--curriculum-file <pdf|html|htm|md|txt>] \
  [--refresh-base] \
  [--provider <provider>] \
  [--output-name <nome>] \
  [--formats <pdf|html|txt,...>] \
  [--verbose]
```

`--role` é obrigatório. A fonte do currículo segue a precedência `--curriculum-file`, `CURRICULUM_FILE` e descoberta única em `input/original-curriculum.*`.

## Formatos

- `pdf`: padrão e único formato salvo quando `--formats` é omitido;
- `html`: salva o HTML final já composto;
- `txt`: salva texto simples em `<nome>.txt`.

Espaços, caixa e duplicatas são normalizados. Lista vazia, `markdown` ou qualquer outro valor são erros.

O HTML sempre existe em memória e PDFs temporários podem ser usados para medição, mas nenhum deles vira saída final sem ter sido solicitado. Artefatos antigos com o mesmo nome não são apagados automaticamente.

## Base intermediário

O prompt 06 gera `input/base-curriculum.html` e `input/base-curriculum.meta.json` antes de qualquer chamada de análise da vaga. O cache usa os hashes da fonte, do prompt, do layout e do base. `--refresh-base` ignora o cache.

O layout é interno; `--template` foi removido.

## Exemplos

PDF padrão:

```bash
docker compose run --rm optimizer generate \
  --curriculum-file /app/input/original-curriculum.pdf \
  --job-file /app/input/job.txt \
  --role "Tech Lead Frontend"
```

Três saídas e provider único nesta execução:

```bash
docker compose run --rm optimizer generate \
  --provider ollama \
  --curriculum-file /app/input/original-curriculum.md \
  --role "Backend Developer" \
  --formats pdf,html,txt
```

## Ordem do fluxo

1. resolve `--provider` ou a ordem `PROVIDERS_ORDER`;
2. localiza, lê e sanitiza a fonte;
3. reutiliza ou gera o base pelo prompt 06;
4. analisa a vaga, se presente;
5. seleciona conteúdo e refina o resumo;
6. compõe e mede o HTML na faixa de 1,9–2,2 páginas;
7. persiste somente os formatos pedidos;
8. valida o PDF e registra o histórico.
