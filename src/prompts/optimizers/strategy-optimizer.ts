import { aiClient } from '../../utils/ai-client.js';
import type { TemplateType, StrategyOptimizationResult, JobAnalysisResult } from '../../types.js';

/**
 * Otimizador estratégico baseado em template
 */
export class StrategyOptimizer {
  /**
   * Otimiza conteúdo baseado no template estratégico
   */
  async optimize(
    template: TemplateType,
    jobAnalysis: JobAnalysisResult,
    curriculumContent: string
  ): Promise<StrategyOptimizationResult> {
    try {
      const result = await aiClient.callJSON<StrategyOptimizationResult>(
        '04-variacoes-estrategicas.md',
        {
          template,
          jobAnalysis: JSON.stringify(jobAnalysis, null, 2),
          curriculumContent,
        },
        {
          maxTokens: 2048,
          temperature: 0.5,
        }
      );

      // Garante que o template no resultado está correto
      result.template = template;

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao otimizar estratégia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}