import { aiClient } from '../../utils/ai-client.js';
import type { JobAnalysisResult } from '../../types.js';

/**
 * Gerador de texto de apresentação personalizado
 */
export class PresentationGenerator {
  /**
   * Gera texto de apresentação baseado na análise da vaga
   */
  async generatePresentation(
    jobAnalysis: JobAnalysisResult,
    candidateProfile?: string,
    additionalContext?: string
  ): Promise<{
    presentationText: string;
    keywordsUsed: string[];
    length: number;
    variations?: {
      short?: string;
      medium?: string;
      linkedin?: string;
    };
  }> {
    // Perfil padrão do candidato
    const defaultProfile = `
Tech Lead Frontend com 6+ anos de experiência em React, Next.js, TypeScript.
Principais conquistas:
- Reduzi tempo de carregamento em +2 segundos (Ilegra)
- Reduzi erros do sistema em +50% (Ilegra)
- Aumentei taxa de conversão em +20% (Repassa)
- Lidei equipes de 5+ desenvolvedores (Txai, Repassa)
- Desenvolvi arquitetura microfrontend com Module Federation
Stack: React 18, Next.js 14, TypeScript, AWS, CI/CD, Docker
    `.trim();

    const profile = candidateProfile || defaultProfile;
    const context = additionalContext || '';

    try {
      const result = await aiClient.callJSON<{
        presentationText: string;
        keywordsUsed: string[];
        length: number;
        variations?: {
          short?: string;
          medium?: string;
          linkedin?: string;
        };
      }>(
        '03-gerador-apresente-se.md',
        {
          jobAnalysis: JSON.stringify(jobAnalysis, null, 2),
          candidateProfile: profile,
          additionalContext: context,
        },
        {
          maxTokens: 2048,
          temperature: 0.7,
        }
      );

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao gerar apresentação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}