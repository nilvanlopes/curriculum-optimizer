/**
 * Tipos globais do projeto CV Optimizer
 */

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
  reorderedSkills?: string[]; // Deprecated: mantido apenas para compatibilidade
  selectedSkills?: {
    categories: Array<{
      categoryId: string; // ID da categoria (usar IDs existentes: "frontend", "backend", etc.)
      categoryName: string; // Nome exibido da categoria (usar nomes existentes)
      skills: string[]; // Lista de tecnologias COLETADAS/FILTRADAS do template (não inventar)
    }>;
  };
  selectedCertifications?: Array<{
    index?: number; // Índice da certificação no template (baseado em ordem)
    text?: string; // Texto completo da certificação para matching
  }>;
  presentationText: string; // OBRIGATÓRIO: texto de apresentação para a seção Summary (200-400 caracteres)
  keywordsUsed?: string[]; // Keywords da vaga usadas no presentationText (se houver análise de vaga)
}

/**
 * Resultado da medição de altura do PDF
 */
export interface PDFMeasurement {
  /** Número de páginas do PDF */
  pageCount: number;
  /** Altura total em mm */
  heightMm: number;
  /** Altura em páginas (ex: 1.5 = 1 página e meia) */
  heightInPages: number;
}

/**
 * Feedback para regeneração de HTML
 * Enviado ao prompt quando o PDF não está no range desejado
 */
export interface HTMLRegenerationFeedback {
  /** Altura atual do PDF em páginas */
  currentHeightPages: number;
  /** Altura atual em mm */
  currentHeightMm: number;
  /** Altura mínima desejada em páginas */
  targetMinPages: number;
  /** Altura máxima desejada em páginas */
  targetMaxPages: number;
  /** Direção do ajuste necessário */
  adjustment: 'expand' | 'reduce';
  /** Número da tentativa atual */
  attemptNumber: number;
  /** Número máximo de tentativas */
  maxAttempts: number;
  /** Conquistas faltantes (quando muito curto) */
  missingAchievements?: Array<{
    companyId: string;
    achievementIndices: number[];
  }>;
  /** Instruções específicas para a IA */
  instructions: string;
}