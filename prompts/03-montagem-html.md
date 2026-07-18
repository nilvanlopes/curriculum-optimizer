# Contrato historico: montagem HTML do curriculo

Este arquivo documenta o contrato historico da etapa de montagem final. Ele nao
e uma chamada obrigatoria de IA no runtime atual.

A execucao atual monta o HTML programaticamente em `HTMLComposer`, usando:

- o curriculo base HTML gerado/importado em `input/base-curriculum.html`;
- a selecao de conteudo produzida pelo `ContentSelector`;
- a analise da vaga, quando disponivel;
- as medicoes de PDF feitas durante `composeWithIteration`.

Portanto, este documento serve como referencia de comportamento esperado para a
montagem programatica, testes e manutencao. Ele nao deve ser tratado como prompt
ativo que recebe JSON e retorna HTML.

## Objetivo da montagem

O `HTMLComposer` deve gerar um documento HTML completo e valido que:

- contenha apenas experiencias, conquistas, skills e certificacoes selecionadas;
- preserve dados pessoais, contatos, empresas, cargos, periodos e tecnologias do
  curriculo base;
- use o titulo alvo informado pelo comando como cargo principal;
- aplique o resumo final validado pelos guardrails factuais;
- mantenha a ordem logica das secoes;
- busque ocupar o intervalo alvo de 1,9 a 2,2 paginas A4 quando houver conteudo
  suficiente.

## Estrutura esperada

O HTML final deve preservar a estrutura base necessaria para renderizacao e
medicao:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>{Nome} - {Role}</title>
  <style>...</style>
</head>
<body>
  <!-- HEADER -->
  <!-- SUMMARY -->
  <!-- EXPERIENCE -->
  <!-- SKILLS -->
  <!-- EDUCATION -->
  <!-- CERTIFICATIONS -->
  <!-- LANGUAGES -->
</body>
</html>
```

As secoes podem ser omitidas apenas quando nao houver conteudo selecionado ou
quando o curriculo base nao tiver informacao correspondente. A estrutura usada
deve continuar compativel com o CSS interno e com a medicao de PDF.

## Header

- Atualizar o titulo profissional com o `role` solicitado.
- Preservar exatamente o nome do candidato.
- Preservar exatamente os contatos existentes.
- Atualizar o `<title>` da pagina para refletir nome e cargo alvo.

## Summary

- Usar o `presentationText` selecionado e validado.
- Nao inventar fatos, metricas, periodos, tecnologias, cargos ou credenciais.
- Manter o texto compacto o suficiente para o layout final.

## Experiencias

- Incluir as experiencias selecionadas em ordem de prioridade.
- Preservar exatamente nomes de cargos, empresas, periodos e tech stack do
  curriculo base.
- Selecionar conquistas a partir dos indices e criterios retornados pelo
  `ContentSelector`.
- Nunca criar conquistas novas.
- Evitar remover uma experiencia completa quando houver conquistas selecionadas
  e espaco disponivel.
- Ao reduzir conteudo, cortar primeiro conquistas de experiencias menos
  prioritarias.

## Skills

- Usar somente categorias e skills existentes no curriculo base.
- Respeitar a ordem e categorias selecionadas.
- Nao adicionar tecnologias ausentes da fonte.

Estrutura de referencia:

```html
<div class="skill-category" data-category="{categoryId}">
  <div class="skill-category-title">{categoryName}</div>
  <div class="skill-list">{skills}</div>
</div>
```

## Certificacoes

- Preservar apenas certificacoes selecionadas.
- Fazer correspondencia por indice ou texto existente no curriculo base.
- Nao atualizar nomes, versoes, datas ou emissores.

## Educacao e idiomas

- Preservar as informacoes existentes no curriculo base.
- Nao completar datas, instituicoes, niveis ou credenciais ausentes.

## Paginacao

O alvo operacional continua sendo 1,9 a 2,2 paginas A4.

Quando o PDF ficar curto:

- incluir mais conquistas selecionadas ainda disponiveis;
- evitar compactacao visual prematura;
- aproveitar certificacoes e skills selecionadas quando existirem.

Quando o PDF ficar longo:

- reduzir primeiro conteudo de menor prioridade;
- reduzir conquistas antes de remover secoes inteiras;
- preservar dados essenciais de header, resumo, experiencias principais e
  contato.

Se nao houver conteudo suficiente na fonte, o compositor deve manter os
guardrails factuais e registrar aviso de pagina fora da faixa, em vez de
preencher espaco com dados inventados.

## Coerencia e validacao

A montagem final deve garantir que:

- o HTML seja valido e renderizavel;
- keywords relevantes aparecam quando estiverem presentes na fonte selecionada;
- skills exibidas sejam coerentes com experiencias e tech stacks existentes;
- o resumo passe pelos guardrails factuais;
- nenhum conteudo integral de prompt ou resposta de IA seja registrado nos logs.
