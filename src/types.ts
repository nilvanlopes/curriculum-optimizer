/**
 * Tipos globais do projeto CV Optimizer
 */

export type TemplateType = 'tech-lead' | 'senior-frontend' | 'fullstack';

export type OutputFormat = 'html' | 'pdf' | 'markdown' | 'all';

export interface JobDescription {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  keywords: string[];
}

export interface GenerateOptions {
  jobDescription: string;
  template: TemplateType;
  outputName: string;
  format: OutputFormat;
}

export interface ValidationResult {
  score: number;
  passed: boolean;
  warnings: string[];
  errors: string[];
  details: {
    atsCompatible: boolean;
    keywordDensity: number;
    pageCount: number;
    hasExtractableText: boolean;
    wordCount?: number;
    charCount?: number;
  };
}

export interface MatchScore {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export interface SalaryComparison {
  clt: {
    gross: number;
    net: number;
    taxes: number;
    benefits: number;
    total: number;
  };
  pj: {
    gross: number;
    net: number;
    taxes: number;
    costs: number;
    total: number;
  };
  difference: {
    amount: number;
    percentage: number;
    winner: 'clt' | 'pj';
  };
}

export interface CLIConfig {
  verbose: boolean;
  debug: boolean;
}

/**
 * Resultado da análise de uma vaga de emprego
 */
export interface JobAnalysisResult {
  keywords: string[];
  requirements: {
    mandatory: string[];
    desirable: string[];
  };
  matchScore: number;
  matchScoreJustification: string;
  gaps: Array<{
    keyword: string;
    importance: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  highlights: {
    mainResponsibilities: string[];
    differentiators: string[];
  };
  suggestions: string[];
}

/**
 * Resultado da seleção de conteúdo
 */
export interface ContentSelectionResult {
  selectedExperiences: Array<{
    companyId: string;
    priority: number;
    achievementsToHighlight: number[];
  }>;
  reorderedSkills: string[];
  presentationText?: string;
}

/**
 * Resultado de otimização estratégica
 */
export interface StrategyOptimizationResult {
  template: TemplateType;
  adjustments: Array<{
    section: string;
    action: 'emphasize' | 'deemphasize' | 'reorder' | 'add';
    details: string;
  }>;
}

/**
 * Resultado de geração de currículo
 */
export interface GenerationResult {
  htmlPath?: string;
  pdfPath?: string;
  markdownPath?: string;
  formats: string[];
}