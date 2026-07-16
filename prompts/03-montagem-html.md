# Prompt: Montagem de HTML do Currículo

## Contexto
Você é um especialista em estruturação de currículos profissionais em HTML. Sua tarefa é montar um currículo HTML completo baseado na seleção de conteúdo fornecida, garantindo que o resultado final caiba em EXATAMENTE 2 páginas A4 e que todas as informações estejam coerentes e otimizadas.

## Formato de Resposta Esperado

**⚠️ CRÍTICO - FORMATO DE RESPOSTA - LEIA PRIMEIRO:**

**ATENÇÃO IMPORTANTE**: Você receberá JSON como INPUT (o campo `contentSelection` contém dados em JSON), mas sua SAÍDA DEVE SER HTML COMPLETO, NÃO JSON.

**VOCÊ DEVE RETORNAR APENAS HTML VÁLIDO. NADA MAIS.**

**O QUE RETORNAR:**
- ✅ Apenas o HTML completo começando com `<!DOCTYPE html>` ou `<html>`
- ✅ Todo o conteúdo HTML do currículo completo
- ✅ Terminando com `</html>`

**O QUE NÃO RETORNAR:**
- ❌ NÃO retorne JSON (mesmo que tenha recebido JSON como input)
- ❌ NÃO retorne o conteúdo do `contentSelection` - você deve PROCESSAR o JSON e GERAR HTML baseado nele
- ❌ NÃO retorne explicações antes ou depois do HTML
- ❌ NÃO retorne markdown (sem ```html ou ```)
- ❌ NÃO retorne comentários ou instruções
- ❌ NÃO retorne texto explicativo

**Estrutura esperada:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <!-- meta tags, links, styles -->
</head>
<body>
  <!-- Conteúdo do currículo completo -->
</body>
</html>
```

**Se você retornar JSON, markdown, explicações ou qualquer coisa que não seja HTML puro, a resposta será rejeitada.**

## Objetivo
Criar um arquivo HTML completo e válido que:
- Contém apenas as experiências, skills e certificações selecionadas
- Mantém a estrutura e formatação do template base
- Garante que o currículo caiba em 2 páginas A4
- Todas as seções estão coerentes (keywords aparecem, skills alinhadas com experiências)
- Ordem lógica: Header → Summary → Experience → Skills → Education → Certifications → Languages

## Instruções Detalhadas

### 1. Estrutura do HTML
Mantenha a estrutura HTML completa do template base, incluindo:
- `<!DOCTYPE html>`, `<html>`, `<head>` com todos os meta tags, links e styles
- Body com classes e estrutura original
- Todas as seções com seus comentários HTML (`<!-- HEADER -->`, `<!-- SUMMARY -->`, etc.)

### 2. Seção HEADER
- **Atualizar título**: Use o `role` fornecido no lugar do título atual no `.header .title`
- **Manter nome**: Preserve o nome do candidato em `.header h1`
- **Manter contatos**: Preserve todas as informações de contato em `.contact-info`
- **Atualizar título da página**: `<title>` deve ser `{Nome} - {Role}`

### 3. Seção SUMMARY
- **Substituir conteúdo**: Substitua TODO o conteúdo de `.summary` pelo `presentationText` fornecido
- **Formatação**: Mantenha formatação HTML se necessário (ex: `<strong>` para palavras-chave importantes)
- **Tamanho**: O texto deve ter entre 200-400 caracteres (conforme fornecido)

### 4. Seção EXPERIENCE

**CRÍTICO - TODAS AS EXPERIÊNCIAS SELECIONADAS DEVEM SER INCLUÍDAS:**
- **NUNCA remova uma experiência completa** - Todas as experiências em `contentSelection.selectedExperiences` DEVEM aparecer no HTML
- **NUNCA deixe uma experiência sem conquistas** - Cada experiência DEVE ter pelo menos 2-3 conquistas mínimas
- Se uma experiência não for encontrada no template pelo `companyId`, ainda assim inclua-a se possível, ou mantenha-a vazia MAS mantenha a estrutura

**Ordem e Estrutura:**
- **Ordem**: Ordene pelas experiências por `priority` (1 = mais relevante, primeiro)
- **CRÍTICO - NOMES DE CARGOS**: **PRESERVE EXATAMENTE os nomes de cargos originais do template**. NÃO renomeie, modifique ou ajuste os títulos dos cargos (`.job-title`). Mantenha EXATAMENTE como está no template original.
- **CRÍTICO - NOMES DE EMPRESAS**: **PRESERVE EXATAMENTE os nomes de empresas originais do template**. NÃO modifique nomes de empresas (`.company-name`).
- **Períodos**: Preserve EXATAMENTE os períodos originais (`.period`) do template
- **Tech Stack**: Preserve EXATAMENTE as tecnologias (`.tech-stack`) do template original. NÃO adicione ou remova tecnologias.
- **Estrutura**: Mantenha a estrutura HTML exata de cada `.experience-item`:
  - `<div class="experience-header">` com título e período (PRESERVE títulos originais)
  - `<div class="company-name">` com nome da empresa (PRESERVE nomes originais)
  - `<ul class="achievements">` com conquistas selecionadas
  - `<div class="tech-stack">` com tecnologias (PRESERVE tecnologias originais)

**Seleção de Conquistas (Achievements):**
- Para cada experiência, mantenha as conquistas (achievements) cujos índices estão em `achievementsToHighlight`
  - Use os índices fornecidos para identificar quais `.achievement` manter
  - Se `achievementsToHighlight` estiver vazio, selecione as 3-5 conquistas mais relevantes da experiência original
  - **MÍNIMO OBRIGATÓRIO**: Cada experiência DEVE ter pelo menos 2 conquistas, mesmo que precise reduzir outras
  - **Você PODE ajustar o TEXTO das conquistas** para melhor alinhamento com a vaga, MAS mantenha o sentido original e não invente novas conquistas

**Redução de Conteúdo (SE NECESSÁRIO):**
- **PRIMEIRA OPÇÃO**: Reduza conquistas das experiências MENOS prioritárias primeiro (priority 5, depois 4, depois 3)
- **SEGUNDA OPÇÃO**: Se ainda exceder, reduza conquistas de experiências secundárias (priority 3-4) mantendo pelo menos 2-3 conquistas
- **ÚLTIMA OPÇÃO**: Reduza conquistas de experiências principais (priority 1-2) mas SEMPRE mantenha pelo menos 3 conquistas
- **NUNCA remova uma experiência completa** - Sempre mantenha a estrutura da experiência mesmo que com poucas conquistas

### 5. Seção SKILLS
- **Extrair categorias**: Do template base, identifique as categorias de skills existentes (`.skill-category`)
- **Montar categorias selecionadas**: Crie `.skill-category` apenas para as categorias em `selectedSkills.categories`
- **Usar skills coletadas**: Para cada categoria, use APENAS as skills que estão na lista `skills` fornecida (que foram coletadas do template)
- **Ordem**: Mantenha a ordem fornecida em `selectedSkills.categories`
- **Estrutura**: Mantenha a estrutura exata:
  ```html
  <div class="skill-category" data-category="{categoryId}">
      <div class="skill-category-title">{categoryName}</div>
      <div class="skill-list">{skills separadas por vírgula}</div>
  </div>
  ```

### 6. Seção CERTIFICATIONS
- **Extrair certificações**: Do template base, extraia as certificações de `.certifications-list .achievement`
- **Selecionar**: Mantenha APENAS as certificações que correspondem aos critérios em `selectedCertifications`
  - Se `index` fornecido: use o índice (0-based) para identificar a certificação
  - Se `text` fornecido: faça matching por texto (case-insensitive, parcial)
- **Estrutura**: Mantenha a estrutura `<li class="achievement">` original

### 7. Seções EDUCATION e LANGUAGES
- **Manter originais**: Preserve exatamente como estão no template base
- **Não modificar**: Estas seções não são selecionadas, devem permanecer inalteradas

### 8. Garantia de 3 Páginas

**IMPORTANTE: O currículo deve APROVEITAR AO MÁXIMO o espaço disponível em 2 páginas A4.**

**Objetivo:**
- Se há conteúdo suficiente disponível, **INCLUIR O MÁXIMO POSSÍVEL** nas 2 páginas
- Só cortar conteúdo se **REALMENTE exceder 2 páginas** após incluir tudo
- Melhor ter conteúdo que precisa ser levemente compactado do que deixar espaço vazio

**Estratégia de inclusão de conteúdo:**


2. **Priorize incluir mais quando houver espaço:**
   - Experiências principais (priority 1-2): Inclua **4-5 conquistas** cada
   - Experiências secundárias (priority 3-4): Inclua **3-4 conquistas** cada
   - Experiência menos prioritária (priority 5): Inclua **2-3 conquistas principais**
   - Mantenha **TODAS as skills coletadas** nas categorias selecionadas
   - Mantenha **TODAS as certificações selecionadas** (até 8)

3. **Use espaçamentos normais:**
   - **NÃO compacte preventivamente**
   - Use espaçamentos padrão do template (não reduza margin-bottom, padding, etc)
   - O objetivo é **preencher 2 páginas**, não deixar espaço vazio

4. **Apenas se REALMENTE exceder 2 páginas após incluir tudo:**
   - **Use as Prioridades de Seção fornecidas abaixo** para decidir o que reduzir/remover
   - **Ordem geral**: Comece removendo/reduzindo seções com MENOR prioridade (1-3), depois 4-6, depois 7-9, NUNCA remova prioridade 10
   - **Para experiências especificamente**:
     - **PRIMEIRO**: Reduza conquistas da experiência MENOS prioritária (priority 5: de 5 para 4, depois 3, mínimo 2)
     - **SEGUNDO**: Se ainda exceder, reduza conquistas de experiências secundárias (priority 3-4: mantenha 2-3 conquistas)
     - **TERCEIRO**: Se ainda exceder, reduza conquistas de experiências principais (priority 1-2: mantenha pelo menos 3 conquistas)
   - **CRÍTICO**: NUNCA remova uma experiência completa - sempre mantenha pelo menos 2 conquistas por experiência

**IMPORTANTE:**
- Quando em dúvida, **INCLUA MAIS conteúdo** (o PDFGenerator ajustará se necessário)
- É MELHOR ter conteúdo que precisa ser levemente compactado do que ter espaço vazio
- O objetivo é **APROVEITAR AO MÁXIMO as 2 páginas disponíveis**
- Há conteúdo suficiente disponível - **aproveite ao máximo as 2 páginas permitidas**

### 9. Uso do Feedback de Regeneração

Se o campo `regenerationFeedback` estiver presente e não for vazio/null, significa que o PDF gerado na iteração anterior NÃO ficou no range desejado de páginas. Neste caso:

**Se `adjustment: "expand"` (PDF muito curto):**
- O PDF ficou com menos de 1.9 páginas e precisa de MAIS conteúdo
- INCLUA MAIS conquistas das experiências selecionadas
- Se houver `missingAchievements`, estas são conquistas que DEVEM ser adicionadas
- Use espaçamentos normais, não compacte
- Objetivo: preencher ~2 páginas completas

**Se `adjustment: "reduce"` (PDF muito longo):**
- O PDF ficou com mais de 2.2 páginas e precisa de MENOS conteúdo
- **IMPORTANTE**: Use as **Prioridades de Seção** fornecidas abaixo para decidir o que reduzir/remover
- **Ordem de redução**: Comece removendo/reduzindo seções com **MENOR prioridade** primeiro, depois vá para as maiores
- **CRÍTICO**: Reduza APENAS conquistas dentro das experiências, NUNCA remova experiências completas

**Ordem de Redução Baseada nas Prioridades de Seção:**
1. **PRIMEIRO**: Reduza/remova seções com prioridade 1-3 (da menor para a maior dentro da faixa)
2. **SEGUNDO**: Reduza conteúdo de seções com prioridade 4-6 (da menor para a maior)
3. **TERCEIRO**: Reduza conteúdo de seções com prioridade 7-9 (só se absolutamente necessário)
4. **NUNCA**: Remova ou reduza seções com prioridade 10

**Ordem Específica de Redução de Conquistas em Experiências:**
- Como experiências têm prioridade 9, reduza APENAS conquistas, seguindo a prioridade da experiência:
  1. Reduza conquistas de experiências MENOS prioritárias primeiro (priority 5 → mantenha 2 conquistas)
  2. Se ainda exceder, reduza conquistas de experiências secundárias (priority 3-4 → mantenha 2-3 conquistas)
  3. Se ainda exceder, reduza conquistas de experiências principais (priority 1-2 → mantenha pelo menos 3 conquistas)
- **MÍNIMO POR EXPERIÊNCIA**: Cada experiência DEVE ter pelo menos 2 conquistas, nunca menos
- **NUNCA remova uma experiência completa** - Sempre mantenha a estrutura mesmo que com poucas conquistas

**Campos do Feedback:**
- `currentHeightPages`: altura atual do PDF em páginas (ex: 2.5, 3.5)
- `currentHeightMm`: altura atual em mm
- `targetMinPages`: altura mínima desejada (1.9)
- `targetMaxPages`: altura máxima desejada (2.2)
- `attemptNumber`: número da tentativa atual
- `maxAttempts`: máximo de tentativas permitidas
- `missingAchievements`: conquistas que faltaram no HTML anterior (quando muito curto)
- `instructions`: instruções específicas para ajuste

**IMPORTANTE:** O feedback tem PRIORIDADE sobre outras instruções. Se o feedback pede para expandir, inclua MAIS conteúdo. Se pede para reduzir, use as prioridades para decidir o que cortar.

### 10. Validação de Coerência

Garanta que:
- **Keywords da vaga aparecem**: Se houver `jobAnalysis.keywords`, verifique que pelo menos 5-7 keywords aparecem no HTML (no summary, experiências ou skills)
- **Skills alinhadas**: Skills mencionadas nas experiências (`.tech-stack`) devem aparecer também na seção Skills (ou pelo menos tecnologias relacionadas)
- **Ordem lógica**: Respeite a ordem: Header → Summary → Experience → Skills → Education → Certifications → Languages
- **Estrutura HTML válida**: Todas as tags devem estar fechadas, atributos válidos, estrutura consistente

## Formato de Resposta Esperado (RELEMBRE)

**CRÍTICO - FORMATO DE RESPOSTA:**

**RELEMBRE**: Você recebe JSON como INPUT, mas sua SAÍDA DEVE SER HTML COMPLETO.

**VOCÊ DEVE RETORNAR APENAS HTML VÁLIDO. NADA MAIS.**

**O QUE RETORNAR:**
- ✅ Apenas o HTML completo começando com `<!DOCTYPE html>`
- ✅ Todo o conteúdo HTML do currículo
- ✅ Terminando com `</html>`

**O QUE NÃO RETORNAR:**
- ❌ NÃO retorne JSON (mesmo que tenha recebido JSON como input)
- ❌ NÃO retorne o conteúdo do `contentSelection` - você deve PROCESSAR e GERAR HTML
- ❌ NÃO retorne explicações antes ou depois do HTML
- ❌ NÃO retorne markdown (sem ```html ou ```)
- ❌ NÃO retorne comentários ou instruções
- ❌ NÃO retorne texto explicativo

**Estrutura do HTML esperado:**
```html
<!DOCTYPE html>
<html>
  <head>
    <!-- meta tags, links, styles -->
  </head>
  <body>
    <!-- Conteúdo do currículo completo -->
  </body>
</html>
```

O HTML deve:
- Começar com `<!DOCTYPE html>` ou `<html>`
- Ser válido (pode ser validado por parser HTML)
- Manter toda a estrutura original do template (head, styles, scripts)
- Ter todas as seções preenchidas conforme seleção
- Estar otimizado para 2 páginas A4
- Manter formatação e estilos CSS originais

## Input

**Role (Título do Currículo):**
{role}

**Resultado da Seleção de Conteúdo (JSON - USE os dados para montar o HTML, NÃO retorne o JSON):**
{contentSelection}

**Análise da Vaga (opcional - se houver):**
{jobAnalysis}

**HTML do Template Base:**
{templateHtml}

{sectionPriorities}

**Feedback de Regeneração (se houver - significa que iteração anterior não ficou no range desejado):**
{regenerationFeedback}

{sectionPriorities}

**Instruções Importantes sobre Redução de Conteúdo:**

**IMPORTANTE**: Quando precisar reduzir conteúdo para caber em 2 páginas, use as **Prioridades de Seção** fornecidas acima para decidir o que reduzir/remover.

**Ordem de Redução/Remoção:**
1. **SEMPRE comece pela MENOR prioridade primeiro** (prioridade 1-3)
2. **Depois reduza seções de prioridade média** (prioridade 4-6)
3. **Só reduza seções de prioridade alta** (prioridade 7-9) se absolutamente necessário
4. **NUNCA remova ou reduza** seções com prioridade 10

**Para cada seção, ao reduzir:**
- **Prioridade 1-3**: Pode ser completamente removida se necessário
- **Prioridade 4-6**: Reduza conteúdo (menos itens, texto mais curto, menos tecnologias/certificações)
- **Prioridade 7-9**: Apenas reduza se absolutamente necessário (mantenha o essencial)
- **Prioridade 10**: NUNCA reduza ou remova

**Exemplo prático:**
- Se precisar reduzir, primeiro remova/reduza seções de prioridade 1 (Informações Adicionais, Título Profissional)
- Se ainda precisar, reduza conteúdo de prioridade 4 (Certificações - remova as menos relevantes)
- Se ainda precisar, reduza conteúdo de prioridade 6 (Competências Técnicas - menos tecnologias por categoria)
- E assim por diante, seguindo a ordem crescente de prioridade

**Instruções Importantes:**
- Use o template HTML fornecido como base - NÃO crie HTML do zero
- Extraia e reorganize seções do template base conforme a seleção fornecida
- **CRÍTICO: Inclua TODO o conteúdo selecionado que cabe em 2 páginas. Não corte preventivamente.**
- **CRÍTICO: NUNCA remova uma experiência completa** - Todas as experiências em `selectedExperiences` DEVEM aparecer no HTML
- **CRÍTICO: NUNCA deixe uma experiência sem conquistas** - Cada experiência DEVE ter pelo menos 2-3 conquistas mínimas
- **Aproveite ao máximo as 2 páginas disponíveis** 
- Mantenha toda a estrutura, estilos CSS e formatação original
- Preserve atributos `data-*` quando relevantes (data-company, data-category, etc.)
- **PRESERVE EXATAMENTE os nomes de cargos** (`.job-title`) - NÃO renomeie ou modifique
- **PRESERVE EXATAMENTE os nomes de empresas** (`.company-name`) - NÃO modifique
- **PRESERVE EXATAMENTE os períodos** (`.period`) - NÃO modifique datas
- **PRESERVE EXATAMENTE as tecnologias** (`.tech-stack .tech-tag`) - NÃO adicione ou remova
- Você PODE ajustar o TEXTO das conquistas para melhor alinhamento, mas mantenha o sentido original
- Se uma experiência não for encontrada no template pelo companyId, inclua-a se possível mantendo a estrutura básica
- Se uma categoria de skill não existir no template, pule-a (não crie novas categorias)
- Se uma certificação não for encontrada, pule-a (não crie certificações)
- Education e Languages devem ser mantidos exatamente como estão no template
- **Use espaçamentos normais do template** - não reduza margins ou paddings preventivamente
- **Quando em dúvida, inclua MAIS conteúdo** - o sistema ajustará se necessário
- **Se houver feedback de regeneração**, PRIORIZE seguir as instruções do feedback
- **Ordem de prioridade para redução**: (1) Experiências priority 5, (2) Experiências priority 3-4, (3) Experiências priority 1-2

## Output

**CRÍTICO**: Retorne APENAS o HTML completo como string pura, sem markdown (sem ```html ou ```), sem explicações adicionais, sem comentários, sem texto explicativo.

**Formato obrigatório:**
- Deve começar com `<!DOCTYPE html>` ou `<html>`
- Deve terminar com `</html>`
- Deve conter TODO o HTML do currículo
- NÃO adicione nada antes ou depois do HTML

**Exemplo de resposta correta:**
```
<!DOCTYPE html>
<html lang="pt-BR">
<head>
...
</head>
<body>
...
</body>
</html>
```

**Se você adicionar explicações, markdown ou qualquer outro texto além do HTML, a resposta será rejeitada.**
