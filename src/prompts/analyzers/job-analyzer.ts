import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { JobAnalysisResult } from '../../types.js';
import { aiClient } from '../../utils/ai-client.js';
import { ProfileExtractor } from '../../utils/profile-extractor.js';
import { storage } from '../../utils/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analisador de vagas usando IA
 */
export class JobAnalyzer {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(__dirname, '../../templates/base-curriculum.html');
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