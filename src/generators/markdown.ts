import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * Gerador de Markdown/texto simples para campos de texto (Gupy, etc)
 */
export class MarkdownGenerator {
  /**
   * Converte HTML para formato de texto simples
   */
  convertHTMLToMarkdown(html: string): string {
    const $ = cheerio.load(html);
    let markdown = '';

    // Header
    const name = $('h1').text().trim();
    const title = $('.header .title').text().trim();
    markdown += `${name}\n${title}\n\n`;

    // Contato
    const contactItems: string[] = [];
    $('.contact-info .item').each((_, el) => {
      const text = $(el).text().trim();
      if (text) contactItems.push(text);
    });
    if (contactItems.length > 0) {
      markdown += contactItems.join(' | ') + '\n\n';
    }

    // Summary
    const summary = $('.summary').text().trim();
    if (summary) {
      markdown += `${summary}\n\n`;
    }

    // Experiência
    markdown += 'EXPERIÊNCIA PROFISSIONAL\n';
    markdown += '═'.repeat(50) + '\n\n';

    $('.experience-item:not(.hidden)').each((_, el) => {
      const $exp = $(el);
      const jobTitle = $exp.find('.job-title').text().trim();
      const companyName = $exp.find('.company-name').text().trim();
      const period = $exp.find('.period').text().trim();

      markdown += `${jobTitle}\n`;
      markdown += `${companyName} - ${period}\n\n`;

      $exp.find('.achievement:not(.hidden)').each((_, achEl) => {
        const achievement = $(achEl).text().trim();
        markdown += `• ${achievement}\n`;
      });

      markdown += '\n';
    });

    // Skills
    markdown += 'COMPETÊNCIAS TÉCNICAS\n';
    markdown += '═'.repeat(50) + '\n\n';

    $('.skill-category:not(.hidden)').each((_, el) => {
      const $cat = $(el);
      const categoryTitle = $cat.find('.skill-category-title').text().trim();
      const skills = $cat.find('.skill-list').text().trim();

      if (categoryTitle && skills) {
        markdown += `${categoryTitle}: ${skills}\n`;
      }
    });

    markdown += '\n';

    // Formação
    const degree = $('.degree').text().trim();
    const institution = $('.institution').text().trim();
    if (degree || institution) {
      markdown += 'FORMAÇÃO ACADÊMICA\n';
      markdown += '═'.repeat(50) + '\n\n';
      if (degree) markdown += `${degree}\n`;
      if (institution) markdown += `${institution}\n`;
      markdown += '\n';
    }

    // Idiomas
    const languages = $('.section:last-child .skill-list').text().trim();
    if (languages) {
      markdown += 'IDIOMAS\n';
      markdown += '═'.repeat(50) + '\n\n';
      markdown += `${languages}\n`;
    }

    return markdown.trim();
  }

  /**
   * Gera arquivo markdown/texto
   */
  async generate(html: string, outputPath: string): Promise<string> {
    try {
      const markdown = this.convertHTMLToMarkdown(html);

      // Garante que diretório existe
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Salva arquivo
      fs.writeFileSync(outputPath, markdown, 'utf-8');

      return outputPath;
    } catch (error) {
      throw new Error(`Erro ao gerar Markdown: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gera markdown diretamente de arquivo HTML
   */
  async generateFromHTMLFile(htmlPath: string, outputPath: string): Promise<string> {
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Arquivo HTML não encontrado: ${htmlPath}`);
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    return this.generate(html, outputPath);
  }
}