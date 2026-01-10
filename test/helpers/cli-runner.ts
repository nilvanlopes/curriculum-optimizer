import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export interface CLIResult {
  code: number | null;
  stdout: string;
  stderr: string;
  // Combinação de stdout e stderr para facilitar busca
  output: string;
}

/**
 * Executa um comando CLI e retorna o resultado
 */
export async function runCLI(
  args: string[],
  options: { env?: Record<string, string>; timeout?: number } = {}
): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV !== 'production';
    const command = isDev ? 'tsx' : 'node';
    const script = isDev 
      ? path.join(projectRoot, 'src', 'cli.ts')
      : path.join(projectRoot, 'dist', 'cli.js');
    
    const cmdArgs = isDev ? [script, ...args] : [script, ...args];
    
    const env = {
      ...process.env,
      ...options.env,
      // Desabilita cores para facilitar parsing
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    };

    const child = spawn(command, cmdArgs, {
      cwd: projectRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = options.timeout || 30000; // 30s default
    const timeoutId = setTimeout(() => {
      // Tenta matar o processo de forma mais agressiva
      try {
        child.kill('SIGKILL');
      } catch (e) {
        // Ignora erros ao matar processo
      }
      reject(new Error(`CLI timeout after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const result: CLIResult = {
        code,
        stdout,
        stderr,
        get output() {
          return this.stdout + this.stderr;
        },
      };
      resolve(result);
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}
