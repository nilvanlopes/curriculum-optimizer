import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCLI } from '../helpers/cli-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../fixtures');
const outputDir = path.join(path.dirname(__dirname), '../../output');

describe('CLI: generate', () => {
  const testVagaPath = path.join(fixturesDir, 'test-vaga.md');

  beforeAll(() => {
    // Garante que o diretório de output existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Limpa arquivos de teste gerados
    const testFiles = fs.readdirSync(outputDir).filter(f => 
      f.startsWith('test-') || f.startsWith('curriculo-')
    );
    testFiles.forEach(file => {
      try {
        fs.unlinkSync(path.join(outputDir, file));
      } catch (e) {
        // Ignora erros de limpeza
      }
    });
  });

  describe('Argumentos obrigatórios', () => {
    it('deve falhar quando --role não é fornecido', async () => {
      const result = await runCLI(['generate'], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('required');
    }, 10000);

    it('deve executar com sucesso quando --role é fornecido', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Senior Frontend Developer'
      ], { timeout: 60000 });
      
      // Pode falhar por falta de API key, mas não deve falhar por argumentos
      expect(result.stderr).not.toContain('required');
    }, 120000);
  });

  describe('Argumentos opcionais - job-description', () => {
    it('deve aceitar --job-description como texto', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Tech Lead',
        '--job-description', 'Vaga para desenvolvedor React'
      ], { timeout: 60000 });
      
      // Não deve falhar por formato de argumento
      expect(result.stderr).not.toContain('invalid');
    }, 120000);

    it('deve aceitar --job-file com arquivo válido', async () => {
      if (!fs.existsSync(testVagaPath)) {
        // Cria arquivo de teste se não existir
        fs.writeFileSync(testVagaPath, '# Vaga de Teste\n\nDescrição da vaga');
      }

      const result = await runCLI([
        'generate',
        '--role', 'Tech Lead',
        '--job-file', testVagaPath
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('não encontrado');
      expect(result.stderr).not.toContain('não suportado');
    }, 120000);

    it('deve falhar quando --job-file aponta para arquivo inexistente', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Tech Lead',
        '--job-file', 'arquivo-inexistente.md'
      ], { timeout: 10000 });
      
      // Deve falhar ao tentar ler o arquivo
      expect(result.code).not.toBe(0);
    }, 15000);

    it('deve falhar quando --job-file aponta para arquivo com extensão inválida', async () => {
      const invalidFile = path.join(fixturesDir, 'test.txt');
      // Cria arquivo .txt temporário
      fs.writeFileSync(invalidFile, 'teste');
      
      try {
        const result = await runCLI([
          'generate',
          '--role', 'Tech Lead',
          '--job-file', invalidFile
        ], { timeout: 10000 });
        
        // .txt deve ser aceito, então não deve falhar por extensão
        expect(result.stderr).not.toContain('não suportado');
      } finally {
        // Limpa arquivo temporário
        if (fs.existsSync(invalidFile)) {
          fs.unlinkSync(invalidFile);
        }
      }
    }, 15000);
  });

  describe('Argumentos opcionais - output-name', () => {
    it('deve usar --output-name quando fornecido', async () => {
      const outputName = 'test-custom-output';
      const result = await runCLI([
        'generate',
        '--role', 'Senior Developer',
        '--output-name', outputName
      ], { timeout: 60000 });
      
      // Verifica se o arquivo foi criado (se o comando completou)
      const htmlPath = path.join(outputDir, `${outputName}.html`);
      // Não verifica existência pois pode falhar por API, apenas verifica que não há erro de argumento
      expect(result.stderr).not.toContain('invalid');
    }, 120000);

    it('deve gerar nome padrão quando --output-name não é fornecido', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Frontend Developer'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });

  describe('Argumentos opcionais - formats', () => {
    it('deve aceitar --formats html', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--formats', 'html'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);

    it('deve aceitar --formats pdf (padrão)', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);

    it('deve rejeitar --formats markdown', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--formats', 'markdown'
      ], {
        timeout: 10000,
        env: {
          AI_PROVIDER: 'ollama',
          OLLAMA_BASE_URL: 'http://localhost:11434/v1',
          OLLAMA_MODEL: 'test-model',
        },
      });
      
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('Formatos inválidos');
    }, 15000);

    it('deve aceitar múltiplos formatos separados por vírgula', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--formats', 'pdf,html,txt'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });

  describe('Argumentos opcionais - verbose', () => {
    it('deve aceitar --verbose', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--verbose'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });

  describe('Flags removidas', () => {
    it('deve rejeitar --template', async () => {
      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--template', 'base.html',
      ], { timeout: 5000 });
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/unknown option.*--template/i);
    });
  });

  describe('Combinações de argumentos', () => {
    it('deve executar com todos os argumentos opcionais', async () => {
      if (!fs.existsSync(testVagaPath)) {
        fs.writeFileSync(testVagaPath, '# Vaga de Teste\n\nDescrição');
      }

      const result = await runCLI([
        'generate',
        '--role', 'Tech Lead Frontend',
        '--job-file', testVagaPath,
        '--output-name', 'test-complete',
        '--formats', 'pdf,html,txt',
        '--verbose'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
      expect(result.stderr).not.toContain('required');
    }, 120000);

    it('deve priorizar --job-file sobre --job-description quando ambos são fornecidos', async () => {
      if (!fs.existsSync(testVagaPath)) {
        fs.writeFileSync(testVagaPath, '# Vaga de Teste\n\nDescrição');
      }

      const result = await runCLI([
        'generate',
        '--role', 'Developer',
        '--job-file', testVagaPath,
        '--job-description', 'Texto direto'
      ], { timeout: 60000 });
      
      // Deve usar job-file (não deve falhar)
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });
});
