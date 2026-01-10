import { describe, it, expect } from 'vitest';
import { runCLI } from '../helpers/cli-runner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../fixtures');

describe('CLI: validate', () => {
  describe('Argumentos obrigatórios', () => {
    it('deve falhar quando caminho do PDF não é fornecido', async () => {
      const result = await runCLI(['validate'], { timeout: 5000 });
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('required') || expect(result.stderr).toContain('argument');
    }, 10000);

    it('deve falhar quando PDF não existe', async () => {
      const result = await runCLI([
        'validate',
        'arquivo-inexistente.pdf'
      ], { timeout: 10000 });
      
      expect(result.code).not.toBe(0);
      // Erro pode estar em stdout ou stderr (depende de onde o erro é lançado)
      expect(result.output).toMatch(/não encontrado|não existe|Erro|Error|ENOENT/i);
    }, 15000);
  });

  describe('Argumentos opcionais - verbose', () => {
    it('deve aceitar --verbose', async () => {
      // Cria um PDF fake para teste (será rejeitado pelo parser, mas testa o argumento)
      const fakePdf = path.join(fixturesDir, 'fake-test.pdf');
      fs.writeFileSync(fakePdf, 'fake pdf content');
      
      try {
        const result = await runCLI([
          'validate',
          fakePdf,
          '--verbose'
        ], { timeout: 15000 });
        
        // Pode falhar ao processar PDF inválido, mas não deve falhar por argumento
        expect(result.stderr).not.toContain('invalid');
      } finally {
        if (fs.existsSync(fakePdf)) {
          fs.unlinkSync(fakePdf);
        }
      }
    }, 20000);
  });

  describe('Validação de formato', () => {
    it('deve processar arquivo PDF válido (se existir)', async () => {
      // Procura por PDFs de teste no output
      const outputDir = path.join(path.dirname(__dirname), '../../output');
      if (fs.existsSync(outputDir)) {
        const pdfs = fs.readdirSync(outputDir).filter(f => f.endsWith('.pdf'));
        if (pdfs.length > 0) {
          const pdfPath = path.join(outputDir, pdfs[0]);
          const result = await runCLI([
            'validate',
            pdfPath
          ], { timeout: 30000 });
          
          // Não deve falhar por argumento inválido
          expect(result.stderr).not.toContain('invalid');
        }
      }
    }, 35000);
  });
});
