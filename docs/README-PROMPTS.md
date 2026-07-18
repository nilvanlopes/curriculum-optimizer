# Prompts do CV Optimizer

## Fluxo ativo

### `06-import-curriculum.md`

Primeira chamada quando o cache não é válido. Recebe formato, conteúdo sanitizado e `src/templates/curriculum-layout.html`. Retorna HTML completo em modo texto. Proíbe fatos, métricas, períodos e tecnologias ausentes da fonte e aceita uma tentativa corretiva baseada nos erros estruturais.

### `01-analise-vaga.md`

Recebe a descrição da vaga e o perfil extraído do base. Retorna `JobAnalysisResult` em JSON.

### `02-selecao-conteudo-e-apresentacao.md`

Recebe análise, currículo base, role e prioridades. Retorna `ContentSelectionResult` em JSON, referenciando somente experiências, conquistas e skills presentes no base.

### `04-refinar-apresentacao.md`

Refina o summary quando há análise de vaga. O resultado passa por validação factual e pode ser substituído por fallback derivado da fonte.

## Prompt 03

`03-montagem-html.md` preserva o contrato histórico de montagem e a meta de 1,9–2,2 páginas, mas o runtime atual monta o HTML programaticamente com `HTMLComposer`. Ele não representa uma terceira chamada obrigatória de IA.

## Outros prompts

- `05-analise-salarial.md` e `07-busca-salarial-glassdoor.md`: fluxos salariais específicos;
- `prompts/archived/`: contratos antigos fora do fluxo principal.

## Regras comuns

- nenhuma etapa pode inventar credenciais, experiências, tecnologias ou métricas;
- JSON é solicitado no adapter quando a etapa é estruturada;
- importação HTML é texto puro, sem JSON;
- respostas truncadas falham explicitamente;
- logs não contêm prompt ou resposta integral.
