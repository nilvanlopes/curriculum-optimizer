import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { aiClient } from '../../utils/ai-client.js';
import type { JobAnalysisResult, ContentSelectionResult } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seletor de conteúdo para otimização de currículo
 */
export class ContentSelector {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../../templates/base-curriculum.html');
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
   * Extrai informações estruturadas do HTML usando Cheerio
   */
  private extractCurriculumData(html: string): string {
    const $ = cheerio.load(html);
    const data: {
      experiences: Array<{
        companyId: string;
        companyName: string;
        jobTitle: string;
        period: string;
        keywords: string;
        achievements: Array<{
          text: string;
          category: string;
          impact: string;
          keywords: string;
        }>;
        techStack: string[];
      }>;
      skills: Array<{
        category: string;
        skills: string;
      }>;
    } = {
      experiences: [],
      skills: [],
    };

    // Extrai experiências
    $('.experience-item').each((_, element) => {
      const $exp = $(element);
      const companyId = $exp.attr('data-company') || '';
      const companyName = $exp.find('.company-name').text().trim();
      const jobTitle = $exp.find('.job-title').text().trim();
      const period = $exp.find('.period').text().trim();
      const keywords = $exp.attr('data-keywords') || '';

      const achievements: Array<{
        text: string;
        category: string;
        impact: string;
        keywords: string;
      }> = [];

      $exp.find('.achievement').each((_, achEl) => {
        const $ach = $(achEl);
        achievements.push({
          text: $ach.text().trim(),
          category: $ach.attr('data-category') || '',
          impact: $ach.attr('data-impact') || '',
          keywords: $ach.attr('data-keywords') || '',
        });
      });

      const techStack: string[] = [];
      $exp.find('.tech-tag').each((_, tagEl) => {
        techStack.push($(tagEl).text().trim());
      });

      data.experiences.push({
        companyId,
        companyName,
        jobTitle,
        period,
        keywords,
        achievements,
        techStack,
      });
    });

    // Extrai skills
    $('.skill-category').each((_, element) => {
      const $cat = $(element);
      data.skills.push({
        category: $cat.attr('data-category') || '',
        skills: $cat.find('.skill-list').text().trim(),
      });
    });

    return JSON.stringify(data, null, 2);
  }

  /**
   * Seleciona e prioriza conteúdo baseado na análise da vaga
   */
  async selectContent(jobAnalysis: JobAnalysisResult): Promise<ContentSelectionResult> {
    try {
      // Carrega template
      const html = this.loadTemplate();
      
      // Extrai dados estruturados
      const curriculumData = this.extractCurriculumData(html);

      // Prepara análise formatada para o prompt
      const analysisFormatted = JSON.stringify(jobAnalysis, null, 2);

      // Chama IA para seleção
      const result = await aiClient.callJSON<ContentSelectionResult>(
        '02-selecao-conteudo.md',
        {
          jobAnalysis: analysisFormatted,
          curriculumHtml: html,
        },
        {
          maxTokens: 4096,
          temperature: 0.4,
        }
      );

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao selecionar conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}