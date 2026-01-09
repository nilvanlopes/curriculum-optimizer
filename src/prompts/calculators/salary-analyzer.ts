import { aiClient } from '../../utils/ai-client.js';
import type { JobAnalysisResult, SalaryComparison } from '../../types.js';

/**
 * Analisador inteligente de propostas salariais via IA
 */
export class SalaryAnalyzer {
  /**
   * Analisa proposta salarial e fornece insights
   */
  async analyze(
    proposalType: 'clt' | 'pj',
    proposalDetails: {
      gross: number;
      benefits?: Record<string, number | string>;
      position?: string;
      location?: string;
    },
    jobAnalysis?: JobAnalysisResult,
    salaryComparison?: SalaryComparison
  ): Promise<{
    marketComparison: {
      position: string;
      marketRange: { min: number; max: number; average: number; currency: string };
      proposalLevel: string;
      comparison: string;
    };
    benefitsAnalysis: {
      totalCompensation: number;
      benefitsQuality: string;
      uniqueBenefits: string[];
      missingBenefits: string[];
    };
    negotiationPoints: Array<{
      aspect: string;
      current: string | number;
      suggested: string | number;
      justification: string;
    }>;
    counterProposal: {
      suggestedValue: number;
      rationale: string;
      presentationStrategy: string;
    };
    recommendation: string;
  }> {
    try {
      const proposalDetailsStr = JSON.stringify(proposalDetails, null, 2);
      const jobAnalysisStr = jobAnalysis ? JSON.stringify(jobAnalysis, null, 2) : '{}';
      const salaryComparisonStr = salaryComparison ? JSON.stringify(salaryComparison, null, 2) : '{}';

      const result = await aiClient.callJSON(
        '05-analise-salarial.md',
        {
          proposalType,
          proposalDetails: proposalDetailsStr,
          jobAnalysis: jobAnalysisStr,
          salaryComparison: salaryComparisonStr,
        },
        {
          maxTokens: 4096,
          temperature: 0.6,
        }
      );

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao analisar proposta salarial: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}