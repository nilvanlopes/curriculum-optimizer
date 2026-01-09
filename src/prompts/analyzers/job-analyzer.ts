import type { JobAnalysisResult } from '../../types.js';
import { aiClient } from '../../utils/ai-client.js';
import { storage } from '../../utils/storage.js';

/**
 * Analisador de vagas usando IA
 */
export class JobAnalyzer {
  /**
   * Analisa uma descrição de vaga e retorna resultados estruturados
   */
  async analyzeJob(
    jobDescription: string,
    candidateProfile?: string,
    options?: { saveToHistory?: boolean; metadata?: { title?: string; company?: string } }
  ): Promise<JobAnalysisResult> {
    // Perfil padrão do candidato (pode ser expandido depois)
    const defaultProfile = `
Tech Lead Frontend com 6+ anos de experiência em React, Next.js, TypeScript.
Experiência em arquiteturas microfrontend, otimização de performance e liderança técnica.
Stack principal: React 18, Next.js 14, TypeScript, AWS, CI/CD, Git, Scrum.
Experiências: Ilegra (Tech Lead), Repassa (Senior Frontend), Txai (Tech Lead).
    `.trim();

    const profile = candidateProfile || defaultProfile;

    try {
      const result = await aiClient.callJSON<JobAnalysisResult>(
        '01-analise-vaga.md',
        {
          jobDescription: jobDescription.trim(),
          candidateProfile: profile,
        },
        {
          maxTokens: 4096,
          temperature: 0.3, // Menor temperatura para respostas mais consistentes
        }
      );

      // Salva no histórico se solicitado
      if (options?.saveToHistory !== false) {
        storage.saveJobAnalysis(jobDescription, result, options?.metadata);
      }

      return result;
    } catch (error) {
      throw new Error(`Erro ao analisar vaga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}