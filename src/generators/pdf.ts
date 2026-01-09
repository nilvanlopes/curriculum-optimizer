import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import puppeteer from 'puppeteer';

/**
 * Gerador de PDF via Puppeteer
 */
export class PDFGenerator {
  /**
   * Verifica número de páginas do PDF
   */
  private async getPageCount(pdfPath: string): Promise<number> {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      return data.numpages;
    } catch (error) {
      // Se não conseguir ler, assume 1 página
      return 1;
    }
  }

  /**
   * Ajusta HTML para reduzir tamanho (reduz espaçamentos, fontes, etc)
   */
  private adjustHTMLForPageLimit(html: string, attempt: number): string {
    const $ = cheerio.load(html);
    
    // Injeta CSS para reduzir tamanho progressivamente
    const reductionFactor = Math.min(0.85 + (attempt * 0.05), 0.95); // Reduz até 5-15%
    
    let existingStyle = $('style').last().html() || '';
    
    const compactCSS = `
      /* Compactação automática para limitar páginas */
      body {
        font-size: ${(14 * reductionFactor).toFixed(1)}px !important;
        line-height: 1.4 !important;
      }
      .section {
        margin-bottom: ${(20 * reductionFactor).toFixed(1)}px !important;
      }
      .experience-item {
        margin-bottom: ${(15 * reductionFactor).toFixed(1)}px !important;
        padding-bottom: ${(10 * reductionFactor).toFixed(1)}px !important;
      }
      .experience-item h3 {
        font-size: ${(16 * reductionFactor).toFixed(1)}px !important;
        margin-bottom: ${(5 * reductionFactor).toFixed(1)}px !important;
      }
      .experience-item p, .experience-item li {
        font-size: ${(13 * reductionFactor).toFixed(1)}px !important;
        margin-bottom: ${(4 * reductionFactor).toFixed(1)}px !important;
      }
      .summary {
        margin-bottom: ${(15 * reductionFactor).toFixed(1)}px !important;
        padding: ${(10 * reductionFactor).toFixed(1)}px !important;
      }
      .header {
        padding-bottom: ${(15 * reductionFactor).toFixed(1)}px !important;
        margin-bottom: ${(15 * reductionFactor).toFixed(1)}px !important;
      }
      .skills-grid {
        gap: ${(8 * reductionFactor).toFixed(1)}px !important;
      }
      .skill-category {
        margin-bottom: ${(10 * reductionFactor).toFixed(1)}px !important;
      }
      ul, ol {
        margin-top: ${(5 * reductionFactor).toFixed(1)}px !important;
        margin-bottom: ${(5 * reductionFactor).toFixed(1)}px !important;
        padding-left: ${(20 * reductionFactor).toFixed(1)}px !important;
      }
      li {
        margin-bottom: ${(3 * reductionFactor).toFixed(1)}px !important;
      }
    `;
    
    // Adiciona ou atualiza style tag
    if ($('style').length === 0) {
      $('head').append(`<style>${compactCSS}</style>`);
    } else {
      $('style').last().append(compactCSS);
    }
    
    return $.html();
  }

  /**
   * Gera PDF a partir de HTML com limite de 2 páginas
   */
  async generate(
    html: string,
    outputPath: string,
    options?: {
      format?: 'A4' | 'Letter';
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
      maxPages?: number;
    }
  ): Promise<string> {
    const maxPages = options?.maxPages ?? 2;
    let currentHTML = html;
    let attempt = 0;
    const maxAttempts = 5; // Limita tentativas para evitar loop infinito

    let browser;

    try {
      // Inicia browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Garante que diretório existe
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Tenta gerar PDF até ter no máximo maxPages páginas
      while (attempt < maxAttempts) {
        // Configura conteúdo
        await page.setContent(currentHTML, {
          waitUntil: 'networkidle0',
        });

        // Gera PDF
        await page.pdf({
          path: outputPath,
          format: options?.format || 'A4',
          margin: options?.margin || {
            top: '10mm', // Margens menores para economizar espaço
            right: '10mm',
            bottom: '10mm',
            left: '10mm',
          },
          printBackground: true,
          preferCSSPageSize: false,
        });

        // Verifica número de páginas
        const pageCount = await this.getPageCount(outputPath);
        
        if (pageCount <= maxPages) {
          // PDF está dentro do limite, retorna
          return outputPath;
        }

        // Se excedeu o limite, ajusta HTML e tenta novamente
        attempt++;
        currentHTML = this.adjustHTMLForPageLimit(html, attempt);
      }

      // Se chegou aqui, ainda tem mais páginas, mas já tentou o máximo
      // Retorna mesmo assim (melhor ter PDF com mais páginas do que falhar)
      return outputPath;
    } catch (error) {
      throw new Error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Gera PDF diretamente de um arquivo HTML
   */
  async generateFromHTMLFile(htmlPath: string, outputPath: string, options?: Parameters<PDFGenerator['generate']>[2]): Promise<string> {
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Arquivo HTML não encontrado: ${htmlPath}`);
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    return this.generate(html, outputPath, options);
  }
}