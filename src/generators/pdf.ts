import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import puppeteer, { type Page } from 'puppeteer';
import { config } from '../config.js';
import type { PDFMeasurement } from '../types.js';

/**
 * Gerador de PDF via Puppeteer
 */
export class PDFGenerator {
  /**
   * Mede altura real do conteúdo renderizado em páginas
   * Mede altura em pixels do conteúdo e converte para páginas usando valores do config
   * 
   * @param page - Página do Puppeteer com conteúdo renderizado
   * @returns Altura em páginas (valor decimal, ex: 1.3, 1.9, 2.2)
   */
  private async measureContentHeightReal(page: Page): Promise<number> {
    const { measurement, pageHeightMm } = config.iterativeLoop;
    
    // Mede altura em pixels do conteúdo renderizado
    // document está disponível no contexto do browser onde evaluate() executa
    // Usamos uma função inline para evitar erros de tipo do TypeScript
    const heightPx = await page.evaluate(() => {
      // @ts-ignore - document está disponível no contexto do browser
      const doc = document;
      const body = doc.body;
      const html = doc.documentElement;
      
      // Obtém a maior altura entre body e html para capturar todo o conteúdo
      // scrollHeight geralmente é o mais preciso pois captura todo o conteúdo, incluindo overflow
      const maxHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      
      return maxHeight;
    });
    
    // Converte pixels para mm usando fator de conversão do config
    const heightMm = heightPx * measurement.mmPerPx;
    
    // Calcula altura em páginas dividindo pela altura útil de 1 página
    const heightInPages = heightMm / pageHeightMm;
    
    return heightInPages;
  }

  /**
   * Verifica se o PDF está dentro do range desejado (1.9-2.2 páginas)
   * 
   * @param measurement - Medição do PDF
   * @returns true se está dentro do range
   */
  isWithinDesiredRange(measurement: PDFMeasurement): boolean {
    const { minPages, maxPages } = config.iterativeLoop;
    return measurement.heightInPages >= minPages && measurement.heightInPages <= maxPages;
  }

  /**
   * Prepara HTML para geração de PDF, removendo padding/margin conflitantes
   * Garante que apenas as margens do PDF sejam aplicadas
   */
  private prepareHTMLForPDF(html: string): string {
    const $ = cheerio.load(html);
    
    // Injeta CSS que sobrescreve padding/margin do body para PDF
    // Isso garante que apenas as margens do PDF sejam aplicadas
    const pdfOverrideCSS = `
      /* Override para PDF - remove padding/margin do HTML */
      @media print {
        html {
          padding: 0 !important;
          margin: 0 !important;
        }
        body {
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-shadow: none !important;
        }
      }
      /* Garante que mesmo fora do @media print, para PDF o body não tenha padding */
      body {
        box-sizing: border-box;
      }
    `;
    
    // Adiciona ou atualiza style para PDF
    if ($('style').length > 0) {
      $('style').last().append(pdfOverrideCSS);
    } else {
      $('head').append(`<style>${pdfOverrideCSS}</style>`);
    }
    
    return $.html();
  }

  /**
   * Gera PDF temporário e retorna medição da altura
   * Útil para o loop iterativo
   * Mede altura real do conteúdo ANTES de gerar o PDF para maior precisão
   * 
   * @param html - HTML a ser convertido
   * @param options - Opções de geração
   * @returns Medição do PDF gerado
   */
  async generateAndMeasure(
    html: string,
    options?: {
      format?: 'A4' | 'Letter';
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
    }
  ): Promise<{ measurement: PDFMeasurement; tempPath: string }> {
    // Cria arquivo temporário
    const tempDir = path.join(process.cwd(), 'output', '.temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `temp-${Date.now()}.pdf`);

    // Prepara HTML removendo padding/margin conflitantes
    const preparedHTML = this.prepareHTMLForPDF(html);

    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Emula print media para garantir que @media print seja aplicado
      await page.emulateMediaType('print');

      await page.setContent(preparedHTML, {
        waitUntil: 'networkidle0',
      });

      // Aguarda um pouco para garantir que todo o conteúdo foi renderizado
      // Isso é importante para obter medidas precisas, especialmente para CSS @media print
      await page.waitForTimeout(100);

      // MEDE ALTURA REAL ANTES de gerar o PDF
      // Isso permite cálculo preciso de heightInPages com decimais (1.3, 1.9, 2.2)
      const heightInPages = await this.measureContentHeightReal(page);
      const { pageHeightMm } = config.iterativeLoop;
      const heightMm = heightInPages * pageHeightMm;
      const pageCount = Math.ceil(heightInPages);

      // Gera PDF (para validação/arquivo final)
      await page.pdf({
        path: tempPath,
        format: options?.format || config.pdf.defaultFormat,
        margin: options?.margin || config.pdf.defaultMargins,
        printBackground: true,
        preferCSSPageSize: false,
      });

      const measurement: PDFMeasurement = {
        pageCount,
        heightMm,
        heightInPages,
      };

      return { measurement, tempPath };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Remove arquivo temporário de PDF
   */
  cleanupTempFile(tempPath: string): void {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (error) {
      // Ignora erros de limpeza
    }
  }

  /**
   * Ajusta HTML para reduzir tamanho APENAS quando necessário (após verificar que excedeu 2.2 páginas)
   * Estratégia conservadora: reduz pouco a pouco, mantendo o máximo de conteúdo possível
   */
  private adjustHTMLForPageLimit(html: string, attempt: number): string {
    const $ = cheerio.load(html);
    
    const { reductionFactors, maxExperiencesVisible } = config.pdf;
    const reductionFactor = reductionFactors[attempt - 1] || reductionFactors[reductionFactors.length - 1];
    
    // Estratégias progressivas e conservadoras baseadas na tentativa
    // Tenta manter o máximo de conteúdo, reduzindo apenas o necessário
    if (attempt === 1) {
      // Tentativa 1: Reduz espaçamentos levemente, mantém fontes normais
      const compactCSS = `
        /* Compactação muito leve - apenas espaçamentos */
        .section { margin-bottom: ${(16 * reductionFactor).toFixed(1)}px !important; }
        .experience-item { margin-bottom: ${(12 * reductionFactor).toFixed(1)}px !important; padding-bottom: ${(10 * reductionFactor).toFixed(1)}px !important; }
        .achievement { margin-bottom: ${(3.5 * reductionFactor).toFixed(1)}px !important; }
        .summary { margin-bottom: ${(16 * reductionFactor).toFixed(1)}px !important; }
      `;
      $('style').last().append(compactCSS);
    } else if (attempt === 2) {
      // Tentativa 2: Reduz fontes levemente e espaçamentos mais
      const compactCSS = `
        /* Compactação leve - reduz fontes levemente */
        body { font-size: ${(9.8 * reductionFactor).toFixed(1)}pt !important; line-height: 1.48 !important; }
        .section { margin-bottom: ${(14 * reductionFactor).toFixed(1)}px !important; }
        .experience-item { margin-bottom: ${(11 * reductionFactor).toFixed(1)}px !important; padding-bottom: ${(9 * reductionFactor).toFixed(1)}px !important; }
        .achievement { margin-bottom: ${(3 * reductionFactor).toFixed(1)}px !important; font-size: ${(9.2 * reductionFactor).toFixed(1)}pt !important; line-height: 1.45 !important; }
        .summary { margin-bottom: ${(14 * reductionFactor).toFixed(1)}px !important; }
      `;
      $('style').last().append(compactCSS);
    } else if (attempt === 3) {
      // Tentativa 3: Reduz achievements por experiência APENAS das experiências menos prioritárias
      // Mantém pelo menos 3-4 conquistas nas principais
      const visibleExperiences = $('.experience-item:not(.hidden)').toArray();
      
      visibleExperiences.forEach((expEl, index) => {
        const $exp = $(expEl);
        const achievements = $exp.find('.achievement:not(.hidden)').toArray();
        
        // Apenas reduz conquistas se houver mais de 4 e for experiência secundária/terciária
        // Mantém mais conquistas nas primeiras experiências (mais relevantes)
        if (index >= 2 && achievements.length > 3) {
          // Para experiências secundárias/terciárias, mantém 3 conquistas
          achievements.slice(3).forEach((achEl) => {
            $(achEl).addClass('hidden');
          });
        } else if (achievements.length > 4) {
          // Para experiências principais, mantém 4 conquistas
          achievements.slice(4).forEach((achEl) => {
            $(achEl).addClass('hidden');
          });
        }
      });
      const compactCSS = `
        /* Compactação agressiva */
        body { font-size: ${(9.5 * reductionFactor).toFixed(1)}pt !important; line-height: 1.4 !important; }
        .section { margin-bottom: ${(12 * reductionFactor).toFixed(1)}px !important; }
        .experience-item { margin-bottom: ${(10 * reductionFactor).toFixed(1)}px !important; padding-bottom: ${(8 * reductionFactor).toFixed(1)}px !important; }
        .achievement { margin-bottom: ${(2 * reductionFactor).toFixed(1)}px !important; font-size: ${(8.5 * reductionFactor).toFixed(1)}pt !important; line-height: 1.35 !important; }
      `;
      $('style').last().append(compactCSS);
    } else if (attempt === 4) {
      // Tentativa 4: Oculta última experiência menos prioritária
      const visibleExperiences = $('.experience-item:not(.hidden)').toArray();
      const maxExperiences = maxExperiencesVisible[0];
      if (visibleExperiences.length > maxExperiences) {
        // Oculta a última experiência (menos prioritária)
        $(visibleExperiences[visibleExperiences.length - 1]).addClass('hidden');
      }
      const compactCSS = `
        /* Compactação muito agressiva */
        body { font-size: ${(9 * reductionFactor).toFixed(1)}pt !important; line-height: 1.35 !important; padding: 8mm 12mm !important; }
        .section { margin-bottom: ${(10 * reductionFactor).toFixed(1)}px !important; }
        .experience-item { margin-bottom: ${(8 * reductionFactor).toFixed(1)}px !important; padding-bottom: ${(6 * reductionFactor).toFixed(1)}px !important; }
        .achievement { margin-bottom: ${(2 * reductionFactor).toFixed(1)}px !important; font-size: ${(8 * reductionFactor).toFixed(1)}pt !important; }
      `;
      $('style').last().append(compactCSS);
    } else {
      // Tentativa 5: Última tentativa - máxima compactação e oculta mais uma experiência se necessário
      const visibleExperiences = $('.experience-item:not(.hidden)').toArray();
      const maxExperiences = maxExperiencesVisible[1];
      if (visibleExperiences.length > maxExperiences) {
        // Oculta mais experiências, mantendo apenas as N mais prioritárias
        visibleExperiences.slice(maxExperiences).forEach((expEl) => {
          $(expEl).addClass('hidden');
        });
      }
      const compactCSS = `
        /* Compactação máxima */
        body { font-size: ${(8.5 * reductionFactor).toFixed(1)}pt !important; line-height: 1.3 !important; padding: 8mm 10mm !important; }
        .section { margin-bottom: ${(8 * reductionFactor).toFixed(1)}px !important; }
        .experience-item { margin-bottom: ${(6 * reductionFactor).toFixed(1)}px !important; padding-bottom: ${(4 * reductionFactor).toFixed(1)}px !important; }
        .achievement { margin-bottom: ${(1 * reductionFactor).toFixed(1)}px !important; font-size: ${(7.5 * reductionFactor).toFixed(1)}pt !important; line-height: 1.3 !important; }
        .header { padding-bottom: ${(10 * reductionFactor).toFixed(1)}px !important; margin-bottom: ${(12 * reductionFactor).toFixed(1)}px !important; }
      `;
      $('style').last().append(compactCSS);
    }
    
    return $.html();
  }

  /**
   * Gera PDF a partir de HTML com limite de 2.2 páginas
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
    const maxPages = options?.maxPages ?? config.pdf.defaultMaxPages;
    let currentHTML = html;
    let attempt = 0;
    const maxAttempts = config.pdf.maxAttempts;

    let browser;

    try {
      // Inicia browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Emula print media para garantir que @media print seja aplicado
      await page.emulateMediaType('print');

      // Garante que diretório existe
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Tenta gerar PDF até ter no máximo maxPages páginas
      while (attempt < maxAttempts) {
        // Prepara HTML removendo padding/margin conflitantes
        const preparedHTML = this.prepareHTMLForPDF(currentHTML);
        
        // Configura conteúdo
        await page.setContent(preparedHTML, {
          waitUntil: 'networkidle0',
        });

        // Aguarda um pouco para garantir que todo o conteúdo foi renderizado
        // Isso é importante para obter medidas precisas, especialmente para CSS @media print
        await page.waitForTimeout(100);

        // MEDE ALTURA REAL ANTES de gerar o PDF
        // Isso permite verificação precisa do limite usando heightInPages com decimais
        const heightInPages = await this.measureContentHeightReal(page);
        
        // Verifica se está dentro do limite usando altura real medida
        if (heightInPages <= maxPages) {
          // Gera PDF (está dentro do limite)
          await page.pdf({
            path: outputPath,
            format: options?.format || config.pdf.defaultFormat,
            margin: options?.margin || config.pdf.defaultMargins,
            printBackground: true,
            preferCSSPageSize: false,
          });
          
          // PDF está dentro do limite (2.2 páginas ou menos), retorna imediatamente
          // NÃO ajusta se estiver dentro do limite - aproveita todo o espaço disponível
          return outputPath;
        }

        // Se excedeu o limite (mais de maxPages páginas), ajusta HTML e tenta novamente
        // Ajuste só acontece APÓS verificar que excedeu - não é preventivo
        attempt++;
        currentHTML = this.adjustHTMLForPageLimit(currentHTML, attempt);
        
        // Se ainda há tentativas, continua o loop (não gera PDF ainda)
        if (attempt < maxAttempts) {
          continue;
        }
        
        // Última tentativa - gera PDF mesmo se exceder o limite
        await page.pdf({
          path: outputPath,
          format: options?.format || config.pdf.defaultFormat,
          margin: options?.margin || config.pdf.defaultMargins,
          printBackground: true,
          preferCSSPageSize: false,
        });

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