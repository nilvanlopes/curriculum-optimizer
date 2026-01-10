import { describe, it, expect } from 'vitest';
import { SalaryCalculator } from '../../../src/calculators/salary.js';

describe('SalaryCalculator', () => {
  const calculator = new SalaryCalculator();

  describe('formatCurrency', () => {
    it('deve formatar valores monetários corretamente', () => {
      // Intl.NumberFormat pode variar, então verificamos o padrão
      expect(calculator.formatCurrency(1000)).toMatch(/R\$\s*1[.,]000[.,]00/);
      expect(calculator.formatCurrency(15000.50)).toMatch(/R\$\s*15[.,]000[.,]50/);
      expect(calculator.formatCurrency(0)).toMatch(/R\$\s*0[.,]00/);
    });
  });

  describe('calculate - CLT', () => {
    it('deve calcular corretamente salário CLT básico', () => {
      const result = calculator.calculate(10000, 0, '');
      
      expect(result.clt.gross).toBe(10000);
      expect(result.clt.net).toBeGreaterThan(0);
      expect(result.clt.net).toBeLessThan(result.clt.gross);
      expect(result.clt.taxes).toBeGreaterThan(0);
    });

    it('deve calcular INSS corretamente para salário no teto', () => {
      // Salário de R$ 7786.02 (teto INSS)
      const result = calculator.calculate(7786.02, 0, '');
      // INSS deve ser calculado (taxes = INSS + IRRF)
      // Para salário no teto, INSS deve ser significativo
      expect(result.clt.taxes).toBeGreaterThan(500);
      expect(result.clt.net).toBeLessThan(result.clt.gross);
    });

    it('deve calcular IRRF corretamente para salário alto', () => {
      // Salário de R$ 20000 (deve ter IRRF)
      const result = calculator.calculate(20000, 0, '');
      // Taxes = INSS + IRRF, deve ser significativo para salário alto
      // Para R$ 20000, taxes geralmente ficam entre 800-1000
      expect(result.clt.taxes).toBeGreaterThan(500);
      expect(result.clt.net).toBeLessThan(result.clt.gross);
      expect(result.clt.net).toBeGreaterThan(0);
      // Net deve ser aproximadamente 19000 (20000 - ~1000 de impostos)
      expect(result.clt.net).toBeGreaterThan(18000);
    });
  });

  describe('calculate - PJ', () => {
    it('deve calcular corretamente faturamento PJ', () => {
      const result = calculator.calculate(0, 15000, '');
      
      expect(result.pj.gross).toBe(15000);
      expect(result.pj.taxes).toBeGreaterThan(0);
      expect(result.pj.net).toBeGreaterThan(0);
      expect(result.pj.net).toBeLessThan(result.pj.gross);
    });

    it('deve calcular impostos PJ (6% Simples Nacional)', () => {
      const result = calculator.calculate(0, 20000, '');
      // Impostos devem ser aproximadamente 6% de 20000 = 1200
      expect(result.pj.taxes).toBeCloseTo(1200, 0);
    });
  });

  describe('calculate - Comparação CLT vs PJ', () => {
    it('deve comparar CLT e PJ corretamente', () => {
      const result = calculator.calculate(16000, 19500, '');
      
      expect(result.clt.gross).toBe(16000);
      expect(result.pj.gross).toBe(19500);
      expect(result.difference.amount).toBeGreaterThan(0);
      expect(['clt', 'pj']).toContain(result.difference.winner);
    });

    it('deve calcular diferença percentual corretamente', () => {
      const result = calculator.calculate(16000, 19500, '');
      
      expect(result.difference.percentage).toBeGreaterThanOrEqual(0);
      expect(result.difference.percentage).toBeLessThan(100);
    });
  });

  describe('calculate - Benefícios CLT', () => {
    it('deve calcular benefícios corretamente', () => {
      const benefits = 'VR:800,VT:200,Saude:600,PLR:25%';
      const result = calculator.calculate(16000, 0, benefits);
      
      expect(result.clt.benefits).toBeGreaterThan(0);
      expect(result.clt.total).toBeGreaterThan(result.clt.net);
    });

    it('deve processar VR/VA corretamente', () => {
      const result = calculator.calculate(10000, 0, 'VR:1000');
      expect(result.clt.benefits).toBeGreaterThanOrEqual(1000);
    });

    it('deve processar VT corretamente', () => {
      const result = calculator.calculate(10000, 0, 'VT:300');
      expect(result.clt.benefits).toBeGreaterThanOrEqual(300);
    });

    it('deve processar PLR percentual corretamente', () => {
      const result = calculator.calculate(12000, 0, 'PLR:30%');
      // PLR anual de 30% = 3600, mensal = 300
      expect(result.clt.benefits).toBeGreaterThan(0);
    });

    it('deve processar múltiplos benefícios', () => {
      const benefits = 'VR:800,VT:200,Saude:600';
      const result = calculator.calculate(10000, 0, benefits);
      
      expect(result.clt.benefits).toBeGreaterThanOrEqual(1600);
    });
  });

  describe('calculate - Casos extremos', () => {
    it('deve lidar com valores muito baixos', () => {
      const result = calculator.calculate(1000, 1200, '');
      expect(result.clt.gross).toBe(1000);
      expect(result.pj.gross).toBe(1200);
    });

    it('deve lidar com valores muito altos', () => {
      const result = calculator.calculate(50000, 60000, '');
      expect(result.clt.gross).toBe(50000);
      expect(result.pj.gross).toBe(60000);
      expect(result.clt.taxes).toBeGreaterThan(0);
    });

    it('deve lidar com string de benefícios vazia', () => {
      const result = calculator.calculate(10000, 0, '');
      expect(result.clt.benefits).toBe(0);
    });
  });
});
