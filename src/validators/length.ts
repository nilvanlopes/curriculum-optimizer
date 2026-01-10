import pdfParse from 'pdf-parse';
import fs from 'fs';
import { config } from '../config.js';

/**
 * Validador de comprimento do currículo
 */
export class LengthValidator {
  /**
   * Valida comprimento do PDF (páginas e conteúdo)
   */
  async validate(pdfPath: string): Promise<{
    pageCount: number;
    wordCount: number;
    charCount: number;
    passed: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF não encontrado: ${pdfPath}`);
      }

      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);

      const pageCount = pdfData.numpages;
      const text = pdfData.text;
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
      const charCount = text.length;

      const { minWords, maxWords, maxPages, minChars, maxChars } = config.validation.length;

      // Validação de páginas (ideal: 1-2 páginas)
      if (pageCount < 1) {
        warnings.push('PDF tem menos de 1 página - pode estar vazio');
      } else if (pageCount > maxPages) {
        warnings.push(`PDF tem ${pageCount} páginas. Ideal para ATS: 1-${maxPages} páginas`);
        suggestions.push(`Considere reduzir conteúdo menos relevante para manter em ${maxPages} páginas`);
      }

      // Validação de palavras (ideal: 400-800 palavras)
      if (wordCount < minWords) {
        warnings.push(`Currículo muito curto (${wordCount} palavras). Pode estar faltando informações importantes`);
        suggestions.push('Adicione mais detalhes sobre experiências e conquistas');
      } else if (wordCount > maxWords) {
        warnings.push(`Currículo muito longo (${wordCount} palavras). Pode ser difícil para recrutadores`);
        suggestions.push('Considere condensar informações menos críticas');
      }

      // Validação de caracteres
      if (charCount < minChars) {
        warnings.push('Currículo muito curto em caracteres');
      } else if (charCount > maxChars) {
        warnings.push('Currículo muito longo em caracteres');
      }

      const passed = pageCount <= maxPages && wordCount >= minWords && wordCount <= maxWords;

      return {
        pageCount,
        wordCount,
        charCount,
        passed,
        warnings,
        suggestions,
      };
    } catch (error) {
      throw new Error(`Erro ao validar comprimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}