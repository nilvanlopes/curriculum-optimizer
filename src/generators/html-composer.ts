import chalk from 'chalk';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import type { ContentSelectionResult, HTMLRegenerationFeedback, JobAnalysisResult, PDFMeasurement } from '../types.js';
import { aiClient } from '../utils/ai-client.js';
import { PDFGenerator } from './pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compositor de HTML que monta currículo completo usando IA
 */
export class HTMLComposer {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(__dirname, '../templates/base-curriculum.html');
  }

  /**
   * Carrega o template HTML base
   */
  private loadTemplate(): string {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template não encontrado: ${this.templatePath}`);
    }
    return fs.readFileSync(this.templatePath, 'utf-8');
  }

  /**
   * Valida estrutura básica do HTML gerado
   */
  private validateHTML(html: string): {
    valid: boolean;
    criticalErrors: string[];
    warnings: string[];
  } {
    const criticalErrors: string[] = [];
    const warnings: string[] = [];

    try {
      const $ = cheerio.load(html);

      // Valida estrutura básica (CRÍTICO)
      if (!$('html').length) {
        criticalErrors.push('HTML não contém tag <html>');
      }

      if (!$('head').length) {
        criticalErrors.push('HTML não contém tag <head>');
      }

      if (!$('body').length) {
        criticalErrors.push('HTML não contém tag <body>');
      }

      // Valida seções obrigatórias (CRÍTICO)
      if (!$('.header').length) {
        criticalErrors.push('HTML não contém seção Header (.header)');
      }

      if (!$('.summary').length) {
        criticalErrors.push('HTML não contém seção Summary (.summary)');
      }

      // Valida se há seção de experiências (CRÍTICO)
      if (!$('.experience-item').length) {
        criticalErrors.push('HTML não contém experiências (.experience-item)');
      }

      // Valida número de experiências (AVISO - não crítico)
      const experienceCount = $('.experience-item').length;
      if (experienceCount > 5) {
        warnings.push(`HTML contém ${experienceCount} experiências (máximo permitido: 5)`);
      }

      // Valida número de categorias de skills (AVISO - não crítico)
      const skillsCategories = $('.skill-category').length;
      if (skillsCategories > 6) {
        warnings.push(`HTML contém ${skillsCategories} categorias de skills (máximo permitido: 6)`);
      }

      return {
        valid: criticalErrors.length === 0,
        criticalErrors,
        warnings,
      };
    } catch (error) {
      criticalErrors.push(`Erro ao validar HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return {
        valid: false,
        criticalErrors,
        warnings: [],
      };
    }
  }

  /**
   * Limpa HTML removendo código markdown ou explicações extras
   */
  private cleanHTMLResponse(response: string): string {
    // Remove markdown code blocks se houver
    let html = response;

    // Remove ```html ou ``` se houver no início/fim
    html = html.replace(/^```html\s*/i, '');
    html = html.replace(/^```\s*/i, '');
    html = html.replace(/\s*```$/i, '');

    // Tenta encontrar início do HTML de várias formas
    let htmlStart = -1;
    
    // Tenta encontrar <!DOCTYPE html>
    const doctypeIndex = html.indexOf('<!DOCTYPE html>');
    if (doctypeIndex !== -1) {
      htmlStart = doctypeIndex;
    } else {
      // Tenta encontrar <html (pode ter atributos)
      const htmlTagIndex = html.indexOf('<html');
      if (htmlTagIndex !== -1) {
        htmlStart = htmlTagIndex;
      }
    }

    // Se encontrou início do HTML, remove tudo antes
    if (htmlStart > 0) {
      html = html.substring(htmlStart);
    } else if (htmlStart === -1) {
      // Se não encontrou início do HTML, pode ser que esteja em outro formato
      // Tenta encontrar pelo menos uma tag HTML
      const anyHtmlTag = html.match(/<[a-zA-Z]+[^>]*>/);
      if (anyHtmlTag && anyHtmlTag.index !== undefined) {
        htmlStart = anyHtmlTag.index;
        html = html.substring(htmlStart);
      }
    }

    // Remove explicações após </html>
    const htmlEndIndex = html.lastIndexOf('</html>');
    if (htmlEndIndex !== -1) {
      html = html.substring(0, htmlEndIndex + 7); // +7 para incluir </html>
    }

    return html.trim();
  }

  /**
   * Compõe HTML completo do currículo baseado na seleção de conteúdo
   */
  async compose(
    role: string,
    contentSelection: ContentSelectionResult,
    jobAnalysis?: JobAnalysisResult
  ): Promise<string> {
    try {
      // Carrega template base
      const templateHtml = this.loadTemplate();

      // Prepara dados para o prompt
      const contentSelectionFormatted = JSON.stringify(contentSelection, null, 2);
      const jobAnalysisFormatted = jobAnalysis ? JSON.stringify(jobAnalysis, null, 2) : 'null';
      const sectionPriorities = this.formatSectionPriorities();

      // Chama IA para montar HTML
      const rawResponse = await aiClient.call(
        '03-montagem-html.md',
        {
          role: role,
          contentSelection: contentSelectionFormatted,
          jobAnalysis: jobAnalysisFormatted,
          templateHtml: templateHtml,
          sectionPriorities: sectionPriorities,
        },
        {
          maxTokens: 8192, // Template grande + resposta HTML
          temperature: 0.3, // Baixa temperatura para HTML consistente
        }
      );

      // Valida se a resposta contém HTML válido antes de limpar
      if (!rawResponse.includes('<!DOCTYPE html>') && !rawResponse.includes('<html')) {
        const preview = rawResponse.substring(0, 1000).replace(/\n/g, '\\n');
        throw new Error(
          `A IA não retornou HTML válido. Resposta recebida (primeiros 1000 chars):\n${preview}${rawResponse.length > 1000 ? '...' : ''}\n\n` +
          `A resposta deve conter um documento HTML completo começando com <!DOCTYPE html> ou <html>.`
        );
      }

      // Limpa resposta (remove markdown, explicações extras)
      const html = this.cleanHTMLResponse(rawResponse);

      // Valida se ainda tem HTML após limpeza
      if (!html || html.trim().length === 0) {
        const preview = rawResponse.substring(0, 500).replace(/\n/g, '\\n');
        throw new Error(
          `Após limpar a resposta da IA, o HTML está vazio. Resposta original (primeiros 500 chars):\n${preview}${rawResponse.length > 500 ? '...' : ''}`
        );
      }

      // Valida estrutura básica
      const validation = this.validateHTML(html);
      
      // Erros críticos fazem o código falhar
      if (validation.criticalErrors.length > 0) {
        const errorMessage = validation.criticalErrors.join('\n  - ');
        const htmlPreview = html.substring(0, 500).replace(/\n/g, '\\n');
        throw new Error(
          `HTML gerado não contém seções obrigatórias:\n  - ${errorMessage}\n\n` +
          `HTML gerado (primeiros 500 chars):\n${htmlPreview}${html.length > 500 ? '...' : ''}\n\n` +
          `Tamanho do HTML: ${html.length} caracteres`
        );
      }
      
      // Avisos não críticos apenas são exibidos
      if (validation.warnings.length > 0) {
        console.warn('Avisos de validação do HTML gerado (não críticos):');
        validation.warnings.forEach((warning) => {
          console.warn(`  - ${warning}`);
        });
      }

      return html;
    } catch (error) {
      throw new Error(
        `Erro ao compor HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Salva HTML em arquivo
   */
  async save(html: string, outputPath: string): Promise<void> {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, html, 'utf-8');
    } catch (error) {
      throw new Error(
        `Erro ao salvar HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Analisa o HTML gerado e compara com a seleção de conteúdo
   * Identifica conquistas que foram incluídas/faltantes
   */
  analyzeHTMLContent(
    html: string,
    contentSelection: ContentSelectionResult
  ): {
    includedAchievements: Map<string, number[]>;
    missingAchievements: Array<{ companyId: string; achievementIndices: number[] }>;
    totalIncluded: number;
    totalExpected: number;
  } {
    const $ = cheerio.load(html);
    const includedAchievements = new Map<string, number[]>();
    const missingAchievements: Array<{ companyId: string; achievementIndices: number[] }> = [];

    let totalIncluded = 0;
    let totalExpected = 0;

    // Analisa cada experiência selecionada
    for (const exp of contentSelection.selectedExperiences) {
      const expectedIndices = exp.achievementsToHighlight || [];
      totalExpected += expectedIndices.length;

      // Encontra a experiência no HTML
      const $experience = $(`.experience-item[data-company="${exp.companyId}"]`);
      
      if ($experience.length === 0) {
        // Experiência não foi incluída no HTML
        missingAchievements.push({
          companyId: exp.companyId,
          achievementIndices: expectedIndices,
        });
        continue;
      }

      // Conta conquistas incluídas
      const $achievements = $experience.find('.achievement:not(.hidden)');
      const includedCount = $achievements.length;
      totalIncluded += includedCount;

      // Registra quais foram incluídas (por índice, baseado na posição)
      const indices: number[] = [];
      for (let i = 0; i < includedCount; i++) {
        indices.push(i);
      }
      includedAchievements.set(exp.companyId, indices);

      // Verifica se há conquistas faltantes
      if (includedCount < expectedIndices.length) {
        const missing = expectedIndices.slice(includedCount);
        if (missing.length > 0) {
          missingAchievements.push({
            companyId: exp.companyId,
            achievementIndices: missing,
          });
        }
      }
    }

    return {
      includedAchievements,
      missingAchievements,
      totalIncluded,
      totalExpected,
    };
  }

  /**
   * Formata as prioridades de seção para envio ao prompt de montagem HTML
   */
  private formatSectionPriorities(): string {
    const { sections, instructions } = config.sectionPriorities;
    
    // Ordena seções por prioridade (da menor para a maior) para mostrar ordem de remoção
    const sortedSections = [...sections].sort((a, b) => a.priority - b.priority);
    
    const prioritiesFormatted = sortedSections.map(s => 
      `  - **${s.name}** (${s.id}): prioridade ${s.priority}`
    ).join('\n');
    
    // Agrupa seções por faixa de prioridade para facilitar entendimento
    const byPriority = {
      priority1to3: sections.filter(s => s.priority >= 1 && s.priority <= 3),
      priority4to6: sections.filter(s => s.priority >= 4 && s.priority <= 6),
      priority7to9: sections.filter(s => s.priority >= 7 && s.priority <= 9),
      priority10: sections.filter(s => s.priority === 10),
    };
    
    return `
## Prioridades de Seção para Redução de Conteúdo

**IMPORTANTE**: Quando precisar reduzir conteúdo para caber em 2 páginas, siga esta ordem de prioridade:

### Ordem de Remoção/Redução (da MENOR prioridade para a MAIOR):

1. **PRIMEIRO** (Prioridade 1-3): Remova/reduza estas seções primeiro:
${byPriority.priority1to3.map(s => `   - ${s.name} (${s.id}) - Prioridade ${s.priority}`).join('\n') || '   - Nenhuma seção nesta faixa'}

2. **SEGUNDO** (Prioridade 4-6): Se ainda precisar reduzir, reduza conteúdo destas seções:
${byPriority.priority4to6.map(s => `   - ${s.name} (${s.id}) - Prioridade ${s.priority}`).join('\n') || '   - Nenhuma seção nesta faixa'}

3. **TERCEIRO** (Prioridade 7-9): Só reduza estas seções se absolutamente necessário:
${byPriority.priority7to9.map(s => `   - ${s.name} (${s.id}) - Prioridade ${s.priority}`).join('\n') || '   - Nenhuma seção nesta faixa'}

4. **NUNCA** (Prioridade 10): Estas seções NUNCA devem ser removidas ou reduzidas:
${byPriority.priority10.map(s => `   - ${s.name} (${s.id}) - Prioridade ${s.priority}`).join('\n') || '   - Nenhuma seção nesta faixa'}

### Instruções Detalhadas por Faixa de Prioridade:

- **Prioridade 10**: ${instructions.priority10}
- **Prioridade 7-9**: ${instructions.priority7to9}
- **Prioridade 4-6**: ${instructions.priority4to6}
- **Prioridade 1-3**: ${instructions.priority1to3}

### Lista Completa de Prioridades (ordenada por prioridade crescente):

${prioritiesFormatted}

### Como Reduzir Conteúdo Dentro de Cada Seção:

**Para Experiências Profissionais** (prioridade 9):
- NUNCA remova uma experiência completa
- Reduza APENAS conquistas, seguindo a prioridade da experiência (priority 5 → 4 → 3 → 2 → 1)
- Mantenha sempre pelo menos 2-3 conquistas por experiência

**Para Certificações** (prioridade 4):
- Pode remover certificações menos relevantes primeiro
- Mantenha pelo menos 2-3 certificações principais

**Para Competências Técnicas** (prioridade 6):
- Pode reduzir número de tecnologias por categoria
- Priorize manter tecnologias mais relevantes para a vaga/role

**Para Outras Seções**:
- Reduza texto quando possível (resumir sem perder essência)
- Remova itens menos relevantes primeiro
- Mantenha pelo menos o essencial de cada seção
`;
  }

  /**
   * Cria feedback de regeneração baseado na medição do PDF
   */
  private createRegenerationFeedback(
    measurement: PDFMeasurement,
    attemptNumber: number,
    analysis?: {
      missingAchievements: Array<{ companyId: string; achievementIndices: number[] }>;
      totalIncluded: number;
      totalExpected: number;
    }
  ): HTMLRegenerationFeedback {
    const { minPages, maxPages, maxIterations } = config.iterativeLoop;
    const isShort = measurement.heightInPages < minPages;
    const isLong = measurement.heightInPages > maxPages;

    let instructions = '';

    if (isShort) {
      const gapPages = minPages - measurement.heightInPages;
      const percentageGap = ((gapPages / minPages) * 100).toFixed(1);
      
      instructions = `
⚠️⚠️⚠️ CRÍTICO: PDF MUITO CURTO ⚠️⚠️⚠️

PDF atual: ${measurement.heightInPages.toFixed(2)} páginas
Objetivo: ${minPages}-${maxPages} páginas
FALTAM: ${gapPages.toFixed(2)} páginas (${percentageGap}% de conteúdo faltante)

🚨 AÇÃO IMEDIATA NECESSÁRIA - ADICIONE CONTEÚDO AGORA 🚨

1. **INCLUA TODAS AS CONQUISTAS POSSÍVEIS** de cada experiência:
   - Experiências PRIORITY 1-2: Inclua TODAS as conquistas disponíveis (até 6-8 conquistas por experiência)
   - Experiências PRIORITY 3-4: Inclua pelo menos 4-5 conquistas por experiência
   - Experiências PRIORITY 5+: Inclua pelo menos 3-4 conquistas por experiência
   
2. **CRÍTICO: MANTENHA TODAS as experiências selecionadas** - NUNCA remova uma experiência completa

3. **CRÍTICO: Cada experiência DEVE ter pelo menos 3-4 conquistas MÍNIMAS** - Nunca deixe uma experiência com menos de 3 conquistas

4. **INCLUA TODAS as certificações selecionadas** - Não omita nenhuma

5. **INCLUA TODAS as skills coletadas nas categorias** - Não omita tecnologias

6. **NÃO reduza espaçamentos ou fontes** - Use tamanhos normais (não compacte)

7. **ADICIONE MAIS DETALHES** nas conquistas se possível - Elabore um pouco mais quando apropriado

${analysis?.missingAchievements && analysis.missingAchievements.length > 0 
  ? `\n🔴 CONQUISTAS FALTANTES QUE DEVEM SER ADICIONADAS (OBRIGATÓRIO):\n${analysis.missingAchievements.map(m => 
  `  - ${m.companyId}: índices ${m.achievementIndices.join(', ')} - ADICIONE TODAS ESTAS`
).join('\n')}`
  : ''}

📊 Estatísticas Atuais:
- Conquistas incluídas: ${analysis?.totalIncluded || 0}
- Conquistas esperadas: ${analysis?.totalExpected || 0}
- Gap: ${(analysis?.totalExpected || 0) - (analysis?.totalIncluded || 0)} conquistas faltantes

⚠️ Lembre-se: Você PRECISA adicionar pelo menos ${percentageGap}% mais conteúdo para atingir o objetivo de ${minPages} páginas.
`;
    } else if (isLong) {
      instructions = `
O PDF está MUITO LONGO (${measurement.heightInPages.toFixed(2)} páginas).
Objetivo: reduzir para ~2 páginas (${minPages}-${maxPages} páginas).

AÇÕES NECESSÁRIAS (use as prioridades de seção para guiar):
1. **CRÍTICO: REDUZA APENAS CONQUISTAS, NUNCA REMOVA EXPERIÊNCIAS COMPLETAS**
2. **Ordem de redução de conquistas**:
   a. PRIMEIRO: Reduza conquistas de experiências MENOS prioritárias (priority 5 → mantenha 2 conquistas mínimas)
   b. SEGUNDO: Reduza conquistas de experiências secundárias (priority 3-4 → mantenha 2-3 conquistas)
   c. TERCEIRO: Reduza conquistas de experiências principais (priority 1-2 → mantenha pelo menos 3 conquistas)
3. **MÍNIMO OBRIGATÓRIO**: Cada experiência DEVE ter pelo menos 2 conquistas, nunca menos
4. Mantenha 4-5 conquistas nas experiências principais (priority 1-2) quando possível
5. Reduza para 3 conquistas nas experiências secundárias (priority 3-5) quando necessário
6. Se ainda muito longo, remova certificações menos relevantes (mas mantenha pelo menos 2-3)
7. NUNCA remova seções com prioridade 10 (Nome, Contato, Summary)
8. **NUNCA remova uma experiência completa** - sempre mantenha a estrutura mesmo com poucas conquistas
`;
    }

    return {
      currentHeightPages: measurement.heightInPages,
      currentHeightMm: measurement.heightMm,
      targetMinPages: minPages,
      targetMaxPages: maxPages,
      adjustment: isShort ? 'expand' : 'reduce',
      attemptNumber,
      maxAttempts: maxIterations,
      missingAchievements: analysis?.missingAchievements,
      instructions,
    };
  }

  /**
   * Expande programaticamente o contentSelection para incluir mais conquistas
   * Isso garante que mais conteúdo seja incluído sem depender da IA
   */
  private expandContentSelection(
    contentSelection: ContentSelectionResult,
    attempt: number
  ): ContentSelectionResult {
    // Cria uma cópia profunda do contentSelection
    const expanded = JSON.parse(JSON.stringify(contentSelection)) as ContentSelectionResult;
    
    // Carrega template para descobrir quantas conquistas existem por experiência
    const templateHtml = this.loadTemplate();
    const $ = cheerio.load(templateHtml);
    
    // Define quantas conquistas adicionar por experiência baseado na tentativa
    // Tentativa 2: adiciona 2 conquistas por experiência
    // Tentativa 3-4: adiciona 3 conquistas por experiência
    // Tentativa 5: adiciona 4 conquistas por experiência
    const achievementsToAdd = attempt === 2 ? 2 : attempt === 3 || attempt === 4 ? 3 : attempt >= 5 ? 4 : 0;
    
    if (achievementsToAdd === 0) {
      return expanded;
    }
    
    // Ajusta conquistas para cada experiência baseado na prioridade
    for (const exp of expanded.selectedExperiences) {
      const currentCount = exp.achievementsToHighlight.length;
      
      // Descobre quantas conquistas existem no template para esta experiência
      const $experience = $(`.experience-item[data-company="${exp.companyId}"]`);
      const availableAchievements = $experience.find('.achievement').length;
      
      // Calcula quantas conquistas devem ter baseado na prioridade
      let targetCount: number;
      if (exp.priority <= 2) {
        // Experiências prioritárias (1-2): mais conquistas
        targetCount = Math.min(currentCount + achievementsToAdd + 1, availableAchievements);
      } else if (exp.priority <= 3) {
        // Experiências secundárias (3): adiciona normalmente
        targetCount = Math.min(currentCount + achievementsToAdd, availableAchievements);
      } else {
        // Experiências menos prioritárias (4+): adiciona menos
        targetCount = Math.min(currentCount + Math.max(achievementsToAdd - 1, 1), availableAchievements);
      }
      
      // Garante mínimo de 3 conquistas para todas as experiências
      targetCount = Math.max(targetCount, 3);
      
      // Se não há conquistas disponíveis no template, pula
      if (availableAchievements === 0) {
        continue;
      }
      
      // Preenche conquistas até o target
      if (currentCount < targetCount) {
        const missingCount = targetCount - currentCount;
        
        // Cria array com todos os índices possíveis (0-based)
        const allIndices = Array.from({ length: availableAchievements }, (_, i) => i);
        const currentIndices = new Set(exp.achievementsToHighlight);
        
        // Encontra índices que ainda não foram incluídos
        const missingIndices = allIndices.filter(idx => !currentIndices.has(idx));
        
        // Adiciona os primeiros missingIndices até atingir missingCount
        for (let i = 0; i < Math.min(missingCount, missingIndices.length); i++) {
          exp.achievementsToHighlight.push(missingIndices[i]);
        }
        
        // Ordena os índices para manter ordem
        exp.achievementsToHighlight.sort((a, b) => a - b);
      }
    }
    
    return expanded;
  }

  /**
   * Compõe HTML com loop iterativo para garantir que o PDF fique entre 1.9-2.2 páginas
   * 
   * @param role - Título do currículo
   * @param contentSelection - Seleção de conteúdo
   * @param jobAnalysis - Análise da vaga (opcional)
   * @param onProgress - Callback para feedback de progresso
   * @returns HTML final e informações sobre as iterações
   */
  async composeWithIteration(
    role: string,
    contentSelection: ContentSelectionResult,
    jobAnalysis?: JobAnalysisResult,
    onProgress?: (message: string, attempt: number, maxAttempts: number) => void
  ): Promise<{
    html: string;
    attempts: number;
    finalMeasurement: PDFMeasurement;
    isWithinRange: boolean;
  }> {
    const { maxIterations } = config.iterativeLoop;
    const pdfGenerator = new PDFGenerator();
    
    let currentHTML = '';
    let attempt = 0;
    let lastMeasurement: PDFMeasurement | null = null;
    let feedback: HTMLRegenerationFeedback | null = null;
    let adjustedContentSelection = contentSelection; // Mantém versão ajustada do contentSelection

    while (attempt < maxIterations) {
      attempt++;
      
      // Notifica progresso
      onProgress?.(`Gerando HTML (tentativa ${attempt}/${maxIterations})...`, attempt, maxIterations);

      // Se PDF está muito curto E não é a primeira tentativa, expande contentSelection programaticamente
      if (feedback && feedback.adjustment === 'expand' && attempt > 1) {
        adjustedContentSelection = this.expandContentSelection(adjustedContentSelection, attempt);
        console.log(chalk.blue('ℹ'), `Expandindo conteúdo programaticamente (tentativa ${attempt})`);
        console.log(chalk.blue('  →'), `Adicionando mais conquistas às experiências`);
      }

      // Gera HTML (com ou sem feedback)
      if (attempt === 1 || !feedback) {
        // Primeira tentativa: gera normalmente
        currentHTML = await this.compose(role, adjustedContentSelection, jobAnalysis);
      } else {
        // Tentativas subsequentes: regenera com feedback
        const adjustmentMessage = feedback.adjustment === 'expand'
          ? chalk.yellow(`PDF muito curto (${feedback.currentHeightPages.toFixed(2)} páginas) - adicionando mais conteúdo`)
          : chalk.yellow(`PDF muito longo (${feedback.currentHeightPages.toFixed(2)} páginas) - reduzindo conteúdo`);
        
        console.log(chalk.blue('ℹ'), `Re-gerando HTML (tentativa ${attempt}/${maxIterations})`);
        console.log(chalk.blue('  →'), adjustmentMessage);
        console.log(chalk.blue('  →'), `Objetivo: ${feedback.targetMinPages}-${feedback.targetMaxPages} páginas`);
        
        currentHTML = await this.composeWithFeedback(
          role,
          adjustedContentSelection, // Usa versão ajustada
          jobAnalysis,
          feedback
        );
      }

      // Mede altura do PDF
      onProgress?.(`Medindo altura do PDF (tentativa ${attempt}/${maxIterations})...`, attempt, maxIterations);
      
      const { measurement, tempPath } = await pdfGenerator.generateAndMeasure(currentHTML);
      lastMeasurement = measurement;
      
      // Limpa arquivo temporário
      pdfGenerator.cleanupTempFile(tempPath);

      // Verifica se está no range desejado
      const isWithinRange = pdfGenerator.isWithinDesiredRange(measurement);
      
      onProgress?.(
        `Tentativa ${attempt}: ${measurement.pageCount} página(s) (${measurement.heightInPages.toFixed(2)} páginas)`,
        attempt,
        maxIterations
      );

      if (isWithinRange) {
        // Sucesso! PDF está no range 1.9-2.2 páginas
        return {
          html: currentHTML,
          attempts: attempt,
          finalMeasurement: measurement,
          isWithinRange: true,
        };
      }

      // Analisa conteúdo para criar feedback (usa adjustedContentSelection)
      const analysis = this.analyzeHTMLContent(currentHTML, adjustedContentSelection);
      
      // Cria feedback para próxima iteração
      feedback = this.createRegenerationFeedback(measurement, attempt, analysis);
    }

    // Não conseguiu convergir, retorna o melhor resultado
    return {
      html: currentHTML,
      attempts: attempt,
      finalMeasurement: lastMeasurement!,
      isWithinRange: false,
    };
  }

  /**
   * Compõe HTML com feedback de iteração anterior
   * Usado quando o PDF não está no range desejado
   */
  private async composeWithFeedback(
    role: string,
    contentSelection: ContentSelectionResult,
    jobAnalysis: JobAnalysisResult | undefined,
    feedback: HTMLRegenerationFeedback
  ): Promise<string> {
    try {
      // Carrega template base
      const templateHtml = this.loadTemplate();

      // Prepara dados para o prompt
      const contentSelectionFormatted = JSON.stringify(contentSelection, null, 2);
      const jobAnalysisFormatted = jobAnalysis ? JSON.stringify(jobAnalysis, null, 2) : 'null';
      const feedbackFormatted = JSON.stringify(feedback, null, 2);
      const sectionPriorities = this.formatSectionPriorities();

      // Chama IA para montar HTML com feedback
      const rawResponse = await aiClient.call(
        '03-montagem-html.md',
        {
          role: role,
          contentSelection: contentSelectionFormatted,
          jobAnalysis: jobAnalysisFormatted,
          templateHtml: templateHtml,
          regenerationFeedback: feedbackFormatted,
          sectionPriorities: sectionPriorities,
        },
        {
          maxTokens: 8192,
          temperature: 0.3,
        }
      );

      // Valida se a resposta contém HTML válido antes de limpar
      if (!rawResponse.includes('<!DOCTYPE html>') && !rawResponse.includes('<html')) {
        const preview = rawResponse.substring(0, 1000).replace(/\n/g, '\\n');
        throw new Error(
          `A IA não retornou HTML válido. Resposta recebida (primeiros 1000 chars):\n${preview}${rawResponse.length > 1000 ? '...' : ''}\n\n` +
          `A resposta deve conter um documento HTML completo começando com <!DOCTYPE html> ou <html>.`
        );
      }

      // Limpa resposta
      const html = this.cleanHTMLResponse(rawResponse);

      // Valida se ainda tem HTML após limpeza
      if (!html || html.trim().length === 0) {
        const preview = rawResponse.substring(0, 500).replace(/\n/g, '\\n');
        throw new Error(
          `Após limpar a resposta da IA, o HTML está vazio. Resposta original (primeiros 500 chars):\n${preview}${rawResponse.length > 500 ? '...' : ''}`
        );
      }

      // Valida estrutura básica
      const validation = this.validateHTML(html);
      
      // Erros críticos fazem o código falhar
      if (validation.criticalErrors.length > 0) {
        const errorMessage = validation.criticalErrors.join('\n  - ');
        const htmlPreview = html.substring(0, 500).replace(/\n/g, '\\n');
        throw new Error(
          `HTML gerado não contém seções obrigatórias:\n  - ${errorMessage}\n\n` +
          `HTML gerado (primeiros 500 chars):\n${htmlPreview}${html.length > 500 ? '...' : ''}\n\n` +
          `Tamanho do HTML: ${html.length} caracteres`
        );
      }
      
      // Avisos não críticos apenas são exibidos
      if (validation.warnings.length > 0) {
        console.warn('Avisos de validação do HTML gerado (não críticos):');
        validation.warnings.forEach((warning) => {
          console.warn(`  - ${warning}`);
        });
      }

      return html;
    } catch (error) {
      throw new Error(
        `Erro ao compor HTML com feedback: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}
