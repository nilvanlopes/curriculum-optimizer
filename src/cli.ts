#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SalaryCalculator } from './calculators/salary.js';
import { config } from './config.js';
import { HTMLComposer } from './generators/html-composer.js';
import { MarkdownGenerator } from './generators/markdown.js';
import { PDFGenerator } from './generators/pdf.js';
import { JobAnalyzer } from './prompts/analyzers/job-analyzer.js';
import { ContentSelector } from './prompts/selectors/content-selector.js';
import type { JobAnalysisResult } from './types.js';
import { Logger } from './utils/logger.js';
import { storage } from './utils/storage.js';
import { ResumeValidator } from './validators/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lê conteúdo de arquivo ou retorna texto fornecido
 */
function readJobDescription(input: string): string {
  // Verifica se é um caminho de arquivo
  if (fs.existsSync(input)) {
    const filePath = path.resolve(input);
    const ext = path.extname(filePath).toLowerCase();
    
    // Aceita apenas .txt e .md
    if (ext !== '.txt' && ext !== '.md') {
      throw new Error(`Formato de arquivo não suportado: ${ext}. Use .txt ou .md`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.trim()) {
      throw new Error(`Arquivo vazio: ${filePath}`);
    }
    
    return content.trim();
  }
  
  // Se não for arquivo, retorna o texto direto
  return input;
}

const logger = new Logger();
const program = new Command();

/**
 * CLI Principal do CV Optimizer
 */
program
  .name('cv-optimizer')
  .description('Sistema automatizado de otimização de currículos para vagas específicas')
  .version('1.0.0');

/**
 * Comando: generate
 * Gera currículo otimizado para uma vaga específica
 */
program
  .command('generate')
  .description('Gera currículo otimizado baseado na descrição da vaga')
  .option('-j, --job-description <text>', 'Descrição completa da vaga (texto ou caminho para arquivo .txt/.md)')
  .option('-f, --job-file <path>', 'Caminho para arquivo .txt ou .md com descrição da vaga')
  .requiredOption('-r, --role <title>', 'Título do currículo (ex: "Tech Lead Frontend", "Senior Frontend Developer")')
  .option('-o, --output-name <name>', 'Nome do arquivo de saída (sem extensão). Padrão: "Curriculo {{role}}"')
  .option('--formats <formats>', 'Formatos de saída separados por vírgula (html, pdf, markdown). Padrão: pdf', 'pdf')
  .option('-t, --template <path>', 'Caminho para template HTML base do currículo. Padrão: src/templates/base-curriculum.html')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (options) => {
    try {
      // Valida entrada
      if (options.jobDescription && options.jobFile) {
        logger.warning('Ambos --job-description e --job-file fornecidos. Usando --job-file');
      }

      // Lê descrição da vaga (arquivo ou texto direto) - opcional
      const hasJobDescription = options.jobDescription || options.jobFile;
      let jobDescription: string | null = null;

      if (hasJobDescription) {
        const jobDescriptionInput = options.jobFile || options.jobDescription || '';
        try {
          jobDescription = readJobDescription(jobDescriptionInput);
        } catch (error) {
          logger.error(`Erro ao ler descrição da vaga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          process.exit(1);
        }
      }

      logger.section('Gerando Currículo Otimizado');
      
      const role = options.role as string;
      // Gera nome padrão se não fornecido: "Curriculo {{role}}" (sanitizado para nome de arquivo válido)
      const defaultOutputName = `Curriculo ${role}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens duplicados
        .replace(/^-|-$/g, ''); // Remove hífens no início/fim
      const outputName = options.outputName || defaultOutputName;
      
      // Processa formatos: separa por vírgula, remove espaços, normaliza para lowercase
      const formatsInput = (options.formats || 'pdf').toLowerCase();
      const requestedFormats = formatsInput
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);
      
      // Valida formatos
      const validFormats = ['html', 'pdf', 'markdown'];
      const invalidFormats = requestedFormats.filter((f: string) => !validFormats.includes(f));
      if (invalidFormats.length > 0) {
        logger.error(`Formatos inválidos: ${invalidFormats.join(', ')}. Formatos válidos: ${validFormats.join(', ')}`);
        process.exit(1);
      }
      
      // Determina templatePath (fornecido ou padrão)
      const templatePath = options.template 
        ? path.resolve(options.template)
        : path.join(__dirname, 'templates/base-curriculum.html');
      
      logger.info(`Role: ${role}`);
      logger.info(`Output: ${outputName}`);
      logger.info(`Formatos: ${requestedFormats.join(', ')}`);
      logger.info(`Template: ${templatePath}`);
      if (hasJobDescription) {
        if (options.jobFile) {
          logger.info(`Arquivo de vaga: ${path.resolve(options.jobFile)}`);
        } else {
          logger.info('Descrição da vaga fornecida via texto');
        }
      } else {
        logger.info('Gerando currículo baseado apenas no role (sem otimização para vaga específica)');
      }
      
      // Calcula total de etapas
      // O loop iterativo de HTML é contado como 1 etapa (internamente pode ter múltiplas tentativas)
      let totalSteps = 2; // Sempre: Seleção de conteúdo + Montagem HTML (com loop iterativo)
      if (jobDescription) {
        totalSteps += 1; // Análise de vaga
      }
      if (requestedFormats.includes('pdf')) {
        totalSteps += 1; // Geração PDF final
        if (jobDescription) {
          totalSteps += 1; // Validação ATS (apenas se houver análise de vaga)
        }
      }
      if (requestedFormats.includes('markdown')) {
        totalSteps += 1; // Geração Markdown
      }
      
      let currentStep = 0;
      
      // 1. Análise de vaga (opcional)
      let jobAnalysis: JobAnalysisResult | null = null;
      if (jobDescription) {
        currentStep += 1;
        logger.startSpinner('Analisando descrição da vaga...', { current: currentStep, total: totalSteps });
        const jobAnalyzer = new JobAnalyzer(templatePath);
        jobAnalysis = await jobAnalyzer.analyzeJob(jobDescription, undefined, {
          saveToHistory: true,
        });
        logger.stopSpinner(true, 'Vaga analisada com sucesso');
        logger.success(`${jobAnalysis.keywords.length} keywords críticas identificadas`);
        logger.info(`Match Score: ${jobAnalysis.matchScore}%`);
      } else {
        logger.info('Pulando análise de vaga (nenhuma descrição fornecida)');
      }
      
      // 2. Seleção de conteúdo e geração de apresentação (combinado)
      currentStep += 1;
      logger.startSpinner('Selecionando conteúdo e gerando apresentação...', { current: currentStep, total: totalSteps });
      const contentSelector = new ContentSelector(templatePath);
      const contentSelection = jobAnalysis 
        ? await contentSelector.selectContentAndPresentation(jobAnalysis, role)
        : await contentSelector.selectContentAndPresentationByRole(role);
      logger.stopSpinner(true, 'Conteúdo selecionado e apresentação gerada');
      
      // 3. Montagem HTML completo com loop iterativo
      currentStep += 1;
      logger.startSpinner('Montando HTML completo do currículo...', { current: currentStep, total: totalSteps });
      const htmlComposer = new HTMLComposer(templatePath);
      
      // Usa loop iterativo para garantir que o PDF fique entre 1.9-2.2 páginas
      const iterationResult = await htmlComposer.composeWithIteration(
        role,
        contentSelection,
        jobAnalysis || undefined,
        (message, attempt, maxAttempts) => {
          if (options.verbose) {
            logger.debug(`[Iteração ${attempt}/${maxAttempts}] ${message}`);
          }
        }
      );
      
      const html = iterationResult.html;
      
      // Salva HTML
      const outputDir = path.join(process.cwd(), 'output');
      const htmlPath = path.join(outputDir, `${outputName}.html`);
      await htmlComposer.save(html, htmlPath);
      
      // Mostra resultado da iteração
      const rangeStatus = iterationResult.isWithinRange 
        ? '✓ dentro do range' 
        : '⚠ fora do range';
      logger.stopSpinner(true, `Arquivo ${outputName}.html criado (${iterationResult.attempts} tentativa(s), ${iterationResult.finalMeasurement.pageCount} página(s) ${rangeStatus})`);
      
      const formats: string[] = [];
      let pdfPath: string | undefined;
      let markdownPath: string | undefined;
      
      // HTML sempre é gerado (necessário para os outros formatos)
      formats.push('html');
      
      // 4. Geração PDF (se solicitado)
      if (requestedFormats.includes('pdf')) {
        currentStep += 1;
        logger.startSpinner('Convertendo para PDF...', { current: currentStep, total: totalSteps });
        const pdfGenerator = new PDFGenerator();
        pdfPath = path.join(outputDir, `${outputName}.pdf`);
        await pdfGenerator.generate(html, pdfPath);
        formats.push('pdf');
        logger.stopSpinner(true, `Arquivo ${outputName}.pdf criado`);
        
        // Validação automática do PDF (apenas se houver análise de vaga)
        if (jobAnalysis) {
          currentStep += 1;
          logger.startSpinner('Validando compatibilidade ATS...', { current: currentStep, total: totalSteps });
          const validator = new ResumeValidator();
          const validation = await validator.validatePDF(pdfPath, jobAnalysis.keywords);
          logger.stopSpinner(true, `Validação concluída (Score: ${validation.score}/100)`);
          
          if (validation.warnings.length > 0 && options.verbose) {
            logger.break();
            logger.warning('Avisos de validação:');
            validation.warnings.slice(0, 3).forEach((w) => {
              console.log(chalk.yellow(`  • ${w}`));
            });
          }
        }
      }
      
      // 5. Geração Markdown (se solicitado)
      if (requestedFormats.includes('markdown')) {
        currentStep += 1;
        logger.startSpinner('Gerando Markdown para Gupy...', { current: currentStep, total: totalSteps });
        const markdownGenerator = new MarkdownGenerator();
        markdownPath = path.join(outputDir, `${outputName}-gupy.txt`);
        await markdownGenerator.generate(html, markdownPath);
        formats.push('markdown');
        logger.stopSpinner(true, `Arquivo ${outputName}-gupy.txt criado`);
      }
      
      // 8. Salva no histórico
      try {
        // Busca a análise mais recente (que acabou de ser salva)
        const recentAnalyses = storage.getRecentAnalyses(1);
        const latestAnalysis = recentAnalyses && recentAnalyses.length > 0 ? recentAnalyses[0] : null;
        
        // Tenta extrair jobId e analysisId do histórico
        // Como salvamos a análise logo antes, ela deve estar no topo
        let jobId: number | undefined;
        let jobAnalysisId: number | undefined;
        
        if (latestAnalysis) {
          // O getRecentAnalyses retorna análises, mas precisamos buscar o jobId relacionado
          // Por enquanto, vamos salvar sem os IDs relacionados se não conseguirmos encontrá-los
          jobAnalysisId = latestAnalysis.id;
        }
        
        storage.saveGeneratedCV({
          jobId: jobId,
          jobAnalysisId: jobAnalysisId,
          role,
          outputName,
          formats,
          matchScore: jobAnalysis?.matchScore,
          filePathHtml: htmlPath,
          filePathPdf: pdfPath,
          filePathMarkdown: markdownPath,
        });
      } catch (error) {
        // Não falha se não conseguir salvar histórico
        if (options.verbose) {
          logger.debug(`Aviso: Não foi possível salvar no histórico: ${error}`);
        }
      }
      
      logger.break();
      logger.success('Currículo gerado com sucesso!');
      logger.break();
      
      const tableData: Record<string, string> = {
        'Formats': formats.join(', '),
        'HTML': htmlPath,
        ...(pdfPath ? { 'PDF': pdfPath } : {}),
        ...(markdownPath ? { 'Markdown': markdownPath } : {}),
        'Iterações HTML': `${iterationResult.attempts}`,
        'Páginas': `${iterationResult.finalMeasurement.pageCount} (${iterationResult.finalMeasurement.heightInPages.toFixed(2)} páginas)`,
        'Status': iterationResult.isWithinRange ? '✓ Dentro do range (1.9-2.2)' : '⚠ Fora do range',
      };
      
      if (jobAnalysis) {
        tableData['Match Score'] = `${jobAnalysis.matchScore}%`;
        tableData['Keywords Match'] = `${jobAnalysis.keywords.length} identificadas`;
      } else {
        tableData['Role'] = role;
        tableData['Tipo'] = 'Currículo genérico (sem otimização para vaga específica)';
      }
      
      logger.table(tableData);
      
      if (jobAnalysis && jobAnalysis.gaps.length > 0) {
        logger.break();
        logger.warning(`Gaps identificados (${jobAnalysis.gaps.length}):`);
        jobAnalysis.gaps.slice(0, 3).forEach((gap) => {
          console.log(chalk.yellow(`  • ${gap.keyword}: ${gap.suggestion}`));
        });
      }
      
      if (options.verbose) {
        logger.break();
        logger.debug('Análise completa salva no histórico');
      }
      
    } catch (error) {
      logger.error(`Erro ao gerar currículo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (options.verbose && error instanceof Error) {
        logger.debug(error.stack || '');
      }
      process.exit(1);
    }
  });

/**
 * Comando: validate
 * Valida compatibilidade ATS de um PDF
 */
program
  .command('validate')
  .description('Valida compatibilidade ATS de um currículo PDF')
  .argument('<pdf-path>', 'Caminho para o arquivo PDF')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (pdfPath, options) => {
    try {
      logger.section('Validando Compatibilidade ATS');
      
      logger.info(`Arquivo: ${pdfPath}`);
      
      logger.startSpinner('Executando validadores...');
      
      const validator = new ResumeValidator();
      
      // Para validação completa, precisamos de keywords (vazio por enquanto)
      // Em produção, isso poderia vir do banco de dados baseado no currículo
      const keywords: string[] = [];
      
      const result = await validator.validatePDF(pdfPath, keywords);
      
      logger.stopSpinner(true, 'Validação concluída');
      logger.break();
      
      const statusColor = result.passed ? chalk.green : chalk.yellow;
      logger.info(`Score ATS: ${statusColor(`${result.score}/100`)}`);
      logger.break();
      
      const { minWords, maxWords, maxPages } = config.validation.length;
      const { min: minKeywordDensity, max: maxKeywordDensity } = config.validation.keywordDensity;
      
      logger.table({
        'Texto Extraível': result.details.hasExtractableText ? '✓ Sim' : '✗ Não',
        'Compatível ATS': result.details.atsCompatible ? '✓ Sim' : '✗ Não',
        'Páginas': `${result.details.pageCount} ${result.details.pageCount <= maxPages ? '✓' : '⚠'}`,
        'Palavras': result.details.wordCount ? `${result.details.wordCount} ${result.details.wordCount >= minWords && result.details.wordCount <= maxWords ? '✓' : '⚠'}` : 'N/A',
        'Densidade Keywords': result.details.keywordDensity > 0 
          ? `${result.details.keywordDensity.toFixed(2)}% ${result.details.keywordDensity >= minKeywordDensity && result.details.keywordDensity <= maxKeywordDensity ? '✓' : '⚠'}`
          : 'N/A (sem keywords)'
      });
      
      if (result.warnings.length > 0) {
        logger.break();
        logger.warning(`Avisos (${result.warnings.length}):`);
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
      
      if (result.errors.length > 0) {
        logger.break();
        logger.error(`Erros (${result.errors.length}):`);
        result.errors.forEach((error) => {
          console.log(chalk.red(`  • ${error}`));
        });
      }
      
      logger.break();
      if (result.passed) {
        logger.success('Currículo aprovado para ATS!');
      } else {
        logger.warning('Currículo pode ter problemas de compatibilidade ATS. Revise os avisos acima.');
      }
      
    } catch (error) {
      logger.error(`Erro ao validar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (options.verbose && error instanceof Error) {
        logger.debug(error.stack || '');
      }
      process.exit(1);
    }
  });

/**
 * Comando: analyze
 * Analisa descrição da vaga sem gerar currículo
 */
program
  .command('analyze')
  .description('Analisa descrição da vaga e mostra keywords críticas')
  .option('-j, --job-description <text>', 'Descrição completa da vaga (texto ou caminho para arquivo .txt/.md)')
  .option('-f, --job-file <path>', 'Caminho para arquivo .txt ou .md com descrição da vaga')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (options) => {
    try {
      // Valida entrada
      if (!options.jobDescription && !options.jobFile) {
        logger.error('Erro: Você deve fornecer --job-description ou --job-file');
        logger.info('Exemplo: --job-description "texto..." ou --job-file vaga.txt');
        process.exit(1);
      }

      if (options.jobDescription && options.jobFile) {
        logger.warning('Ambos --job-description e --job-file fornecidos. Usando --job-file');
      }

      // Lê descrição da vaga (arquivo ou texto direto)
      const jobDescriptionInput = options.jobFile || options.jobDescription || '';
      let jobDescription: string;

      try {
        jobDescription = readJobDescription(jobDescriptionInput);
      } catch (error) {
        logger.error(`Erro ao ler descrição da vaga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        process.exit(1);
      }

      logger.section('Análise de Vaga');
      
      if (options.jobFile) {
        logger.info(`Arquivo: ${path.resolve(options.jobFile)}`);
      }
      
      logger.startSpinner('Analisando descrição com IA...');
      
      const analyzer = new JobAnalyzer();
      const analysis = await analyzer.analyzeJob(jobDescription);
      
      logger.stopSpinner(true, 'Análise concluída');
      logger.break();
      
      logger.info(`Keywords Críticas Identificadas (${analysis.keywords.length}):`);
      analysis.keywords.forEach((kw, i) => {
        console.log(chalk.gray(`  ${i + 1}.`) + chalk.white(` ${kw}`));
      });
      
      logger.break();
      logger.success(`Match Score: ${analysis.matchScore}%`);
      logger.info(chalk.gray(analysis.matchScoreJustification));
      logger.break();
      
      logger.info('Requisitos Obrigatórios:');
      analysis.requirements.mandatory.forEach((req, i) => {
        console.log(chalk.yellow(`  ${i + 1}. ${req}`));
      });
      
      if (analysis.requirements.desirable.length > 0) {
        logger.break();
        logger.info('Requisitos Desejáveis:');
        analysis.requirements.desirable.forEach((req, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${req}`));
        });
      }
      
      if (analysis.gaps.length > 0) {
        logger.break();
        logger.warning(`Gaps identificados (${analysis.gaps.length}):`);
        analysis.gaps.forEach((gap) => {
          const importanceColor = gap.importance === 'high' ? chalk.red : gap.importance === 'medium' ? chalk.yellow : chalk.gray;
          console.log(importanceColor(`  • ${gap.keyword} (${gap.importance}): ${gap.suggestion}`));
        });
      }
      
      if (analysis.suggestions.length > 0) {
        logger.break();
        logger.info('Sugestões de Melhoria:');
        analysis.suggestions.forEach((suggestion, i) => {
          console.log(chalk.blue(`  ${i + 1}. ${suggestion}`));
        });
      }
      
      if (options.verbose) {
        logger.break();
        logger.debug('Detalhes completos da análise salvos no histórico');
      }
      
    } catch (error) {
      logger.error(`Erro ao analisar vaga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (options.verbose && error instanceof Error) {
        logger.debug(error.stack || '');
      }
      process.exit(1);
    }
  });

/**
 * Comando: salary-compare
 * Compara propostas CLT vs PJ
 */
program
  .command('salary-compare')
  .description('Compara compensação total entre CLT e PJ')
  .requiredOption('--clt <value>', 'Salário bruto CLT (ex: 16000)')
  .requiredOption('--pj <value>', 'Valor mensal PJ (ex: 19500)')
  .option('--benefits <list>', 'Benefícios CLT no formato "VR:800,VT:200,Saude:600,PLR:25%"', '')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (options) => {
    try {
      logger.section('Comparação Salarial CLT vs PJ');
      
      const cltGross = parseFloat(options.clt);
      const pjGross = parseFloat(options.pj);

      if (isNaN(cltGross) || cltGross <= 0) {
        logger.error('Valor CLT inválido');
        process.exit(1);
      }

      if (isNaN(pjGross) || pjGross <= 0) {
        logger.error('Valor PJ inválido');
        process.exit(1);
      }

      logger.startSpinner('Calculando...');
      
      const calculator = new SalaryCalculator();
      const comparison = calculator.calculate(cltGross, pjGross, options.benefits || '');
      
      logger.stopSpinner(true, 'Cálculo concluído');
      logger.break();
      
      logger.info(`CLT - Salário Bruto: ${calculator.formatCurrency(comparison.clt.gross)}`);
      const irrfAmount = comparison.clt.taxes - (comparison.clt.gross - comparison.clt.net - comparison.clt.taxes);
      logger.table({
        'INSS': calculator.formatCurrency(Math.max(0, comparison.clt.gross - comparison.clt.net - irrfAmount)),
        'IRRF': calculator.formatCurrency(irrfAmount),
        'Líquido': calculator.formatCurrency(comparison.clt.net),
        'Benefícios': calculator.formatCurrency(comparison.clt.benefits),
        'Total Mensal': calculator.formatCurrency(comparison.clt.total)
      });
      
      logger.break();
      logger.info(`PJ - Faturamento: ${calculator.formatCurrency(comparison.pj.gross)}`);
      const pjReserves = comparison.pj.costs * (1/3); // Aproximação
      logger.table({
        'Impostos (6%)': calculator.formatCurrency(comparison.pj.taxes),
        'Custos Fixos': calculator.formatCurrency(comparison.pj.costs - pjReserves),
        'Reservas (Férias/13º)': calculator.formatCurrency(pjReserves),
        'Líquido Disponível': calculator.formatCurrency(comparison.pj.total)
      });
      
      logger.break();
      
      const winnerText = comparison.difference.winner === 'clt' ? 'CLT' : 'PJ';
      const diffText = calculator.formatCurrency(comparison.difference.amount);
      const percentText = comparison.difference.percentage.toFixed(2);
      
      logger.success(`RESULTADO: ${winnerText} oferece ${diffText}/mês a mais (${percentText}%)`);
      
      if (comparison.difference.winner === 'clt') {
        logger.info('Considerando estabilidade e benefícios: CLT é mais vantajoso');
      } else {
        logger.info('PJ oferece maior valor líquido, mas considere estabilidade e benefícios');
      }
      
      if (options.verbose) {
        logger.break();
        logger.debug('Detalhes do cálculo:');
        logger.debug(`  CLT Total: ${calculator.formatCurrency(comparison.clt.total)}`);
        logger.debug(`  PJ Total: ${calculator.formatCurrency(comparison.pj.total)}`);
      }
      
    } catch (error) {
      logger.error(`Erro ao comparar salários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (options.verbose && error instanceof Error) {
        logger.debug(error.stack || '');
      }
      process.exit(1);
    }
  });

/**
 * Comando: serve
 * Inicia servidor de desenvolvimento com live reload usando Vite
 */
program
  .command('serve')
  .description('Inicia servidor de desenvolvimento com live reload para editar HTML do currículo')
  .requiredOption('-f, --file <path>', 'Caminho para o arquivo HTML a monitorar (template base ou HTML gerado)')
  .option('-p, --port <number>', 'Porta do servidor (padrão: 5173)', '5173')
  .option('--open', 'Abrir navegador automaticamente (padrão: true)', true)
  .option('--no-open', 'Não abrir navegador automaticamente')
  .action(async (options) => {
    try {
      logger.section('Iniciando Live Server');

      const htmlPath = path.resolve(options.file);
      
      // Valida se o arquivo existe
      if (!fs.existsSync(htmlPath)) {
        logger.error(`Arquivo não encontrado: ${htmlPath}`);
        logger.info('Use um caminho relativo ou absoluto para o arquivo HTML');
        process.exit(1);
      }

      // Valida se é um arquivo HTML
      if (!htmlPath.toLowerCase().endsWith('.html')) {
        logger.error('O arquivo deve ter extensão .html');
        process.exit(1);
      }

      const port = parseInt(options.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        logger.error('Porta inválida. Use um número entre 1 e 65535');
        process.exit(1);
      }

      // Determina se deve abrir navegador (padrão: true)
      // Quando --no-open é usado, Commander define options.open como false
      const shouldOpen = options.open !== false;
      
      logger.info(`Arquivo: ${htmlPath}`);
      logger.info(`Porta: ${port}`);
      logger.info(`Abrir navegador: ${shouldOpen ? 'Sim' : 'Não'}`);
      logger.break();

      // Importa Vite dinamicamente
      let vite;
      try {
        vite = await import('vite');
      } catch (error) {
        logger.error('Vite não está instalado. Execute: npm install');
        logger.info('Instale as dependências com: npm install');
        process.exit(1);
      }
      
      const htmlDir = path.dirname(htmlPath);
      const htmlFileName = path.basename(htmlPath);
      
      // Cria servidor Vite
      const server = await vite.createServer({
        root: htmlDir,
        server: {
          port,
          open: shouldOpen ? `/${htmlFileName}` : false,
          strictPort: false,
        },
        publicDir: false,
      });

      // Inicia servidor
      await server.listen();

      const url = `http://localhost:${port}/${htmlFileName}`;
      
      logger.success('Servidor iniciado com sucesso!');
      logger.break();
      logger.info(`URL: ${url}`);
      logger.info('Edite o arquivo HTML e veja as mudanças em tempo real no navegador');
      logger.info('Pressione Ctrl+C para parar o servidor');
      logger.break();

      // Mantém o processo rodando
      process.on('SIGINT', async () => {
        logger.break();
        logger.info('Encerrando servidor...');
        await server.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await server.close();
        process.exit(0);
      });

    } catch (error) {
      logger.error(`Erro ao iniciar servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

// Parse dos argumentos
program.parse();
