import chalk from 'chalk';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { ContentSelectionResult, HTMLRegenerationFeedback, JobAnalysisResult, PDFMeasurement } from '../types.js';
import { PDFGenerator } from './pdf.js';

/**
 * Compositor de HTML que monta currículo completo usando IA
 */
export class HTMLComposer {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(process.cwd(), 'input/base-curriculum.html');
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
   * Normaliza a seleção de conteúdo para tolerar campos ausentes no payload da IA
   */
  private normalizeContentSelection(contentSelection: ContentSelectionResult): ContentSelectionResult {
    return {
      ...contentSelection,
      selectedExperiences: Array.isArray(contentSelection.selectedExperiences)
        ? contentSelection.selectedExperiences.map((experience) => ({
            companyId: experience.companyId,
            priority: experience.priority,
            achievementsToHighlight: Array.isArray(experience.achievementsToHighlight)
              ? experience.achievementsToHighlight
              : [],
          }))
        : [],
      selectedSkills: {
        categories: Array.isArray(contentSelection.selectedSkills?.categories)
          ? contentSelection.selectedSkills!.categories.map((category) => ({
              categoryId: category.categoryId,
              categoryName: category.categoryName,
              skills: Array.isArray(category.skills) ? category.skills : [],
            }))
          : [],
      },
      selectedCertifications: Array.isArray(contentSelection.selectedCertifications)
        ? contentSelection.selectedCertifications.map((certification) => ({
            index: certification.index,
            text: certification.text,
          }))
        : [],
      presentationText: contentSelection.presentationText || '',
      keywordsUsed: Array.isArray(contentSelection.keywordsUsed) ? contentSelection.keywordsUsed : [],
    };
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
   * Seleciona os índices de conquistas que devem permanecer visíveis
   */
  private pickAchievementIndices(totalAchievements: number, selectedIndices: number[] | undefined, priority: number): number[] {
    const uniqueSelected = Array.from(new Set((selectedIndices || []).filter((index) => index >= 0 && index < totalAchievements)));
    const minimum = Math.min(totalAchievements, priority <= 2 ? 3 : 2);
    const targetCount = Math.max(uniqueSelected.length, minimum);

    if (uniqueSelected.length >= targetCount) {
      return uniqueSelected.slice(0, targetCount).sort((a, b) => a - b);
    }

    const remaining = Array.from({ length: totalAchievements }, (_, index) => index)
      .filter((index) => !uniqueSelected.includes(index));

    const filled = [...uniqueSelected, ...remaining.slice(0, targetCount - uniqueSelected.length)];
    return filled.sort((a, b) => a - b);
  }

  /**
   * Aplica a seleção de conquistas em uma experiência específica
   */
  private applyExperienceSelection($: cheerio.CheerioAPI, $experience: any, selection: { priority: number; achievementsToHighlight: number[] }): void {
    const $achievements = $experience.find('.achievement');
    const totalAchievements = $achievements.length;

    if (totalAchievements === 0) {
      return;
    }

    const keepIndices = this.pickAchievementIndices(
      totalAchievements,
      selection.achievementsToHighlight,
      selection.priority
    );

    $achievements.each((index: number, element: any) => {
      if (!keepIndices.includes(index)) {
        $(element).remove();
      }
    });
  }

  /**
   * Aplica as seleções de skills ao template
   */
  private applySelectedSkills($: cheerio.CheerioAPI, contentSelection: ContentSelectionResult): void {
    const selectedCategories = contentSelection.selectedSkills?.categories || [];
    if (selectedCategories.length === 0) {
      return;
    }

    const $skillsGrid = $('.skills-grid').first();
    if ($skillsGrid.length === 0) {
      return;
    }

    const $templateCategory = $skillsGrid.find('.skill-category').first();
    const renderedCategories: any[] = [];

    selectedCategories.forEach((category) => {
      const $existingCategory = $skillsGrid
        .find('.skill-category')
        .filter((_, element) => $(element).attr('data-category') === category.categoryId)
        .first();

      const $category = ($existingCategory.length > 0 ? $existingCategory : $templateCategory).clone();
      if ($category.length === 0) {
        return;
      }

      $category.attr('data-category', category.categoryId);
      $category.find('.skill-category-title').text(category.categoryName);
      $category.find('.skill-list').text(category.skills.join(', '));
      renderedCategories.push($category);
    });

    if (renderedCategories.length > 0) {
      $skillsGrid.empty();
      renderedCategories.forEach(($category) => {
        $skillsGrid.append($category);
      });
    }
  }

  /**
   * Aplica as certificações selecionadas ao template
   */
  private applySelectedCertifications($: cheerio.CheerioAPI, contentSelection: ContentSelectionResult): void {
    const selectedCertifications = contentSelection.selectedCertifications || [];
    if (selectedCertifications.length === 0) {
      return;
    }

    const $certificationsList = $('.certifications-list').first();
    if ($certificationsList.length === 0) {
      return;
    }

    const originalCertifications = $certificationsList.find('.achievement').toArray();
    const renderedCertifications: any[] = [];
    const usedIndexes = new Set<number>();

    for (const selection of selectedCertifications) {
      let matchedIndex = -1;

      if (typeof selection.index === 'number' && originalCertifications[selection.index]) {
        matchedIndex = selection.index;
      } else if (selection.text) {
        const query = selection.text.toLowerCase();
        matchedIndex = originalCertifications.findIndex((element, index) => {
          if (usedIndexes.has(index)) {
            return false;
          }
          const text = $(element).text().trim().toLowerCase();
          return text.includes(query);
        });
      }

      if (matchedIndex === -1 || usedIndexes.has(matchedIndex)) {
        continue;
      }

      usedIndexes.add(matchedIndex);
      renderedCertifications.push($(originalCertifications[matchedIndex]).clone());
    }

    if (renderedCertifications.length > 0) {
      $certificationsList.empty();
      renderedCertifications.forEach(($certification) => {
        $certificationsList.append($certification);
      });
    }
  }

  /**
   * Renderiza o template HTML com o conteúdo selecionado
   */
  private renderTemplateHtml(
    templateHtml: string,
    role: string,
    contentSelection: ContentSelectionResult
  ): string {
    const normalized = this.normalizeContentSelection(contentSelection);
    const $ = cheerio.load(templateHtml);

    const name = $('.header h1').first().text().trim() || 'Currículo';

    $('head title').text(`${name} - ${role}`);
    $('.header .title').first().text(role);
    $('.summary').first().text(normalized.presentationText || '');

    const $experienceSection = $('.experience-item').first().closest('section');
    if ($experienceSection.length > 0 && normalized.selectedExperiences.length > 0) {
      const selectedExperiences = [...normalized.selectedExperiences].sort((a, b) => a.priority - b.priority);
      const renderedExperiences: any[] = [];

      selectedExperiences.forEach((selection) => {
        const $experience = $experienceSection
          .find('.experience-item')
          .filter((_, element) => $(element).attr('data-company') === selection.companyId)
          .first();

        if ($experience.length === 0) {
          return;
        }

        this.applyExperienceSelection($, $experience, selection);
        renderedExperiences.push($experience.clone());
      });

      if (renderedExperiences.length > 0) {
        $experienceSection.find('.experience-item').remove();
        renderedExperiences.forEach(($experience) => {
          $experienceSection.append($experience);
        });
      }
    }

    this.applySelectedSkills($, normalized);
    this.applySelectedCertifications($, normalized);

    const serializedHtml = $.html();
    const hasDoctype = /^<!DOCTYPE html>/i.test(templateHtml.trimStart());
    return hasDoctype ? `<!DOCTYPE html>\n${serializedHtml}` : serializedHtml;
  }

  /**
   * Compõe HTML completo do currículo baseado na seleção de conteúdo
   */
  async compose(
    role: string,
    contentSelection: ContentSelectionResult,
    _jobAnalysis?: JobAnalysisResult
  ): Promise<string> {
    try {
      void _jobAnalysis;
      const templateHtml = this.loadTemplate();
      const html = this.renderTemplateHtml(templateHtml, role, this.normalizeContentSelection(contentSelection));

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
    const normalized = this.normalizeContentSelection(contentSelection);
    const $ = cheerio.load(html);
    const includedAchievements = new Map<string, number[]>();
    const missingAchievements: Array<{ companyId: string; achievementIndices: number[] }> = [];

    let totalIncluded = 0;
    let totalExpected = 0;

    // Analisa cada experiência selecionada
    for (const exp of normalized.selectedExperiences) {
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
    const expanded = this.normalizeContentSelection(contentSelection);
    
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
    let bestHTML = '';
    let bestMeasurement: PDFMeasurement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let attemptsWithoutImprovement = 0;

    while (attempt < maxIterations) {
      attempt++;
      
      // Notifica progresso
      onProgress?.(`Gerando HTML (tentativa ${attempt}/${maxIterations})...`, attempt, maxIterations);

      // Se PDF está muito curto E não é a primeira tentativa, expande contentSelection programaticamente
      if (feedback && feedback.adjustment === 'expand' && attempt > 1) {
        const expandedContentSelection = this.expandContentSelection(adjustedContentSelection, attempt);

        if (JSON.stringify(expandedContentSelection) === JSON.stringify(adjustedContentSelection)) {
          console.log(chalk.yellow('⚠'), 'Todo o conteúdo disponível já foi incluído; encerrando ajustes de paginação.');
          attempt--;
          break;
        }

        adjustedContentSelection = expandedContentSelection;
        console.log(chalk.blue('ℹ'), `Expandindo conteúdo programaticamente (tentativa ${attempt})`);
        console.log(chalk.blue('  →'), `Adicionando mais conquistas às experiências`);
      } else if (feedback && feedback.adjustment === 'reduce' && attempt > 1) {
        adjustedContentSelection = this.reduceContentSelection(adjustedContentSelection, attempt);
        console.log(chalk.blue('ℹ'), `Reduzindo conteúdo programaticamente (tentativa ${attempt})`);
        console.log(chalk.blue('  →'), `Removendo conquistas menos prioritárias`);
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
        
        currentHTML = await this.composeWithFeedback(role, adjustedContentSelection, jobAnalysis, feedback);
      }

      // Mede altura do PDF
      onProgress?.(`Medindo altura do PDF (tentativa ${attempt}/${maxIterations})...`, attempt, maxIterations);
      
      const { measurement, tempPath } = await pdfGenerator.generateAndMeasure(currentHTML);
      lastMeasurement = measurement;
      
      // Limpa arquivo temporário
      pdfGenerator.cleanupTempFile(tempPath);

      // Verifica se está no range desejado
      const isWithinRange = pdfGenerator.isWithinDesiredRange(measurement);
      const distanceFromRange = measurement.heightInPages < config.iterativeLoop.minPages
        ? config.iterativeLoop.minPages - measurement.heightInPages
        : measurement.heightInPages > config.iterativeLoop.maxPages
          ? measurement.heightInPages - config.iterativeLoop.maxPages
          : 0;

      if (distanceFromRange < bestDistance) {
        bestDistance = distanceFromRange;
        bestHTML = currentHTML;
        bestMeasurement = measurement;
        attemptsWithoutImprovement = 0;
      } else {
        attemptsWithoutImprovement++;
      }
      
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

      if (attemptsWithoutImprovement >= 2) {
        console.log(chalk.yellow('⚠'), 'Paginação não melhorou em duas tentativas; usando o melhor resultado obtido.');
        break;
      }

      // Analisa conteúdo para criar feedback (usa adjustedContentSelection)
      const analysis = this.analyzeHTMLContent(currentHTML, adjustedContentSelection);
      
      // Cria feedback para próxima iteração
      feedback = this.createRegenerationFeedback(measurement, attempt, analysis);
    }

    // Não conseguiu convergir, retorna o melhor resultado
    return {
      html: bestHTML || currentHTML,
      attempts: attempt,
      finalMeasurement: bestMeasurement || lastMeasurement!,
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
    _jobAnalysis: JobAnalysisResult | undefined,
    _feedback: HTMLRegenerationFeedback
  ): Promise<string> {
    try {
      void _jobAnalysis;
      void _feedback;
      return await this.compose(role, contentSelection, _jobAnalysis);
    } catch (error) {
      throw new Error(
        `Erro ao compor HTML com feedback: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Reduz programaticamente a seleção de conteúdo para tentar diminuir o PDF
   */
  private reduceContentSelection(
    contentSelection: ContentSelectionResult,
    attempt: number
  ): ContentSelectionResult {
    const reduced = this.normalizeContentSelection(contentSelection);
    const achievementsToRemove = attempt === 2 ? 1 : attempt === 3 ? 2 : 3;

    const sortedExperiences = [...reduced.selectedExperiences].sort((a, b) => b.priority - a.priority);

    sortedExperiences.forEach((exp) => {
      const minimumToKeep = exp.priority <= 2 ? 3 : 2;
      const currentCount = exp.achievementsToHighlight.length;

      if (currentCount <= minimumToKeep) {
        return;
      }

      const targetCount = Math.max(minimumToKeep, currentCount - achievementsToRemove);
      exp.achievementsToHighlight = exp.achievementsToHighlight.slice(0, targetCount);
    });

    return reduced;
  }
}
