# Comando: salary-compare

Compara a compensação total entre uma proposta CLT e uma proposta PJ, considerando impostos, benefícios e custos adicionais.

## Sintaxe

```bash
npm start salary-compare [opções]
```

ou

```bash
npm run dev -- salary-compare [opções]
```

## Opções Obrigatórias

- `--clt <value>` - Salário bruto CLT (ex: 16000)
- `--pj <value>` - Valor mensal PJ (ex: 19500)

## Opções Opcionais

- `--benefits <list>` - Benefícios CLT no formato `"VR:800,VT:200,Saude:600,PLR:25%"`
- `-v, --verbose` - Modo verboso com logs detalhados

## Formato de Benefícios

Os benefícios devem ser fornecidos como uma string separada por vírgulas, no formato:

```
"Benefício1:Valor1,Benefício2:Valor2,Benefício3:Percentual%"
```

### Benefícios Suportados

- **VR/VA** - Vale Refeição/Alimentação (valor fixo)
- **VT** - Vale Transporte (valor fixo)
- **Saude** - Plano de saúde (valor fixo)
- **PLR** - Participação nos Lucros e Resultados (percentual do salário anual)
- **Outros** - Qualquer outro benefício pode ser adicionado como valor fixo

### Exemplos de Formato

```bash
# Apenas VR e VT
--benefits "VR:800,VT:200"

# VR, VT, Saúde e PLR
--benefits "VR:1000,VT:0,Saude:600,PLR:25%"

# Múltiplos benefícios
--benefits "VR:800,VT:200,Saude:600,PLR:30%,Bonus:500"
```

## Exemplos

### Comparação básica

```bash
npm start salary-compare \
  --clt 16000 \
  --pj 19500
```

### Com benefícios CLT

```bash
npm start salary-compare \
  --clt 16000 \
  --pj 19500 \
  --benefits "VR:1000,VT:0,Saude:600,PLR:25%"
```

### Modo verboso

```bash
npm start salary-compare \
  --clt 16000 \
  --pj 19500 \
  --benefits "VR:800,VT:200,Saude:600,PLR:30%" \
  --verbose
```

## O Que É Calculado

### CLT (Consolidação das Leis do Trabalho)

**Descontos:**
- **INSS**: Calculado conforme tabela vigente
- **IRRF**: Imposto de Renda Retido na Fonte, calculado progressivamente

**Benefícios:**
- Todos os benefícios fornecidos via `--benefits`
- PLR calculada como percentual do salário anual dividido por 12 meses

**Total Mensal CLT:**
```
Salário Líquido + Benefícios = Total Mensal
```

### PJ (Pessoa Jurídica)

**Descontos:**
- **Impostos**: 6% (Simples Nacional - MEI ou ME)
- **Custos Fixos**: Estimativa de 33% para reservas (férias, 13º) e custos operacionais

**Líquido Disponível PJ:**
```
Faturamento - Impostos - Custos Fixos = Líquido Disponível
```

### Comparação

- **Diferença Absoluta**: Valor em reais da diferença mensal
- **Diferença Percentual**: Percentual de diferença
- **Vencedor**: CLT ou PJ baseado no total mensal

## Saída Esperada

### Exemplo de Saída

```
═══════════════════════════════════════════════════════
Comparação Salarial CLT vs PJ
═══════════════════════════════════════════════════════

✓ Cálculo concluído

CLT - Salário Bruto: R$ 16.000,00

┌──────────────┬──────────────────┐
│ INSS         │ R$ 1.181,60      │
│ IRRF         │ R$ 2.227,20      │
│ Líquido      │ R$ 12.591,20     │
│ Benefícios   │ R$ 1.933,33      │
│ Total Mensal │ R$ 14.524,53     │
└──────────────┴──────────────────┘

PJ - Faturamento: R$ 19.500,00

┌──────────────────────┬──────────────────┐
│ Impostos (6%)        │ R$ 1.170,00      │
│ Custos Fixos         │ R$ 5.445,00      │
│ Reservas (Férias/13º)│ R$ 2.722,50      │
│ Líquido Disponível   │ R$ 12.885,00     │
└──────────────────────┴──────────────────┘

✓ RESULTADO: PJ oferece R$ 1.639,53/mês a mais (11.29%)

PJ oferece maior valor líquido, mas considere estabilidade e benefícios
```

## Interpretação dos Resultados

### Quando CLT é Melhor

- Estabilidade e segurança jurídica
- Benefícios como plano de saúde, VR/VA
- Direitos trabalhistas (férias, 13º, FGTS)
- Menor responsabilidade fiscal
- Ideal para quem valoriza segurança

### Quando PJ é Melhor

- Maior valor líquido disponível
- Flexibilidade fiscal (com planejamento)
- Potencial de crescimento de faturamento
- Ideal para quem tem disciplina financeira

### Considerações Importantes

- **Estabilidade**: CLT oferece mais segurança
- **Responsabilidade**: PJ exige mais organização e planejamento
- **Crescimento**: PJ pode ter mais potencial de aumento
- **Benefícios**: CLT geralmente oferece mais benefícios
- **Impostos**: PJ pode ter vantagem fiscal com planejamento adequado

## Dicas

- Use valores brutos reais das propostas
- Inclua todos os benefícios CLT para comparação justa
- Considere o contexto pessoal (necessidade de estabilidade, etc.)
- Use `--verbose` para ver detalhes dos cálculos
- Compare múltiplas propostas antes de decidir

## Limitações

- Cálculos são estimativas baseadas em regras gerais
- Impostos podem variar conforme situação fiscal específica
- Custos PJ podem variar (contador, software, etc.)
- Não considera outros fatores como cultura, crescimento, etc.

## Ver Também

- [README-ANALYZE.md](README-ANALYZE.md) - Para analisar propostas salariais via IA
