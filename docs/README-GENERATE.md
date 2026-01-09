# Comando: generate

Gera um currículo otimizado baseado na descrição de uma vaga específica, utilizando análise de IA para selecionar e priorizar conteúdo relevante.

## Sintaxe

```bash
npm start generate [opções]
```

ou

```bash
npm run dev -- generate [opções]
```

## Opções

### Obrigatórias

- `-t, --template <type>` - Template a usar:
  - `tech-lead` - Foco em liderança técnica e arquitetura
  - `senior-frontend` - Especialização em React/performance
  - `fullstack` - Equilibra frontend/backend/infra

- `-o, --output-name <name>` - Nome do arquivo de saída (sem extensão)

### Entrada da Vaga (escolha uma)

- `-j, --job-description <text>` - Descrição completa da vaga como texto direto ou caminho para arquivo `.txt` ou `.md`
- `-f, --job-file <path>` - Caminho para arquivo `.txt` ou `.md` com descrição da vaga

### Opcionais

- `--format <format>` - Formato de saída (padrão: `all`):
  - `html` - Apenas HTML
  - `pdf` - Apenas PDF
  - `markdown` - Apenas Markdown para Gupy
  - `all` - Todos os formatos

- `-v, --verbose` - Modo verboso com logs detalhados

## Exemplos

### Usando texto direto

```bash
npm start generate \
  --job-description "Vaga para Tech Lead Frontend..." \
  --template tech-lead \
  --output-name btg-pactual-senior
```

### Usando arquivo

```bash
npm start generate \
  --job-file vaga.txt \
  --template tech-lead \
  --output-name btg-pactual-senior
```

### Usando flags curtas

```bash
npm start generate -f vaga.md -t tech-lead -o btg-senior
```

### Gerar apenas HTML

```bash
npm start generate \
  -f vaga.md \
  -t senior-frontend \
  -o curriculo \
  --format html
```

### Gerar apenas PDF

```bash
npm start generate \
  -f vaga.md \
  -t fullstack \
  -o curriculo \
  --format pdf
```

### Modo verboso

```bash
npm start generate \
  -f vaga.md \
  -t tech-lead \
  -o curriculo \
  --verbose
```

## Templates Disponíveis

### tech-lead

**Quando usar:** Para vagas de liderança técnica, arquitetura de sistemas, coordenação de equipes.

**Foco:**
- Liderança técnica e decisões arquiteturais
- Mentoria e desenvolvimento de pessoas
- Impacto organizacional
- Experiências de coordenação

### senior-frontend

**Quando usar:** Para vagas especializadas em frontend, React, performance, UI/UX.

**Foco:**
- Expertise técnica profunda em React/Next.js
- Otimizações de performance
- Experiências com UI/UX
- Detalhes de implementação técnica

### fullstack

**Quando usar:** Para vagas que exigem conhecimento completo de stack, integração frontend/backend.

**Foco:**
- Versatilidade técnica
- Experiências end-to-end
- Conhecimento de infra e DevOps
- Integração entre sistemas

## Formatos de Saída

### HTML (`--format html`)

- Arquivo: `output/{output-name}.html`
- Uso: Visualização no navegador, edição manual
- Formato: HTML completo com CSS embutido

### PDF (`--format pdf`)

- Arquivo: `output/{output-name}.pdf`
- Uso: Envio para recrutadores, impressão
- Formato: PDF gerado a partir do HTML
- Validação ATS: Automática quando gerado com `--format all`

### Markdown (`--format markdown`)

- Arquivo: `output/{output-name}-gupy.txt`
- Uso: Cópia para plataformas como Gupy, LinkedIn
- Formato: Texto formatado em Markdown

### Todos (`--format all` - padrão)

- Gera todos os formatos acima
- Executa validação ATS automática no PDF
- Salva histórico completo no banco de dados

## Fluxo de Execução

1. **Análise da Vaga** - Extrai keywords, requisitos e calcula match score
2. **Seleção de Conteúdo** - Prioriza experiências e skills mais relevantes
3. **Geração de Apresentação** - Cria texto personalizado de apresentação
4. **Otimização Estratégica** - Ajusta conteúdo baseado no template escolhido
5. **Geração HTML** - Monta o currículo HTML otimizado
6. **Geração PDF** (se solicitado) - Converte HTML para PDF
7. **Geração Markdown** (se solicitado) - Cria versão texto para plataformas
8. **Validação ATS** (se `--format all`) - Valida compatibilidade do PDF

## Saída Esperada

### Arquivos Gerados

- `output/{output-name}.html` - Currículo HTML
- `output/{output-name}.pdf` - Currículo PDF (se solicitado)
- `output/{output-name}-gupy.txt` - Versão Markdown (se solicitado)

### Informações Exibidas

- Match Score (%)
- Quantidade de keywords identificadas
- Formatos gerados
- Caminhos dos arquivos criados
- Gaps identificados (se houver)
- Avisos de validação (se `--verbose`)

### Exemplo de Saída

```
✓ Currículo gerado com sucesso!

Match Score: 87%
Keywords Match: 12 identificadas
Formats: html, pdf, markdown
HTML: /path/to/output/curriculo.html
PDF: /path/to/output/curriculo.pdf
Markdown: /path/to/output/curriculo-gupy.txt
```

## Histórico

O comando salva automaticamente no banco de dados SQLite:
- Análise da vaga
- Currículo gerado (metadados)
- Match score
- Templates e formatos usados

## Dicas

- Use `--verbose` para ver detalhes do processo de otimização
- Teste diferentes templates para a mesma vaga e compare resultados
- O comando `analyze` pode ser usado antes para entender a vaga sem gerar currículo
- Arquivos são salvos em `output/` - certifique-se de que o diretório existe ou será criado automaticamente

## Ver Também

- [README-ANALYZE.md](README-ANALYZE.md) - Para analisar vagas antes de gerar
- [README-VALIDATE.md](README-VALIDATE.md) - Para validar PDFs gerados
- [README-PROMPTS.md](README-PROMPTS.md) - Para entender como a IA processa as vagas
