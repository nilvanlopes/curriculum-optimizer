import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gerenciador de banco de dados SQLite
 */
export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Define o caminho do banco
    const dataDir = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(dataDir, 'cv-optimizer.db');
    this.db = new Database(this.dbPath);
    
    // Configurações de performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Inicializa o schema
    this.initializeSchema();
  }

  /**
   * Cria todas as tabelas necessárias
   */
  private initializeSchema(): void {
    // Tabela de vagas analisadas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        company TEXT,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de análises de vagas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        keywords TEXT NOT NULL, -- JSON array
        requirements TEXT NOT NULL, -- JSON object
        match_score INTEGER NOT NULL,
        match_score_justification TEXT,
        gaps TEXT, -- JSON array
        highlights TEXT, -- JSON object
        suggestions TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    // Tabela de currículos gerados
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS generated_cvs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        job_analysis_id INTEGER,
        template TEXT NOT NULL,
        output_name TEXT NOT NULL,
        formats TEXT NOT NULL, -- JSON array
        match_score INTEGER,
        file_path_html TEXT,
        file_path_pdf TEXT,
        file_path_markdown TEXT,
        file_path_txt TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
        FOREIGN KEY (job_analysis_id) REFERENCES job_analyses(id) ON DELETE SET NULL
      )
    `);

    this.ensureColumn('generated_cvs', 'file_path_txt', 'TEXT');

    // Tabela de aplicações
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        generated_cv_id INTEGER NOT NULL,
        company_name TEXT,
        position_name TEXT,
        application_date DATE,
        status TEXT, -- 'pending', 'reviewing', 'interview', 'rejected', 'accepted'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (generated_cv_id) REFERENCES generated_cvs(id) ON DELETE CASCADE
      )
    `);

    // Índices para performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_job_analyses_job_id ON job_analyses(job_id);
      CREATE INDEX IF NOT EXISTS idx_generated_cvs_job_id ON generated_cvs(job_id);
      CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    `);
  }

  /** Migração aditiva para bancos criados por versões anteriores. */
  private ensureColumn(table: string, column: string, definition: string): void {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((item) => item.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  /**
   * Salva uma vaga no banco
   */
  saveJob(title: string | null, company: string | null, description: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (title, company, description)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(title, company, description);
    return result.lastInsertRowid as number;
  }

  /**
   * Salva uma análise de vaga
   */
  saveJobAnalysis(
    jobId: number,
    analysis: {
      keywords: string[];
      requirements: { mandatory: string[]; desirable: string[] };
      matchScore: number;
      matchScoreJustification: string;
      gaps: Array<{ keyword: string; importance: string; suggestion: string }>;
      highlights: { mainResponsibilities: string[]; differentiators: string[] };
      suggestions: string[];
    }
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO job_analyses (
        job_id, keywords, requirements, match_score, 
        match_score_justification, gaps, highlights, suggestions
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      jobId,
      JSON.stringify(analysis.keywords),
      JSON.stringify(analysis.requirements),
      analysis.matchScore,
      analysis.matchScoreJustification,
      JSON.stringify(analysis.gaps),
      JSON.stringify(analysis.highlights),
      JSON.stringify(analysis.suggestions)
    );
    
    return result.lastInsertRowid as number;
  }

  /**
   * Salva um currículo gerado
   */
  saveGeneratedCV(data: {
    jobId: number | null;
    jobAnalysisId: number | null;
    template: string;
    outputName: string;
    formats: string[];
    matchScore: number | null;
    filePathHtml: string | null;
    filePathPdf: string | null;
    filePathMarkdown: string | null;
    filePathTxt: string | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO generated_cvs (
        job_id, job_analysis_id, template, output_name, formats,
        match_score, file_path_html, file_path_pdf, file_path_markdown, file_path_txt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.jobId,
      data.jobAnalysisId,
      data.template,
      data.outputName,
      JSON.stringify(data.formats),
      data.matchScore,
      data.filePathHtml,
      data.filePathPdf,
      data.filePathMarkdown,
      data.filePathTxt
    );
    
    return result.lastInsertRowid as number;
  }

  /**
   * Busca análises recentes
   */
  getRecentAnalyses(limit: number = 10): Array<{
    id: number;
    jobTitle: string | null;
    company: string | null;
    matchScore: number;
    createdAt: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT 
        ja.id,
        j.title as jobTitle,
        j.company,
        ja.match_score as matchScore,
        ja.created_at as createdAt
      FROM job_analyses ja
      LEFT JOIN jobs j ON ja.job_id = j.id
      ORDER BY ja.created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(limit) as Array<{
      id: number;
      jobTitle: string | null;
      company: string | null;
      matchScore: number;
      createdAt: string;
    }>;
  }

  /**
   * Retorna a instância do banco (para queries customizadas)
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Fecha a conexão com o banco
   */
  close(): void {
    this.db.close();
  }
}

// Instância singleton
let dbInstance: DatabaseManager | null = null;

export function getDatabase(dbPath?: string): DatabaseManager {
  if (!dbInstance) {
    dbInstance = new DatabaseManager(dbPath);
  }
  return dbInstance;
}
