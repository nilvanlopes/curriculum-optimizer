import type { SalaryComparison } from '../types.js';

/**
 * Calculadora de salário CLT vs PJ
 */
export class SalaryCalculator {
  /**
   * Calcula desconto de INSS (alíquotas progressivas 2024)
   */
  private calculateINSS(grossSalary: number): number {
    // Tabela INSS 2024
    const limits = [
      { min: 0, max: 1412.0, rate: 0.075 },
      { min: 1412.01, max: 2666.68, rate: 0.09 },
      { min: 2666.69, max: 4000.03, rate: 0.12 },
      { min: 4000.04, max: 7786.02, rate: 0.14 },
    ];

    const tetoINSS = 7786.02;
    let inss = 0;
    let remaining = Math.min(grossSalary, tetoINSS);

    for (const bracket of limits) {
      if (remaining <= 0) break;

      const bracketAmount = Math.min(remaining, bracket.max - bracket.min);
      inss += bracketAmount * bracket.rate;
      remaining -= bracketAmount;
    }

    return Math.round(inss * 100) / 100;
  }

  /**
   * Calcula desconto de IRRF (alíquotas progressivas 2024)
   */
  private calculateIRRF(baseSalary: number): number {
    // Base de cálculo = salário - INSS - dedução por dependente
    const baseCalculo = baseSalary;

    // Tabela IRRF 2024
    const brackets = [
      { min: 0, max: 22847.76, rate: 0, deduction: 0 },
      { min: 22847.77, max: 33919.8, rate: 0.075, deduction: 1713.58 },
      { min: 33919.81, max: 45012.6, rate: 0.15, deduction: 4257.57 },
      { min: 45012.61, max: 55976.16, rate: 0.225, deduction: 7633.51 },
      { min: 55976.17, max: Infinity, rate: 0.275, deduction: 10432.32 },
    ];

    for (const bracket of brackets) {
      if (baseCalculo >= bracket.min && baseCalculo <= bracket.max) {
        return Math.max(0, Math.round((baseCalculo * bracket.rate - bracket.deduction) * 100) / 100);
      }
    }

    return 0;
  }

  /**
   * Calcula impostos PJ (Simples Nacional - 6% sobre faturamento)
   */
  private calculatePJTaxes(grossPJ: number): number {
    // Simples Nacional - Faixa 1 (até 180.000/ano = 15.000/mês): 6% sobre faturamento
    // Para valores maiores, usar alíquota efetiva maior, mas simplificando para 6%
    const taxRate = 0.06;
    return Math.round(grossPJ * taxRate * 100) / 100;
  }

  /**
   * Calcula reservas para férias e 13º (PJ)
   */
  private calculatePJReserves(grossPJ: number): number {
    // Férias: 1/12 do salário mensal
    // 13º: 1/12 do salário mensal
    // Total: 2/12 = 1/6
    return Math.round((grossPJ / 6) * 100) / 100;
  }

  /**
   * Parse de string de benefícios CLT
   */
  private parseBenefits(benefitsString: string): {
    vr: number;
    vt: number;
    saude: number;
    plrPercent: number;
    outros: number;
  } {
    const defaults = { vr: 0, vt: 0, saude: 0, plrPercent: 0, outros: 0 };

    if (!benefitsString || benefitsString.trim() === '') {
      return defaults;
    }

    const parts = benefitsString.split(',');
    const result = { ...defaults };

    for (const part of parts) {
      const [key, value] = part.split(':').map((s) => s.trim());
      const numValue = parseFloat(value || '0');

      switch (key.toLowerCase()) {
        case 'vr':
        case 'va':
        case 'vr/va':
          result.vr = numValue;
          break;
        case 'vt':
          result.vt = numValue;
          break;
        case 'saude':
        case 'plano':
          result.saude = numValue;
          break;
        case 'plr':
          // PLR pode ser percentual ou valor fixo
          if (value?.includes('%')) {
            result.plrPercent = parseFloat(value.replace('%', '')) / 100;
          } else {
            result.plrPercent = numValue / 12000; // Assume salário base para calcular %
          }
          break;
        default:
          result.outros += numValue;
      }
    }

    return result;
  }

  /**
   * Calcula comparação completa CLT vs PJ
   */
  calculate(cltGross: number, pjGross: number, benefitsString: string = ''): SalaryComparison {
    // Parse benefícios
    const benefits = this.parseBenefits(benefitsString);

    // CLT - Cálculos
    const inss = this.calculateINSS(cltGross);
    const baseIRRF = cltGross - inss;
    const irrf = this.calculateIRRF(baseIRRF);
    const cltNet = cltGross - inss - irrf;
    const cltTaxes = inss + irrf;

    // Benefícios CLT (mensais)
    const vr = benefits.vr;
    const vt = benefits.vt;
    const saude = benefits.saude;
    const plrMensal = (cltGross * benefits.plrPercent) / 12; // PLR anual dividido por 12
    const outros = benefits.outros;
    const cltBenefits = vr + vt + saude + plrMensal + outros;
    const cltTotal = cltNet + cltBenefits;

    // PJ - Cálculos
    const pjTaxes = this.calculatePJTaxes(pjGross);
    const pjReserves = this.calculatePJReserves(pjGross);
    const contador = 300; // Custo fixo estimado
    const pjSaude = 800; // Custo estimado plano de saúde PJ
    const pjCosts = contador + pjSaude;
    const pjNet = pjGross - pjTaxes - pjReserves - pjCosts;
    const pjTotal = pjNet; // Total disponível já considera reservas

    // Diferença
    const difference = cltTotal - pjTotal;
    const percentage = pjTotal > 0 ? (difference / pjTotal) * 100 : 0;
    const winner: 'clt' | 'pj' = difference > 0 ? 'clt' : 'pj';

    return {
      clt: {
        gross: cltGross,
        net: cltNet,
        taxes: cltTaxes,
        benefits: cltBenefits,
        total: cltTotal,
      },
      pj: {
        gross: pjGross,
        net: pjNet,
        taxes: pjTaxes,
        costs: pjCosts + pjReserves,
        total: pjTotal,
      },
      difference: {
        amount: Math.abs(difference),
        percentage: Math.abs(percentage),
        winner,
      },
    };
  }

  /**
   * Formata valor monetário
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}