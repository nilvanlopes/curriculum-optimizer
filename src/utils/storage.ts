import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './database.js';
import type { JobAnalysisResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gerenciador de storage (JSON + SQLite)
 */
export class StorageManager {
  private dataDir: string;
  private db;

  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    
    // Garante que o diretório existe
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.db = getDatabase();
  }

  /**
   * Salva análise de vaga
   */
  saveJobAnalysis(
    description: string,
    analysis: JobAnalysisResult,
    metadata?: { title?: string; company?: string }
  ): { jobId: number; analysisId: number } {
    const jobId = this.db.saveJob(
      metadata?.title || null,
      metadata?.company || null,
      description
    );

    const analysisId = this.db.saveJobAnalysis(jobId, {
      keywords: analysis.keywords,
      requirements: analysis.requirements,
      matchScore: analysis.matchScore,
      matchScoreJustification: analysis.matchScoreJustification,
      gaps: analysis.gaps,
      highlights: analysis.highlights,
      suggestions: analysis.suggestions,
    });

    return { jobId, analysisId };
  }

  /**
   * Salva currículo gerado
   */
  saveGeneratedCV(data: {
    jobId?: number;
    jobAnalysisId?: number;
    template: string;
    outputName: string;
    formats: string[];
    matchScore?: number;
    filePathHtml?: string;
    filePathPdf?: string;
    filePathMarkdown?: string;
  }): number {
    return this.db.saveGeneratedCV({
      jobId: data.jobId || null,
      jobAnalysisId: data.jobAnalysisId || null,
      template: data.template,
      outputName: data.outputName,
      formats: data.formats,
      matchScore: data.matchScore || null,
      filePathHtml: data.filePathHtml || null,
      filePathPdf: data.filePathPdf || null,
      filePathMarkdown: data.filePathMarkdown || null,
    });
  }

  /**
   * Busca análises recentes
   */
  getRecentAnalyses(limit: number = 10) {
    return this.db.getRecentAnalyses(limit);
  }

  /**
   * Salva configuração em JSON
   */
  saveConfig(key: string, value: unknown): void {
    const configPath = path.join(this.dataDir, 'config.json');
    let config: Record<string, unknown> = {};
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    }
    
    config[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Carrega configuração de JSON
   */
  loadConfig<T>(key: string, defaultValue?: T): T | undefined {
    const configPath = path.join(this.dataDir, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return defaultValue;
    }
    
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    return (config[key] as T) || defaultValue;
  }
}

// Instância singleton
export const storage = new StorageManager();