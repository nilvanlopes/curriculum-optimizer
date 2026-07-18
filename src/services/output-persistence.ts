import fs from 'fs';
import path from 'path';
import { HTMLComposer } from '../generators/html-composer.js';
import { PDFGenerator } from '../generators/pdf.js';
import { TextGenerator } from '../generators/text.js';
import type { OutputFormat } from '../utils/output-formats.js';

export interface OutputWriters {
  html: Pick<HTMLComposer, 'save'>;
  pdf: Pick<PDFGenerator, 'generate'>;
  txt: Pick<TextGenerator, 'generate'>;
}

export async function persistRequestedOutputs(options: {
  formats: OutputFormat[];
  html: string;
  outputDir: string;
  outputName: string;
  writers?: OutputWriters;
}): Promise<Partial<Record<OutputFormat, string>>> {
  const writers = options.writers || {
    html: new HTMLComposer(),
    pdf: new PDFGenerator(),
    txt: new TextGenerator(),
  };
  fs.mkdirSync(options.outputDir, { recursive: true });
  const paths: Partial<Record<OutputFormat, string>> = {};

  if (options.formats.includes('html')) {
    paths.html = path.join(options.outputDir, `${options.outputName}.html`);
    await writers.html.save(options.html, paths.html);
  }
  if (options.formats.includes('pdf')) {
    paths.pdf = path.join(options.outputDir, `${options.outputName}.pdf`);
    await writers.pdf.generate(options.html, paths.pdf);
  }
  if (options.formats.includes('txt')) {
    paths.txt = path.join(options.outputDir, `${options.outputName}.txt`);
    await writers.txt.generate(options.html, paths.txt);
  }
  return paths;
}
