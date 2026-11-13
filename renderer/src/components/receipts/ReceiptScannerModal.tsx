import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  Loader2,
  DollarSign,
  Calendar,
  Tag,
  Landmark,
  Eye,
  Check,
  Receipt
} from 'lucide-react';
import { api } from '../../lib/ipc';
import { formatCurrency, cn } from '../../lib/utils';
import { useReceiptScannerStore } from '../../store/useReceiptScannerStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { Account, Category, ParsedReceipt } from '../../types';

export const ReceiptScannerModal: React.FC = () => {
  const isOpen = useReceiptScannerStore((s) => s.isOpen);
  const closeModal = useReceiptScannerStore((s) => s.closeModal);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'upload' | 'scanning' | 'review' | 'success'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Campos editáveis do formulário de lançamento
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]!);
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Busca contas e categorias
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

  // Define conta padrão
  useEffect(() => {
    if (isOpen && accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isActive && a.type === 'checking') || accounts[0];
      if (def) setSelectedAccountId(def.id);
    }
  }, [isOpen, accounts, selectedAccountId]);

  const handleClose = () => {
    setStep('upload');
    setImagePreview(null);
    setParsedResult(null);
    setError(null);
    setShowRawText(false);
    closeModal();
  };

  const processImage = async (base64OrPath: string) => {
    setImagePreview(base64OrPath);
    setStep('scanning');
    setError(null);

    try {
      const result = await api.receipt.scanReceipt(base64OrPath);
      setParsedResult(result);

      // Preenche os campos do formulário com o que o OCR encontrou
      if (result.amountCents && result.amountCents > 0) {
        setAmountStr((result.amountCents / 100).toFixed(2).replace('.', ','));
      } else {
        setAmountStr('');
      }

      if (result.date) {
        setDateStr(result.date);
      } else {
        setDateStr(new Date().toISOString().split('T')[0]!);
      }

      setDescription(result.merchantName || 'Despesa com comprovante');

      if (result.suggestedCategoryId) {
        setSelectedCategoryId(result.suggestedCategoryId);
      } else {
        // Categoria padrão de compras ou alimentação
        const defaultCat = categories.find((c) => c.type === 'EXPENSE');
        if (defaultCat) setSelectedCategoryId(defaultCat.id);
      }

      setStep('review');
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar o comprovante com OCR.');
      setStep('upload');
    }
  };

  const handlePickNativeFile = async () => {
    try {
      const res = await api.receipt.selectFile();
      if (!res.canceled && res.fileBase64) {
        await processImage(res.fileBase64);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao selecionar imagem.');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        await processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]!;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        await processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTransaction = async () => {
    const cleanAmount = amountStr.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    const amountCents = Math.round(parseFloat(cleanAmount) * 100);

    if (!amountCents || amountCents <= 0) {
      setError('Informe um valor válido para o lançamento.');
      return;
    }

    if (!selectedAccountId) {
      setError('Selecione uma conta bancária de destino.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await api.transactions.create({
        accountId: selectedAccountId,
        categoryId: selectedCategoryId || undefined,
        amountCents,
        date: new Date(`${dateStr}T12:00:00.000Z`),
        description: description.trim() || 'Despesa com nota fiscal',
        type: 'EXPENSE',
        status: 'PAID',
        tags: ['OCR_COMPROVANTE', parsedResult?.documentType || 'RECIBO'],
      });

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className={cn(
          "w-full bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 flex flex-col overflow-hidden transition-all duration-200",
          step === 'review' ? 'max-w-4xl max-h-[90vh]' : 'max-w-xl max-h-[85vh]'
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Leitor de Notas & Comprovantes
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> OCR 100% Offline
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Extração inteligente de valor, data e estabelecimento direto de fotos e PDFs
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: Upload / Seleção de Imagem */}
        {step === 'upload' && (
          <div className="p-6 space-y-5 overflow-y-auto">
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
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                id="receipt-file-input"
              />

              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 shadow-xs">
                <Camera className="w-8 h-8" />
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Arraste a foto da nota ou comprovante aqui
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                Suporta cupons fiscais (NFC-e / SAT), comprovantes de Pix, TED e maquininha de cartão (PNG, JPG, WEBP).
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-xs transition duration-150 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Selecionar Foto no Computador
                </button>
              </div>
            </div>

            {/* Dica de Uso */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Como funciona a extração local?</p>
                <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  O Gringotts utiliza redes neurais ópticas (OCR Tesseract) executadas <strong>diretamente no seu processador</strong>. O texto da nota é analisado localmente para identificar o valor total, a data da compra e o estabelecimento sem que sua foto jamais seja enviada para a internet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Processando OCR */}
        {step === 'scanning' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/10">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Processando imagem com OCR offline...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lendo texto, identificando valores e categorizando despesa...
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Revisão & Prévia Lado a Lado */}
        {step === 'review' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto max-h-[65vh]">
              {/* Lado Esquerdo: Imagem do Comprovante */}
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Foto do Comprovante</span>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Trocar imagem
                  </button>
                </span>

                <div className="flex-1 min-h-[300px] max-h-[420px] rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center p-2 relative group">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Comprovante"
                      className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Sem prévia</span>
                  )}
                </div>

                {parsedResult?.rawText && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
                    >
                      {showRawText ? 'Ocultar texto lido pelo OCR' : 'Ver texto bruto extraído'}
                    </button>
                    {showRawText && (
                      <pre className="mt-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {parsedResult.rawText}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Lado Direito: Dados Extraídos & Formulário */}
              <div className="space-y-4">
                {/* Badges de Confiança e Tipo */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                    {parsedResult?.documentType === 'NFCE_SAT'
                      ? 'Cupom Fiscal (NFC-e/SAT)'
                      : parsedResult?.documentType === 'PIX_RECEIPT'
                      ? 'Comprovante Pix'
                      : parsedResult?.documentType === 'CARD_SLIP'
                      ? 'Comprovante de Cartão'
                      : 'Comprovante'}
                  </span>

                  {parsedResult && parsedResult.confidence > 0 && (
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Precisão estimada: {parsedResult.confidence}%
                    </span>
                  )}
                </div>

                {/* Valor Extraído (Destaque) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Valor Pago (R$) *
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      autoFocus
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full text-lg font-bold font-mono text-rose-600 dark:text-rose-400 py-2.5 pl-3"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Data e Conta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Data da Despesa *
                    </label>
                    <Input
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Conta Debitada *
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balanceCents)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estabelecimento / Descrição */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Estabelecimento / Descrição *
                  </label>
                  <Input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Supermercado Carrefour"
                    className="w-full text-xs"
                  />
                  {parsedResult?.cnpj && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      CNPJ identificado: {parsedResult.cnpj}
                    </span>
                  )}
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Categoria do Lançamento
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'INCOME' ? 'Receita' : 'Despesa'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer com Ações */}
            <div className="p-4 px-6 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Trocar Imagem
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 transition"
                >
                  Cancelar
                </button>

                <Button
                  onClick={handleSaveTransaction}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-xs font-bold gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar Lançamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Sucesso */}
        {step === 'success' && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Lançamento Registrado!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                A despesa extraída da sua nota fiscal foi salva com sucesso e o saldo da conta foi atualizado.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Escanear Outro Comprovante
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-500/20 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

