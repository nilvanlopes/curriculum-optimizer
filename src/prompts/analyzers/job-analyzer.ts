import fs from 'fs';
import path from 'path';
import type { JobAnalysisResult } from '../../types.js';
import { AIClient } from '../../utils/ai-client.js';
import { ProfileExtractor } from '../../utils/profile-extractor.js';
import { storage } from '../../utils/storage.js';

/**
 * Analisador de vagas usando IA
 */
export class JobAnalyzer {
  private templatePath: string;
  private aiClient: AIClient;

  constructor(templatePath?: string, aiClient?: AIClient) {
    this.templatePath = templatePath || path.join(process.cwd(), 'input/base-curriculum.html');
    this.aiClient = aiClient || new AIClient();
  }

  /**
   * Analisa uma descrição de vaga e retorna resultados estruturados
   */
  async analyzeJob(
    jobDescription: string,
    candidateProfile?: string,
    options?: { saveToHistory?: boolean; metadata?: { title?: string; company?: string } }
  ): Promise<JobAnalysisResult> {
    // Tenta extrair perfil do template HTML se não fornecido
    let profile = candidateProfile;
    if (!profile) {
      try {
        if (fs.existsSync(this.templatePath)) {
          const extracted = ProfileExtractor.extractFromTemplate(this.templatePath);
          profile = extracted.profileText;
        } else {
          // Se não houver template, usa perfil genérico mínimo
          profile = 'Perfil do candidato não disponível. Análise baseada apenas na descrição da vaga.';
        }
      } catch (error) {
        // Se houver erro, usa perfil genérico mínimo
        profile = 'Perfil do candidato não disponível. Análise baseada apenas na descrição da vaga.';
      }
    }

    try {
      const result = await this.aiClient.callJSON<JobAnalysisResult>(
        '01-analise-vaga.md',
        {
          jobDescription: jobDescription.trim(),
          candidateProfile: profile,
        },
        {
          maxTokens: 4096,
          temperature: 0.3, // Menor temperatura para respostas mais consistentes
          step: 'job-analysis',
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
