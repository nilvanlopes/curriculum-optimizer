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

export function normalizeBaseCurriculumHTML(html: string): string {
  const raw = html.trim();
  const $ = cheerio.load(raw);

  $('.achievement').each((_, achievementElement) => {
    const achievement = $(achievementElement);
    if (!achievement.attr('data-category')?.trim() || isPlaceholder(achievement.attr('data-category') || '')) {
      achievement.attr('data-category', slugify(deriveKeywords(achievement.text())[0] || 'experiencia'));
    }
    if (!achievement.attr('data-keywords')?.trim() || isPlaceholder(achievement.attr('data-keywords') || '')) {
      achievement.attr('data-keywords', deriveKeywords(achievement.text()).join(','));
    }
    if (['true', 'false'].includes(achievement.attr('data-metrics') || '')) return;

    achievement.attr('data-metrics', containsMetric(achievement.text()) ? 'true' : 'false');
  });

  const usedCompanyIds = new Set<string>();
  $('.experience-item').each((index, experienceElement) => {
    const experience = $(experienceElement);
    let companyId = experience.attr('data-company') || '';
    if (!companyId.trim() || isPlaceholder(companyId)) {
      const companyName = experience.find('.company-name').first().text();
      const jobTitle = experience.find('.job-title').first().text();
      companyId = slugify(companyName || jobTitle || `experiencia-${index + 1}`);
    } else {
      companyId = slugify(companyId);
    }

    const uniqueCompanyId = uniqueSlug(companyId, usedCompanyIds);
    usedCompanyIds.add(uniqueCompanyId);
    experience.attr('data-company', uniqueCompanyId);

    if (!experience.attr('data-keywords')?.trim() || isPlaceholder(experience.attr('data-keywords') || '')) {
      experience.attr('data-keywords', deriveKeywords(experience.text()).join(','));
    }
  });

  $('.skill-category').each((index, categoryElement) => {
    const category = $(categoryElement);
    if (!category.attr('data-category')?.trim() || isPlaceholder(category.attr('data-category') || '')) {
      const title = category.find('.skill-category-title').first().text();
      category.attr('data-category', slugify(title || `competencias-${index + 1}`));
    }
  });

  return $.html();
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

  const placeholderText = [
    $('body').text(),
    ...$('*').toArray().flatMap((element) => (
      element.type === 'tag' ? Object.values(element.attribs || {}) : []
    )),
  ].join('\n');
  if (/\{\{[^}]+\}\}|\[(?:NOME|CONTATO|CARGO|PREENCHER|slug|keywords|categoria|realiza|tecnologia|per[íi]odo|empresa)[^\]]*\]/i.test(placeholderText)) {
    errors.push('Documento contém placeholders não preenchidos.');
  }

  if (source) {
    const sourceText = sourcePlainText(source);
    validateGrounding($, sourceText, errors);
    validateContactGrounding($, sourceText, errors);
    validateSourceCoverage($, source.content, errors);
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

function validateContactGrounding($: cheerio.CheerioAPI, sourceText: string, errors: string[]): void {
  const normalizedSource = normalizeContact(sourceText);
  $('.contact-info a').each((_, element) => {
    const link = $(element);
    const href = link.attr('href') || '';
    const text = link.text();
    const contactValues = [href, text]
      .map((value) => normalizeContact(value.replace(/^mailto:/i, '')))
      .filter((value) => value.length >= 5);

    for (const value of contactValues) {
      if (!normalizedSource.includes(value)) {
        errors.push(`Contato ausente da fonte original: ${text || href}.`);
        break;
      }
    }
  });

  const requiredContacts = extractSourceContacts(sourceText);
  const renderedContacts = normalizeContact($('.contact-info').text());
  const renderedHrefs = normalizeContact($('.contact-info a').toArray().map((element) => $(element).attr('href') || '').join(' '));
  for (const contact of requiredContacts) {
    if (!renderedContacts.includes(contact) && !renderedHrefs.includes(contact)) {
      errors.push(`Contato da fonte original ausente no HTML: ${contact}.`);
    }
  }
}

function validateSourceCoverage($: cheerio.CheerioAPI, sourceText: string, errors: string[]): void {
  const visible = $('body').text();
  const normalizedVisible = normalizeFact(visible);
  const expectedExperiences = countSectionItems(sourceText, 'Experiência profissional');
  if (expectedExperiences > 0 && $('.experience-item').length < expectedExperiences) {
    errors.push(`Fonte contém ${expectedExperiences} experiência(s), mas HTML contém ${$('.experience-item').length}.`);
  }
  for (const experience of extractExperienceHeadings(sourceText)) {
    if (experience.company && !normalizedVisible.includes(normalizeFact(experience.company))) {
      errors.push(`Experiência da fonte original ausente no HTML: ${experience.company}.`);
    }
    if (experience.period && !normalizedVisible.includes(normalizeFact(experience.period))) {
      errors.push(`Período da experiência ausente no HTML: ${experience.period}.`);
    }
  }

  for (const [heading, selector, label] of [
    ['Formação', '.education', 'formação'],
    ['Idiomas', '.languages', 'idiomas'],
  ] as const) {
    if (hasSection(sourceText, heading) && !$(selector).text().trim()) {
      errors.push(`Fonte contém ${label}, mas HTML não contém seção ${selector}.`);
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

function containsMetric(value: string): boolean {
  return /\b\d[\d.,/%+-]*\b/.test(value);
}

function isPlaceholder(value: string): boolean {
  return /\[[^\]]+\]|\{\{[^}]+\}\}/.test(value);
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

function uniqueSlug(value: string, used: Set<string>): string {
  const base = slugify(value);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function deriveKeywords(value: string): string[] {
  const stopwords = new Set([
    'com', 'das', 'dos', 'para', 'por', 'uma', 'uso', 'em', 'de', 'da', 'do', 'e',
    'the', 'and', 'with',
  ]);
  return [...new Set(
    value
      .split(/[^\p{L}\p{N}+#.]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopwords.has(token.toLowerCase()))
  )].slice(0, 6);
}

function normalizeContact(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//g, '')
    .replace(/^www\./g, '')
    .replace(/\/+$/g, '')
    .replace(/[^a-z0-9@._/-]/g, '');
}

function extractSourceContacts(sourceText: string): string[] {
  const contacts = new Set<string>();
  for (const email of sourceText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || []) {
    contacts.add(normalizeContact(email));
  }
  for (const url of sourceText.match(/https?:\/\/[^\s)]+/gi) || []) {
    contacts.add(normalizeContact(url));
  }
  return [...contacts].filter((contact) => contact.length >= 5);
}

function hasSection(sourceText: string, heading: string): boolean {
  return new RegExp(`^#{1,3}\\s+${escapeRegExp(heading)}\\b`, 'im').test(sourceText);
}

function countSectionItems(sourceText: string, heading: string): number {
  const section = extractMarkdownSection(sourceText, heading);
  if (!section) return 0;
  return (section.match(/^###\s+\S.+$/gm) || []).length;
}

function extractExperienceHeadings(sourceText: string): Array<{ period: string; company: string }> {
  const section = extractMarkdownSection(sourceText, 'Experiência profissional');
  if (!section) return [];
  return (section.match(/^###\s+(.+)$/gm) || [])
    .map((line) => line.replace(/^###\s+/, '').trim())
    .map((heading) => {
      const match = heading.match(/^(\d{4}(?:\s*[-–]\s*(?:\d{4}|Presente|Atual))?)\s*[-–]\s*(.+)$/i);
      return match
        ? { period: match[1].trim(), company: match[2].trim() }
        : { period: '', company: heading };
    });
}

function extractMarkdownSection(sourceText: string, heading: string): string {
  const pattern = new RegExp(`^#{1,3}\\s+${escapeRegExp(heading)}\\b.*$`, 'im');
  const match = pattern.exec(sourceText);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = sourceText.slice(start);
  const nextHeading = rest.search(/^##\s+\S.+$/m);
  return nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
