import path from 'path';
import { HTMLComposer } from '../generators/html-composer.js';
import { PDFGenerator } from '../generators/pdf.js';
import { TextGenerator } from '../generators/text.js';
import { JobAnalyzer } from '../prompts/analyzers/job-analyzer.js';
import { ContentSelector } from '../prompts/selectors/content-selector.js';
import type { JobAnalysisResult, PDFMeasurement } from '../types.js';
import { AIClient } from '../utils/ai-client.js';
import { Logger } from '../utils/logger.js';
import type { OutputFormat } from '../utils/output-formats.js';
import { normalizeJobAnalysis } from '../prompts/selectors/presentation-guard.js';
import { storage, type StorageManager } from '../utils/storage.js';
import { ResumeValidator } from '../validators/index.js';
import { BaseCurriculumImporter, type BaseCurriculumImportResult } from './base-curriculum-importer.js';
import {
  CurriculumSourceReader,
  resolveCurriculumSourcePath,
  type CurriculumSource,
} from './curriculum-source.js';
import { persistRequestedOutputs } from './output-persistence.js';

export interface GenerateCurriculumOptions {
  role: string;
  curriculumFile?: string;
  refreshBase?: boolean;
  jobDescription?: string | null;
  outputName?: string;
  formats: OutputFormat[];
  cwd?: string;
  verbose?: boolean;
}

export interface GenerateCurriculumResult {
  outputName: string;
  formats: OutputFormat[];
  paths: Partial<Record<OutputFormat, string>>;
  source: CurriculumSource;
  base: BaseCurriculumImportResult;
  jobAnalysis: JobAnalysisResult | null;
  measurement: PDFMeasurement;
  attempts: number;
  isWithinRange: boolean;
}

export interface GenerationServiceOptions {
  aiClient: AIClient;
  logger?: Logger;
  sourceReader?: CurriculumSourceReader;
  history?: Pick<StorageManager, 'saveGeneratedCV' | 'getRecentAnalyses'>;
}

/** Orquestra uma geração completa sem depender do parser de CLI. */
export class GenerationService {
  private readonly aiClient: AIClient;
  private readonly logger: Logger;
  private readonly sourceReader: CurriculumSourceReader;
  private readonly history: Pick<StorageManager, 'saveGeneratedCV' | 'getRecentAnalyses'>;

  constructor(options: GenerationServiceOptions) {
    this.aiClient = options.aiClient;
    this.logger = options.logger || new Logger(false);
    this.sourceReader = options.sourceReader || new CurriculumSourceReader();
    this.history = options.history || storage;
  }

  async generate(options: GenerateCurriculumOptions): Promise<GenerateCurriculumResult> {
    const cwd = options.cwd || process.cwd();
    const role = options.role.trim();
    if (!role) throw new Error('O role do currículo não pode ser vazio.');
    if (options.formats.length === 0) throw new Error('Ao menos um formato de saída deve ser solicitado.');

    const sourcePath = resolveCurriculumSourcePath({
      curriculumFile: options.curriculumFile,
      envCurriculumFile: process.env.CURRICULUM_FILE,
      cwd,
    });
    const source = await this.sourceReader.read(sourcePath);
    this.logger.info(`Currículo original: ${source.path} (${source.format})`);

    const importer = new BaseCurriculumImporter({
      aiClient: this.aiClient,
      logger: this.logger,
      basePath: path.join(cwd, 'input/base-curriculum.html'),
      metadataPath: path.join(cwd, 'input/base-curriculum.meta.json'),
    });
    const base = await importer.ensureBase(source, options.refreshBase === true);
    const outputName = validateOutputName(options.outputName || defaultOutputName(role));
    const outputDir = path.join(cwd, 'output');

    let jobAnalysis: JobAnalysisResult | null = null;
    if (options.jobDescription) {
      this.logger.info('Analisando descrição da vaga');
      const analyzer = new JobAnalyzer(base.basePath, this.aiClient);
      jobAnalysis = normalizeJobAnalysis(
        await analyzer.analyzeJob(options.jobDescription, undefined, { saveToHistory: true })
      ) || null;
    }

    this.logger.info('Selecionando conteúdo do currículo base');
    const selector = new ContentSelector(base.basePath, this.aiClient);
    const contentSelection = jobAnalysis
      ? await selector.selectContentAndPresentation(jobAnalysis, role)
      : await selector.selectContentAndPresentationByRole(role);

    this.logger.info('Compondo e medindo o HTML final');
    const composer = new HTMLComposer(base.basePath);
    const iteration = await composer.composeWithIteration(
      role,
      contentSelection,
      jobAnalysis || undefined,
      options.verbose
        ? (message, attempt, maxAttempts) => this.logger.debug(`[Iteração ${attempt}/${maxAttempts}] ${message}`)
        : undefined
    );

    const paths = await persistRequestedOutputs({
      formats: options.formats,
      html: iteration.html,
      outputDir,
      outputName,
      writers: {
        html: composer,
        pdf: new PDFGenerator(),
        txt: new TextGenerator(),
      },
    });
    if (paths.pdf && jobAnalysis) {
      const validation = await new ResumeValidator().validatePDF(paths.pdf, jobAnalysis.keywords);
      this.logger.info(`Validação ATS: ${validation.score}/100`);
      if (options.verbose) {
        validation.warnings.slice(0, 3).forEach((warning) => this.logger.warning(warning));
      }
    }

    this.saveHistory(role, outputName, options.formats, paths, jobAnalysis);
    return {
      outputName,
      formats: [...options.formats],
      paths,
      source,
      base,
      jobAnalysis,
      measurement: iteration.finalMeasurement,
      attempts: iteration.attempts,
      isWithinRange: iteration.isWithinRange,
    };
  }

  private saveHistory(
    role: string,
    outputName: string,
    formats: OutputFormat[],
    paths: Partial<Record<OutputFormat, string>>,
    jobAnalysis: JobAnalysisResult | null
  ): void {
    try {
      const recent = jobAnalysis ? this.history.getRecentAnalyses(1) : [];
      this.history.saveGeneratedCV({
        jobAnalysisId: recent[0]?.id,
        role,
        outputName,
        formats,
        matchScore: jobAnalysis?.matchScore,
        filePathHtml: paths.html,
        filePathPdf: paths.pdf,
        filePathTxt: paths.txt,
      });
    } catch (error) {
      this.logger.debug(`Histórico não persistido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function defaultOutputName(role: string): string {
  return `Curriculo ${role}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateOutputName(value: string): string {
  const name = value.trim();
  if (!name || name === '.' || name === '..' || path.basename(name) !== name) {
    throw new Error(`Nome de saída inválido: ${value}`);
  }
  return name;
}
