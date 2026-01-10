# Testes

Esta pasta contém todos os testes da aplicação CV Optimizer.

## Estrutura

```
test/
├── cli/                    # Testes de integração dos comandos CLI
│   ├── generate.test.ts
│   ├── validate.test.ts
│   ├── analyze.test.ts
│   ├── salary-compare.test.ts
│   └── serve.test.ts
├── unit/                   # Testes unitários
│   ├── calculators/
│   │   └── salary.test.ts
│   └── ...
├── fixtures/                # Arquivos de teste (fixtures)
│   └── test-vaga.md
└── helpers/                 # Funções auxiliares para testes
    └── cli-runner.ts
```

## Executando os Testes

### Todos os testes
```bash
npm test
```

### Modo watch (desenvolvimento)
```bash
npm run test:watch
```

### Interface visual
```bash
npm run test:ui
```

### Apenas testes rápidos (sem testes CLI que fazem chamadas de API)
```bash
npm test -- test/unit
```

### Pular testes lentos
Alguns testes CLI podem ser lentos se fizerem chamadas de API. Para pular testes marcados como lentos:
```bash
SKIP_SLOW_TESTS=1 npm test
```

## Tipos de Testes

### Testes CLI
Testam os comandos da linha de comando com diferentes combinações de argumentos:
- Argumentos obrigatórios
- Argumentos opcionais
- Validações de entrada
- Tratamento de erros

### Testes Unitários
Testam funções e classes isoladamente:
- Cálculos matemáticos
- Transformações de dados
- Validações

## Notas

- Os testes CLI podem falhar se as APIs de IA não estiverem configuradas (chaves de API)
- Testes que dependem de arquivos externos usam fixtures da pasta `fixtures/`
- Timeouts são configurados para evitar testes que travam indefinidamente
