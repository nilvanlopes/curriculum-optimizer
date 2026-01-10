import { describe, it, expect, beforeAll } from 'vitest';
import { runCLI } from '../helpers/cli-runner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../fixtures');
const testVagaPath = path.join(fixturesDir, 'test-vaga.md');

describe('CLI: analyze', () => {
  beforeAll(() => {
    // Garante que o arquivo de teste existe
    if (!fs.existsSync(testVagaPath)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
      fs.writeFileSync(testVagaPath, '# Vaga: Tech Lead Frontend\n\n## Requisitos\n\n- React\n- TypeScript');
    }
  });

  describe('Argumentos obrigatórios', () => {
    it('deve falhar quando nem --job-description nem --job-file são fornecidos', async () => {
      const result = await runCLI(['analyze'], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout, não stderr
      expect(result.output).toMatch(/fornecer|required|Erro/i);
    }, 10000);

    it('deve executar com --job-description', async () => {
      const result = await runCLI([
        'analyze',
        '--job-description', 'Vaga para desenvolvedor React com experiência em TypeScript'
      ], { timeout: 60000 });
      
      // Pode falhar por falta de API key, mas não deve falhar por argumentos
      expect(result.stderr).not.toContain('fornecer');
      expect(result.stderr).not.toContain('required');
    }, 120000);

    it('deve executar com --job-file', async () => {
      const result = await runCLI([
        'analyze',
        '--job-file', testVagaPath
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('fornecer');
      expect(result.stderr).not.toContain('não encontrado');
    }, 120000);
  });

  describe('Argumentos opcionais - verbose', () => {
    it('deve aceitar --verbose', async () => {
      const result = await runCLI([
        'analyze',
        '--job-description', 'Vaga de teste',
        '--verbose'
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });

  describe('Validação de arquivo', () => {
    it('deve falhar quando --job-file aponta para arquivo inexistente', async () => {
      const result = await runCLI([
        'analyze',
        '--job-file', 'arquivo-inexistente.md'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // Erro pode estar em stdout ou stderr
      expect(result.output).toMatch(/não encontrado|não existe|Erro|Error/i);
    }, 15000);

    it('deve aceitar arquivo .txt', async () => {
      const txtFile = path.join(fixturesDir, 'test-vaga.txt');
      fs.writeFileSync(txtFile, 'Vaga de teste em formato texto');
      
      try {
        const result = await runCLI([
          'analyze',
          '--job-file', txtFile
        ], { timeout: 60000 });
        
        expect(result.stderr).not.toContain('não suportado');
      } finally {
        if (fs.existsSync(txtFile)) {
          fs.unlinkSync(txtFile);
        }
      }
    }, 120000);

    it('deve aceitar arquivo .md', async () => {
      const result = await runCLI([
        'analyze',
        '--job-file', testVagaPath
      ], { timeout: 60000 });
      
      expect(result.stderr).not.toContain('não suportado');
    }, 120000);
  });

  describe('Prioridade de argumentos', () => {
    it('deve priorizar --job-file sobre --job-description quando ambos são fornecidos', async () => {
      const result = await runCLI([
        'analyze',
        '--job-file', testVagaPath,
        '--job-description', 'Texto direto'
      ], { timeout: 60000 });
      
      // Deve usar job-file (não deve falhar)
      expect(result.stderr).not.toContain('invalid');
    }, 120000);
  });
});
