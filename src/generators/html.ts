import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import type { TemplateType, ContentSelectionResult } from '../types.js';
import type { JobAnalysisResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gerador de HTML customizado
 */
export class HTMLGenerator {
  private templatePath: string;
  private metadataPath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../templates/base-curriculum.html');
    this.metadataPath = path.join(__dirname, '../templates/metadata.json');
  }

  /**
   * Carrega template base e metadata
   */
  loadTemplate(): { html: string; metadata: Record<string, unknown> } {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template não encontrado: ${this.templatePath}`);
    }
    if (!fs.existsSync(this.metadataPath)) {
      throw new Error(`Metadata não encontrado: ${this.metadataPath}`);
    }

    const html = fs.readFileSync(this.templatePath, 'utf-8');
    const metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf-8'));

    return { html, metadata };
  }

  /**
   * Aplica template específico (cores, título)
   */
  private applyTemplate($: cheerio.CheerioAPI, template: TemplateType, metadata: Record<string, unknown>): void {
    const templates = (metadata.templates as Record<string, unknown>) || {};
    const templateConfig = templates[template] as Record<string, unknown> | undefined;

    if (!templateConfig) {
      throw new Error(`Template ${template} não encontrado no metadata`);
    }

    // Atualiza classe do body
    $('body').removeClass('template-tech-lead template-senior-frontend template-fullstack');
    $('body').addClass(`template-${template}`);
    $('body').attr('data-template', template);

    // Atualiza cor do accent no CSS
    const accentColor = (templateConfig.color as string) || '#2563eb';
    $('style').text($('style').text().replace(
      /--accent-color:\s*#[0-9a-fA-F]+/,
      `--accent-color: ${accentColor}`
    ));

    // Atualiza título
    const title = (templateConfig.title as string) || '';
    if (title) {
      $('.header .title').text(title);
    }
  }

  /**
   * Atualiza seção summary com texto personalizado
   */
  private updateSummary($: cheerio.CheerioAPI, summaryText: string): void {
    // Melhor formatação: tenta encontrar a primeira palavra importante para destacar
    const words = summaryText.split(' ');
    if (words.length > 3) {
      // Pega as primeiras 2-3 palavras como strong (geralmente o título/cargo)
      const strongPart = words.slice(0, Math.min(3, words.length)).join(' ');
      const restPart = words.slice(3).join(' ');
      $('.summary').html(`<strong>${strongPart}</strong> ${restPart}`);
    } else {
      // Se for muito curto, apenas coloca tudo
      $('.summary').text(summaryText);
    }
  }

  /**
   * Reordena experiências baseado na seleção
   */
  private reorderExperiences($: cheerio.CheerioAPI, selection: ContentSelectionResult): void {
    // Encontra a seção de experiências (a que contém .experience-item)
    let experienceContainer: cheerio.Cheerio<cheerio.Element> | null = null;
    
    $('.section').each((_, el) => {
      if ($(el).find('.experience-item').length > 0) {
        experienceContainer = $(el);
        return false; // break
      }
    });
    
    if (!experienceContainer || experienceContainer.length === 0) {
      // Fallback: usa primeira seção
      experienceContainer = $('.section').first();
    }
    
    const experiences = $('.experience-item').toArray();

    // Mapeia companyId para elemento
    const experienceMap = new Map<string, cheerio.Element>();
    experiences.forEach((el) => {
      const $el = $(el);
      const companyId = $el.attr('data-company');
      if (companyId) {
        experienceMap.set(companyId, el);
      }
    });

    // Remove todas as experiências
    $('.experience-item').remove();

    // Adiciona na ordem de prioridade
    const sortedExperiences = selection.selectedExperiences.sort((a, b) => a.priority - b.priority);

    sortedExperiences.forEach((selected) => {
      const experienceEl = experienceMap.get(selected.companyId);
      if (experienceEl) {
        const $exp = $(experienceEl);

        // Destaca conquistas específicas se necessário
        if (selected.achievementsToHighlight && selected.achievementsToHighlight.length > 0) {
          $exp.find('.achievement').each((index, achEl) => {
            const $ach = $(achEl);
            if (!selected.achievementsToHighlight.includes(index)) {
              $ach.addClass('hidden');
            }
          });
        }

        // Adiciona de volta ao container
        experienceContainer.append($exp);
      }
    });

    // Adiciona experiências não selecionadas no final (ocultas ou visíveis)
    experiences.forEach((el) => {
      const $el = $(el);
      const companyId = $el.attr('data-company');
      if (companyId && !selection.selectedExperiences.some((s) => s.companyId === companyId)) {
        $el.addClass('hidden');
        experienceContainer.append($el);
      }
    });
  }

  /**
   * Reordena skills baseado na seleção
   */
  private reorderSkills($: cheerio.CheerioAPI, selection: ContentSelectionResult): void {
    if (!selection.reorderedSkills || selection.reorderedSkills.length === 0) {
      return;
    }

    const skillsGrid = $('.skills-grid');
    const skillCategories = $('.skill-category').toArray();

    // Mapeia categoria para elemento
    const categoryMap = new Map<string, cheerio.Element>();
    skillCategories.forEach((el) => {
      const $el = $(el);
      const category = $el.attr('data-category');
      if (category) {
        categoryMap.set(category, el);
      }
    });

    // Remove todas as categorias
    $('.skill-category').remove();

    // Adiciona na ordem especificada
    selection.reorderedSkills.forEach((categoryId) => {
      const categoryEl = categoryMap.get(categoryId);
      if (categoryEl) {
        skillsGrid.append(categoryEl);
      }
    });

    // Adiciona categorias não mencionadas no final
    categoryMap.forEach((el, categoryId) => {
      if (!selection.reorderedSkills.includes(categoryId)) {
        skillsGrid.append(el);
      }
    });
  }

  /**
   * Gera HTML otimizado
   */
  async generate(
    template: TemplateType,
    selection: ContentSelectionResult,
    summaryText?: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const { html, metadata } = this.loadTemplate();
      const $ = cheerio.load(html);

      // Aplica template (cores, título)
      this.applyTemplate($, template, metadata);

      // Atualiza summary se fornecido
      if (summaryText) {
        this.updateSummary($, summaryText);
      }

      // Reordena experiências
      this.reorderExperiences($, selection);

      // Reordena skills
      this.reorderSkills($, selection);

      const finalHtml = $.html();

      // Salva arquivo se path fornecido
      if (outputPath) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, finalHtml, 'utf-8');
      }

      return finalHtml;
    } catch (error) {
      throw new Error(`Erro ao gerar HTML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}