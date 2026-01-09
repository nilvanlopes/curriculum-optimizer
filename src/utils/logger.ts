import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * Sistema de logs colorido para o CLI
 */
export class Logger {
  private verbose: boolean;
  private spinner: Ora | null = null;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }

  section(title: string): void {
    console.log('\n' + chalk.bold.cyan(`━━━ ${title} ━━━`) + '\n');
  }

  table(data: Record<string, string | number>): void {
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
    
    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(chalk.gray(`  ${paddedKey} : `) + chalk.white(value));
    });
  }

  break(): void {
    console.log('');
  }
}

// Instância global
export const logger = new Logger();