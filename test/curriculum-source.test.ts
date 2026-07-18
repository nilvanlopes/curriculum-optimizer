import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CurriculumSourceReader,
  resolveCurriculumSourcePath,
  sanitizeCurriculumHTML,
} from '../src/services/curriculum-source.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

describe('curriculum source', () => {
  it('respeita precedência CLI, env e descoberta única', () => {
    const cwd = temporaryDirectory();
    fs.mkdirSync(path.join(cwd, 'input'));
    const discovered = path.join(cwd, 'input/original-curriculum.md');
    const fromEnv = path.join(cwd, 'env.txt');
    const fromCLI = path.join(cwd, 'cli.html');
    fs.writeFileSync(discovered, '# Descoberto');
    fs.writeFileSync(fromEnv, 'Ambiente');
    fs.writeFileSync(fromCLI, '<p>CLI</p>');

    expect(resolveCurriculumSourcePath({ cwd })).toBe(discovered);
    expect(resolveCurriculumSourcePath({ cwd, envCurriculumFile: 'env.txt' })).toBe(fromEnv);
    expect(resolveCurriculumSourcePath({ cwd, envCurriculumFile: 'env.txt', curriculumFile: 'cli.html' })).toBe(fromCLI);
  });

  it('rejeita ausência, ambiguidade e extensão inválida', () => {
    const cwd = temporaryDirectory();
    fs.mkdirSync(path.join(cwd, 'input'));
    expect(() => resolveCurriculumSourcePath({ cwd })).toThrow('não encontrado');
    fs.writeFileSync(path.join(cwd, 'input/original-curriculum.md'), 'A');
    fs.writeFileSync(path.join(cwd, 'input/original-curriculum.txt'), 'B');
    expect(() => resolveCurriculumSourcePath({ cwd })).toThrow('ambígua');
    const invalid = path.join(cwd, 'resume.docx');
    fs.writeFileSync(invalid, 'doc');
    expect(() => resolveCurriculumSourcePath({ cwd, curriculumFile: invalid })).toThrow('Extensão');
  });

  it.each([
    ['md', '# Ana\nReact'],
    ['txt', 'Ana\nReact'],
  ])('lê %s como UTF-8', async (extension, content) => {
    const file = path.join(temporaryDirectory(), `resume.${extension}`);
    fs.writeFileSync(file, content, 'utf8');
    const source = await new CurriculumSourceReader().read(file);
    expect(source.content).toContain('React');
    expect(source.format).toBe(extension);
    expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('sanitiza HTML preservando texto, links e estrutura útil', async () => {
    const unsafe = `<!doctype html><html><head><style>x</style><script>alert(1)</script></head>
      <body onload="steal()"><h1>Ana</h1><a href="https://example.com" onclick="x()">Site</a>
      <a href="javascript:steal()">Ruim</a><p style="color:red">React</p></body></html>`;
    const sanitized = sanitizeCurriculumHTML(unsafe);
    expect(sanitized).toContain('<h1>Ana</h1>');
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toMatch(/script|style=|onload|onclick|javascript:/i);

    const file = path.join(temporaryDirectory(), 'resume.htm');
    fs.writeFileSync(file, unsafe);
    const source = await new CurriculumSourceReader().read(file);
    expect(source.format).toBe('html');
    expect(source.content).toContain('React');
  });

  it('extrai texto de PDF e orienta OCR quando não há texto', async () => {
    const file = path.join(temporaryDirectory(), 'resume.pdf');
    fs.writeFileSync(file, '%PDF-fake');
    const parser = vi.fn().mockResolvedValue({ text: 'Ana Silva\nReact' });
    const source = await new CurriculumSourceReader(parser).read(file);
    expect(source.format).toBe('pdf');
    expect(source.content).toContain('Ana Silva');
    expect(parser).toHaveBeenCalledOnce();

    await expect(new CurriculumSourceReader(async () => ({ text: '  ' })).read(file))
      .rejects.toThrow(/OCR|texto extraível/);
  });

  it('rejeita arquivo vazio', async () => {
    const file = path.join(temporaryDirectory(), 'resume.txt');
    fs.writeFileSync(file, '   ');
    await expect(new CurriculumSourceReader().read(file)).rejects.toThrow('vazio');
  });
});

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'curriculum-source-'));
  temporaryDirectories.push(directory);
  return directory;
}
