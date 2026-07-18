import type { JobAnalysisResult } from '../../types.js';

export interface PresentationSourceFacts {
  name: string;
  title: string;
  summary: string;
  profileText: string;
}

export interface PresentationValidationResult {
  valid: boolean;
  rejectedTerms: string[];
  allowedFacts: string;
}

const CREDENTIAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bMBA\b/i, label: 'MBA' },
  { pattern: /\bM\.?B\.?A\.?\b/i, label: 'MBA' },
  { pattern: /p[óo]s[- ]?gradua[cç][aã]o/i, label: 'pós-graduação' },
  { pattern: /\bmestrado\b/i, label: 'mestrado' },
  { pattern: /\bdoutorado\b/i, label: 'doutorado' },
  { pattern: /\bphd\b/i, label: 'PhD' },
  { pattern: /\bespecializa[cç][aã]o\b/i, label: 'especialização' },
  { pattern: /\bcertifica[cç][aã]o\b/i, label: 'certificação' },
  { pattern: /\bcertificado\b/i, label: 'certificado' },
  { pattern: /\bpmp\b/i, label: 'PMP' },
  { pattern: /\bscrum master\b/i, label: 'Scrum Master' },
];

const SENIORITY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btech lead\b/i, label: 'Tech Lead' },
  { pattern: /\blead\b/i, label: 'Lead' },
  { pattern: /\bs[ée]nior\b/i, label: 'Senior' },
  { pattern: /\bsenior\b/i, label: 'Senior' },
  { pattern: /\bmanager\b/i, label: 'Manager' },
  { pattern: /\bgerente\b/i, label: 'Gerente' },
  { pattern: /\barquiteto\b/i, label: 'Arquiteto' },
  { pattern: /\bprincipal\b/i, label: 'Principal' },
  { pattern: /\bstaff\b/i, label: 'Staff' },
];

const GENERIC_ALLOWED_TERMS = new Set([
  'experiencia',
  'experiência',
  'profissional',
  'desenvolvedor',
  'desenvolvedora',
  'web',
  'full',
  'stack',
  'focado',
  'focada',
  'aprendizado',
  'continuo',
  'contínuo',
  'projetos',
  'pessoais',
  'interfaces',
  'responsivas',
  'aplicacoes',
  'aplicações',
  'apis',
  'api',
]);

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeJobAnalysis(jobAnalysis?: JobAnalysisResult): JobAnalysisResult | undefined {
  if (!jobAnalysis) {
    return undefined;
  }

  return {
    ...jobAnalysis,
    keywords: arrayOfStrings(jobAnalysis.keywords),
    requirements: {
      mandatory: arrayOfStrings(jobAnalysis.requirements?.mandatory),
      desirable: arrayOfStrings(jobAnalysis.requirements?.desirable),
    },
    gaps: Array.isArray(jobAnalysis.gaps)
      ? jobAnalysis.gaps.filter((gap) => gap && typeof gap.keyword === 'string')
      : [],
    highlights: {
      mainResponsibilities: arrayOfStrings(jobAnalysis.highlights?.mainResponsibilities),
      differentiators: arrayOfStrings(jobAnalysis.highlights?.differentiators),
    },
    suggestions: arrayOfStrings(jobAnalysis.suggestions),
    matchScoreJustification:
      typeof jobAnalysis.matchScoreJustification === 'string' ? jobAnalysis.matchScoreJustification : '',
  };
}

function buildAllowedFacts(
  source: PresentationSourceFacts,
  role?: string,
  jobAnalysis?: JobAnalysisResult
): string {
  const normalizedJobAnalysis = normalizeJobAnalysis(jobAnalysis);
  const parts = [
    source.name,
    source.title,
    source.summary,
    source.profileText,
    role || '',
  ];

  if (normalizedJobAnalysis) {
    parts.push(
      normalizedJobAnalysis.keywords.join(' '),
      normalizedJobAnalysis.requirements.mandatory.join(' '),
      normalizedJobAnalysis.requirements.desirable.join(' '),
      normalizedJobAnalysis.gaps.map((gap) => gap.keyword).join(' '),
      normalizedJobAnalysis.highlights.mainResponsibilities.join(' '),
      normalizedJobAnalysis.highlights.differentiators.join(' '),
      normalizedJobAnalysis.suggestions.join(' '),
      normalizedJobAnalysis.matchScoreJustification
    );
  }

  return normalizeText(parts.filter(Boolean).join(' '));
}

function extractSuspiciousTerms(text: string): string[] {
  const terms = new Set<string>();

  for (const { pattern, label } of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) {
      terms.add(label);
    }
  }

  for (const { pattern, label } of SENIORITY_PATTERNS) {
    if (pattern.test(text)) {
      terms.add(label);
    }
  }

  const acronymMatches = text.match(/\b[A-Z]{2,}(?:[./-][A-Z0-9]+)?\b/g) || [];
  acronymMatches.forEach((term) => terms.add(term));

  const techLikeMatches = text.match(/\b[A-Z][a-zA-Z0-9]+(?:\.[A-Za-z0-9]+)+\b/g) || [];
  techLikeMatches.forEach((term) => terms.add(term));

  return Array.from(terms);
}

function isGenericTerm(term: string): boolean {
  return GENERIC_ALLOWED_TERMS.has(normalizeText(term));
}

function containsAllowedFact(allowedFacts: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) {
    return true;
  }
  return allowedFacts.includes(normalizedTerm);
}

export function validatePresentationText(
  text: string,
  source: PresentationSourceFacts,
  role?: string,
  jobAnalysis?: JobAnalysisResult
): PresentationValidationResult {
  const allowedFacts = buildAllowedFacts(source, role, jobAnalysis);
  const rejectedTerms: string[] = [];

  for (const term of extractSuspiciousTerms(text)) {
    if (isGenericTerm(term)) {
      continue;
    }

    if (!containsAllowedFact(allowedFacts, term)) {
      rejectedTerms.push(term);
    }
  }

  return {
    valid: rejectedTerms.length === 0,
    rejectedTerms,
    allowedFacts,
  };
}

function truncateToWholeWords(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const cut = trimmed.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const safeCut = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut.replace(/[.,;:!?-]+$/, '')}...`;
}

export function buildFallbackPresentation(
  source: PresentationSourceFacts,
  role?: string,
  jobAnalysis?: JobAnalysisResult
): string {
  const normalizedJobAnalysis = normalizeJobAnalysis(jobAnalysis);
  const facts = source.profileText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^principais experiências:$/i.test(line))
    .filter((line) => !/^stack principal:$/i.test(line));

  const parts: string[] = [];
  const title = role || source.title || 'Profissional de tecnologia';
  if (title) {
    parts.push(title);
  }

  if (source.summary) {
    parts.push(source.summary);
  }

  const meaningfulFacts = facts.filter((line) => {
    const normalized = normalizeText(line);
    return (
      normalized.length > 0 &&
      !normalized.includes(normalizeText(source.name)) &&
      !normalized.includes(normalizeText(source.title)) &&
      normalized !== normalizeText(source.summary)
    );
  });

  const selectedFacts = meaningfulFacts.slice(0, 3);
  if (selectedFacts.length > 0) {
    parts.push(selectedFacts.join(' | '));
  }

  if (normalizedJobAnalysis && normalizedJobAnalysis.keywords.length > 0) {
    parts.push(`Keywords relevantes: ${normalizedJobAnalysis.keywords.slice(0, 4).join(', ')}`);
  }

  let fallback = parts.join(' • ').replace(/\s+/g, ' ').trim();
  let factIndex = selectedFacts.length;

  while (fallback.length < 200 && factIndex < meaningfulFacts.length) {
    fallback = `${fallback} • ${meaningfulFacts[factIndex]}`.replace(/\s+/g, ' ').trim();
    factIndex += 1;
  }

  return truncateToWholeWords(fallback, 380);
}

export function buildValidationFeedback(
  source: PresentationSourceFacts,
  rejectedTerms: string[],
  role?: string,
  jobAnalysis?: JobAnalysisResult
): string {
  const normalizedJobAnalysis = normalizeJobAnalysis(jobAnalysis);
  const allowedPreview = source.profileText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .join('\n- ');

  const keywordPreview = normalizedJobAnalysis?.keywords.length
    ? `\n- Job keywords: ${normalizedJobAnalysis.keywords.slice(0, 6).join(', ')}`
    : '';

  return [
    'Reescreva o presentationText usando somente fatos presentes na fonte.',
    role ? `- Role fornecido: ${role}` : '',
    rejectedTerms.length > 0 ? `- Termos rejeitados: ${rejectedTerms.join(', ')}` : '',
    '- Não invente diplomas, MBAs, certificações, senioridade ou tecnologias.',
    '- Use métricas somente se estiverem explicitamente presentes na fonte.',
    '- Fonte factual disponível:',
    allowedPreview ? `- ${allowedPreview}` : '',
    keywordPreview,
  ]
    .filter(Boolean)
    .join('\n');
}
