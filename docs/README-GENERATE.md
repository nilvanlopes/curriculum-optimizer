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

- `-r, --role <title>` - Título do currículo (ex: "Tech Lead Frontend", "Senior Frontend Developer") - **obrigatório**
  - Define o título que aparecerá no header do currículo
  - A IA usa este role junto com a análise da vaga para decidir quais skills focar
  - Veja sugestões de roles comuns no README principal

- `-o, --output-name <name>` - Nome do arquivo de saída (sem extensão) - **opcional**
  - Se não fornecido, usa padrão: "Curriculo {{role}}" (sanitizado para nome de arquivo válido)
  - Exemplo: role "Tech Lead Frontend" → "Curriculo-Tech-Lead-Frontend"

### Entrada da Vaga (escolha uma)

- `-j, --job-description <text>` - Descrição completa da vaga como texto direto ou caminho para arquivo `.txt` ou `.md`
- `-f, --job-file <path>` - Caminho para arquivo `.txt` ou `.md` com descrição da vaga

### Opcionais

- `--formats <formats>` - Formatos de saída separados por vírgula (padrão: `pdf`):
  - `html` - HTML
  - `pdf` - PDF
  - `markdown` - Markdown para Gupy
  - Exemplo: `--formats pdf,html,markdown` para gerar todos os formatos

- `-v, --verbose` - Modo verboso com logs detalhados

## Exemplos

### Usando texto direto

```bash
# Com nome customizado
npm start generate \
  --job-description "Vaga para Tech Lead Frontend..." \
  --role "Tech Lead Frontend" \
  --output-name btg-pactual-senior

# Sem nome (usa padrão "Curriculo Tech Lead Frontend")
npm start generate \
  --job-description "Vaga para Tech Lead Frontend..." \
  --role "Tech Lead Frontend"
```

### Usando arquivo

```bash
npm start generate \
  --job-file vaga.txt \
  --role "Tech Lead Frontend" \
  --output-name btg-pactual-senior
```

### Usando flags curtas

```bash
npm start generate -f vaga.md -r "Tech Lead Frontend" -o btg-senior
```

### Gerar apenas HTML

```bash
npm start generate \
  -f vaga.md \
  -r "Senior Frontend Developer" \
  -o curriculo \
  --formats html
```

### Gerar apenas PDF (padrão)

```bash
npm start generate \
  -f vaga.md \
  -r "Fullstack Developer" \
  -o curriculo
```

### Gerar múltiplos formatos

```bash
npm start generate \
  -f vaga.md \
  -r "Tech Lead Frontend" \
  -o curriculo \
  --formats pdf,html,markdown
```

### Modo verboso

```bash
npm start generate \
  -f vaga.md \
  -r "Tech Lead Frontend" \
  -o curriculo \
  --verbose
```

## Parâmetro --role

O parâmetro `--role` é obrigatório e define o título do currículo. A IA usa este role junto com a análise da vaga para decidir dinamicamente quais skills e experiências enfatizar.

**Como funciona:**
- O role fornecido aparece como título no header do currículo
- A IA analisa o role + keywords da vaga para determinar estratégia
- Skills são priorizadas automaticamente baseado no contexto
- Não há templates fixos - a estratégia é adaptativa

**Sugestões de roles comuns:**
- Tech Lead Frontend / Tech Lead
- Senior Frontend Developer
- Fullstack Developer
- Backend Developer
- Mobile Developer
- DevOps Engineer
- E muitos outros - use o título que melhor descreve o cargo

## Formatos de Saída

### HTML (`--formats html`)

- Arquivo: `output/{output-name}.html`
- Uso: Visualização no navegador, edição manual
- Formato: HTML completo com CSS embutido
- Nota: HTML é sempre gerado (necessário para os outros formatos)

### PDF (`--formats pdf` - padrão)

- Arquivo: `output/{output-name}.pdf`
- Uso: Envio para recrutadores, impressão
- Formato: PDF gerado a partir do HTML
- Validação ATS: Automática quando há análise de vaga

### Markdown (`--formats markdown`)

- Arquivo: `output/{output-name}-gupy.txt`
- Uso: Cópia para plataformas como Gupy, LinkedIn
- Formato: Texto formatado em Markdown

### Múltiplos formatos

- Use `--formats pdf,html,markdown` para gerar todos os formatos
- Formatos são separados por vírgula, sem espaços
- Exemplo: `--formats pdf,markdown` gera apenas PDF e Markdown

## Fluxo de Execução

1. **Análise da Vaga** (opcional - apenas se houver descrição de vaga) - Extrai keywords, requisitos e calcula match score
2. **Seleção de Conteúdo e Geração de Apresentação** (combinado) - Prioriza experiências, skills e certificações mais relevantes + gera texto de apresentação personalizado
3. **Montagem HTML** - Monta HTML completo do currículo garantindo 2 páginas A4 e coerência total
4. **Geração PDF** (se solicitado via `--formats`) - Converte HTML para PDF
5. **Geração Markdown** (se solicitado via `--formats`) - Cria versão texto para plataformas
6. **Validação ATS** (se PDF gerado e houver análise de vaga) - Valida compatibilidade do PDF

**Nota:** O fluxo foi simplificado de 8 para 6 etapas. A seleção de conteúdo e geração de apresentação agora são combinadas em uma única etapa, e a montagem HTML garante automaticamente que o currículo caiba em 2 páginas A4.

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
