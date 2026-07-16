import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config.js';
import type { ContentSelectionResult, JobAnalysisResult } from '../../types.js';
import { aiClient } from '../../utils/ai-client.js';
import { ProfileExtractor } from '../../utils/profile-extractor.js';
import {
  buildFallbackPresentation,
  buildValidationFeedback,
  validatePresentationText,
  type PresentationSourceFacts,
} from './presentation-guard.js';

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
   * Extrai dados do perfil do candidato do template
   */
  private extractProfileData(): PresentationSourceFacts {
    try {
      if (fs.existsSync(this.templatePath)) {
        return ProfileExtractor.extractFromTemplate(this.templatePath);
      }
      return {
        name: 'Candidato',
        title: '',
        summary: '',
        profileText: 'Perfil do candidato extraído do currículo base.',
      };
    } catch (error) {
      return {
        name: 'Candidato',
        title: '',
        summary: '',
        profileText: 'Perfil do candidato extraído do currículo base.',
      };
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
   * Monta a instrução de factualidade para o texto de apresentação
   */
  private buildPresentationGuardrails(
    source: PresentationSourceFacts,
    role: string,
    jobAnalysis?: JobAnalysisResult,
    validationFeedback = ''
  ): string {
    const allowedFacts = source.profileText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join('\n- ');

    const keywordsPreview = jobAnalysis?.keywords.length
      ? `\n- Keywords da vaga: ${jobAnalysis.keywords.slice(0, 8).join(', ')}`
      : '';

    return [
      'Regras de factualidade para o presentationText:',
      '- Use somente fatos presentes no perfil do candidato, no role informado e na análise da vaga.',
      '- Não invente MBAs, pós-graduações, certificações, cargos de liderança, tecnologias ou métricas.',
      '- Use métricas apenas se estiverem explicitamente presentes na fonte factual.',
      role ? `- Role fornecido: ${role}` : '',
      keywordsPreview,
      validationFeedback ? `- Feedback de validação anterior:\n${validationFeedback}` : '',
      '- Fonte factual disponível:',
      allowedFacts ? `- ${allowedFacts}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Refina o texto de apresentação em uma segunda passada específica
   */
  private async refinePresentationText(
    result: ContentSelectionResult,
    role: string,
    jobAnalysis: JobAnalysisResult,
    profileData: PresentationSourceFacts,
    validationFeedback = ''
  ): Promise<ContentSelectionResult> {
    try {
      const refinement = await aiClient.callJSON<{
        presentationText: string;
        keywordsUsed?: string[];
      }>(
        '04-refinar-apresentacao.md',
        {
          role,
          jobAnalysis: JSON.stringify(jobAnalysis, null, 2),
          candidateProfile: profileData.profileText,
          presentationDraft: result.presentationText,
          presentationGuardrails: this.buildPresentationGuardrails(
            profileData,
            role,
            jobAnalysis,
            validationFeedback
          ),
          validationFeedback,
        },
        {
          maxTokens: 2048,
          temperature: 0.25,
        }
      );

      const refinedText = refinement.presentationText?.trim();
      if (!refinedText) {
        return result;
      }

      return {
        ...result,
        presentationText: refinedText,
        keywordsUsed: Array.isArray(refinement.keywordsUsed) && refinement.keywordsUsed.length > 0
          ? refinement.keywordsUsed
          : result.keywordsUsed,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`Aviso: falha ao refinar presentationText; usando rascunho original (${message})`);
      return result;
    }
  }

  /**
   * Executa a chamada de seleção + apresentação e devolve o resultado cru
   */
  private async requestSelection(
    role: string,
    jobAnalysis: JobAnalysisResult,
    validationFeedback = ''
  ): Promise<{ result: ContentSelectionResult; profileData: PresentationSourceFacts }> {
    const html = this.loadTemplate();
    const profileData = this.extractProfileData();
    const candidateProfile = profileData.profileText;
    const analysisFormatted = JSON.stringify(jobAnalysis, null, 2);
    const sectionPriorities = this.formatSectionPriorities();
    const presentationGuardrails = this.buildPresentationGuardrails(
      profileData,
      role,
      jobAnalysis,
      validationFeedback
    );

    const result = await aiClient.callJSON<ContentSelectionResult>(
      '02-selecao-conteudo-e-apresentacao.md',
      {
        jobAnalysis: analysisFormatted,
        curriculumHtml: html,
        candidateProfile,
        role,
        sectionPriorities,
        presentationGuardrails,
        presentationValidationFeedback: validationFeedback,
      },
      {
        maxTokens: 8192,
        temperature: 0.4,
      }
    );

    return { result, profileData };
  }

  /**
   * Valida e normaliza o resultado da seleção
   */
  private validateAndNormalizeSelection(
    result: ContentSelectionResult,
    role: string,
    jobAnalysis: JobAnalysisResult,
    profileData: PresentationSourceFacts,
    fallbackPresentation?: string
  ): ContentSelectionResult {
    if (!result.presentationText || result.presentationText.trim().length === 0) {
      if (fallbackPresentation) {
        result.presentationText = fallbackPresentation;
      } else {
        throw new Error('Erro: presentationText é obrigatório mas não foi gerado');
      }
    }

    const validation = validatePresentationText(result.presentationText, profileData, role, jobAnalysis);
    if (!validation.valid) {
      if (fallbackPresentation) {
        result.presentationText = fallbackPresentation;
      } else {
        throw new Error(
          `presentationText contém termos não suportados: ${validation.rejectedTerms.join(', ')}`
        );
      }
    }

    if (result.presentationText.length < 200 || result.presentationText.length > 400) {
      console.warn(`Aviso: presentationText tem ${result.presentationText.length} caracteres (ideal: 200-400)`);
    }

    if (result.selectedExperiences) {
      result.selectedExperiences.forEach((exp, index) => {
        if (!exp.achievementsToHighlight || exp.achievementsToHighlight.length === 0) {
          console.warn(`Aviso: Experiência ${index + 1} (priority ${exp.priority}) não tem conquistas selecionadas`);
        }
      });
      result.selectedExperiences = result.selectedExperiences.sort((a, b) => a.priority - b.priority);
    }

    if (result.selectedSkills && result.selectedSkills.categories) {
      if (result.selectedSkills.categories.length === 0) {
        console.warn('Aviso: Nenhuma categoria de skill foi selecionada');
      }
    }

    return result;
  }

  /**
   * Gera seleção com uma segunda tentativa de correção e fallback factual
   */
  private async generateSelectionWithRecovery(
    role: string,
    jobAnalysis: JobAnalysisResult
  ): Promise<ContentSelectionResult> {
    try {
      const firstAttempt = await this.requestSelection(role, jobAnalysis);
      const refinedFirstAttempt = await this.refinePresentationText(
        firstAttempt.result,
        role,
        jobAnalysis,
        firstAttempt.profileData
      );
      return this.validateAndNormalizeSelection(
        refinedFirstAttempt,
        role,
        jobAnalysis,
        firstAttempt.profileData
      );
    } catch (error) {
      const initialError = error instanceof Error ? error.message : 'Erro desconhecido';
      const needsRetry = initialError.includes('termos não suportados') || initialError.includes('presentationText');

      if (needsRetry) {
        try {
          const profileData = this.extractProfileData();
          const rejectedTerms = initialError.includes('termos não suportados')
            ? initialError
                .split(':')
                .slice(1)
                .join(':')
                .split(',')
                .map((term) => term.trim())
                .filter(Boolean)
            : [];
          const feedback = buildValidationFeedback(profileData, rejectedTerms, role, jobAnalysis);
          const retryAttempt = await this.requestSelection(role, jobAnalysis, feedback);
          const refinedRetryAttempt = await this.refinePresentationText(
            retryAttempt.result,
            role,
            jobAnalysis,
            retryAttempt.profileData,
            feedback
          );
          const fallbackPresentation = buildFallbackPresentation(profileData, role, jobAnalysis);
          return this.validateAndNormalizeSelection(
            refinedRetryAttempt,
            role,
            jobAnalysis,
            retryAttempt.profileData,
            fallbackPresentation
          );
        } catch (retryError) {
          const profileData = this.extractProfileData();
          const fallbackPresentation = buildFallbackPresentation(profileData, role, jobAnalysis);
          return {
            selectedExperiences: [],
            selectedSkills: { categories: [] },
            selectedCertifications: [],
            presentationText: fallbackPresentation,
            keywordsUsed: jobAnalysis.keywords.slice(0, 6),
          };
        }
      }

      throw error;
    }
  }

  /**
   * Seleciona conteúdo e gera apresentação baseado na análise da vaga
   */
  async selectContentAndPresentation(
    jobAnalysis: JobAnalysisResult,
    role?: string
  ): Promise<ContentSelectionResult> {
    try {
      const profileData = this.extractProfileData();
      const effectiveRole = role || profileData.title || 'Currículo';
      return await this.generateSelectionWithRecovery(effectiveRole, jobAnalysis);
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
      return await this.generateSelectionWithRecovery(role, minimalAnalysis);
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
