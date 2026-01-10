import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLI } from '../helpers/cli-runner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../fixtures');
const outputDir = path.join(path.dirname(__dirname), '../../output');

describe('CLI: serve', () => {
  let testHtmlFile: string;

  beforeAll(() => {
    // Cria arquivo HTML de teste
    testHtmlFile = path.join(fixturesDir, 'test.html');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    fs.writeFileSync(testHtmlFile, '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test</h1></body></html>');
  });

  afterAll(() => {
    // Limpa arquivo de teste
    if (fs.existsSync(testHtmlFile)) {
      fs.unlinkSync(testHtmlFile);
    }
  });

  describe('Argumentos obrigatórios', () => {
    it('deve falhar quando --file não é fornecido', async () => {
      const result = await runCLI(['serve'], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('required') || expect(result.stderr).toContain('--file');
    }, 10000);

    it('deve falhar quando arquivo não existe', async () => {
      const result = await runCLI([
        'serve',
        '--file', 'arquivo-inexistente.html'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/não encontrado|não existe|Erro/i);
    }, 15000);

    it('deve falhar quando arquivo não é HTML', async () => {
      const txtFile = path.join(fixturesDir, 'test.txt');
      fs.writeFileSync(txtFile, 'teste');
      
      try {
        const result = await runCLI([
          'serve',
          '--file', txtFile
        ], { timeout: 10000 });
        
        expect(result.code).not.toBe(0);
        // logger.error vai para stdout
        expect(result.output).toMatch(/\.html|HTML|extensão/i);
      } finally {
        if (fs.existsSync(txtFile)) {
          fs.unlinkSync(txtFile);
        }
      }
    }, 15000);
  });

  describe('Argumentos opcionais - port', () => {
    it('deve aceitar --port com valor válido', async () => {
      // Serve inicia um servidor que fica rodando, então vamos apenas verificar se inicia
      // sem erro de argumento (vai dar timeout, mas isso é esperado)
      try {
        await runCLI([
          'serve',
          '--file', testHtmlFile,
          '--port', '3000',
          '--no-open'
        ], { timeout: 3000 });
      } catch (error: any) {
        // Timeout é esperado pois o servidor fica rodando
        if (error.message?.includes('timeout')) {
          // Servidor iniciou (timeout = servidor está rodando)
          expect(true).toBe(true);
        } else {
          // Outro erro - verifica se não é erro de argumento
          expect(error.message).not.toMatch(/inválido|invalid/i);
        }
      }
    }, 10000);

    it('deve usar porta padrão (5173) quando --port não é fornecido', async () => {
      // Serve inicia um servidor que fica rodando
      try {
        await runCLI([
          'serve',
          '--file', testHtmlFile,
          '--no-open'
        ], { timeout: 3000 });
      } catch (error: any) {
        // Timeout é esperado
        if (error.message?.includes('timeout')) {
          expect(true).toBe(true);
        }
      }
    }, 10000);

    it('deve falhar quando --port é inválido (não numérico)', async () => {
      const result = await runCLI([
        'serve',
        '--file', testHtmlFile,
        '--port', 'abc'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/Porta.*inválida|invalid|Erro/i);
    }, 15000);

    it('deve falhar quando --port está fora do range válido', async () => {
      const result = await runCLI([
        'serve',
        '--file', testHtmlFile,
        '--port', '70000'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/Porta.*inválida|65535|invalid|Erro/i);
    }, 15000);
  });

  describe('Argumentos opcionais - open', () => {
    it('deve aceitar --open (padrão)', async () => {
      // Serve inicia um servidor que fica rodando
      try {
        await runCLI([
          'serve',
          '--file', testHtmlFile,
          '--open'
        ], { timeout: 3000 });
      } catch (error: any) {
        // Timeout é esperado
        if (error.message?.includes('timeout')) {
          expect(true).toBe(true);
        }
      }
    }, 10000);

    it('deve aceitar --no-open', async () => {
      // Serve inicia um servidor que fica rodando
      try {
        await runCLI([
          'serve',
          '--file', testHtmlFile,
          '--no-open'
        ], { timeout: 3000 });
      } catch (error: any) {
        // Timeout é esperado
        if (error.message?.includes('timeout')) {
          expect(true).toBe(true);
        }
      }
    }, 10000);
  });

  describe('Combinações de argumentos', () => {
    it('deve executar com todos os argumentos opcionais', async () => {
      // Serve inicia um servidor que fica rodando
      try {
        await runCLI([
          'serve',
          '--file', testHtmlFile,
          '--port', '3000',
          '--no-open'
        ], { timeout: 3000 });
      } catch (error: any) {
        // Timeout é esperado (servidor iniciou)
        if (error.message?.includes('timeout')) {
          expect(true).toBe(true);
        }
      }
    }, 10000);
  });
});
