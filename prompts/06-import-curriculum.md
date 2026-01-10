# Prompt: Importação e Estruturação de Currículo

## Contexto
Você é um especialista em estruturação de currículos profissionais. Sua tarefa é extrair informações de currículos existentes (PDF, HTML, texto, etc.) e convertê-las para o formato HTML estruturado do template base, incluindo TODAS as informações disponíveis e metadados necessários para otimização futura.

## Objetivo
Criar um arquivo `base-curriculum.html` completo que contenha:
- **TODAS** as experiências profissionais do candidato
- **TODAS** as conquistas/realizações de cada experiência
- **TODAS** as tecnologias utilizadas
- **TODAS** as competências técnicas
- Metadados estruturados para seleção inteligente posterior

Este arquivo será usado como base para gerar currículos otimizados para vagas específicas, onde o sistema selecionará automaticamente as informações mais relevantes.

## Instruções de Extração

### 1. Processamento de Diferentes Formatos

**PDF:**
- Extraia texto completo preservando estrutura
- Identifique seções (Experiência, Educação, Skills, etc.)
- Mantenha ordem cronológica quando possível

**HTML:**
- Parse do HTML preservando conteúdo
- Extraia texto de elementos relevantes
- Ignore formatação visual, foque no conteúdo

**Texto/Markdown:**
- Identifique seções por títulos/headers
- Preserve listas e estrutura hierárquica
- Extraia informações estruturadas

**Múltiplos Arquivos:**
- Se múltiplos currículos forem fornecidos, combine todas as informações
- Identifique experiências duplicadas e consolide
- Mantenha a informação mais completa de cada experiência

### 2. Informações a Extrair

**Dados Pessoais:**
- Nome completo
- Título/Cargo atual
- Localização (cidade - estado)
- Telefone
- Email
- LinkedIn
- Portfolio/Site (se houver)

**Experiências Profissionais:**
- Nome da empresa
- Cargo/Título
- Período (data início - data fim)
- TODAS as responsabilidades e conquistas
- TODAS as tecnologias utilizadas
- Métricas e resultados quantificáveis (quando disponíveis)

**Educação:**
- Grau/Curso
- Instituição
- Período (se disponível)

**Competências Técnicas:**
- Categorias de skills
- Tecnologias específicas dentro de cada categoria
- Níveis de proficiência (se mencionados)

**Idiomas:**
- Lista de idiomas e níveis

**Certificações/Cursos:**
- Nome da certificação/curso
- Instituição/Organização
- Data (se disponível)

## Instruções de Estruturação HTML

### 1. Estrutura Base do Template

Use exatamente esta estrutura HTML, preenchendo com as informações extraídas:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{Nome} - {Título}</title>
    <style>
        /* Incluir todo o CSS do template base */
    </style>
</head>
<body class="template-tech-lead" data-template="tech-lead">
    <!-- HEADER -->
    <header class="header">
        <h1>{Nome Completo}</h1>
        <div class="title">{Título Principal}</div>
        <div class="contact-info">
            <!-- Itens de contato -->
        </div>
    </header>

    <!-- SUMMARY -->
    <section class="summary" data-customizable="summary">
        {Texto de resumo profissional}
    </section>

    <!-- EXPERIENCE -->
    <section class="section">
        <h2 class="section-title">Experiência Profissional</h2>
        <!-- Experiências aqui -->
    </section>

    <!-- SKILLS -->
    <section class="section">
        <h2 class="section-title">Competências Técnicas</h2>
        <!-- Skills aqui -->
    </section>

    <!-- EDUCATION -->
    <section class="section">
        <h2 class="section-title">Formação Acadêmica</h2>
        <!-- Educação aqui -->
    </section>

    <!-- LANGUAGES -->
    <section class="section">
        <h2 class="section-title">Idiomas</h2>
        <!-- Idiomas aqui -->
    </section>
</body>
</html>
```

### 2. Estrutura de Experiência Profissional

Cada experiência deve seguir este formato exato:

```html
<article class="experience-item" 
         data-company="{id-empresa}"
         data-keywords="{keywords-separadas-por-virgula}"
         data-relevance="{high|medium|low}">
    <div class="experience-header">
        <h3 class="job-title">{Cargo/Título}</h3>
        <span class="period">{Mês Ano} - {Mês Ano ou Presente}</span>
    </div>
    <div class="company-name">{Nome da Empresa}</div>
    
    <ul class="achievements">
        <li class="achievement" 
            data-category="{category}"
            data-impact="{high|medium|low}"
            data-keywords="{keywords}"
            data-metrics="{true|false}">
            {Texto da conquista}
        </li>
        <!-- Mais conquistas -->
    </ul>
    
    <div class="tech-stack">
        <span class="tech-tag">{Tecnologia 1}</span>
        <span class="tech-tag">{Tecnologia 2}</span>
        <!-- Mais tecnologias -->
    </div>
</article>
```

**Importante:**
- Cada empresa deve ter um `data-company` único (use slug: lowercase, hífens)
- Se a mesma empresa aparecer em múltiplos períodos/cargos, crie múltiplos `<article>` com o mesmo `data-company`
- Inclua TODAS as conquistas, não apenas as principais
- Inclua TODAS as tecnologias utilizadas

### 3. Estrutura de Skills

```html
<div class="skills-grid">
    <div class="skill-category" data-category="{categoria}">
        <div class="skill-category-title">{Nome da Categoria}</div>
        <div class="skill-list">
            {Lista de tecnologias separadas por vírgula}
        </div>
    </div>
    <!-- Mais categorias -->
</div>
```

**Categorias padrão sugeridas:**
- frontend
- architecture
- mobile
- backend
- database
- cloud
- tools
- testing
- state
- design
- agile
- leadership
- performance

### 4. Formato de Períodos

**CORRETO:**
- "Janeiro 2023 - Presente"
- "Outubro 2022 - Agosto 2023"
- "Março 2019 - Janeiro 2021"

**ERRADO (NÃO FAZER):**
- "1 ano e 3 meses" ❌
- "3 anos de experiência" ❌
- "2019-2021 (2 anos)" ❌
- "Out/2022 - Ago/2023" ❌

Sempre use formato completo: "Mês Ano - Mês Ano" ou "Mês Ano - Presente"

## Instruções de Metadados

### 1. data-company
- Use slug único para cada empresa (lowercase, hífens)
- Exemplos: "empresa-a", "empresa-b", "sistema-gerencial-xyz", "projeto-abc"
- Se mesma empresa, use mesmo ID em múltiplos `<article>`

### 2. data-keywords (no experience-item)
- Liste TODAS as tecnologias, frameworks, metodologias relevantes
- Separe por vírgula, sem espaços extras
- Exemplo: "react,typescript,microfrontend,module-federation,performance,react-native,aws"

### 3. data-relevance
- "high": Experiência principal, mais relevante
- "medium": Experiência importante mas secundária
- "low": Experiência menos relevante ou antiga
- Use seu julgamento baseado em recência e importância

### 4. data-category (nos achievements)
Categorias possíveis:
- "architecture": Arquitetura, design de sistemas
- "performance": Otimização, performance
- "quality": Qualidade, bugs, estabilidade
- "business": Impacto no negócio, receita, conversão
- "integration": Integrações, APIs
- "seo": SEO, marketing
- "mobile": Desenvolvimento mobile
- "devops": CI/CD, infraestrutura
- "backend": Backend, APIs, servidores
- "frontend": Frontend, UI/UX
- "leadership": Liderança, coordenação de equipe
- "mentoring": Mentoria, ensino
- "product": Produto, features
- "optimization": Otimizações gerais
- "legacy": Código legado, refatoração

### 5. data-impact
- "high": Impacto significativo, métricas importantes
- "medium": Impacto moderado
- "low": Impacto menor ou rotineiro

### 6. data-metrics
- "true": Se a conquista menciona números, percentuais, métricas
- "false": Se é descritiva sem métricas

### 7. data-keywords (nos achievements)
- Keywords específicas daquela conquista
- Separe por vírgula
- Exemplo: "performance,optimization,loading-time"

## Instruções de Layout Profissional

### 1. Organização Visual

**Hierarquia de Informação:**
- Informações mais importantes primeiro
- Experiências em ordem cronológica reversa (mais recente primeiro)
- Seções claramente separadas
- Espaçamento consistente

**Tipografia:**
- Use `<strong>` para destacar tecnologias e conceitos importantes
- Use `<span class="metric">` para métricas e números
- Mantenha texto legível e profissional

**Estrutura de Conquistas:**
- Cada conquista deve ser uma frase completa e clara
- Comece com ação/resultado principal
- Inclua contexto quando relevante
- Destaque tecnologias com `<strong>`

### 2. Formatação de Conquistas

**Bom exemplo:**
```html
<li class="achievement">
    <strong>Arquitetura Microfrontend:</strong> Desenvolvi aplicações baseadas em <strong>arquitetura de microfrontends</strong> usando <strong>React 18 e Module Federation</strong>, melhorando escalabilidade e permitindo deployment independente de múltiplos times
</li>
```

**Estrutura recomendada:**
- Título da conquista em `<strong>` seguido de dois pontos
- Descrição detalhada com tecnologias em `<strong>`
- Métricas em `<span class="metric">` quando disponíveis

### 3. Organização de Tecnologias

- Liste tecnologias mais relevantes primeiro dentro de cada experiência
- Agrupe tecnologias relacionadas
- Não repita tecnologias desnecessariamente
- Inclua versões quando relevante (ex: "React 18", "Next.js 14")

### 4. Consistência

- Mantenha formato consistente entre todas as experiências
- Use mesmo estilo de escrita
- Padronize nomenclatura de tecnologias
- Mantenha estrutura HTML idêntica

## Regras: O Que Evitar

### 1. Formatação de Períodos ❌
**NUNCA inclua tempo total de experiência por extenso:**
- ❌ "1 ano e 3 meses"
- ❌ "3 anos de experiência"
- ❌ "6 meses"
- ❌ "2019-2021 (2 anos)"

**SEMPRE use:**
- ✅ "Janeiro 2023 - Presente"
- ✅ "Outubro 2022 - Agosto 2023"
- ✅ "Março 2019 - Janeiro 2021"

### 2. Informações Redundantes ❌
- Não repita informações já presentes em outras seções
- Não inclua resumo de experiência que já está detalhado
- Evite duplicar tecnologias em múltiplas experiências da mesma empresa

### 3. Informações Pessoais Inadequadas ❌
- Não inclua: idade, estado civil, foto, CPF, RG
- Não inclua informações que possam causar discriminação
- Mantenha foco profissional

### 4. Linguagem Informal ❌
- Evite gírias e linguagem muito casual
- Use português profissional e formal
- Evite emojis e símbolos desnecessários
- Mantenha tom profissional mas acessível

### 5. Informações Vazias ou Genéricas ❌
- Evite conquistas genéricas como "Trabalhei em projetos"
- Prefira descrições específicas e mensuráveis
- Se não houver informação suficiente, omita ao invés de inventar

### 6. Estrutura HTML Incorreta ❌
- Não remova atributos data-* necessários
- Não modifique a estrutura de seções
- Mantenha compatibilidade com o sistema de seleção

### 7. Metadados Incompletos ❌
- Não deixe `data-company` vazio
- Sempre preencha `data-keywords` com tecnologias relevantes
- Não omita `data-category` e `data-impact` nos achievements
- Preencha todos os metadados necessários

### 8. Informações Desatualizadas ❌
- Não inclua experiências muito antigas e irrelevantes (mais de 10 anos, a menos que muito relevantes)
- Atualize tecnologias para versões atuais quando possível
- Remova informações obsoletas

### 9. Excesso de Informação em Uma Linha ❌
- Não coloque múltiplas conquistas em uma única linha
- Cada conquista deve ser um `<li>` separado
- Facilite leitura e processamento

### 10. Falta de Especificidade ❌
- Evite: "Trabalhei com React"
- Prefira: "Desenvolvi aplicações com React 18, implementando hooks customizados e otimizações de performance"
- Seja específico sobre o que foi feito e como

## Formato de Saída

### Requisitos
1. **HTML completo e válido** - Deve ser um documento HTML completo
2. **Todas as informações incluídas** - Não filtre nada, inclua tudo
3. **Metadados completos** - Todos os data-attributes preenchidos
4. **Estrutura correta** - Seguir exatamente a estrutura do template
5. **CSS incluído** - Incluir todo o CSS do template base no `<style>`

### Estrutura de Resposta

Retorne APENAS o HTML completo, sem explicações adicionais, sem markdown, sem código blocks. Apenas o HTML puro e válido.

## Input

**Currículo(s) para processar:**
{curriculumContent}

**Formato do arquivo original:**
{fileFormat}

## Output

Retorne o HTML completo do `base-curriculum.html` estruturado conforme todas as instruções acima.
