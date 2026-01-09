# Comando: validate

Valida a compatibilidade ATS (Applicant Tracking System) de um currículo em formato PDF, verificando aspectos técnicos que podem afetar a leitura por sistemas automatizados.

## Sintaxe

```bash
npm start validate <pdf-path> [opções]
```

ou

```bash
npm run dev -- validate <pdf-path> [opções]
```

## Argumentos

- `<pdf-path>` - Caminho para o arquivo PDF a ser validado (obrigatório)

## Opções

- `-v, --verbose` - Modo verboso com logs detalhados

## Exemplos

### Validação básica

```bash
npm start validate output/curriculo.pdf
```

### Validação com modo verboso

```bash
npm start validate output/curriculo.pdf --verbose
```

### Usando caminho absoluto

```bash
npm start validate /caminho/completo/para/curriculo.pdf
```

### Em modo desenvolvimento

```bash
npm run dev -- validate output/test-tech-lead.pdf
```

## O Que É Validado

### 1. Texto Extraível

Verifica se o PDF contém texto que pode ser extraído por sistemas ATS, ao invés de apenas imagens escaneadas.

- ✓ **Aprovado**: PDF contém texto selecionável
- ✗ **Reprovado**: PDF é apenas imagem (escaneado)

### 2. Compatibilidade ATS

Verifica se o PDF é compatível com sistemas de rastreamento de candidatos.

- ✓ **Aprovado**: Formato compatível
- ✗ **Reprovado**: Formato pode causar problemas

### 3. Número de Páginas

Valida se o currículo está dentro do tamanho recomendado.

- ✓ **Ideal**: 1-2 páginas
- ⚠ **Atenção**: Mais de 2 páginas pode ser excessivo

### 4. Contagem de Palavras

Verifica se o conteúdo tem densidade adequada de texto.

- ✓ **Ideal**: 300-1000 palavras
- ⚠ **Atenção**: Menos de 300 ou mais de 1000 palavras

### 5. Densidade de Keywords

Calcula a porcentagem de keywords relevantes no texto (quando keywords são fornecidas).

- ✓ **Ideal**: 5-10% de densidade
- ⚠ **Atenção**: Muito baixa (<5%) ou muito alta (>10%)

## Score ATS

O comando retorna um score de 0-100 baseado em todos os critérios acima:

- **90-100**: Excelente compatibilidade ATS
- **70-89**: Boa compatibilidade, pequenos ajustes podem melhorar
- **50-69**: Compatibilidade média, revisão recomendada
- **0-49**: Problemas significativos de compatibilidade

## Saída Esperada

### Exemplo de Saída

```
═══════════════════════════════════════════════════════
Validando Compatibilidade ATS
═══════════════════════════════════════════════════════

Arquivo: output/curriculo.pdf

✓ Validação concluída

Score ATS: 87/100

┌─────────────────────┬──────────────┐
│ Texto Extraível     │ ✓ Sim        │
│ Compatível ATS       │ ✓ Sim        │
│ Páginas              │ 2 ✓          │
│ Palavras             │ 650 ✓        │
│ Densidade Keywords   │ 7.2% ✓      │
└─────────────────────┴──────────────┘

✓ Currículo aprovado para ATS!
```

### Com Avisos

```
⚠ Avisos (2):
  • PDF tem 3 páginas, considere reduzir para 1-2 páginas
  • Densidade de keywords (3.2%) está abaixo do ideal (5-10%)
```

### Com Erros

```
✗ Erros (1):
  • PDF não contém texto extraível - pode ser uma imagem escaneada
```

## Quando Usar

- **Após gerar um currículo** com `generate --format all` (validação automática)
- **Antes de enviar** para uma vaga importante
- **Para comparar versões** diferentes do mesmo currículo
- **Para diagnosticar problemas** quando não recebe retorno de recrutadores

## Dicas

- Use `--verbose` para ver detalhes técnicos da validação
- PDFs gerados pelo comando `generate` são automaticamente compatíveis
- Se o score estiver baixo, revise o template HTML antes de gerar o PDF
- Evite usar PDFs escaneados ou convertidos de imagens

## Limitações

- A validação de keywords requer que elas sejam fornecidas durante a geração
- O score é uma estimativa baseada em heurísticas comuns de ATS
- Diferentes sistemas ATS podem ter requisitos específicos adicionais

## Ver Também

- [README-GENERATE.md](README-GENERATE.md) - Para gerar currículos validados
- [README-ANALYZE.md](README-ANALYZE.md) - Para entender keywords da vaga
