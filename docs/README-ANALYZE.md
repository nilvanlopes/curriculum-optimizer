# Comando: analyze

Analisa uma descrição de vaga e extrai informações críticas como keywords, requisitos, match score e gaps, sem gerar um currículo.

## Sintaxe

```bash
npm start analyze [opções]
```

ou

```bash
npm run dev -- analyze [opções]
```

## Opções

### Entrada da Vaga (escolha uma)

- `-j, --job-description <text>` - Descrição completa da vaga como texto direto ou caminho para arquivo `.txt` ou `.md`
- `-f, --job-file <path>` - Caminho para arquivo `.txt` ou `.md` com descrição da vaga

### Opcionais

- `-v, --verbose` - Modo verboso com logs detalhados

## Exemplos

### Usando texto direto

```bash
npm start analyze \
  --job-description "Vaga para Tech Lead Frontend..."
```

### Usando arquivo

```bash
npm start analyze --job-file vaga.txt
```

### Usando flag curta

```bash
npm start analyze -f vaga.md
```

### Modo verboso

```bash
npm start analyze -f vaga.md --verbose
```

## O Que É Analisado

### 1. Keywords Críticas

Lista de 10-15 palavras-chave mais importantes extraídas da vaga:
- Tecnologias mencionadas (React, TypeScript, etc.)
- Frameworks e ferramentas (Next.js, AWS, etc.)
- Metodologias (Scrum, Agile, etc.)
- Soft skills relevantes (Liderança, etc.)

### 2. Match Score

Score de 0-100% indicando o quão bem o perfil do candidato se alinha com a vaga:
- **90-100%**: Excelente match, candidato atende 95%+ dos requisitos
- **70-89%**: Bom match, candidato atende 70-94% dos requisitos
- **50-69%**: Match médio, candidato atende 50-69% dos requisitos
- **<50%**: Match baixo, candidato atende menos de 50% dos requisitos

### 3. Requisitos

Separados em:
- **Obrigatórios**: Requisitos essenciais para a vaga
- **Desejáveis**: Requisitos que são um diferencial

### 4. Gaps Identificados

Keywords ou competências que o candidato não possui ou não mencionou:
- Classificação de importância: `high`, `medium`, `low`
- Sugestões de como endereçar cada gap

### 5. Destaques da Vaga

- Responsabilidades principais
- Diferenciais da empresa/posição
- Oportunidades de crescimento

### 6. Sugestões de Melhoria

Recomendações específicas para melhorar o match com a vaga.

## Saída Esperada

### Exemplo de Saída

```
═══════════════════════════════════════════════════════
Análise de Vaga
═══════════════════════════════════════════════════════

Arquivo: /path/to/vaga.md

✓ Análise concluída

Keywords Críticas Identificadas (12):
  1. React
  2. TypeScript
  3. Next.js
  4. Microfrontends
  5. AWS
  6. CI/CD
  7. Git
  8. Liderança Técnica
  9. Scrum
  10. Performance
  11. Module Federation
  12. Arquitetura

✓ Match Score: 87%
Candidato possui 90% das tecnologias obrigatórias e experiência relevante. 
Faltam conhecimentos específicos em microfrontends mencionados como desejável.

Requisitos Obrigatórios:
  1. React e TypeScript (5+ anos)
  2. Experiência com Next.js
  3. Liderança de equipe técnica

Requisitos Desejáveis:
  1. Microfrontends e Module Federation
  2. AWS e cloud computing
  3. Experiência com arquitetura escalável

⚠ Gaps identificados (2):
  • Microfrontends (high): Adicionar experiência com Module Federation ou menção a arquitetura modular
  • AWS (medium): Destacar projetos que usam serviços AWS

Sugestões de Melhoria:
  1. Destacar mais experiências de liderança técnica
  2. Mencionar projetos com arquitetura escalável
  3. Enfatizar conquistas com métricas quantificáveis
```

## Quando Usar

- **Antes de gerar currículo** - Para entender a vaga e planejar a otimização
- **Para comparar vagas** - Analisar múltiplas vagas e escolher a melhor match
- **Para identificar gaps** - Descobrir o que está faltando no seu perfil
- **Para ajustar estratégia** - Decidir qual template usar no `generate`

## Interpretação dos Resultados

### Match Score Alto (80%+)

- Você tem um perfil muito alinhado com a vaga
- Foque em destacar as keywords identificadas no currículo
- Use o template mais adequado ao perfil da vaga

### Match Score Médio (50-79%)

- Há espaço para melhoria, mas você tem base sólida
- Trabalhe nos gaps de importância `high` primeiro
- Considere adquirir conhecimentos nos gaps antes de aplicar

### Match Score Baixo (<50%)

- O perfil não está muito alinhado com a vaga
- Avalie se vale a pena aplicar ou se precisa desenvolver mais competências
- Considere outras vagas mais alinhadas ao seu perfil atual

### Gaps de Alta Importância

- Devem ser endereçados prioritariamente
- Se não puder adquirir a competência, tente encontrar experiências similares no seu histórico
- Considere mencionar interesse em aprender ou projetos pessoais relacionados

## Histórico

A análise é automaticamente salva no banco de dados SQLite, permitindo:
- Consultar análises anteriores
- Comparar diferentes vagas
- Acompanhar evolução do match score ao longo do tempo

## Dicas

- Use `--verbose` para ver detalhes completos salvos no histórico
- Execute `analyze` antes de `generate` para entender melhor a vaga
- Compare múltiplas vagas para escolher as melhores oportunidades
- Use os gaps identificados para planejar desenvolvimento profissional

## Ver Também

- [README-GENERATE.md](README-GENERATE.md) - Para gerar currículo baseado na análise
- [README-PROMPTS.md](README-PROMPTS.md) - Para entender como a análise é feita
