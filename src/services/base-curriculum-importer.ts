import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIClient } from '../utils/ai-client.js';
import { sha256 } from '../utils/hash.js';
import { Logger } from '../utils/logger.js';
import type { CurriculumSource } from './curriculum-source.js';
import { extractHTMLDocument, validateBaseCurriculumHTML } from './base-curriculum-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BaseCurriculumMetadata {
  version: 1;
  source: {
    path: string;
    format: CurriculumSource['format'];
    sha256: string;
    size: number;
  };
  promptSha256: string;
  layoutSha256: string;
  baseSha256: string;
  provider: string;
  model: string;
  createdAt: string;
}

export interface BaseCurriculumImportResult {
  basePath: string;
  metadataPath: string;
  metadata: BaseCurriculumMetadata;
  cache: 'hit' | 'generated';
}

export interface BaseCurriculumImporterOptions {
  aiClient: AIClient;
  logger?: Logger;
  layoutPath?: string;
  basePath?: string;
  metadataPath?: string;
}

export class BaseCurriculumImporter {
  private readonly aiClient: AIClient;
  private readonly logger: Logger;
  private readonly layoutPath: string;
  private readonly basePath: string;
  private readonly metadataPath: string;

  constructor(options: BaseCurriculumImporterOptions) {
    this.aiClient = options.aiClient;
    this.logger = options.logger || new Logger(false);
    this.layoutPath = options.layoutPath || path.join(__dirname, '../templates/curriculum-layout.html');
    this.basePath = options.basePath || path.join(process.cwd(), 'input/base-curriculum.html');
    this.metadataPath = options.metadataPath || path.join(process.cwd(), 'input/base-curriculum.meta.json');
  }

  async ensureBase(source: CurriculumSource, refresh = false): Promise<BaseCurriculumImportResult> {
    const prompt = await this.aiClient.loadPrompt('06-import-curriculum.md');
    if (!fs.existsSync(this.layoutPath)) {
      throw new Error(`Layout interno não encontrado: ${this.layoutPath}`);
    }
    const layout = fs.readFileSync(this.layoutPath, 'utf8');
    const expectedHashes = {
      promptSha256: sha256(prompt),
      layoutSha256: sha256(layout),
    };

    if (!refresh) {
      const cached = this.readValidCache(source, expectedHashes);
      if (cached) {
        this.logger.info(`[base-import] cache hit source_sha256=${source.sha256}`);
        return cached;
      }
    } else {
      this.logger.info('[base-import] cache ignorado por --refresh-base');
    }

    let validationErrors: string[] = [];
    let previousHtml = '';
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await this.aiClient.callText(
        '06-import-curriculum.md',
        {
          sourceFormat: source.format,
          sourceContent: source.content,
          layoutHtml: layout,
          validationFeedback: validationErrors.length > 0
            ? validationErrors.map((error) => `- ${error}`).join('\n')
            : 'Nenhum: esta é a primeira tentativa.',
          previousHtml: previousHtml || 'Nenhum: esta é a primeira tentativa.',
        },
        {
          maxTokens: 16384,
          temperature: 0.1,
          step: attempt === 1 ? 'base-curriculum-import' : 'base-curriculum-import-correction',
          attempt,
        }
      );
      const html = extractHTMLDocument(response);
      const validation = validateBaseCurriculumHTML(html, source);
      if (validation.valid) {
        const metadata: BaseCurriculumMetadata = {
          version: 1,
          source: {
            path: source.path,
            format: source.format,
            sha256: source.sha256,
            size: source.size,
          },
          ...expectedHashes,
          baseSha256: sha256(html),
          provider: this.aiClient.provider.provider,
          model: this.aiClient.provider.model,
          createdAt: new Date().toISOString(),
        };
        this.writeAtomically(html, metadata);
        this.logger.info(`[base-import] cache generated source_sha256=${source.sha256}`);
        return {
          basePath: this.basePath,
          metadataPath: this.metadataPath,
          metadata,
          cache: 'generated',
        };
      }
      validationErrors = validation.errors;
      previousHtml = html;
    }

    throw new Error(
      `A IA não gerou um currículo base estruturalmente válido após 2 tentativas:\n- ${validationErrors.join('\n- ')}`
    );
  }

  private readValidCache(
    source: CurriculumSource,
    expected: Pick<BaseCurriculumMetadata, 'promptSha256' | 'layoutSha256'>
  ): BaseCurriculumImportResult | null {
    if (!fs.existsSync(this.basePath) || !fs.existsSync(this.metadataPath)) return null;
    try {
      const metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf8')) as BaseCurriculumMetadata;
      const html = fs.readFileSync(this.basePath, 'utf8');
      const hashesMatch = metadata.version === 1
        && metadata.source?.sha256 === source.sha256
        && metadata.promptSha256 === expected.promptSha256
        && metadata.layoutSha256 === expected.layoutSha256
        && metadata.baseSha256 === sha256(html);
      if (!hashesMatch || !validateBaseCurriculumHTML(html, source).valid) return null;
      return {
        basePath: this.basePath,
        metadataPath: this.metadataPath,
        metadata,
        cache: 'hit',
      };
    } catch {
      return null;
    }
  }

  private writeAtomically(html: string, metadata: BaseCurriculumMetadata): void {
    fs.mkdirSync(path.dirname(this.basePath), { recursive: true });
    fs.mkdirSync(path.dirname(this.metadataPath), { recursive: true });
    const nonce = `${process.pid}-${Date.now()}`;
    const baseTemp = path.join(path.dirname(this.basePath), `.${path.basename(this.basePath)}.${nonce}.tmp`);
    const metadataTemp = path.join(path.dirname(this.metadataPath), `.${path.basename(this.metadataPath)}.${nonce}.tmp`);
    const previousBase = fs.existsSync(this.basePath) ? fs.readFileSync(this.basePath) : null;
    const previousMetadata = fs.existsSync(this.metadataPath) ? fs.readFileSync(this.metadataPath) : null;
    fs.writeFileSync(baseTemp, html, 'utf8');
    fs.writeFileSync(metadataTemp, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    try {
      fs.renameSync(baseTemp, this.basePath);
      fs.renameSync(metadataTemp, this.metadataPath);
    } catch (error) {
      restoreFile(this.basePath, previousBase);
      restoreFile(this.metadataPath, previousMetadata);
      throw error;
    } finally {
      if (fs.existsSync(baseTemp)) fs.unlinkSync(baseTemp);
      if (fs.existsSync(metadataTemp)) fs.unlinkSync(metadataTemp);
    }
  }
}

function restoreFile(target: string, previous: Buffer | null): void {
  if (previous === null) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return;
  }
  const restorePath = `${target}.${process.pid}.restore.tmp`;
  fs.writeFileSync(restorePath, previous);
  fs.renameSync(restorePath, target);
}
