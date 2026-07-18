/**
 * Configurações pessoais da aplicação
 * 
 * Este arquivo centraliza todas as configurações que podem ser
 * personalizadas conforme as necessidades do usuário.
 */
export const config = {
  /**
   * Configurações de cálculo salarial
   */
  salary: {
    /**
     * Custo mensal estimado de contador para regime PJ
     */
    pjAccountantCost: 300,
    
    /**
     * Custo mensal estimado de plano de saúde para regime PJ
     */
    pjHealthInsuranceCost: 800,
    
    /**
     * Taxa de imposto do Simples Nacional (6% sobre faturamento)
     * Baseado na faixa 1 do Simples Nacional (até R$ 180.000/ano)
     */
    pjTaxRate: 0.06,
  },

  /**
   * Configurações de validação de currículo
   */
  validation: {
    /**
     * Configurações de comprimento do currículo
     */
    length: {
      /**
       * Número mínimo de palavras recomendado
       */
      minWords: 300,
      
      /**
       * Número máximo de palavras recomendado
       */
      maxWords: 1000,
      
      /**
       * Número máximo de páginas recomendado
       */
      maxPages: 2,
      
      /**
       * Número mínimo de caracteres recomendado
       */
      minChars: 2000,
      
      /**
       * Número máximo de caracteres recomendado
       */
      maxChars: 5000,
    },
    
    /**
     * Configurações de densidade de keywords
     */
    keywordDensity: {
      /**
       * Densidade mínima de keywords recomendada (%)
       */
      min: 5,
      
      /**
       * Densidade máxima de keywords recomendada (%)
       */
      max: 10,
    },
  },

  /**
   * Configurações de geração de PDF
   */
  pdf: {
    /**
     * Número máximo de tentativas para gerar PDF com limite de páginas
     */
    maxAttempts: 5,
    
    /**
     * Fatores de redução progressivos para compactação do PDF
     * Cada índice corresponde a uma tentativa (1-5)
     * Valores menores = compactação mais agressiva
     */
    reductionFactors: [0.90, 0.85, 0.80, 0.75, 0.70] as const,
    
    /**
     * Número padrão de páginas máximo para PDFs
     */
    defaultMaxPages: 2,
    
    /**
     * Número máximo de achievements (conquistas) a manter por experiência
     * quando aplicando compactação agressiva
     */
    maxAchievementsPerExperience: 3,
    
    /**
     * Número máximo de experiências a manter visíveis durante compactação
     * [tentativa 4, tentativa 5]
     */
    maxExperiencesVisible: [4, 3] as const,
    
    /**
     * Margens padrão do PDF (em mm)
     */
    defaultMargins: {
      top: '5mm',
      right: '10mm',
      bottom: '5mm',
      left: '10mm',
    },
    
    /**
     * Formato padrão de página
     */
    defaultFormat: 'A4' as const,
  },

  /**
   * Configurações de busca web
   */
  webSearch: {
    /**
     * Habilita busca web para obter informações atualizadas (default: false)
     * Quando habilitado, permite que a IA faça buscas na internet para dados mais atualizados
     * Atualmente usado apenas na busca de informações salariais do Glassdoor
     */
    enabled: false,
  },
  /**
   * Prioridades de seções do currículo
   * 
   * Estas prioridades são APENAS enviadas aos prompts da IA para orientar
   * suas decisões sobre o que manter/reduzir quando necessário.
   * NÃO são usadas em lógica programática.
   * 
   * Escala de prioridade (1-10):
   * - 10: NUNCA remover ou reduzir
   * - 7-9: Manter completo, só reduzir se absolutamente necessário
   * - 4-6: Pode ter conteúdo reduzido se necessário
   * - 1-3: Pode ser completamente removido se necessário
   */
  sectionPriorities: {
    sections: [
      { id: 'header h1', name: 'Nome', priority: 10 },
      { id: '.header .title', name: 'Título Profissional', priority: 1 },
      { id: '.header .contact-info', name: 'Informações de Contato', priority: 10 },
      { id: '.summary', name: 'Sobre Mim', priority: 10 },
      { id: '.experience-item', name: 'Experiência Profissional', priority: 9 },
      { id: '.skill-category', name: 'Competências Técnicas', priority: 6 },
      { id: '.education-item', name: 'Formação Acadêmica', priority: 7 },
      { id: '.certifications-list', name: 'Certificações', priority: 4 },
      { id: '.languages-inline', name: 'Idiomas', priority: 7 },
      { id: '.additional-list', name: 'Informações Adicionais', priority: 1 },
    ] as const,
    
    /**
     * Instruções para a IA sobre como usar as prioridades
     */
    instructions: {
      priority10: 'NUNCA remover ou reduzir. Conteúdo essencial.',
      priority7to9: 'Manter completo. Só reduzir se absolutamente necessário para respeitar o alvo de 1,9 a 2,2 páginas.',
      priority4to6: 'Pode ter conteúdo reduzido (menos itens, texto mais curto) se necessário.',
      priority1to3: 'Pode ser completamente removido se necessário para respeitar o alvo de 1,9 a 2,2 páginas.',
    },
  },

  /**
   * Configurações do loop iterativo de geração de PDF
   */
  iterativeLoop: {
    /**
     * Número máximo de iterações do loop
     */
    maxIterations: 5,
    
    /**
     * Altura mínima desejada em páginas (1.9 páginas = ~526mm)
     */
    minPages: 1.9,
    
    /**
     * Altura máxima desejada em páginas (2.2 páginas = ~610mm)
     */
    maxPages: 2.2,
    
    /**
     * Altura útil de 1 página A4 com margens (em mm)
     */
    pageHeightMm: 277,
    
    /**
     * Configurações de medição de conteúdo
     */
    measurement: {
      /**
       * DPI usado pelo Puppeteer para gerar PDFs
       */
      dpi: 96,
      
      /**
       * Dimensões A4 em mm
       */
      a4Dimensions: {
        widthMm: 210,
        heightMm: 297,
      },
      
      /**
       * Dimensões A4 em pixels (96 DPI)
       */
      a4DimensionsPx: {
        widthPx: 794,
        heightPx: 1123,
      },
      
      /**
       * Fator de conversão de pixels para mm (1px = mmPerPx)
       * Calculado como: heightMm / heightPx = 297 / 1123 ≈ 0.2644
       */
      mmPerPx: 297 / 1123, // ≈ 0.2644
    },
  },
} as const;

/**
 * Tipo das configurações (inferido automaticamente)
 */
export type AppConfig = typeof config;

/**
 * Tipo para uma prioridade de seção
 */
export type SectionPriorityConfig = typeof config.sectionPriorities.sections[number];
