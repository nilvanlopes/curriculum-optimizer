import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para testar o template HTML
 */
async function testTemplate() {
    const templatePath = path.join(__dirname, 'base-curriculum.html');
    const metadataPath = path.join(__dirname, 'metadata.json');
    
    console.log('🔍 Testando template HTML...\n');
    
    // Verifica se os arquivos existem
    if (!fs.existsSync(templatePath)) {
        console.error('❌ Template HTML não encontrado:', templatePath);
        process.exit(1);
    }
    
    if (!fs.existsSync(metadataPath)) {
        console.error('❌ Metadata JSON não encontrado:', metadataPath);
        process.exit(1);
    }
    
    // Lê os arquivos
    const html = fs.readFileSync(templatePath, 'utf-8');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    
    console.log('✓ Arquivos encontrados\n');
    
    // Testa estrutura HTML
    const tests = [
        {
            name: 'Header com dados pessoais',
            test: () => html.includes('Douglas Fantoni') && html.includes('dfantoni2@gmail.com')
        },
        {
            name: 'Seção de experiências',
            test: () => html.includes('class="experience-item"') && html.includes('data-company="ilegra"')
        },
        {
            name: 'Atributos data-keywords',
            test: () => html.includes('data-keywords=')
        },
        {
            name: 'Métricas destacadas',
            test: () => html.includes('class="metric"') && html.includes('+50%')
        },
        {
            name: 'Tags de tecnologia',
            test: () => html.includes('class="tech-tag"') && html.includes('React')
        },
        {
            name: 'Skills categorizadas',
            test: () => html.includes('class="skill-category"') && html.includes('data-category="frontend"')
        },
        {
            name: 'Classes de template',
            test: () => html.includes('template-tech-lead') && html.includes('data-template=')
        },
        {
            name: 'Metadata válido',
            test: () => metadata.companies.length > 0 && metadata.templates['tech-lead']
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(({ name, test }) => {
        try {
            if (test()) {
                console.log('✓', name);
                passed++;
            } else {
                console.log('✗', name);
                failed++;
            }
        } catch (error) {
            console.log('✗', name, '(erro)', error);
            failed++;
        }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`Resultado: ${passed} testes passaram, ${failed} falharam`);
    console.log('='.repeat(50));
    
    if (failed === 0) {
        console.log('\n✅ Template está pronto para uso!\n');
    } else {
        console.log('\n⚠️  Alguns testes falharam. Revise o template.\n');
        process.exit(1);
    }
}

testTemplate();