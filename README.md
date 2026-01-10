# CV Optimizer

Sistema automatizado de otimização de currículos para vagas específicas, com análise semântica, múltiplos formatos de saída e validação ATS.

## 🚀 Instalação

```bash
# Clone o repositório
git clone 
cd cv-optimizer

# Instale as dependências
npm install

# Build do projeto
npm run build
```

## ⚙️ Configuração

Antes de usar, configure o provider de IA e sua chave de API:

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env e configure:
```

### Escolha do Provider de IA

O sistema suporta três providers de IA. Escolha um e configure a chave correspondente:

**1. Claude (Anthropic) - Padrão**
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
```
Obtenha sua chave em: https://console.anthropic.com/

**2. ChatGPT (OpenAI)**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-sua-chave-aqui
```
Obtenha sua chave em: https://platform.openai.com/api-keys

**3. Gemini (Google)**
```bash
AI_PROVIDER=gemini
GOOGLE_API_KEY=sua-chave-aqui
```
Obtenha sua chave em: https://makersuite.google.com/app/apikey

**Nota:** Você só precisa configurar a chave do provider escolhido. As outras podem ser deixadas em branco.

## 🎬 Como Começar

### 1. Prepare seu currículo base

Antes de gerar currículos otimizados, você precisa ter um arquivo `base-curriculum.html` preenchido com suas informações. Este arquivo deve estar em `src/templates/base-curriculum.html`.

**Opções para criar o currículo base:**

- **Editar manualmente**: Use `src/templates/base-curriculum-example.html` como referência e preencha com suas informações
- **Importar de PDF/HTML**: Use o prompt `06-import-curriculum.md` para converter um currículo existente (funcionalidade futura)

O currículo base deve conter:
- Todas as suas experiências profissionais
- Todas as conquistas e realizações
- Todas as tecnologias e skills
- Metadados estruturados (atributos `data-*`) para seleção inteligente

### 2. Analise uma vaga (opcional, mas recomendado)

Primeiro, analise a descrição da vaga para entender keywords e requisitos:

```bash
# Salve a descrição da vaga em um arquivo (ex: vaga.md)
npm run dev -- analyze -f vaga.md
```

Isso mostrará:
- Keywords críticas identificadas
- Match score do seu perfil
- Requisitos obrigatórios vs desejáveis
- Gaps identificados

**Prompts usados:** `01-analise-vaga.md` - Extrai informações críticas da vaga usando IA

### 3. Gere seu currículo otimizado

Você pode gerar um currículo de duas formas:

**Opção A: Com descrição de vaga (otimizado para vaga específica)**

```bash
npm run dev -- generate \
  -f vaga.md \
  -r "Tech Lead Frontend"
```

**Opção B: Sem descrição de vaga (currículo genérico baseado no role)**

```bash
npm run dev -- generate \
  -r "Tech Lead Frontend"
```

**Parâmetros:**
- `-f vaga.md` - Arquivo com descrição da vaga (opcional)
- `-j, --job-description <text>` - Descrição da vaga como texto (opcional)
- `-r "Tech Lead Frontend"` - Role (título do currículo) - **obrigatório**
- `-o meu-curriculo` - Nome do arquivo de saída (opcional, padrão: "Curriculo {{role}}")

**Nota:** Se você não fornecer descrição da vaga, o sistema gerará um currículo genérico baseado apenas no role fornecido, sem otimização para uma vaga específica.

**Prompts usados no processo:**
1. `01-analise-vaga.md` - Analisa a vaga e extrai keywords (opcional - apenas se houver descrição de vaga)
2. `02-selecao-conteudo-e-apresentacao.md` - Seleciona experiências, skills e certificações mais relevantes + gera texto de apresentação personalizado
3. `03-montagem-html.md` - Monta HTML completo do currículo garantindo 2 páginas e coerência total

### 4. Verifique os resultados

Os arquivos serão gerados em `output/`:
- `meu-curriculo.html` - Versão HTML para visualização
- `meu-curriculo.pdf` - Versão PDF para envio
- `meu-curriculo-gupy.txt` - Versão Markdown para plataformas

### 5. Valide o PDF (opcional)

Verifique a compatibilidade ATS do PDF gerado:

```bash
npm run dev -- validate output/meu-curriculo.pdf
```

### 6. Edite e ajuste (opcional)

Use o servidor de desenvolvimento para fazer ajustes manuais:

```bash
npm run dev -- serve -f output/meu-curriculo.html
```

Isso abrirá o navegador com live reload - edite o HTML e veja as mudanças em tempo real.

### Parâmetro --role

O parâmetro `--role` é obrigatório e define o título do currículo. A IA usa este role junto com a análise da vaga para decidir quais skills e experiências enfatizar.

**Sugestões de roles comuns:**

**Frontend:**
- Senior Frontend Developer
- Frontend Engineer
- React Developer
- Frontend Tech Lead

**Backend:**
- Backend Developer
- Backend Engineer
- Senior Backend Developer
- API Developer

**Fullstack:**
- Fullstack Developer
- Full Stack Engineer
- Fullstack Tech Lead

**Mobile:**
- Mobile Developer
- React Native Developer
- Flutter Developer
- iOS/Android Developer

**Liderança:**
- Tech Lead
- Engineering Manager
- Technical Lead
- Senior Tech Lead

**DevOps/Infra:**
- DevOps Engineer
- SRE (Site Reliability Engineer)
- Cloud Engineer
- Infrastructure Engineer

**Outros:**
- QA Engineer
- Test Engineer
- Product Engineer
- Solutions Architect
- Software Architect

### Sobre os Prompts

O sistema usa prompts de IA para processar e otimizar currículos. Cada prompt tem uma função específica:

- **Análise de vaga** - Entende o que a vaga busca
- **Seleção de conteúdo** - Escolhe o que destacar do seu currículo
- **Geração de texto** - Cria apresentações personalizadas
- **Otimização estratégica** - Adapta conteúdo baseado no role + análise da vaga (IA decide dinamicamente quais skills focar)

Para mais detalhes, consulte [docs/README-PROMPTS.md](docs/README-PROMPTS.md).

## 📖 Comandos Disponíveis

### Resumo Rápido

- **`generate`** - Gera currículo otimizado para uma vaga específica usando IA, priorizando experiências e skills mais relevantes
- **`analyze`** - Analisa descrição de vaga e extrai keywords, requisitos e match score sem gerar currículo
- **`validate`** - Valida compatibilidade ATS de um PDF, verificando se pode ser lido por sistemas automatizados
- **`salary-compare`** - Compara compensação total entre propostas CLT e PJ, considerando impostos e benefícios
- **`serve`** - Inicia servidor de desenvolvimento com live reload para editar HTML do currículo em tempo real
- **`dev` / `build` / `start`** - Comandos npm para desenvolvimento, compilação e execução do projeto

Para documentação detalhada de cada comando, consulte os READMEs específicos:

- **[docs/README-GENERATE.md](docs/README-GENERATE.md)** - Gerar currículo otimizado
- **[docs/README-VALIDATE.md](docs/README-VALIDATE.md)** - Validar compatibilidade ATS de PDF
- **[docs/README-ANALYZE.md](docs/README-ANALYZE.md)** - Analisar descrição de vaga
- **[docs/README-SALARY-COMPARE.md](docs/README-SALARY-COMPARE.md)** - Comparar propostas CLT vs PJ
- **[docs/README-SERVE.md](docs/README-SERVE.md)** - Servidor de desenvolvimento com live reload
- **[docs/README-DEVELOPMENT.md](docs/README-DEVELOPMENT.md)** - Comandos npm de desenvolvimento
- **[docs/README-PROMPTS.md](docs/README-PROMPTS.md)** - Sistema de prompts de IA

## 📁 Estrutura do Projeto

```
cv-optimizer/
├── src/
│   ├── templates/        # Template HTML base
│   ├── generators/       # Geradores HTML/PDF/Markdown
│   ├── validators/       # Validadores ATS
│   ├── calculators/      # Calculadora salarial
│   ├── prompts/          # Classes que usam prompts de IA
│   ├── utils/           # Utilitários (logger, storage, etc)
│   ├── types.ts         # Tipos TypeScript
│   └── cli.ts           # CLI principal
├── prompts/             # Prompts para APIs de IA
├── output/              # Currículos gerados
├── docs/                # Documentação dos comandos
└── README.md
```

## 🎯 Status do Projeto

- [x] ETAPA 1: Setup Base ✓
- [x] ETAPA 2: Template HTML ✓
- [x] ETAPA 3: Sistema de Análise de Vagas via IA ✓
- [x] ETAPA 4a: Sistema de Seleção de Conteúdo ✓
- [x] ETAPA 4b: Gerador de Texto "Apresente-se" ✓
- [x] ETAPA 4c: Geradores Multi-formato (HTML/PDF/Markdown) ✓
- [x] ETAPA 5: Sistema de Storage (SQLite + JSON) ✓
- [x] ETAPA 6: Validadores Automáticos (ATS, Keyword Density, Length) ✓
- [x] ETAPA 7d: Calculadora Salarial CLT vs PJ ✓
- [x] ETAPA 8: Prompt de Variações Estratégicas ✓
- [x] ETAPA 9: Prompt de Análise Salarial via IA ✓
- [x] ETAPA 10: Integração Completa ✓

## 📝 Licença

MIT - Douglas Fantoni
