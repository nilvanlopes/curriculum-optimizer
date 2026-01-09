/**
 * Calculador de densidade de keywords
 */
export class KeywordDensityCalculator {
  /**
   * Calcula densidade de keywords no texto
   */
  calculate(text: string, keywords: string[]): {
    density: number;
    distribution: Record<string, number>;
    naturalDistribution: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const distribution: Record<string, number> = {};

    // Normaliza texto para análise
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = normalizedText.split(/\s+/).filter((w) => w.length > 0);
    const totalWords = words.length;

    if (totalWords === 0) {
      return {
        density: 0,
        distribution: {},
        naturalDistribution: false,
        warnings: ['Texto vazio'],
        suggestions: [],
      };
    }

    // Normaliza keywords
    const normalizedKeywords = keywords.map((kw) => kw.toLowerCase().trim());

    // Conta ocorrências de cada keyword
    let totalKeywordOccurrences = 0;

    for (const keyword of normalizedKeywords) {
      const keywordWords = keyword.split(/\s+/);
      let count = 0;

      // Conta ocorrências da keyword (pode ser frase)
      for (let i = 0; i <= words.length - keywordWords.length; i++) {
        const slice = words.slice(i, i + keywordWords.length).join(' ');
        if (slice === keyword) {
          count++;
        }
      }

      distribution[keyword] = count;
      totalKeywordOccurrences += count;
    }

    // Calcula densidade total
    const density = (totalKeywordOccurrences / totalWords) * 100;

    // Verifica distribuição natural
    const naturalDistribution = this.checkNaturalDistribution(distribution, keywords);

    // Valida densidade ideal (5-10%)
    if (density < 5) {
      warnings.push(`Densidade de keywords muito baixa (${density.toFixed(2)}%). Ideal: 5-10%`);
      suggestions.push('Considere adicionar mais keywords relevantes naturalmente no texto');
    } else if (density > 10) {
      warnings.push(`Densidade de keywords muito alta (${density.toFixed(2)}%). Pode ser detectado como keyword stuffing. Ideal: 5-10%`);
      suggestions.push('Reduza repetições desnecessárias de keywords. Foque em uso natural');
    }

    // Verifica distribuição
    if (!naturalDistribution) {
      warnings.push('Distribuição de keywords não está natural. Algumas keywords aparecem muito mais que outras');
      suggestions.push('Distribua keywords de forma mais equilibrada ao longo do texto');
    }

    return {
      density: Math.round(density * 100) / 100,
      distribution,
      naturalDistribution,
      warnings,
      suggestions,
    };
  }

  /**
   * Verifica se distribuição é natural (sem keyword stuffing)
   */
  private checkNaturalDistribution(
    distribution: Record<string, number>,
    keywords: string[]
  ): boolean {
    if (keywords.length === 0) return true;

    const counts = keywords.map((kw) => distribution[kw.toLowerCase().trim()] || 0);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts.filter((c) => c > 0));

    // Se diferença entre max e min é muito grande, não é natural
    if (minCount > 0 && maxCount / minCount > 5) {
      return false;
    }

    // Se alguma keyword aparece mais de 10 vezes e outras aparecem 0-1, não é natural
    const highCountKeywords = counts.filter((c) => c > 10).length;
    const lowCountKeywords = counts.filter((c) => c <= 1).length;

    if (highCountKeywords > 0 && lowCountKeywords / keywords.length > 0.5) {
      return false;
    }

    return true;
  }
}