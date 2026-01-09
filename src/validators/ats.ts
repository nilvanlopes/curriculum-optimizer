import pdfParse from 'pdf-parse';
import fs from 'fs';

/**
 * Validador de compatibilidade ATS
 */
export class ATSValidator {
  /**
   * Valida se PDF é compatível com ATS
   */
  async validate(pdfPath: string): Promise<{
    score: number;
    passed: boolean;
    hasExtractableText: boolean;
    usesStandardFonts: boolean;
    hasComplexTables: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Verifica se arquivo existe
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF não encontrado: ${pdfPath}`);
      }

      // Lê PDF
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);

      // 1. Verifica se tem texto extraível
      const hasExtractableText = pdfData.text.trim().length > 100;
      if (!hasExtractableText) {
        errors.push('PDF não possui texto extraível (pode ser imagem escaneada)');
      }

      // 2. Verifica fontes (heurística baseada em nomes de fontes comuns)
      // pdf-parse não fornece fontes diretamente, mas podemos verificar se há texto
      const usesStandardFonts = hasExtractableText; // Assumimos true se há texto extraível
      if (!usesStandardFonts) {
        warnings.push('Pode conter fontes não padrão que afetam leitura ATS');
      }

      // 3. Verifica tabelas complexas (heurística: muitas quebras de linha consecutivas)
      const lines = pdfData.text.split('\n');
      const hasComplexTables = this.detectComplexTables(lines);
      if (hasComplexTables) {
        warnings.push('Possíveis tabelas complexas detectadas que podem afetar parsing ATS');
      }

      // 4. Calcula score
      let score = 100;
      if (!hasExtractableText) score -= 50;
      if (!usesStandardFonts) score -= 10;
      if (hasComplexTables) score -= 20;
      if (pdfData.text.length < 500) score -= 10; // Muito curto
      if (pdfData.text.length > 10000) score -= 5; // Muito longo pode ter problemas

      score = Math.max(0, Math.min(100, score));

      return {
        score,
        passed: score >= 70,
        hasExtractableText,
        usesStandardFonts,
        hasComplexTables,
        warnings,
        errors,
      };
    } catch (error) {
      throw new Error(`Erro ao validar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Detecta tabelas complexas (heurística simples)
   */
  private detectComplexTables(lines: string[]): boolean {
    // Detecta padrões que podem indicar tabelas:
    // - Muitas linhas curtas consecutivas
    // - Padrões de espaçamento suspeitos
    let shortLinesCount = 0;
    let maxShortLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 30) {
        shortLinesCount++;
        maxShortLines = Math.max(maxShortLines, shortLinesCount);
      } else {
        shortLinesCount = 0;
      }
    }

    // Se há 5+ linhas curtas consecutivas, pode ser tabela
    return maxShortLines >= 5;
  }
}