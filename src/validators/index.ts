import { config } from '../config.js';
import type { ValidationResult } from '../types.js';
import { ATSValidator } from './ats.js';
import { KeywordDensityCalculator } from './keyword-density.js';
import { LengthValidator } from './length.js';

/**
 * Validador completo de currículo
 */
export class ResumeValidator {
  private atsValidator: ATSValidator;
  private keywordDensity: KeywordDensityCalculator;
  private lengthValidator: LengthValidator;

  constructor() {
    this.atsValidator = new ATSValidator();
    this.keywordDensity = new KeywordDensityCalculator();
    this.lengthValidator = new LengthValidator();
  }

  /**
   * Valida currículo completo (PDF)
   */
  async validatePDF(pdfPath: string, keywords: string[]): Promise<ValidationResult> {
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    // 1. Validação ATS
    const atsResult = await this.atsValidator.validate(pdfPath);
    allWarnings.push(...atsResult.warnings);
    allErrors.push(...atsResult.errors);

    // 2. Validação de comprimento
    const lengthResult = await this.lengthValidator.validate(pdfPath);
    allWarnings.push(...lengthResult.warnings);
    if (!lengthResult.passed && !allErrors.length) {
      // Comprimento não é erro crítico, apenas warning
    }

    // 3. Validação de densidade de keywords (requer extração de texto)
    let keywordDensity = 0;
    if (atsResult.hasExtractableText && keywords.length > 0) {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const fs = await import('fs');
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        
        const densityResult = this.keywordDensity.calculate(pdfData.text, keywords);
        keywordDensity = densityResult.density;
        allWarnings.push(...densityResult.warnings);
      } catch (error) {
        // Se falhar, continua sem densidade
      }
    }

    // Calcula score final (média ponderada)
    let score = 0;
    let totalWeight = 0;

    // ATS Score (peso 50%)
    score += (atsResult.score / 100) * 50;
    totalWeight += 50;

    // Length Score (peso 30%)
    const { maxPages } = config.validation.length;
    const lengthScore = lengthResult.passed ? 100 : (lengthResult.pageCount <= maxPages ? 80 : 50);
    score += (lengthScore / 100) * 30;
    totalWeight += 30;

    // Keyword Density Score (peso 20%)
    const { min: minDensity, max: maxDensity } = config.validation.keywordDensity;
    const idealDensity = keywordDensity >= minDensity && keywordDensity <= maxDensity 
      ? 100 
      : keywordDensity < minDensity 
        ? (keywordDensity / minDensity) * 100 
        : (maxDensity / keywordDensity) * 100;
    score += (idealDensity / 100) * 20;
    totalWeight += 20;

    const finalScore = Math.round((score / totalWeight) * 100);

    return {
      score: finalScore,
      passed: finalScore >= 70 && atsResult.passed,
      warnings: allWarnings,
      errors: allErrors,
      details: {
        atsCompatible: atsResult.passed,
        keywordDensity,
        pageCount: lengthResult.pageCount,
        hasExtractableText: atsResult.hasExtractableText,
        wordCount: lengthResult.wordCount,
        charCount: lengthResult.charCount,
      },
    };
  }

  /**
   * Valida apenas densidade de keywords em texto
   */
  validateKeywordDensity(text: string, keywords: string[]) {
    return this.keywordDensity.calculate(text, keywords);
  }
}