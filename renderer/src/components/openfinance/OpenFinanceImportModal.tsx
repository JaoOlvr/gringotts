import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Landmark, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  Loader2,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  TrendingDown,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/ipc';
import { formatCurrency, cn } from '../../lib/utils';
import { useOpenFinanceStore } from '../../store/useOpenFinanceStore';
import type { 
  Account, 
  Category, 
  ParsedStatement, 
  ParsedStatementTransaction 
} from '../../types';

const BRAZILIAN_BANKS_PRESETS = [
  { name: 'Nubank', color: '#8a05be' },
  { name: 'Banco Inter', color: '#ff7a00' },
  { name: 'Itaú', color: '#ec7000' },
  { name: 'Bradesco', color: '#cc092f' },
  { name: 'Banco do Brasil', color: '#f8d210' },
  { name: 'Santander', color: '#ec0000' },
  { name: 'C6 Bank', color: '#242424' },
  { name: 'Caixa', color: '#0066b3' },
  { name: 'PicPay', color: '#21c25e' },
];

export const OpenFinanceImportModal: React.FC = () => {
  const isOpen = useOpenFinanceStore((s) => s.isOpen);
  const targetAccountId = useOpenFinanceStore((s) => s.targetAccountId);
  const closeModal = useOpenFinanceStore((s) => s.closeModal);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [transactions, setTransactions] = useState<ParsedStatementTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{ count: number; accountName: string } | null>(null);
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Queries para contas e categorias
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.getAll(),
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
    enabled: isOpen,
  });

  // Define conta inicial quando abrir modal
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      if (targetAccountId && accounts.some((a) => a.id === targetAccountId)) {
        setSelectedAccountId(targetAccountId);
      } else {
        const defaultAcc = accounts.find((a) => a.isActive && a.type === 'checking') || accounts[0];
        if (defaultAcc) {
          setSelectedAccountId(defaultAcc.id);
        }
      }
    }
  }, [isOpen, targetAccountId, accounts]);

  // Reset do estado ao fechar
  const handleClose = () => {
    setStep('upload');
    setStatement(null);
    setTransactions([]);
    setParseError(null);
    setFileName('');
    setImportSummary(null);
    closeModal();
  };

  // Processa o conteúdo do arquivo
  const processFileContent = async (content: string, name: string) => {
    setIsParsing(true);
    setParseError(null);
    try {
      setFileName(name);
      const parsed = await api.openFinance.parseStatement(content, name, selectedAccountId || undefined);
      setStatement(parsed);
      setTransactions(parsed.transactions);
      setStep('review');
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao analisar o arquivo de extrato.');
    } finally {
      setIsParsing(false);
    }
  };

  // Seletor nativo de arquivo
  const handlePickNativeFile = async () => {
    try {
      const res = await api.openFinance.selectFile();
      if (!res.canceled && res.fileContent && res.fileName) {
        await processFileContent(res.fileContent, res.fileName);
      }
    } catch (err: any) {
      setParseError(err?.message || 'Erro ao selecionar o arquivo.');
    }
  };

  // Leitura de arquivo via Drag & Drop ou Input file nativo
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      const text = await file.text();
      await processFileContent(text, file.name);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]!;
      const text = await file.text();
      await processFileContent(text, file.name);
    }
  };

  // Alterna seleção de uma transação
  const handleToggleSelect = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  // Alterna selecionar todos
  const handleToggleSelectAll = (select: boolean) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (hideDuplicates && t.isDuplicate) return t;
        return { ...t, selected: select };
      })
    );
  };

  // Atualiza categoria de uma transação
  const handleChangeCategory = (transactionId: string, categoryId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              suggestedCategoryId: categoryId || undefined,
              suggestedCategoryName: categories.find((c) => c.id === categoryId)?.name,
            }
          : t
      )
    );
  };

  // Transações filtradas para visualização
  const visibleTransactions = useMemo(() => {
    if (hideDuplicates) {
      return transactions.filter((t) => !t.isDuplicate);
    }
    return transactions;
  }, [transactions, hideDuplicates]);

  // Contadores
  const selectedCount = transactions.filter((t) => t.selected).length;
  const duplicateCount = transactions.filter((t) => t.isDuplicate).length;

  const totalSelectedIncome = transactions
    .filter((t) => t.selected && t.type === 'INCOME')
    .reduce((acc, t) => acc + t.absAmountCents, 0);

  const totalSelectedExpense = transactions
    .filter((t) => t.selected && t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.absAmountCents, 0);

  // Executa a importação
  const handleConfirmImport = async () => {
    if (!selectedAccountId) {
      setParseError('Selecione uma conta bancária de destino.');
      return;
    }

    const itemsToImport = transactions.filter((t) => t.selected);
    if (itemsToImport.length === 0) {
      setParseError('Nenhuma transação selecionada para importação.');
      return;
    }

    setIsImporting(true);
    setParseError(null);

    try {
      const payload = {
        accountId: selectedAccountId,
        transactions: itemsToImport.map((t) => ({
          amountCents: t.absAmountCents,
          date: t.date,
          description: t.description,
          type: t.type,
          categoryId: t.suggestedCategoryId,
          fitid: t.fitid,
          status: 'PAID' as const,
        })),
      };

      const result = await api.openFinance.importTransactions(payload);

      // Invalida cache de consultas para atualizar saldos e tabelas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      const targetAcc = accounts.find((a) => a.id === selectedAccountId);
      setImportSummary({
        count: result.importedCount,
        accountName: targetAcc ? targetAcc.name : 'Conta selecionada',
      });
      setStep('success');
    } catch (err: any) {
      setParseError(err?.message || 'Erro ao salvar transações no banco de dados.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className={cn(
          "w-full max-w-4xl bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 flex flex-col overflow-hidden transition-all duration-200",
          step === 'review' ? 'max-h-[90vh]' : 'max-h-[85vh]'
        )}
      >
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Importar Extrato & Open Finance
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% Local & Privado
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Suporte nativo a extratos bancários OFX e Open Finance JSON
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro (se houver) */}
        {parseError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{parseError}</div>
            <button onClick={() => setParseError(null)} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: Upload / Seleção de Arquivo */}
        {step === 'upload' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Seletor de Conta de Destino */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Importar lançamentos para qual conta?
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 shadow-2xs"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — Saldo: {formatCurrency(acc.balanceCents)}
                  </option>
                ))}
              </select>
            </div>

            {/* Zona de Drop & Botão de Seleção */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative",
                isDragOver 
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20" 
                  : "border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 bg-gray-50/50 dark:bg-gray-800/30"
              )}
              onClick={handlePickNativeFile}
            >
              <input
                type="file"
                accept=".ofx,.qfx,.json"
                onChange={handleFileInputChange}
                className="hidden"
                id="statement-file-input"
              />

              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 shadow-xs">
                {isParsing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {isParsing ? 'Processando e categorizando extrato...' : 'Arraste seu extrato aqui ou clique para selecionar'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                Aceita arquivos <strong>.OFX</strong> (padrão de todos os bancos brasileiros) e <strong>.JSON</strong> do Open Finance.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isParsing}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-xs transition duration-150 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Selecionar Arquivo OFX / JSON
                </button>
              </div>
            </div>

            {/* Bancos Suportados */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
                Compatível com extratos de qualquer banco brasileiro
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {BRAZILIAN_BANKS_PRESETS.map((bank) => (
                  <div
                    key={bank.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 text-[11px] font-medium text-gray-700 dark:text-gray-300 shadow-2xs"
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: bank.color }}
                    />
                    {bank.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Dica de Segurança e Como Exportar */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Como exportar o extrato no seu banco?</p>
                <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  No app ou internet banking do seu banco (ex: Nubank, Inter, Itaú, Bradesco), acesse a tela de extrato, procure a opção <strong>"Exportar Extrato"</strong> ou <strong>"Salvar Extrato"</strong> e escolha a opção <strong>OFX</strong>. Seus dados nunca saem do seu computador.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Revisão & Prévia Inteligente */}
        {step === 'review' && statement && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Barra de Resumo do Extrato */}
            <div className="p-4 px-6 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-750 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-650 shadow-2xs">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Instituição</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{statement.bankName || 'Banco'}</span>
                </div>

                {statement.startDate && statement.endDate && (
                  <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-650 shadow-2xs">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Período</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {statement.startDate.split('-').reverse().join('/')} a {statement.endDate.split('-').reverse().join('/')}
                    </span>
                  </div>
                )}

                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-650 shadow-2xs">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Destino</span>
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    {accounts.find((a) => a.id === selectedAccountId)?.name || 'Conta'}
                  </span>
                </div>
              </div>

              {/* Estatísticas e Totais Selecionados */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{formatCurrency(totalSelectedIncome)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="w-4 h-4" />
                  <span>-{formatCurrency(totalSelectedExpense)}</span>
                </div>

                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  <strong>{selectedCount}</strong> de {transactions.length} selecionados
                </div>
              </div>
            </div>

            {/* Controles de Tabela */}
            <div className="px-6 py-2.5 bg-white dark:bg-gray-850 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(selectedCount < visibleTransactions.length)}
                  className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {selectedCount === visibleTransactions.length ? (
                    <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>{selectedCount === visibleTransactions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                </button>

                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setHideDuplicates(!hideDuplicates)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border",
                      hideDuplicates
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{duplicateCount} duplicadas detectadas ({hideDuplicates ? 'ocultas' : 'visíveis'})</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] text-gray-400">
                Categorias sugeridas automaticamente por inteligência de palavras-chave
              </span>
            </div>

            {/* Tabela de Transações */}
            <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[50vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 select-none z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-10"></th>
                    <th className="py-2.5 px-3 font-semibold w-24">Data</th>
                    <th className="py-2.5 px-3 font-semibold">Descrição do Banco</th>
                    <th className="py-2.5 px-3 font-semibold w-56">Categoria</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-32">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-200">
                  {visibleTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => handleToggleSelect(tx.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60",
                        tx.selected ? "bg-white dark:bg-gray-850" : "opacity-60 bg-gray-50/40 dark:bg-gray-900/40",
                        tx.isDuplicate && "bg-amber-50/30 dark:bg-amber-950/20"
                      )}
                    >
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={Boolean(tx.selected)}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer h-4 w-4"
                        />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {tx.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
                          {tx.description}
                        </div>
                        {tx.isDuplicate && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 font-medium">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{tx.duplicateReason || 'Possível lançamento duplicado'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={tx.suggestedCategoryId || ''}
                          onChange={(e) => handleChangeCategory(tx.id, e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type === 'INCOME' ? 'Receita' : 'Despesa'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            "font-bold font-mono text-xs",
                            tx.type === 'INCOME'
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.absAmountCents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer com Ações */}
            <div className="p-4 px-6 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Trocar Arquivo
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || selectedCount === 0}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition duration-150",
                    selectedCount > 0 && !isImporting
                      ? "bg-primary-600 hover:bg-primary-700 shadow-primary-500/20 cursor-pointer"
                      : "bg-gray-400 cursor-not-allowed opacity-60"
                  )}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Importar {selectedCount} {selectedCount === 1 ? 'Lançamento' : 'Lançamentos'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Sucesso */}
        {step === 'success' && importSummary && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Extrato Importado com Sucesso!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                Foram adicionados <strong>{importSummary.count} lançamentos</strong> à sua conta <strong>{importSummary.accountName}</strong>. Os saldos foram atualizados automaticamente.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-500/20 transition duration-150"
              >
                Concluir e Ver Lançamentos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
