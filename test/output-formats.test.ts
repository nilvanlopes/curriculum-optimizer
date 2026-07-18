import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextGenerator } from '../src/generators/text.js';
import { persistRequestedOutputs } from '../src/services/output-persistence.js';
import { DatabaseManager } from '../src/utils/database.js';
import { parseOutputFormats } from '../src/utils/output-formats.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

describe('output formats', () => {
  it('usa PDF por padrão e normaliza caixa, espaços e duplicatas', () => {
    expect(parseOutputFormats()).toEqual(['pdf']);
    expect(parseOutputFormats(' PDF, html, pdf , TXT ')).toEqual(['pdf', 'html', 'txt']);
  });

  it('rejeita lista vazia, markdown e formatos desconhecidos', () => {
    expect(() => parseOutputFormats(' , ')).toThrow('não pode ser vazia');
    expect(() => parseOutputFormats('markdown')).toThrow('Formatos inválidos');
    expect(() => parseOutputFormats('pdf,docx')).toThrow('docx');
  });

  it('persiste somente formatos solicitados sem apagar artefato antigo', async () => {
    const outputDir = temporaryDirectory();
    const staleHTML = path.join(outputDir, 'curriculo.html');
    fs.writeFileSync(staleHTML, 'artefato anterior');
    const saveHTML = vi.fn(async () => undefined);
    const savePDF = vi.fn(async (_html: string, outputPath: string) => {
      fs.writeFileSync(outputPath, '%PDF');
      return outputPath;
    });
    const saveTXT = vi.fn(async () => 'unused');

    const paths = await persistRequestedOutputs({
      formats: ['pdf'],
      html: '<html></html>',
      outputDir,
      outputName: 'curriculo',
      writers: {
        html: { save: saveHTML },
        pdf: { generate: savePDF },
        txt: { generate: saveTXT },
      },
    });

    expect(paths).toEqual({ pdf: path.join(outputDir, 'curriculo.pdf') });
    expect(savePDF).toHaveBeenCalledOnce();
    expect(saveHTML).not.toHaveBeenCalled();
    expect(saveTXT).not.toHaveBeenCalled();
    expect(fs.readFileSync(staleHTML, 'utf8')).toBe('artefato anterior');
  });

  it('gera texto em <nome>.txt', async () => {
    const outputDir = temporaryDirectory();
    const paths = await persistRequestedOutputs({
      formats: ['txt'],
      html: fs.readFileSync(path.join(process.cwd(), 'test/fixtures/base-curriculum.html'), 'utf8'),
      outputDir,
      outputName: 'ana',
      writers: {
        html: { save: async () => undefined },
        pdf: { generate: async (_html, outputPath) => outputPath },
        txt: new TextGenerator(),
      },
    });
    expect(paths.txt).toBe(path.join(outputDir, 'ana.txt'));
    expect(fs.readFileSync(paths.txt!, 'utf8')).toContain('EXPERIÊNCIA PROFISSIONAL');
  });
});

describe('SQLite output history migration', () => {
  it('adiciona file_path_txt e preserva file_path_markdown legado', () => {
    const directory = temporaryDirectory();
    const dbPath = path.join(directory, 'legacy.db');
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE generated_cvs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        job_analysis_id INTEGER,
        template TEXT NOT NULL,
        output_name TEXT NOT NULL,
        formats TEXT NOT NULL,
        match_score INTEGER,
        file_path_html TEXT,
        file_path_pdf TEXT,
        file_path_markdown TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    legacy.close();

    const manager = new DatabaseManager(dbPath);
    const columns = manager.getDatabase().prepare('PRAGMA table_info(generated_cvs)').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toEqual(expect.arrayContaining(['file_path_markdown', 'file_path_txt']));
    manager.saveGeneratedCV({
      jobId: null,
      jobAnalysisId: null,
      template: 'role',
      outputName: 'curriculo',
      formats: ['pdf', 'txt'],
      matchScore: null,
      filePathHtml: null,
      filePathPdf: '/output/curriculo.pdf',
      filePathMarkdown: null,
      filePathTxt: '/output/curriculo.txt',
    });
    const row = manager.getDatabase().prepare(
      'SELECT formats, file_path_html, file_path_pdf, file_path_markdown, file_path_txt FROM generated_cvs'
    ).get() as Record<string, string | null>;
    expect(JSON.parse(row.formats!)).toEqual(['pdf', 'txt']);
    expect(row.file_path_html).toBeNull();
    expect(row.file_path_pdf).toBe('/output/curriculo.pdf');
    expect(row.file_path_markdown).toBeNull();
    expect(row.file_path_txt).toBe('/output/curriculo.txt');
    manager.close();
  });
});

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'output-formats-'));
  temporaryDirectories.push(directory);
  return directory;
}
