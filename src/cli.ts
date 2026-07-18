#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { SalaryCalculator } from './calculators/salary.js';
import { config } from './config.js';
import { JobAnalyzer } from './prompts/analyzers/job-analyzer.js';
import { GenerationService } from './services/generation-service.js';
import { AIClient } from './utils/ai-client.js';
import { Logger } from './utils/logger.js';
import { parseOutputFormats } from './utils/output-formats.js';
import { ResumeValidator } from './validators/index.js';

/**
 * Lê conteúdo de arquivo ou retorna texto fornecido
 */
function readJobDescription(input: string, requireFile = false): string {
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

  if (requireFile) {
    throw new Error(`Arquivo de vaga não encontrado: ${path.resolve(input)}`);
  }
  
  // Se não for arquivo, retorna o texto direto
  return input;
}

let logger = new Logger();
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
  .option('--curriculum-file <path>', 'Currículo original em PDF, HTML, Markdown ou TXT')
  .option('--refresh-base', 'Ignora o cache e regenera input/base-curriculum.html', false)
  .option('--provider <provider>', 'Provider de IA desta execução')
  .option('--formats <formats>', 'Formatos separados por vírgula: pdf, html, txt. Padrão: pdf', 'pdf')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (options) => {
    logger = new Logger(Boolean(options.verbose));
    try {
      if (options.jobDescription && options.jobFile) {
        logger.warning('Ambos --job-description e --job-file fornecidos. Usando --job-file');
      }
      logger.section('Gerando Currículo Otimizado');
      const aiClient = new AIClient({ providerOverride: options.provider, logger });
      const formats = parseOutputFormats(options.formats);
      const jobInput = options.jobFile || options.jobDescription;
      const jobDescription = jobInput
        ? readJobDescription(jobInput, Boolean(options.jobFile))
        : null;
      const service = new GenerationService({ aiClient, logger });
      const result = await service.generate({
        role: options.role,
        curriculumFile: options.curriculumFile,
        refreshBase: options.refreshBase,
        jobDescription,
        outputName: options.outputName,
        formats,
        verbose: options.verbose,
      });

      logger.success('Currículo gerado com sucesso!');
      logger.table({
        'Provider': `${aiClient.provider.provider} / ${aiClient.provider.model}`,
        'Cache base': result.base.cache,
        'Formatos': result.formats.join(', '),
        ...(result.paths.pdf ? { 'PDF': result.paths.pdf } : {}),
        ...(result.paths.html ? { 'HTML': result.paths.html } : {}),
        ...(result.paths.txt ? { 'TXT': result.paths.txt } : {}),
        'Iterações HTML': result.attempts,
        'Páginas': `${result.measurement.pageCount} (${result.measurement.heightInPages.toFixed(2)} páginas)`,
        'Status': result.isWithinRange ? '✓ Dentro do range (1.9-2.2)' : '⚠ Fora do range',
      });
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
    logger = new Logger(Boolean(options.verbose));
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
  .option('--provider <provider>', 'Provider de IA desta execução')
  .option('-v, --verbose', 'Modo verboso com logs detalhados', false)
  .action(async (options) => {
    logger = new Logger(Boolean(options.verbose));
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
        jobDescription = readJobDescription(jobDescriptionInput, Boolean(options.jobFile));
      } catch (error) {
        logger.error(`Erro ao ler descrição da vaga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        process.exit(1);
      }

      logger.section('Análise de Vaga');
      
      if (options.jobFile) {
        logger.info(`Arquivo: ${path.resolve(options.jobFile)}`);
      }
      
      logger.startSpinner('Analisando descrição com IA...');
      
      const aiClient = new AIClient({ providerOverride: options.provider, logger });
      const analyzer = new JobAnalyzer(undefined, aiClient);
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
    logger = new Logger(Boolean(options.verbose));
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
