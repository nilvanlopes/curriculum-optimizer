import * as cheerio from 'cheerio';
import type { CurriculumSource } from './curriculum-source.js';
import { sourcePlainText } from './curriculum-source.js';

export interface BaseCurriculumValidation {
  valid: boolean;
  errors: string[];
}

const RELEVANCE = new Set(['high', 'medium', 'low']);
const IMPACT = new Set(['high', 'medium', 'low']);

export function extractHTMLDocument(response: string): string {
  const trimmed = response.trim();
  const fenced = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  const candidate = (fenced?.[1] || trimmed).trim();
  const doctypeStart = candidate.search(/<!doctype\s+html/i);
  const htmlStart = candidate.search(/<html(?:\s|>)/i);
  const start = doctypeStart >= 0 ? doctypeStart : htmlStart;
  const end = candidate.toLowerCase().lastIndexOf('</html>');
  if (start < 0 || end < start) {
    return candidate;
  }
  return candidate.slice(start, end + '</html>'.length).trim();
}

export function validateBaseCurriculumHTML(
  html: string,
  source?: Pick<CurriculumSource, 'content' | 'format'>
): BaseCurriculumValidation {
  const errors: string[] = [];
  const raw = html.trim();
  if (!/^<!doctype\s+html/i.test(raw)) {
    errors.push('Documento deve começar com <!DOCTYPE html>.');
  }
  for (const tag of ['html', 'head', 'body']) {
    if (!new RegExp(`<${tag}(?:\\s|>)`, 'i').test(raw) || !new RegExp(`</${tag}>`, 'i').test(raw)) {
      errors.push(`Documento deve conter <${tag}> completo.`);
    }
  }

  const $ = cheerio.load(raw);
  if ($('script, iframe, object, embed, form').length > 0) {
    errors.push('Documento contém elementos executáveis proibidos.');
  }
  $('*').each((_, element) => {
    if (element.type !== 'tag') return;
    for (const [name, value] of Object.entries(element.attribs)) {
      if (name.toLowerCase().startsWith('on')) {
        errors.push(`Atributo de evento proibido: ${name}.`);
      }
      if (['href', 'src'].includes(name.toLowerCase()) && /^(?:javascript|vbscript|data):/i.test(value)) {
        errors.push(`URL executável proibida em ${name}.`);
      }
    }
  });

  requireSelector($, '.header', 'Header (.header)', errors);
  requireSelector($, '.header h1', 'Nome no header (.header h1)', errors);
  requireSelector($, '.header .title', 'Título no header (.header .title)', errors);
  requireSelector($, '.contact-info', 'Contato (.contact-info)', errors);
  requireSelector($, '.summary[data-customizable="summary"]', 'Summary com data-customizable="summary"', errors);
  requireSelector($, '.experience-item', 'Experiências (.experience-item)', errors);
  requireSelector($, '.skill-category', 'Competências (.skill-category)', errors);

  const companyIds = new Set<string>();
  $('.experience-item').each((index, element) => {
    const item = $(element);
    const prefix = `Experiência ${index + 1}`;
    const companyId = item.attr('data-company')?.trim() || '';
    if (!companyId) errors.push(`${prefix} sem data-company.`);
    else if (companyIds.has(companyId)) errors.push(`${prefix} repete data-company="${companyId}".`);
    else companyIds.add(companyId);
    if (!item.attr('data-keywords')?.trim()) errors.push(`${prefix} sem data-keywords.`);
    if (!RELEVANCE.has(item.attr('data-relevance') || '')) errors.push(`${prefix} com data-relevance inválido.`);
    for (const [selector, label] of [
      ['.job-title', 'cargo'],
      ['.period', 'período'],
      ['.company-name', 'empresa'],
      ['.achievement', 'conquista'],
    ] as const) {
      if (!item.find(selector).length || !item.find(selector).first().text().trim()) {
        errors.push(`${prefix} sem ${label} (${selector}).`);
      }
    }
    item.find('.achievement').each((achievementIndex, achievementElement) => {
      const achievement = $(achievementElement);
      const label = `${prefix}, conquista ${achievementIndex + 1}`;
      if (!achievement.attr('data-category')?.trim()) errors.push(`${label} sem data-category.`);
      if (!IMPACT.has(achievement.attr('data-impact') || '')) errors.push(`${label} com data-impact inválido.`);
      if (!achievement.attr('data-keywords')?.trim()) errors.push(`${label} sem data-keywords.`);
      if (!['true', 'false'].includes(achievement.attr('data-metrics') || '')) {
        errors.push(`${label} com data-metrics inválido.`);
      }
    });
  });

  $('.skill-category').each((index, element) => {
    const category = $(element);
    if (!category.attr('data-category')?.trim()) errors.push(`Categoria de skill ${index + 1} sem data-category.`);
    if (!category.find('.skill-category-title').text().trim()) errors.push(`Categoria de skill ${index + 1} sem título.`);
    if (!category.find('.skill-list').text().trim()) errors.push(`Categoria de skill ${index + 1} sem lista.`);
  });

  if (/\{\{[^}]+\}\}|\[(?:NOME|CONTATO|CARGO|PREENCHER)[^\]]*\]/i.test($('body').text())) {
    errors.push('Documento contém placeholders não preenchidos.');
  }

  if (source) {
    validateGrounding($, sourcePlainText(source), errors);
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

function requireSelector(
  $: cheerio.CheerioAPI,
  selector: string,
  label: string,
  errors: string[]
): void {
  if (!$(selector).length) {
    errors.push(`Seção obrigatória ausente: ${label}.`);
  }
}

function validateGrounding($: cheerio.CheerioAPI, sourceText: string, errors: string[]): void {
  const normalizedSource = normalizeFact(sourceText);
  const visibleBody = $('body').clone();
  visibleBody.find('style, script, noscript, template').remove();
  const visible = visibleBody.text();
  const numericFacts = visible.match(/\b\d[\d.,/%+-]*\b/g) || [];
  for (const fact of numericFacts) {
    if (!normalizeFact(fact) || normalizedSource.includes(normalizeFact(fact))) continue;
    errors.push(`Valor numérico ausente da fonte original: ${fact}.`);
  }

  const skillFacts = new Set<string>();
  $('.skill-list, .tech-tag').each((_, element) => {
    const container = $(element);
    const leaves = container.find('*').filter((__, child) => $(child).children().length === 0);
    const candidates = leaves.length > 0
      ? leaves.toArray().map((leaf) => $(leaf).text())
      : [container.text()];
    candidates
      .flatMap((candidate) => candidate.split(/[,;|•\n]/))
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => skillFacts.add(value));
  });
  for (const skill of skillFacts) {
    const normalized = normalizeFact(skill);
    if (normalized.length >= 2 && !isGroundedSkill(skill, sourceText, normalizedSource)) {
      errors.push(`Competência ausente da fonte original: ${skill}.`);
    }
  }
}

function isGroundedSkill(skill: string, sourceText: string, normalizedSource: string): boolean {
  const normalizedSkill = normalizeFact(skill);
  if (normalizedSource.includes(normalizedSkill)) return true;

  const tokens = skill
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map(normalizeFact)
    .filter((token) => token.length >= 2);
  if (tokens.length < 2) return false;

  return sourceText
    .split(/[\n.!?;]+/)
    .map(normalizeFact)
    .some((segment) => tokens.every((token) => segment.includes(token)));
}

function normalizeFact(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '');
}
