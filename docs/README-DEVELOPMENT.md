# Comandos de Desenvolvimento

Comandos npm disponíveis para desenvolvimento, build e manutenção do projeto.

## Comandos Disponíveis

### build

Compila o projeto TypeScript para JavaScript.

```bash
npm run build
```

**Quando usar:**
- Antes de usar `npm start` (comando compilado)
- Antes de fazer deploy
- Após modificar código TypeScript

**Saída:**
- Arquivos JavaScript compilados em `dist/`

---

### dev

Executa o CLI em modo desenvolvimento com hot reload usando `tsx`.

```bash
npm run dev -- [comando] [opções]
```

**Quando usar:**
- Durante desenvolvimento
- Para testar comandos sem compilar
- Para ver mudanças imediatamente após editar código

**Exemplos:**

```bash
# Executar comando generate
npm run dev -- generate -f vaga.md -t tech-lead -o teste

# Executar comando analyze
npm run dev -- analyze -f vaga.md

# Executar comando validate
npm run dev -- validate output/curriculo.pdf
```

**Vantagens:**
- Não precisa compilar antes de testar
- Mudanças no código são refletidas imediatamente
- Mais rápido para desenvolvimento iterativo

---

### start

Executa o CLI compilado (requer `npm run build` antes).

```bash
npm start [comando] [opções]
```

**Quando usar:**
- Após compilar o projeto
- Em produção
- Para testar versão compilada

**Exemplos:**

```bash
npm start generate -f vaga.md -t tech-lead -o curriculo
npm start analyze -f vaga.md
npm start validate output/curriculo.pdf
```

**Nota:** Se o projeto não foi compilado, este comando falhará. Use `npm run build` primeiro.

---

### clean

Remove a pasta `dist/` com os arquivos compilados.

```bash
npm run clean
```

**Quando usar:**
- Para limpar build anterior
- Antes de fazer rebuild completo
- Para liberar espaço

**Cuidado:** Remove todos os arquivos compilados. Execute `npm run build` novamente após limpar.

---

### rebuild

Limpa e recompila o projeto em uma única operação.

```bash
npm run rebuild
```

**Equivale a:**
```bash
npm run clean && npm run build
```

**Quando usar:**
- Para garantir build limpo
- Após mudanças significativas no código
- Quando há problemas com build anterior

---

### test:template

Testa os templates HTML do sistema.

```bash
npm run test:template
```

**Quando usar:**
- Para validar templates
- Para verificar estrutura HTML
- Durante desenvolvimento de novos templates

**Nota:** Este comando pode variar conforme implementação. Consulte o código em `src/templates/template-tester.ts` para detalhes.

---

### serve

Inicia servidor de desenvolvimento para editar HTML (alias para `npm start serve`).

```bash
npm run serve -- -f arquivo.html
```

**Quando usar:**
- Para editar HTML do currículo com live reload
- Para visualizar templates no navegador

**Ver:** [README-SERVE.md](README-SERVE.md) para documentação completa.

---

## Fluxo de Desenvolvimento Recomendado

### 1. Desenvolvimento Ativo

```bash
# Editar código
# Testar com dev (não precisa compilar)
npm run dev -- generate -f vaga.md -t tech-lead -o teste

# Ver mudanças imediatamente
```

### 2. Antes de Commitar

```bash
# Compilar para verificar erros
npm run build

# Testar versão compilada
npm start generate -f vaga.md -t tech-lead -o teste-final
```

### 3. Build Limpo

```bash
# Limpar e recompilar tudo
npm run rebuild
```

## Estrutura de Build

```
curriculum-optimizer/
├── src/           # Código fonte TypeScript
├── dist/          # Código compilado JavaScript (gerado)
└── output/        # Currículos gerados
```

## Dependências de Desenvolvimento

- **TypeScript** - Compilador
- **tsx** - Executor TypeScript para desenvolvimento
- **Vite** - Servidor de desenvolvimento (para comando serve)

## Troubleshooting

### Erro: "Cannot find module"

**Problema:** Módulos não encontrados após compilar.

**Solução:**
```bash
npm run rebuild
```

### Erro: "Command not found" com npm start

**Problema:** Projeto não foi compilado.

**Solução:**
```bash
npm run build
```

### Mudanças não aparecem com npm start

**Problema:** Código foi editado mas não recompilado.

**Solução:**
```bash
npm run build
# ou use npm run dev durante desenvolvimento
```

## Ver Também

- [README-GENERATE.md](README-GENERATE.md) - Comando principal
- [README-SERVE.md](README-SERVE.md) - Servidor de desenvolvimento
- [../README.md](../README.md) - Visão geral do projeto
