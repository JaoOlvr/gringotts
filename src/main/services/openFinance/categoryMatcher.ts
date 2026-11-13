export interface CategoryCandidate {
  id: string;
  name: string;
  type: string;
}

interface KeywordRule {
  keywords: string[];
  targetCategoryNames: string[];
  type?: 'INCOME' | 'EXPENSE';
}

const KEYWORD_RULES: KeywordRule[] = [
  // Alimentação & Restaurantes
  {
    keywords: [
      'ifood', 'ubereats', 'rappi', 'aiqfome', 'delivery',
      'restaurante', 'lanchonete', 'mcdonald', 'burger king', 'bk', 'subway',
      'habibs', 'choperia', 'bar', 'cafe', 'starbucks', 'pizzaria', 'pizza',
      'sorveteria', 'sorvete', 'sushi', 'churrascaria', 'pastelaria', 'padaria',
      'panificadora', 'bistro', 'acai', 'doceria'
    ],
    targetCategoryNames: ['Restaurantes e Delivery', 'Alimentação', 'Restaurante'],
    type: 'EXPENSE',
  },
  // Supermercado & Feira
  {
    keywords: [
      'supermercado', 'mercado', 'hipermercado', 'atacadão', 'atacadao', 'assai',
      'carrefour', 'pao de acucar', 'extra', 'hortifruti', 'sacolao', 'acougue',
      'muffato', 'zaffari', 'nagumo', 'guanabara', 'mercadinho', 'emporio', 'dia %'
    ],
    targetCategoryNames: ['Supermercado e Feira', 'Alimentação', 'Supermercado'],
    type: 'EXPENSE',
  },
  // Transporte & Mobilidade
  {
    keywords: [
      'uber', '99app', '99 *', '99 tecnologia', 'cabify', 'indrive', 'taxi',
      'posto', 'gasolina', 'combustivel', 'ipiranga', 'shell', 'vibra', 'petrobras',
      'auto posto', 'estacionamento', 'sem parar', 'veloe', 'conectcar', 'pedagio',
      'metro', 'cptm', 'onibus', 'bilhete unico', 'passagem aerea', 'gol linhas',
      'latam', 'azul linhas'
    ],
    targetCategoryNames: ['Transporte & Combustível', 'Transporte', 'Mobilidade'],
    type: 'EXPENSE',
  },
  // Moradia, Contas e Utilidades
  {
    keywords: [
      'aluguel', 'condominio', 'iptu', 'enel', 'cpfl', 'cemig', 'copel', 'light',
      'energisa', 'elektro', 'energia eletrica', 'sabesp', 'sanepar', 'copasa',
      'embasa', 'corsan', 'comgas', 'ultragaz', 'supergasbras', 'nacional gas',
      'claro', 'vivo', 'tim', 'oi telecom', 'internet residencial', 'fibra'
    ],
    targetCategoryNames: ['Aluguel & Contas da Casa', 'Moradia / Aluguel', 'Moradia', 'Habitação'],
    type: 'EXPENSE',
  },
  // Saúde & Farmácia
  {
    keywords: [
      'farmacia', 'drogaria', 'drogasil', 'droga raia', 'pague menos', 'panvel',
      'drogaria sao paulo', 'drogaria araujo', 'ultrafarma', 'medicamento', 'droga',
      'hospital', 'clinica', 'laboratorio', 'fleury', 'dasa', 'lavoisier', 'consulta',
      'medico', 'dentista', 'odonto', 'unimed', 'amil', 'bradesco saude', 'sulamerica',
      'hapvida', 'notredame', 'otica'
    ],
    targetCategoryNames: ['Saúde e Farmácia', 'Saúde', 'Saude'],
    type: 'EXPENSE',
  },
  // Assinaturas & Lazer
  {
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'disney+', 'hbo',
      'max.com', 'youtube premium', 'deezer', 'apple.com/bill', 'google play', 'steam',
      'playstation', 'psn', 'xbox', 'game pass', 'nintendo', 'cinema', 'cinemark',
      'cinepolis', 'ingresso.com', 'sympla', 'show', 'teatro'
    ],
    targetCategoryNames: ['Lazer e Streaming', 'Lazer e Entretenimento', 'Assinaturas e Serviços', 'Lazer'],
    type: 'EXPENSE',
  },
  // Compras & E-commerce
  {
    keywords: [
      'amazon', 'mercado livre', 'mercadolivre', 'shopee', 'shein', 'aliexpress',
      'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'fast shop',
      'zara', 'renner', 'c&a', 'riachuelo', 'centauro', 'netshoes', 'nike', 'adidas',
      'leroy merlin', 'kalunga', 'decathlon'
    ],
    targetCategoryNames: ['Compras e Vestuário', 'Compras', 'Vestuário'],
    type: 'EXPENSE',
  },
  // Educação
  {
    keywords: [
      'faculdade', 'universidade', 'colegio', 'escola', 'curso', 'udemy', 'alura',
      'coursera', 'duolingo', 'ingles', 'idiomas', 'livraria', 'leitura', 'saraiva',
      'livro', 'mensalidade escolar'
    ],
    targetCategoryNames: ['Educação', 'Educacao', 'Cursos'],
    type: 'EXPENSE',
  },
  // Receitas - Salário
  {
    keywords: [
      'salario', 'remuneracao', 'folha de pagto', 'folha de pagamento', 'holerite',
      'pro-labore', 'pro labore', 'adiantamento salarial', 'salário'
    ],
    targetCategoryNames: ['Salário & Remuneração', 'Salário e Pró-labore', 'Salário', 'Salario'],
    type: 'INCOME',
  },
  // Receitas - Investimentos
  {
    keywords: [
      'rendimento', 'dividendos', 'juros s/ capital', 'jcp', 'cdi', 'tesouro direto',
      'resgate cdb', 'resgate fundo', 'rendimentos cdb', 'nuinvest', 'b3'
    ],
    targetCategoryNames: ['Rendimentos e Dividendos', 'Investimentos e Dividendos', 'Investimentos', 'Rendimentos'],
    type: 'INCOME',
  },
  // Receitas - Freelance & Extras
  {
    keywords: [
      'freelance', 'freela', 'honorarios', 'servico prestado', 'consultoria'
    ],
    targetCategoryNames: ['Freelance e Renda Extra', 'Renda Extra', 'Outras Receitas'],
    type: 'INCOME',
  },
];

/**
 * Remove acentuação e transforma para minúsculas
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Tenta encontrar a categoria mais apropriada para uma transação com base na sua descrição
 */
export function matchCategory(
  description: string,
  transactionType: 'INCOME' | 'EXPENSE',
  availableCategories: CategoryCandidate[]
): { categoryId?: string; categoryName?: string } {
  if (!description || !availableCategories || availableCategories.length === 0) {
    return {};
  }

  const normalizedDesc = normalizeText(description);

  // Filtra categorias pelo tipo compatível ou todas caso não haja tipo
  const typeFilteredCategories = availableCategories.filter(
    (c) => !c.type || c.type === transactionType
  );

  const pool = typeFilteredCategories.length > 0 ? typeFilteredCategories : availableCategories;

  // 1. Tentar encontrar por regras de palavras-chave
  for (const rule of KEYWORD_RULES) {
    if (rule.type && rule.type !== transactionType) {
      continue;
    }

    const hasKeyword = rule.keywords.some((kw) => {
      const normalizedKw = normalizeText(kw);
      return normalizedDesc.includes(normalizedKw);
    });

    if (hasKeyword) {
      for (const targetName of rule.targetCategoryNames) {
        const normalizedTarget = normalizeText(targetName);
        const match = pool.find((cat) => {
          const catNorm = normalizeText(cat.name);
          return catNorm === normalizedTarget || catNorm.includes(normalizedTarget) || normalizedTarget.includes(catNorm);
        });

        if (match) {
          return { categoryId: match.id, categoryName: match.name };
        }
      }
    }
  }

  // 2. Tentar match direto: o nome da categoria está contido na descrição da transação
  for (const cat of pool) {
    const catNorm = normalizeText(cat.name);
    // Ignora nomes muito genéricos e curtos para evitar falsos positivos
    if (catNorm.length >= 4 && normalizedDesc.includes(catNorm)) {
      return { categoryId: cat.id, categoryName: cat.name };
    }
  }

  return {};
}

