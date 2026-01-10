import * as cheerio from 'cheerio';
import fs from 'fs';

/**
 * Utilitário para extrair perfil do candidato do template HTML
 */
export class ProfileExtractor {
  /**
   * Extrai informações básicas do perfil do template HTML
   */
  static extractProfileFromHtml(html: string): {
    name: string;
    title: string;
    summary: string;
    profileText: string;
  } {
    const $ = cheerio.load(html);

    // Extrai nome do header
    const name = $('.header h1').text().trim() || 'Candidato';

    // Extrai título do header
    const title = $('.header .title').text().trim() || '';

    // Extrai resumo
    const summary = $('.summary').text().trim() || '';

    // Gera perfil textual a partir das informações do HTML
    const profileText = this.generateProfileText($, name, title, summary);

    return {
      name,
      title,
      summary,
      profileText,
    };
  }

  /**
   * Gera texto de perfil a partir do HTML parseado
   */
  private static generateProfileText(
    $: cheerio.CheerioAPI,
    _name: string,
    title: string,
    summary: string
  ): string {
    const parts: string[] = [];

    // Adiciona título e nome se disponível
    if (title) {
      parts.push(title);
    }

    // Adiciona resumo se disponível
    if (summary) {
      parts.push(summary);
    }

    // Extrai informações das experiências mais recentes
    const experiences: string[] = [];
    $('.experience-item').slice(0, 3).each((_, element) => {
      const $exp = $(element);
      const jobTitle = $exp.find('.job-title').text().trim();
      const companyName = $exp.find('.company-name').text().trim();
      const period = $exp.find('.period').text().trim();

      if (jobTitle && companyName) {
        experiences.push(`${jobTitle} (${companyName}${period ? ` - ${period}` : ''})`);
      }

      // Extrai algumas conquistas principais
      const achievements: string[] = [];
      $exp.find('.achievement').slice(0, 2).each((_, achEl) => {
        const achievementText = $(achEl).text().trim();
        if (achievementText) {
          achievements.push(achievementText);
        }
      });

      if (achievements.length > 0) {
        experiences.push(`  Conquistas: ${achievements.join('; ')}`);
      }
    });

    if (experiences.length > 0) {
      parts.push('Principais experiências:');
      parts.push(...experiences);
    }

    // Extrai stack principal das skills
    const techStack: string[] = [];
    $('.skill-category').each((_, element) => {
      const $cat = $(element);
      const categoryTitle = $cat.find('.skill-category-title').text().trim();
      const skills = $cat.find('.skill-list').text().trim();

      if (categoryTitle && skills) {
        techStack.push(`${categoryTitle}: ${skills}`);
      }
    });

    if (techStack.length > 0) {
      parts.push('Stack principal:');
      parts.push(techStack.slice(0, 5).join(', '));
    }

    return parts.join('\n').trim() || 'Perfil do candidato extraído do currículo base.';
  }

  /**
   * Carrega template HTML e extrai perfil
   */
  static extractFromTemplate(templatePath: string): {
    name: string;
    title: string;
    summary: string;
    profileText: string;
  } {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    const html = fs.readFileSync(templatePath, 'utf-8');
    return this.extractProfileFromHtml(html);
  }
}
