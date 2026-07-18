import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { sha256 } from '../utils/hash.js';

export type CurriculumSourceFormat = 'pdf' | 'html' | 'md' | 'txt';

export interface CurriculumSource {
  path: string;
  format: CurriculumSourceFormat;
  content: string;
  sha256: string;
  size: number;
}

export interface CurriculumSourceResolutionOptions {
  curriculumFile?: string;
  envCurriculumFile?: string;
  cwd?: string;
}

export type PDFTextParser = (buffer: Buffer) => Promise<{ text?: string }>;

const EXTENSION_FORMATS: Readonly<Record<string, CurriculumSourceFormat>> = {
  '.pdf': 'pdf',
  '.html': 'html',
  '.htm': 'html',
  '.md': 'md',
  '.txt': 'txt',
};

const DISCOVERY_NAMES = [
  'original-curriculum.pdf',
  'original-curriculum.html',
  'original-curriculum.htm',
  'original-curriculum.md',
  'original-curriculum.txt',
] as const;

export function resolveCurriculumSourcePath(options: CurriculumSourceResolutionOptions = {}): string {
  const cwd = options.cwd || process.cwd();
  const selected = options.curriculumFile?.trim() || options.envCurriculumFile?.trim();
  if (selected) {
    return validateSourcePath(path.resolve(cwd, selected));
  }

  const inputDir = path.join(cwd, 'input');
  const matches = DISCOVERY_NAMES
    .map((name) => path.join(inputDir, name))
    .filter((candidate) => fs.existsSync(candidate));

  if (matches.length === 0) {
    throw new Error(
      'Currículo original não encontrado. Use --curriculum-file, CURRICULUM_FILE ou adicione exatamente um input/original-curriculum.{pdf,html,htm,md,txt}.'
    );
  }
  if (matches.length > 1) {
    throw new Error(`Fonte de currículo ambígua: ${matches.join(', ')}. Mantenha exatamente um arquivo original.`);
  }
  return validateSourcePath(matches[0]);
}

export class CurriculumSourceReader {
  constructor(private readonly parsePDF: PDFTextParser = pdfParse) {}

  async read(sourcePath: string): Promise<CurriculumSource> {
    const resolvedPath = validateSourcePath(path.resolve(sourcePath));
    const extension = path.extname(resolvedPath).toLowerCase();
    const format = EXTENSION_FORMATS[extension];
    if (!format) {
      throw unsupportedExtension(extension);
    }

    const bytes = fs.readFileSync(resolvedPath);
    if (bytes.length === 0) {
      throw new Error(`Arquivo de currículo vazio: ${resolvedPath}`);
    }

    let content: string;
    if (format === 'pdf') {
      let parsed: { text?: string };
      try {
        parsed = await this.parsePDF(bytes);
      } catch (error) {
        throw new Error(
          `Não foi possível extrair texto do PDF ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      content = parsed.text?.trim() || '';
      if (!content) {
        throw new Error(
          `O PDF não contém texto extraível: ${resolvedPath}. Execute OCR e forneça um PDF pesquisável, HTML, Markdown ou TXT.`
        );
      }
    } else {
      const decoded = bytes.toString('utf8').replace(/^\uFEFF/, '');
      content = format === 'html' ? sanitizeCurriculumHTML(decoded) : decoded.trim();
      if (!visibleText(content, format).trim()) {
        throw new Error(`Arquivo de currículo vazio: ${resolvedPath}`);
      }
    }

    return {
      path: resolvedPath,
      format,
      content,
      sha256: sha256(bytes),
      size: bytes.length,
    };
  }
}

export function sanitizeCurriculumHTML(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, iframe, object, embed, base, link, form, input, button, textarea, select, option, canvas, svg, audio, video, source').remove();

  $('*').each((_, element) => {
    const attributes = { ...(element.type === 'tag' ? element.attribs : {}) };
    for (const name of Object.keys(attributes)) {
      const lower = name.toLowerCase();
      if (lower.startsWith('on') || lower === 'style' || lower === 'srcdoc') {
        $(element).removeAttr(name);
      }
    }
    for (const attribute of ['href', 'src', 'action', 'formaction']) {
      const value = $(element).attr(attribute)?.trim();
      if (value && /^(?:javascript|vbscript|data):/i.test(value)) {
        $(element).removeAttr(attribute);
      }
    }
  });

  return $.html().trim();
}

export function sourcePlainText(source: Pick<CurriculumSource, 'content' | 'format'>): string {
  return visibleText(source.content, source.format).replace(/\s+/g, ' ').trim();
}

function visibleText(content: string, format: CurriculumSourceFormat): string {
  if (format !== 'html') {
    return content;
  }
  return cheerio.load(content).text();
}

function validateSourcePath(sourcePath: string): string {
  const extension = path.extname(sourcePath).toLowerCase();
  if (!EXTENSION_FORMATS[extension]) {
    throw unsupportedExtension(extension);
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo de currículo não encontrado: ${sourcePath}`);
  }
  if (!fs.statSync(sourcePath).isFile()) {
    throw new Error(`A fonte do currículo não é um arquivo: ${sourcePath}`);
  }
  return sourcePath;
}

function unsupportedExtension(extension: string): Error {
  return new Error(
    `Extensão de currículo inválida: ${extension || '(sem extensão)'}. Use pdf, html, htm, md ou txt.`
  );
}
