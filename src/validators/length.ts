import pdfParse from 'pdf-parse';
import fs from 'fs';

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

      // Validação de páginas (ideal: 1-2 páginas)
      if (pageCount < 1) {
        warnings.push('PDF tem menos de 1 página - pode estar vazio');
      } else if (pageCount > 2) {
        warnings.push(`PDF tem ${pageCount} páginas. Ideal para ATS: 1-2 páginas`);
        suggestions.push('Considere reduzir conteúdo menos relevante para manter em 2 páginas');
      }

      // Validação de palavras (ideal: 400-800 palavras)
      if (wordCount < 300) {
        warnings.push(`Currículo muito curto (${wordCount} palavras). Pode estar faltando informações importantes`);
        suggestions.push('Adicione mais detalhes sobre experiências e conquistas');
      } else if (wordCount > 1000) {
        warnings.push(`Currículo muito longo (${wordCount} palavras). Pode ser difícil para recrutadores`);
        suggestions.push('Considere condensar informações menos críticas');
      }

      // Validação de caracteres
      if (charCount < 2000) {
        warnings.push('Currículo muito curto em caracteres');
      } else if (charCount > 5000) {
        warnings.push('Currículo muito longo em caracteres');
      }

      const passed = pageCount <= 2 && wordCount >= 300 && wordCount <= 1000;

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