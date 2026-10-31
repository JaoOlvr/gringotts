# Changelog - Gringotts

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
