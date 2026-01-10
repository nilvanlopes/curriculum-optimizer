import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config.js';
import type { ContentSelectionResult, JobAnalysisResult } from '../../types.js';
import { aiClient } from '../../utils/ai-client.js';
import { ProfileExtractor } from '../../utils/profile-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seletor de conteúdo e gerador de apresentação para otimização de currículo
 */
export class ContentSelector {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(__dirname, '../../templates/base-curriculum.html');
  }

  /**
   * Carrega o template HTML base
   */
  private loadTemplate(): string {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template não encontrado: ${this.templatePath}`);
    }
    return fs.readFileSync(this.templatePath, 'utf-8');
  }

  /**
   * Extrai perfil do candidato do template
   */
  private extractProfile(): string {
    try {
      if (fs.existsSync(this.templatePath)) {
        const extracted = ProfileExtractor.extractFromTemplate(this.templatePath);
        return extracted.profileText;
      }
      return 'Perfil do candidato extraído do currículo base.';
    } catch (error) {
      // Se falhar, retorna um perfil básico
      return 'Perfil do candidato extraído do currículo base.';
    }
  }

  /**
   * Formata as prioridades de seção para envio ao prompt
   * As prioridades orientam a IA sobre o que manter/reduzir quando necessário
   */
  private formatSectionPriorities(): string {
    const { sections, instructions } = config.sectionPriorities;
    
    const prioritiesFormatted = sections.map(s => 
      `  - ${s.name} (${s.id}): prioridade ${s.priority}`
    ).join('\n');
    
    return `
## Prioridades de Seção (para orientar decisões de redução)

Quando precisar reduzir conteúdo para caber em 2 páginas, use estas prioridades:

${prioritiesFormatted}

### Instruções de Uso:
- **Prioridade 10**: ${instructions.priority10}
- **Prioridade 7-9**: ${instructions.priority7to9}
- **Prioridade 4-6**: ${instructions.priority4to6}
- **Prioridade 1-3**: ${instructions.priority1to3}

### Aplicação Prática:
- Se precisar reduzir conquistas, reduza primeiro de experiências menos prioritárias
- Se precisar remover certificações, remova primeiro as menos relevantes
- NUNCA reduza ou remova seções com prioridade 10 (Nome, Contato, Summary)
- Seções com prioridade < 2 (Título Profissional, Informações Adicionais) podem ser removidas se necessário
`;
  }

  /**
   * Seleciona conteúdo e gera apresentação baseado na análise da vaga
   */
  async selectContentAndPresentation(
    jobAnalysis: JobAnalysisResult
  ): Promise<ContentSelectionResult> {
    try {
      // Carrega template
      const html = this.loadTemplate();
      
      // Extrai perfil do candidato
      const candidateProfile = this.extractProfile();

      // Prepara análise formatada para o prompt
      const analysisFormatted = JSON.stringify(jobAnalysis, null, 2);
      
      // Formata prioridades de seção para orientar a IA
      const sectionPriorities = this.formatSectionPriorities();

      // Chama IA para seleção e geração de apresentação
      const result = await aiClient.callJSON<ContentSelectionResult>(
        '02-selecao-conteudo-e-apresentacao.md',
        {
          jobAnalysis: analysisFormatted,
          curriculumHtml: html,
          candidateProfile: candidateProfile,
          sectionPriorities: sectionPriorities,
        },
        {
          maxTokens: 8192, // Aumentado para suportar geração de apresentação também
          temperature: 0.4,
        }
      );

      // Valida que presentationText está presente e tem tamanho adequado
      if (!result.presentationText || result.presentationText.trim().length === 0) {
        throw new Error('Erro: presentationText é obrigatório mas não foi gerado');
      }

      if (result.presentationText.length < 200 || result.presentationText.length > 400) {
        // Avisa mas não falha - pode ajustar depois
        console.warn(`Aviso: presentationText tem ${result.presentationText.length} caracteres (ideal: 200-400)`);
      }

      // Valida experiências - quantidade variável conforme conteúdo disponível (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione quantidade adequada
      if (result.selectedExperiences) {
        result.selectedExperiences.forEach((exp, index) => {
          // Valida que achievementsToHighlight existe e não está vazio
          if (!exp.achievementsToHighlight || exp.achievementsToHighlight.length === 0) {
            console.warn(`Aviso: Experiência ${index + 1} (priority ${exp.priority}) não tem conquistas selecionadas`);
          }
          // Quantidade de conquistas é variável - a IA ajusta conforme relevância e espaço disponível
        });
        // Ordena por prioridade para garantir ordem correta
        result.selectedExperiences = result.selectedExperiences.sort((a, b) => a.priority - b.priority);
      }

      // Valida categorias de skills - quantidade variável conforme relevância (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione todas as categorias relevantes
      if (result.selectedSkills && result.selectedSkills.categories) {
        // Apenas valida que existe e não está vazio
        if (result.selectedSkills.categories.length === 0) {
          console.warn('Aviso: Nenhuma categoria de skill foi selecionada');
        }
      }

      // Valida certificações - quantidade variável conforme relevância (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione todas as certificações relevantes
      // Pode estar vazio se não houver certificações relevantes

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao selecionar conteúdo e gerar apresentação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Método legado: mantido para compatibilidade
   * @deprecated Use selectContentAndPresentation em vez disso
   */
  async selectContent(jobAnalysis: JobAnalysisResult): Promise<ContentSelectionResult> {
    return this.selectContentAndPresentation(jobAnalysis);
  }

  /**
   * Seleciona conteúdo e gera apresentação baseado apenas no role (sem análise de vaga)
   */
  async selectContentAndPresentationByRole(role: string): Promise<ContentSelectionResult> {
    try {
      // Carrega template
      const html = this.loadTemplate();
      
      // Extrai perfil do candidato
      const candidateProfile = this.extractProfile();

      // Cria uma análise mínima baseada no role
      const minimalAnalysis: JobAnalysisResult = {
        keywords: [],
        requirements: {
          mandatory: [],
          desirable: [],
        },
        matchScore: 0,
        matchScoreJustification: `Currículo gerado baseado apenas no role: ${role}`,
        gaps: [],
        highlights: {
          mainResponsibilities: [],
          differentiators: [],
        },
        suggestions: [],
      };

      // Prepara análise formatada para o prompt
      const analysisFormatted = JSON.stringify(minimalAnalysis, null, 2);
      
      // Formata prioridades de seção para orientar a IA
      const sectionPriorities = this.formatSectionPriorities();

      // Chama IA para seleção e geração de apresentação com role adicional
      const result = await aiClient.callJSON<ContentSelectionResult>(
        '02-selecao-conteudo-e-apresentacao.md',
        {
          jobAnalysis: analysisFormatted,
          curriculumHtml: html,
          candidateProfile: candidateProfile,
          role: role, // Passa role adicional para o prompt
          sectionPriorities: sectionPriorities,
        },
        {
          maxTokens: 8192, // Aumentado para suportar geração de apresentação também
          temperature: 0.4,
        }
      );

      // Valida que presentationText está presente e tem tamanho adequado
      if (!result.presentationText || result.presentationText.trim().length === 0) {
        throw new Error('Erro: presentationText é obrigatório mas não foi gerado');
      }

      if (result.presentationText.length < 200 || result.presentationText.length > 400) {
        // Avisa mas não falha - pode ajustar depois
        console.warn(`Aviso: presentationText tem ${result.presentationText.length} caracteres (ideal: 200-400)`);
      }

      // Valida experiências - quantidade variável conforme conteúdo disponível (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione quantidade adequada
      if (result.selectedExperiences) {
        result.selectedExperiences.forEach((exp, index) => {
          // Valida que achievementsToHighlight existe e não está vazio
          if (!exp.achievementsToHighlight || exp.achievementsToHighlight.length === 0) {
            console.warn(`Aviso: Experiência ${index + 1} (priority ${exp.priority}) não tem conquistas selecionadas`);
          }
          // Quantidade de conquistas é variável - a IA ajusta conforme relevância e espaço disponível
        });
        // Ordena por prioridade para garantir ordem correta
        result.selectedExperiences = result.selectedExperiences.sort((a, b) => a.priority - b.priority);
      }

      // Valida categorias de skills - quantidade variável conforme relevância (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione todas as categorias relevantes
      if (result.selectedSkills && result.selectedSkills.categories) {
        // Apenas valida que existe e não está vazio
        if (result.selectedSkills.categories.length === 0) {
          console.warn('Aviso: Nenhuma categoria de skill foi selecionada');
        }
      }

      // Valida certificações - quantidade variável conforme relevância (IA pensa que tem 3 páginas, mas validamos em 1.9-2.2)
      // Não limita rigidamente - permite que a IA selecione todas as certificações relevantes
      // Pode estar vazio se não houver certificações relevantes

      return result;
    } catch (error) {
      throw new Error(
        `Erro ao selecionar conteúdo e gerar apresentação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Método legado: mantido para compatibilidade
   * @deprecated Use selectContentAndPresentationByRole em vez disso
   */
  async selectContentByRole(role: string): Promise<ContentSelectionResult> {
    return this.selectContentAndPresentationByRole(role);
  }
}