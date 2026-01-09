# Comando: serve

Inicia um servidor de desenvolvimento com live reload usando Vite, permitindo editar o HTML do currículo e ver as mudanças em tempo real no navegador.

## Sintaxe

```bash
npm start serve [opções]
```

ou

```bash
npm run dev -- serve [opções]
```

ou usando o script npm direto:

```bash
npm run serve -- -f arquivo.html
```

## Opções Obrigatórias

- `-f, --file <path>` - Caminho para o arquivo HTML a monitorar (template base ou HTML gerado)

## Opções Opcionais

- `-p, --port <number>` - Porta do servidor (padrão: 5173)
- `--open` - Abrir navegador automaticamente (padrão: true)
- `--no-open` - Não abrir navegador automaticamente

## Exemplos

### Servir arquivo HTML gerado

```bash
npm start serve -f output/curriculo.html
```

### Servir template base

```bash
npm start serve -f src/templates/base.html
```

### Especificar porta customizada

```bash
npm start serve -f output/curriculo.html -p 3000
```

### Não abrir navegador automaticamente

```bash
npm start serve -f output/curriculo.html --no-open
```

### Usando caminho absoluto

```bash
npm start serve -f /caminho/completo/para/curriculo.html
```

### Em modo desenvolvimento

```bash
npm run dev -- serve -f output/test-tech-lead.html
```

## Como Funciona

1. **Inicia servidor Vite** na porta especificada (padrão: 5173)
2. **Monitora o arquivo HTML** para mudanças
3. **Recarrega automaticamente** o navegador quando o arquivo é salvo
4. **Abre navegador** automaticamente (se `--open` não for desabilitado)

## Quando Usar

- **Edição manual do HTML** - Para fazer ajustes finos no currículo gerado
- **Teste de formatação** - Para ver como o currículo aparece no navegador
- **Ajustes de CSS** - Para modificar estilos e ver resultado imediato
- **Desenvolvimento de templates** - Para criar ou modificar templates HTML

## Saída Esperada

### Exemplo de Saída

```
═══════════════════════════════════════════════════════
Iniciando Live Server
═══════════════════════════════════════════════════════

Arquivo: /path/to/output/curriculo.html
Porta: 5173
Abrir navegador: Sim

✓ Servidor iniciado com sucesso!

URL: http://localhost:5173/curriculo.html
Edite o arquivo HTML e veja as mudanças em tempo real no navegador
Pressione Ctrl+C para parar o servidor
```

## Live Reload

O servidor monitora o arquivo HTML e recarrega automaticamente quando detecta mudanças. Isso permite:

- Editar o HTML em qualquer editor
- Salvar o arquivo
- Ver mudanças instantaneamente no navegador
- Iterar rapidamente em ajustes visuais

## Porta

- **Padrão**: 5173 (porta padrão do Vite)
- **Customizada**: Use `-p` ou `--port` para especificar outra porta
- **Conflito**: Se a porta estiver em uso, Vite tentará a próxima disponível

## Parar o Servidor

Pressione `Ctrl+C` no terminal para encerrar o servidor.

## Dicas

- Use este comando após gerar um currículo para fazer ajustes manuais
- Edite o HTML diretamente e veja o resultado em tempo real
- Útil para ajustar formatação, adicionar conteúdo ou modificar estilos
- O arquivo HTML gerado já contém todo o CSS necessário

## Limitações

- Requer que o arquivo HTML exista e seja válido
- Apenas o arquivo especificado é servido (não serve diretório completo)
- Mudanças em arquivos externos (CSS separado, imagens) podem não ser detectadas

## Ver Também

- [README-GENERATE.md](README-GENERATE.md) - Para gerar o HTML inicial
- [README-DEVELOPMENT.md](README-DEVELOPMENT.md) - Para outros comandos de desenvolvimento
