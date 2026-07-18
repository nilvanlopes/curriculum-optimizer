export type OutputFormat = 'pdf' | 'html' | 'txt';

const VALID_FORMATS: readonly OutputFormat[] = ['pdf', 'html', 'txt'] as const;

export function parseOutputFormats(value?: string): OutputFormat[] {
  const raw = value === undefined ? 'pdf' : value;
  const formats = raw
    .split(',')
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean);
  if (formats.length === 0) {
    throw new Error(`A lista --formats não pode ser vazia. Formatos válidos: ${VALID_FORMATS.join(', ')}.`);
  }

  const invalid = [...new Set(formats.filter((format) => !VALID_FORMATS.includes(format as OutputFormat)))];
  if (invalid.length > 0) {
    throw new Error(`Formatos inválidos: ${invalid.join(', ')}. Formatos válidos: ${VALID_FORMATS.join(', ')}.`);
  }
  return [...new Set(formats)] as OutputFormat[];
}
