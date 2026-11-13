# Gringotts 🪙 — Controle Financeiro Pessoal Desktop

> Aplicativo desktop moderno, rápido, offline-first e seguro para controle financeiro pessoal, inspirado no Denaro.

---

## 🚀 Sobre o Projeto

O **Gringotts** foi construído do zero com foco em simplicidade, velocidade e privacidade total dos dados do usuário. Todas as informações financeiras são armazenadas localmente em SQLite e nunca saem do computador do usuário.

- **Offline-First:** Sem necessidade de nuvem obrigatória ou dependência de servidores externos.
- **Rápido:** Lançamento de despesas e receitas em menos de 5 segundos via atalho global (`Ctrl+N` / `Cmd+N`).
- **Valores Monetários Precisos:** Todos os valores são calculados em inteiros (centavos), eliminando erros de arredondamento de ponto flutuante.
- **Segurança Rigorosa:** Arquitetura com `contextIsolation`, `sandbox`, `nodeIntegration: false` e comunicação IPC estritamente validada via Zod.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Shell Desktop** | Electron (Processo Main isolado) + TypeScript |
| **Interface / Renderer** | React 19 + Vite + Tailwind CSS + Lucide Icons |
| **Banco de Dados Local** | SQLite via `better-sqlite3` + Drizzle ORM |
| **Estado Global & Cache** | Zustand + TanStack React Query |
| **Gráficos Financeiros** | Recharts (gráficos de rosca e barras responsivos) |
| **Formulários & Validação** | React Hook Form + Zod |
| **Testes** | Vitest (Regras e Domínio) + Playwright (E2E) |
| **Empacotamento** | electron-builder (Linux AppImage/deb, Windows NSIS, macOS DMG) |

---

## 🏛️ Arquitetura em Camadas

```
gringotts/
├── src/
│   ├── main/                 # Processo Principal do Electron
│   │   ├── index.ts          # Ciclo de vida da janela, atalhos globais
│   │   ├── ipc/              # Canais IPC e handlers tipados com Zod
│   │   ├── repositories/     # Camada de acesso ao SQLite com Drizzle
│   │   └── services/         # Banco de dados, migrations, backups e seed
│   ├── preload/              # Script de ponte segura (contextBridge)
│   └── domain/               # Entidades de negócio puras
├── renderer/                 # Interface React + Vite
│   ├── src/
│   │   ├── components/       # Componentes acessíveis e reutilizáveis
│   │   ├── pages/            # Dashboard, Lançamentos, Contas, Categorias, Onboarding
│   │   ├── store/            # Stores globais Zustand
│   │   └── lib/              # Utilitários de formatação, IPC e atalhos
├── tests/                    # Suíte de testes unitários e E2E
└── package.json              # Configuração geral e electron-builder
```

---

## 📊 Modelo de Dados (ERD)

- **accounts:** `id`, `name`, `type` (checking, savings, credit_card, cash, investment, loan), `balance_cents`, `currency`, `color`, `icon`, `is_active`, `created_at`, `updated_at`
- **categories:** `id`, `name`, `group`, `icon`, `color`, `type` (INCOME, EXPENSE), `parent_id`, `created_at`
- **transactions:** `id`, `amount_cents`, `date`, `description`, `account_id`, `category_id`, `type`, `status` (PENDING, PAID, RECONCILED), `tags`, `attachment_path`, `recurrence_id`, `created_at`
- **budgets:** `id`, `category_id`, `amount_cents`, `month`, `year`, `created_at`
- **goals:** `id`, `name`, `target_amount_cents`, `current_amount_cents`, `deadline`, `color`, `created_at`

---

## 💻 Instruções de Instalação e Execução

### Pré-requisitos
- Node.js >= 20.x
- npm >= 9.x

### 1. Instalar dependências
```bash
npm install
npm --prefix renderer install
```

### 2. Modo de Desenvolvimento
Inicia o Vite dev server com Live Reload e a janela do Electron:
```bash
npm run dev
```

### 3. Rodar Testes
```bash
# Testes Unitários de Regras Financeiras (Vitest)
npm run test:unit

# Testes End-to-End (Playwright)
npm run test:e2e
```

### 4. Compilar e Gerar Instaladores
```bash
# Compilar projeto
npm run build

# Gerar pacote executável
npm run pack

# Gerar instaladores finais (.AppImage, .deb, .exe, .dmg)
npm run dist
```

---

## 🎯 Atalhos de Teclado
- **`Ctrl+N` / `Cmd+N`**: Abrir modal de lançamento rápido de qualquer lugar
- **`Enter`**: Salvar formulário ativo
- **`Esc`**: Fechar modal ativo

---

## 🗺️ Roadmap Futuro

- [x] **Open Finance Brasil:** Importação e conciliação de extratos bancários via OFX (SGML/XML de todos os bancos brasileiros) e Open Finance JSON, 100% local e privado, com categorização inteligente por palavras-chave e detecção automática de duplicidades.
- [x] **Leitura de Notas Fiscais e Comprovantes:** OCR local offline para preenchimento de lançamentos via fotos e imagens de cupons fiscais (NFC-e/SAT), comprovantes Pix e recibos de cartão.
- [x] **Planejador de Dívidas:** Métodos Bola de Neve (*Snowball*) e Avalanche com simulação interativa de quitação acelerada, cálculo de aportes extras e projeção de economia de juros.
- [x] **Modo Calma:** Visão semanal minimalista sem sobrecarga de números, com ritmo qualitativo da semana, contador de dias de paz financeira e modo zen (ocultar cifras).
- [ ] **Sincronização P2P:** Sincronização ponta-a-ponta entre dispositivos sem armazenamento em nuvem externa.
# gringotts
