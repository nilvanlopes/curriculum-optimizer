import { describe, it, expect } from 'vitest';
import { runCLI } from '../helpers/cli-runner.js';

describe('CLI: salary-compare', () => {
  describe('Argumentos obrigatórios', () => {
    it('deve falhar quando --clt não é fornecido', async () => {
      const result = await runCLI([
        'salary-compare',
        '--pj', '20000'
      ], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('required') || expect(result.stderr).toContain('--clt');
    }, 10000);

    it('deve falhar quando --pj não é fornecido', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000'
      ], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('required') || expect(result.stderr).toContain('--pj');
    }, 10000);

    it('deve executar com ambos --clt e --pj fornecidos', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500'
      ], { timeout: 15000 });
      
      // Deve executar com sucesso (cálculo local, não precisa de API)
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('CLT') || expect(result.stdout).toContain('PJ');
    }, 20000);
  });

  describe('Validação de valores', () => {
    it('deve falhar quando --clt é inválido (não numérico)', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', 'abc',
        '--pj', '20000'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/CLT.*inválido|invalid|Erro/i);
    }, 15000);

    it('deve falhar quando --pj é inválido (não numérico)', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', 'xyz'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/PJ.*inválido|invalid|Erro/i);
    }, 15000);

    it('deve falhar quando --clt é negativo', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '-1000',
        '--pj', '20000'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/CLT.*inválido|invalid|Erro/i);
    }, 15000);

    it('deve falhar quando --pj é negativo', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '-2000'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // logger.error vai para stdout
      expect(result.output).toMatch(/PJ.*inválido|invalid|Erro/i);
    }, 15000);

    it('deve aceitar valores válidos', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
    }, 20000);
  });

  describe('Argumentos opcionais - benefits', () => {
    it('deve aceitar --benefits com formato válido', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500',
        '--benefits', 'VR:800,VT:200,Saude:600'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Benefícios') || expect(result.stdout).toContain('Total');
    }, 20000);

    it('deve aceitar --benefits com PLR percentual', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500',
        '--benefits', 'PLR:25%'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
    }, 20000);

    it('deve executar sem --benefits (padrão: vazio)', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
    }, 20000);
  });

  describe('Argumentos opcionais - verbose', () => {
    it('deve aceitar --verbose', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500',
        '--verbose'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
      expect(result.stderr).not.toContain('invalid');
    }, 20000);
  });

  describe('Combinações de argumentos', () => {
    it('deve executar com todos os argumentos opcionais', async () => {
      const result = await runCLI([
        'salary-compare',
        '--clt', '16000',
        '--pj', '19500',
        '--benefits', 'VR:800,VT:200,Saude:600,PLR:25%',
        '--verbose'
      ], { timeout: 15000 });
      
      expect(result.code).toBe(0);
    }, 20000);
  });
});
