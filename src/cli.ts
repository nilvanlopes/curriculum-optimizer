#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SalaryCalculator } from './calculators/salary.js';
import { HTMLGenerator } from './generators/html.js';
import { MarkdownGenerator } from './generators/markdown.js';
import { PDFGenerator } from './generators/pdf.js';
import { JobAnalyzer } from './prompts/analyzers/job-analyzer.js';
import { PresentationGenerator } from './prompts/optimizers/presentation-generator.js';
import { StrategyOptimizer } from './prompts/optimizers/strategy-optimizer.js';
import { ContentSelector } from './prompts/selectors/content-selector.js';
import type { OutputFormat, TemplateType } from './types.js';
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
  .requiredOption('-t, --template <type>', 'Template a usar (tech-lead, senior-frontend, fullstack)')
  .requiredOption('-o, --output-name <name>', 'Nome do arquivo de saída (sem extensão)')
  .option('--format <format>', 'Formato de saída (html, pdf, markdown, all)', 'all')
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

      logger.section('Gerando Currículo Otimizado');
      
      const template = options.template as TemplateType;
      const outputName = options.outputName;
      const format = (options.format || 'all') as OutputFormat;
      
      logger.info(`Template: ${template}`);
      logger.info(`Output: ${outputName}`);
      logger.info(`Formato: ${format}`);
      if (options.jobFile) {
        logger.info(`Arquivo de vaga: ${path.resolve(options.jobFile)}`);
      }
      
      // 1. Análise de vaga
      logger.startSpinner('Analisando descrição da vaga...');
      const jobAnalyzer = new JobAnalyzer();
      const jobAnalysis = await jobAnalyzer.analyzeJob(jobDescription, undefined, {
        saveToHistory: true,
      });
      logger.stopSpinner(true, 'Vaga analisada com sucesso');
      logger.success(`${jobAnalysis.keywords.length} keywords críticas identificadas`);
      logger.info(`Match Score: ${jobAnalysis.matchScore}%`);
      
      // 2. Seleção de conteúdo
      logger.startSpinner('Selecionando e priorizando conteúdo...');
      const contentSelector = new ContentSelector();
      const contentSelection = await contentSelector.selectContent(jobAnalysis);
      logger.stopSpinner(true, 'Conteúdo selecionado');
      
      // 3. Geração de texto de apresentação
      logger.startSpinner('Gerando texto de apresentação...');
      const presentationGenerator = new PresentationGenerator();
      const presentation = await presentationGenerator.generatePresentation(jobAnalysis);
      logger.stopSpinner(true, 'Texto de apresentação gerado');
      
      // 4. Otimização estratégica (opcional - pode ser aplicada depois)
      logger.startSpinner('Otimizando estratégia do template...');
      const htmlGenerator = new HTMLGenerator();
      const { html: baseHtml } = htmlGenerator.loadTemplate();
      const strategyOptimizer = new StrategyOptimizer();
      // Nota: Otimização estratégica pode ser usada para ajustes finos
      await strategyOptimizer.optimize(template, jobAnalysis, baseHtml);
      logger.stopSpinner(true, 'Estratégia otimizada');
      
      // 5. Geração HTML
      logger.startSpinner('Gerando HTML otimizado...');

      const outputDir = path.join(process.cwd(), 'output');
      const htmlPath = path.join(outputDir, `${outputName}.html`);
      const html = await htmlGenerator.generate(
        template,
        contentSelection,
        presentation.presentationText
      );
      // Salva HTML
      const fs = await import('fs');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(htmlPath, html, 'utf-8');
      logger.stopSpinner(true, `Arquivo ${outputName}.html criado`);
      
      const formats: string[] = [];
      let pdfPath: string | undefined;
      let markdownPath: string | undefined;
      
      // 6. Geração PDF (se solicitado)
      if (format === 'pdf' || format === 'all') {
        logger.startSpinner('Convertendo para PDF...');
        const pdfGenerator = new PDFGenerator();
        pdfPath = path.join(outputDir, `${outputName}.pdf`);
        await pdfGenerator.generate(html, pdfPath);
        formats.push('pdf');
        logger.stopSpinner(true, `Arquivo ${outputName}.pdf criado`);
        
        // Validação automática do PDF
        if (format === 'all') {
          logger.startSpinner('Validando compatibilidade ATS...');
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
      
      // 7. Geração Markdown (se solicitado)
      if (format === 'markdown' || format === 'all') {
        logger.startSpinner('Gerando Markdown para Gupy...');
        const markdownGenerator = new MarkdownGenerator();
        markdownPath = path.join(outputDir, `${outputName}-gupy.txt`);
        await markdownGenerator.generate(html, markdownPath);
        formats.push('markdown');
        logger.stopSpinner(true, `Arquivo ${outputName}-gupy.txt criado`);
      }
      
      formats.push('html');
      
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
          template,
          outputName,
          formats,
          matchScore: jobAnalysis.matchScore,
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
      
      logger.table({
        'Match Score': `${jobAnalysis.matchScore}%`,
        'Keywords Match': `${jobAnalysis.keywords.length} identificadas`,
        'Formats': formats.join(', '),
        'HTML': htmlPath,
        ...(pdfPath ? { 'PDF': pdfPath } : {}),
        ...(markdownPath ? { 'Markdown': markdownPath } : {}),
      });
      
      if (jobAnalysis.gaps.length > 0) {
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
      
      logger.table({
        'Texto Extraível': result.details.hasExtractableText ? '✓ Sim' : '✗ Não',
        'Compatível ATS': result.details.atsCompatible ? '✓ Sim' : '✗ Não',
        'Páginas': `${result.details.pageCount} ${result.details.pageCount <= 2 ? '✓' : '⚠'}`,
        'Palavras': result.details.wordCount ? `${result.details.wordCount} ${result.details.wordCount >= 300 && result.details.wordCount <= 1000 ? '✓' : '⚠'}` : 'N/A',
        'Densidade Keywords': result.details.keywordDensity > 0 
          ? `${result.details.keywordDensity.toFixed(2)}% ${result.details.keywordDensity >= 5 && result.details.keywordDensity <= 10 ? '✓' : '⚠'}`
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
      const inssAmount = comparison.clt.gross - (comparison.clt.net + (comparison.clt.taxes - (comparison.clt.gross - comparison.clt.net - comparison.clt.taxes)));
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