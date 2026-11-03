# Changelog - Gringotts

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
