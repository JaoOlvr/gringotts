# Changelog - Gringotts

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.4.0] - 2026-11-13

### 🚀 Grandes Novas Funcionalidades

- **Conexão com Extratos Bancários & Open Finance Brasil (100% Offline & Local)**:
  - Suporte completo a extratos bancários nos formatos **OFX 1.x (SGML)** e **OFX 2.x (XML)** de todos os bancos brasileiros (*Nubank, Banco Inter, Itaú, Bradesco, Banco do Brasil, Santander, C6 Bank, Caixa, PicPay, etc.*).
  - Suporte ao formato padrão **JSON do Open Finance Brasil** e exportações de agregadores de dados bancários abertos.
  - Extração automatizada de código de compensação bancária (COMPE), número de conta, moeda e saldo informado.
  - **Categorização Inteligente por Palavras-Chave**: Mecanismo inteligente que reconhece estabelecimentos do dia a dia brasileiro (*iFood, Uber, 99, Drogasil, Carrefour, Atacadão, Enel, Sabesp, Netflix, Salário, etc.*) e pré-associa à categoria correspondente do usuário.
  - **Detecção Automática de Duplicidades**: Verificação dupla por identificador bancário (`FITID`) e por paridade de Data + Valor com alertas visuais para evitar lançamentos repetidos.
  - Modal interativo de revisão em lote (`OpenFinanceImportModal`) com estatísticas de receitas e despesas, filtro de duplicadas e seleção flexível.
  - Acessos rápidos no menu lateral, na tela de Lançamentos e nos cards individuais de cada conta.

- **Planejador de Dívidas (*Snowball* & *Avalanche*)**:
  - Módulo completo de gestão e plano de ataque para quitação acelerada de compromissos financeiros (empréstimos, financiamentos, faturas, cheque especial).
  - **Método Bola de Neve (*Snowball*)**: Priorização das dívidas de menor saldo devedor primeiro para vitórias rápidas e liberação de fluxo de caixa.
  - **Método Avalanche**: Priorização das dívidas com maiores taxas de juros primeiro para maximizar a economia financeira total.
  - **Efeito Rollover (*Snowball Effect*)**: Conforme uma dívida é liquidada, o valor de sua parcela é automaticamente transferido para potencializar a amortização da próxima dívida da fila.
  - **Simulador Interativo de Aportes Extras**: Slider e botões rápidos (+R$ 100, +R$ 250, +R$ 500, +R$ 1.000) calculando em tempo real o adiantamento da data de liberdade financeira (*Debt-Free Date*) e a economia projetada de juros.
  - Comparativo direto entre as estratégias e seção comemorativa de dívidas 100% quitadas.
  - Nova tela dedicada `/debts` com link direto no menu lateral (`Sidebar`).

- **Leitura de Notas Fiscais e Comprovantes (OCR 100% Local & Privado)**:
  - Extração óptica inteligente utilizando redes neurais locais do Tesseract embarcadas diretamente no app (`resources/tessdata`), sem qualquer envio de fotos ou dados para APIs na nuvem.
  - Reconhecimento especializado para documentos fiscais e bancários brasileiros:
    - Cupons Fiscais Eletrônicos (**NFC-e / SAT / Danfe**): Extração de Razão Social/Fantasia, CNPJ, data de emissão e valor total líquido.
    - Comprovantes de Transferência **Pix e TED**: Extração de valor, data/hora e nome do favorecido/destinatário.
    - Comprovantes de maquininhas de cartão (**Cielo, Rede, Stone, PagBank, Getnet**): Identificação do estabelecimento, modalidade (débito/crédito) e valor.
  - Modal com pré-visualização lado a lado (`ReceiptScannerModal`), permitindo conferir a foto e os campos lidos antes de salvar a transação com um único clique.
  - Atalhos no menu lateral e botão *"Escanear Nota"* na tela de lançamentos.

### 🧪 Testes e Qualidade
- Expansão da suíte de testes com 25 novos testes cobrindo parsers OFX/Open Finance, algoritmos de dívidas e OCR, totalizando **89 testes automatizados com 100% de aprovação**.

---

## [1.3.1] - 2026-11-10

### 🧪 Testes e Atualização Contínua
- **Release de Teste de Atualização (Auto-Update Validation)**:
  - Validação da esteira de CI/CD multiplataforma e publicação de artefatos com `latest*.yml`.
  - Verificação de notificação automática de atualização para usuários na versão `v1.3.0`.
  - Teste de download in-app com barra de progresso e reinício assistido.

---

## [1.3.0] - 2026-11-05

### 🚀 Novas Funcionalidades
- **Modo Calma (Visão Semanal Minimalista sem Sobrecarga de Números)**:
  - Foco na semana corrente (Segunda a Domingo) com destaque para o dia de hoje.
  - Indicador sereno do ritmo de gastos semanais (*Semana Ultratranquila*, *Fluxo em Harmonia*, *Ritmo Confortável*, *Semana Mais Movimentada*).
  - Contador de *Dias de Paz Financeira* (dias sem nenhuma despesa registrada na semana).
  - *Modo Zen (Cifras Ocultas)* com alternância rápida (`●●●`) para reduzir a ansiedade financeira e sobrecarga cognitiva (preferência persistida no `localStorage`).
  - Lançamento rápido direto no dia escolhido da semana através de botão de atalho `+`.
  - Resumo sereno com balanço semanal e pílulas de pensamentos zen rotativos.
  - Suporte completo aos modos Claro e Escuro com contrastes equilibrados.
- **Sistema de Atualização Nativa em Segundo Plano (In-App Auto-Update)**:
  - **Linux (AppImage in-place):** Atualização direta no mesmo arquivo (`process.env.APPIMAGE`) com permissão automática (`chmod 755`) e reinicialização, sem necessidade de baixar um novo AppImage pelo navegador nem apagar o antigo manualmente.
  - **Windows (NSIS Installer):** Execução do instalador Setup e reinício automático do aplicativo.
  - **Download com Streaming e Barra de Progresso:** Acompanhamento em tempo real no modal (porcentagem, MBs baixados e velocidade de download) e botão pulsante na barra lateral (`Sidebar`) que indica quando a atualização estiver pronta para reiniciar com 1 clique.
  - Configuração oficial de publicação com `electron-builder` e upload de manifestos `latest*.yml` no GitHub Actions.

### 🧹 Limpeza e Usabilidade
- Remoção do banner de demonstração/seed da página inicial de primeiros passos (`OnboardingPage`).
- Correção de priorização de instaladores no Windows para evitar o download acidental da versão portátil.

### 🛡️ Confiabilidade e Testes
- Adição de 18 novos testes unitários cobrindo o Modo Calma e o serviço de auto-update (totalizando **64 testes automatizados** passando com 100% de sucesso).

---

## [1.2.0] - 2026-11-02

### 🚀 Novas Funcionalidades
- **Lançamentos Recorrentes e Parcelamento nos Meses**:
  - Capacidade de configurar receitas ou despesas que se repetem nos meses subsequentes.
  - Retenção automática do dia do mês cadastrado com ajuste inteligente para o último dia válido em meses mais curtos (ex: dia 31 ajusta para 28 de fevereiro e retorna para 31 em março).
  - Suporte a duas modalidades financeiras:
    - **Dividir em parcelas:** divide o valor total pelas parcelas sem perder nenhum centavo (`calculateInstallments`).
    - **Valor fixo mensal:** repete o mesmo valor informado a cada mês.
  - Seleção de 2 a 120 parcelas/meses com botões de atalho rápido (`2x`, `3x`, `4x`, `6x`, `10x`, `12x`, `24x`, `36x`) e resumo em tempo real do vencimento e período.
  - 1ª parcela criada como PAGA e parcelas futuras como PENDENTES, preservando o saldo atual da carteira.
- **Gestão Flexível de Carteiras e Saldo Inicial**:
  - Edição direta de carteiras e saldos iniciais a partir da tela de entrada ("Quem está acessando?").
  - Opção para escolher se a carteira deve ser somada ou isolada do consolidado no Dashboard.
  - Sincronização automática de conta selecionada no Dashboard e filtros na tabela de lançamentos.

### 🎨 Melhorias de Layout e Proporção para Windows
- **Dimensionamento Inteligente de Janela no Windows**:
  - Leitura do `workAreaSize` do monitor para garantir que a janela nunca ultrapasse a barra de tarefas do Windows (inclusive em resoluções 1366×768 ou 1080p com escala DPI de 125%/150%).
  - Ativação de `autoHideMenuBar: true` para ocultar a barra cinza nativa do Electron e maximizar a área útil vertical.
  - Inicialização maximizada inteligente para displays com altura $\le 800\text{px}$.
- **Correção de Proporções e Rolagem na Tela Inicial**:
  - Eliminação de transbordamento horizontal (`w-screen` substituído por `w-full`).
  - Habilitação de rolagem vertical suave (`overflow-y-auto`) no seletor de contas e na tela de primeiros passos (Onboarding).
  - Cards do seletor e do Dashboard readequados para visualização sem cortes.

### 🛡️ Confiabilidade e Testes
- Limpeza em cascata de transações órfãs ao deletar contas.
- Cobertura de 46 testes unitários automatizados cobrindo semver, regras financeiras, segurança e recorrência.

---

## [1.1.0] - 2026-10-30

### 🚀 Novas Funcionalidades
- **Acessibilidade Multiplataforma (Modo Claro & Escuro)**:
  - Seletor acessível na barra lateral com 3 modos: **Sistema**, **Claro** e **Escuro**.
  - Detecção dinâmica da preferência do sistema operacional (`nativeTheme` e `prefers-color-scheme`) em tempo real no Windows, macOS e Linux.
- **Sistema Inteligente de Notificação de Atualizações**:
  - Verificação automática e manual de releases no GitHub oficial (`JaoOlvr/gringotts`).
  - Reconhecimento automático do sistema operacional para download com 1 clique (`.exe` para Windows, `.dmg` para macOS e `.AppImage`/`.deb` para Linux).
  - Modal com exibição das notas de atualização (*release notes*).
- **Calculadora Financeira Integrada**:
  - Modal com atalho global (`Alt+C`), calculadora aritmética, simulação de juros compostos e divisão justa de contas em grupo.
- **Canal de Apoio ao Projeto (Doação Pix)**:
  - Modal com chave Pix aleatória oficial e geração instantânea de QR Code e código Copia e Cola.
- **Nova Identidade Visual Oficial**:
  - Logotipo oficial vetorial em SVG nativo de alto desempenho (moeda dourada estilizada, monograma G e brilho).

### 🛠️ Correções e Melhorias
- Correção no carregamento de imagens no ambiente Electron empacotado (`file://`).
- Otimização do tempo de inicialização e persistência de cofres offline.
- Cobertura completa de 34 testes unitários automatizados.

---

## [1.0.0] - 2026-10-13

### 🌟 Lançamento Inicial
- Arquitetura Offline-First com SQLite local (`better-sqlite3`).
- Gestão completa de contas, lançamentos, categorias, metas e orçamentos.
- Gráficos financeiros interativos e calendário financeiro.
- Proteção e tranca de cofres por senha ou PIN.
- Sistema de backup e restauração local.
