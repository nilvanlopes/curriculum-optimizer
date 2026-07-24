import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { BaseCurriculumImporter } from '../src/services/base-curriculum-importer.js';
import type { CurriculumSource } from '../src/services/curriculum-source.js';
import { AIClient } from '../src/utils/ai-client.js';
import type {
  AICallOptions,
  AIProviderType,
  IAProvider,
} from '../src/utils/ai-providers/interface.js';
import { sha256 } from '../src/utils/hash.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

describe('BaseCurriculumImporter', () => {
  it('aceita HTML em code fence, persiste metadados e reutiliza cache', async () => {
    const setup = importerSetup([`\`\`\`html\n${validBase()}\n\`\`\``]);
    const first = await setup.importer.ensureBase(source());
    const second = await setup.importer.ensureBase(source());

    expect(first.cache).toBe('generated');
    expect(second.cache).toBe('hit');
    expect(setup.provider.calls).toHaveLength(1);
    expect(setup.provider.calls[0].options?.mode).toBe('text');
    expect(fs.readFileSync(setup.basePath, 'utf8')).toMatch(/^<!DOCTYPE html>/);
    const metadata = JSON.parse(fs.readFileSync(setup.metadataPath, 'utf8'));
    expect(metadata.source.sha256).toBe(source().sha256);
    expect(metadata.promptSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.layoutSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.baseSha256).toBe(sha256(fs.readFileSync(setup.basePath)));
    expect(metadata.provider).toBe('ollama');
    expect(metadata.model).toBe('test-model');
  });

  it('invalida cache quando fonte, prompt ou layout mudam', async () => {
    const directory = temporaryDirectory();
    const promptDirectory = path.join(directory, 'prompts');
    fs.mkdirSync(promptDirectory);
    const promptPath = path.join(promptDirectory, '06-import-curriculum.md');
    fs.copyFileSync(path.join(process.cwd(), 'prompts/06-import-curriculum.md'), promptPath);
    const layoutPath = path.join(directory, 'layout.html');
    fs.copyFileSync(path.join(process.cwd(), 'src/templates/curriculum-layout.html'), layoutPath);
    const provider = new QueueProvider([validBase(), validBase(), validBase(), validBase()]);
    const client = new AIClient({ provider, promptsDir: promptDirectory });
    const basePath = path.join(directory, 'base.html');
    const metadataPath = path.join(directory, 'base.json');
    const createImporter = () => new BaseCurriculumImporter({
      aiClient: client,
      layoutPath,
      basePath,
      metadataPath,
    });

    await createImporter().ensureBase(source());
    await createImporter().ensureBase({ ...source(), sha256: 'f'.repeat(64) });
    fs.appendFileSync(promptPath, '\n<!-- prompt v2 -->\n');
    await createImporter().ensureBase({ ...source(), sha256: 'f'.repeat(64) });
    fs.appendFileSync(layoutPath, '\n<!-- layout v2 -->\n');
    await createImporter().ensureBase({ ...source(), sha256: 'f'.repeat(64) });
    expect(provider.calls).toHaveLength(4);
  });

  it('refresh-base ignora cache, mas trocar provider/model não', async () => {
    const setup = importerSetup([validBase(), validBase()]);
    await setup.importer.ensureBase(source());

    const otherProvider = new QueueProvider([], 'openai', 'different-model');
    const otherImporter = new BaseCurriculumImporter({
      aiClient: new AIClient({ provider: otherProvider }),
      basePath: setup.basePath,
      metadataPath: setup.metadataPath,
    });
    expect((await otherImporter.ensureBase(source())).cache).toBe('hit');
    expect(otherProvider.calls).toHaveLength(0);

    expect((await setup.importer.ensureBase(source(), true)).cache).toBe('generated');
    expect(setup.provider.calls).toHaveLength(2);
  });

  it.each(['metadata', 'base'])('regenera cache %s corrompido', async (target) => {
    const setup = importerSetup([validBase(), validBase()]);
    await setup.importer.ensureBase(source());
    if (target === 'metadata') fs.writeFileSync(setup.metadataPath, '{broken');
    else fs.appendFileSync(setup.basePath, '<script>alterado</script>');

    expect((await setup.importer.ensureBase(source())).cache).toBe('generated');
    expect(setup.provider.calls).toHaveLength(2);
  });

  it('faz uma tentativa corretiva com os erros estruturais', async () => {
    const setup = importerSetup(['<html><body>incompleto</body></html>', validBase()]);
    const result = await setup.importer.ensureBase(source());
    expect(result.cache).toBe('generated');
    expect(setup.provider.calls).toHaveLength(2);
    expect(setup.provider.calls[1].prompt).toContain('Seção obrigatória ausente');
    expect(setup.provider.calls[1].prompt).toContain('<html><body>incompleto</body></html>');
    expect(setup.provider.calls[1].options?.mode).toBe('text');
  });

  it('normaliza data-metrics estrutural antes de validar a importação', async () => {
    const withoutMetrics = validBase()
      .replace(' data-metrics="false">Desenvolvimento de aplicações responsivas', '>Desenvolvimento de aplicações responsivas')
      .replace('data-metrics="false">Integração de interfaces', 'data-metrics="talvez">Integração de interfaces');
    const setup = importerSetup([withoutMetrics]);

    await expect(setup.importer.ensureBase(source())).resolves.toMatchObject({ cache: 'generated' });
    const html = fs.readFileSync(setup.basePath, 'utf8');
    expect(html).toContain('data-metrics="false">Desenvolvimento de aplicações responsivas');
    expect(html).toContain('data-metrics="false">Integração de interfaces');
  });

  it('normaliza placeholders de metadados sem alterar fatos visíveis', async () => {
    const withAttributePlaceholders = validBase()
      .replace('data-company="empresa-exemplo"', 'data-company="[slug-unico]"')
      .replace('data-keywords="react,typescript,apis"', 'data-keywords="[keywords-da-fonte]"')
      .replace('data-category="frontend"', 'data-category="[categoria]"')
      .replace('data-keywords="react,typescript"', 'data-keywords="[keywords-da-fonte]"');
    const setup = importerSetup([withAttributePlaceholders]);

    await expect(setup.importer.ensureBase(source())).resolves.toMatchObject({ cache: 'generated' });
    const html = fs.readFileSync(setup.basePath, 'utf8');
    expect(html).toContain('data-company="empresa-exemplo"');
    expect(html).not.toContain('[slug-unico]');
    expect(html).not.toContain('[keywords-da-fonte]');
    expect(html).not.toContain('[categoria]');
  });

  it('bloqueia contatos inventados e currículo base com seções descartadas', async () => {
    const badImport = validBase()
      .replaceAll('Ana Silva', 'Nilvan Lopes')
      .replaceAll('Desenvolvedora Web', 'Desenvolvedor Fullstack')
      .replaceAll('ana@example.com', 'nilvanlopes@example.com')
      .replace('Desenvolvedora Frontend', 'Desenvolvedor Fullstack')
      .replace('2022 - Presente', '2026 - Presente')
      .replace('Empresa Exemplo', 'Fity Ai')
      .replace('Desenvolvimento de aplicações responsivas com React e TypeScript.', 'Desenvolvimento de aplicativo mobile utilizando React Native e NestJS.')
      .replace('Integração de interfaces com APIs.', '')
      .replace('HTML, CSS, React, TypeScript', 'React, Angular, HTML, CSS, JavaScript');
    const setup = importerSetup([badImport, badImport]);

    await expect(setup.importer.ensureBase(markdownSource())).rejects.toThrow(/Contato ausente|2 experiência|formação|idiomas/);
  });

  it('não sobrescreve cache anterior quando as duas tentativas falham', async () => {
    const setup = importerSetup([validBase()]);
    await setup.importer.ensureBase(source());
    const oldBase = fs.readFileSync(setup.basePath);
    const oldMetadata = fs.readFileSync(setup.metadataPath);

    const failing = new QueueProvider(['<html>ruim</html>', '<html>ainda ruim</html>']);
    const importer = new BaseCurriculumImporter({
      aiClient: new AIClient({ provider: failing }),
      basePath: setup.basePath,
      metadataPath: setup.metadataPath,
    });
    await expect(importer.ensureBase(source(), true)).rejects.toThrow('após 2 tentativas');
    expect(fs.readFileSync(setup.basePath)).toEqual(oldBase);
    expect(fs.readFileSync(setup.metadataPath)).toEqual(oldMetadata);
  });

  it('bloqueia métricas e competências ausentes da fonte', async () => {
    const invented = validBase()
      .replace('Desenvolvimento de aplicações responsivas com React e TypeScript.', 'Reduziu custos em 35% usando Rust.')
      .replace('HTML, CSS, React, TypeScript', 'React, TypeScript, Rust');
    const setup = importerSetup([invented, invented]);
    await expect(setup.importer.ensureBase(source())).rejects.toThrow(/35%|Rust/);
  });

  it('não interpreta números de CSS como fatos do candidato', async () => {
    const withBodyStyle = validBase().replace(
      '</body>',
      '<style>.resume { color: #172033; font-weight: 700; }</style></body>'
    );
    const setup = importerSetup([withBodyStyle]);

    await expect(setup.importer.ensureBase(source())).resolves.toMatchObject({ cache: 'generated' });
    expect(setup.provider.calls).toHaveLength(1);
  });

  it('aceita competência composta cujos termos constam na mesma frase da fonte', async () => {
    const content = `${source().content}\nIntegração ao WhatsApp com a API oficial.`;
    const groundedSource: CurriculumSource = {
      ...source(),
      content,
      sha256: sha256(content),
      size: Buffer.byteLength(content),
    };
    const reorderedSkill = validBase().replace(
      '<div class="skill-list">APIs</div>',
      '<div class="skill-list">WhatsApp API</div>'
    );
    const setup = importerSetup([reorderedSkill]);

    await expect(setup.importer.ensureBase(groundedSource)).resolves.toMatchObject({ cache: 'generated' });
  });

  it('valida cada competência quando a lista usa elementos filhos', async () => {
    const withSkillSpans = validBase().replace(
      '<div class="skill-list">HTML, CSS, React, TypeScript</div>',
      '<div class="skill-list"><span>HTML</span><span>CSS</span><span>React</span><span>TypeScript</span></div>'
    );
    const setup = importerSetup([withSkillSpans]);

    await expect(setup.importer.ensureBase(source())).resolves.toMatchObject({ cache: 'generated' });
  });
});

class QueueProvider implements IAProvider {
  readonly endpoint = 'http://localhost:11434/v1';
  readonly calls: Array<{ prompt: string; options?: AICallOptions }> = [];

  constructor(
    private readonly responses: Array<string | Error>,
    readonly provider: AIProviderType = 'ollama',
    readonly model = 'test-model'
  ) {}

  async call(prompt: string, options?: AICallOptions): Promise<string> {
    this.calls.push({ prompt, options });
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    if (response === undefined) throw new Error('Resposta de teste não configurada');
    return response;
  }
}

function importerSetup(responses: Array<string | Error>) {
  const directory = temporaryDirectory();
  const provider = new QueueProvider(responses);
  const basePath = path.join(directory, 'base-curriculum.html');
  const metadataPath = path.join(directory, 'base-curriculum.meta.json');
  return {
    provider,
    basePath,
    metadataPath,
    importer: new BaseCurriculumImporter({
      aiClient: new AIClient({ provider }),
      basePath,
      metadataPath,
    }),
  };
}

function source(): CurriculumSource {
  const content = [
    'Ana Silva',
    'Desenvolvedora Web',
    'ana@example.com',
    'Empresa Exemplo',
    'Desenvolvedora Frontend',
    '2022 - Presente',
    'Desenvolvimento de aplicações responsivas com React e TypeScript.',
    'Integração de interfaces com APIs.',
    'Competências: HTML, CSS, React, TypeScript, APIs.',
  ].join('\n');
  return {
    path: '/tmp/original-curriculum.txt',
    format: 'txt',
    content,
    sha256: sha256(content),
    size: Buffer.byteLength(content),
  };
}

function markdownSource(): CurriculumSource {
  const content = [
    '# Nilvan Lopes Cruz',
    '',
    '- **E-mail:** nilvanlopes@outlook.com',
    '- **LinkedIn:** https://www.linkedin.com/in/nilvanlopes/',
    '- **GitHub:** https://github.com/nilvanlopes',
    '',
    '## Formação',
    '',
    '- 2024 - Análise e Desenvolvimento de Sistemas, Universidade Estadual do Tocantins (UNITINS) - Cursando',
    '',
    '## Experiência profissional',
    '',
    '### 2026 - Fity Ai',
    '',
    '- **Cargo:** Desenvolvedor Fullstack',
    '- Desenvolvimento de aplicativo mobile, utilizando React Native e NestJS.',
    '',
    '### 2025 - Niceplanet',
    '',
    '- **Cargo:** Desenvolvedor Fullstack Junior',
    '- Manutenção e evolução do sistema central da empresa utilizando React, PHP e Node.js.',
    '',
    '## Idiomas',
    '',
    '- Inglês: Intermediário',
  ].join('\n');
  return {
    path: '/tmp/original-curriculum.md',
    format: 'md',
    content,
    sha256: sha256(content),
    size: Buffer.byteLength(content),
  };
}

function validBase(): string {
  return fs.readFileSync(path.join(process.cwd(), 'test/fixtures/base-curriculum.html'), 'utf8');
}

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'base-importer-'));
  temporaryDirectories.push(directory);
  return directory;
}
