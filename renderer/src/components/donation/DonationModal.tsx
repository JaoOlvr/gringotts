import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Heart, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  Sparkles, 
  Coffee, 
  ShieldCheck, 
  Sliders
} from 'lucide-react';
import { generatePixPayload, PIX_KEY_DEFAULT } from '../../lib/pix';
import { useDonationStore } from '../../store/useDonationStore';

interface DonationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const PRESET_AMOUNTS = [
  { label: 'Qualquer Valor', value: undefined, icon: '🪙' },
  { label: 'R$ 5', value: 5, icon: '☕' },
  { label: 'R$ 15', value: 15, icon: '🍕' },
  { label: 'R$ 30', value: 30, icon: '🚀' },
];

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const storeIsOpen = useDonationStore((state) => state.isOpen);
  const storeClose = useDonationStore((state) => state.closeDonationModal);
  const promptMode = useDonationStore((state) => state.promptMode);
  const setPromptMode = useDonationStore((state) => state.setPromptMode);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const handleClose = propOnClose || storeClose;

  const [selectedAmount, setSelectedAmount] = useState<number | undefined>(undefined);
  const [copiedType, setCopiedType] = useState<'key' | 'payload' | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Gera o código Pix Copia e Cola conforme o valor selecionado
  const pixPayload = useMemo(() => {
    return generatePixPayload({
      key: PIX_KEY_DEFAULT,
      amount: selectedAmount,
      name: 'Joao Oliveira',
      city: 'BRASIL',
    });
  }, [selectedAmount]);

  const handleCopy = (text: string, type: 'key' | 'payload') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700/80 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho com Gradiente */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-amber-500/10 via-primary-500/5 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-amber-950 shadow-md shadow-amber-500/25">
              <Heart className="w-6 h-6 fill-amber-950" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Apoie o Gringotts 🪙
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                100% gratuito, offline-first e sem anúncios
              </p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-center">
            Se o Gringotts está te ajudando a economizar e organizar suas finanças, considere apoiar o desenvolvimento com qualquer valor via Pix!
          </p>

          {/* Seletor de Valores Pré-definidos */}
          <div className="flex items-center justify-center gap-2">
            {PRESET_AMOUNTS.map((item) => (
              <button
                key={item.label}
                onClick={() => setSelectedAmount(item.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  selectedAmount === item.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                    : 'border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-750">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-100">
              <QRCodeSVG 
                value={pixPayload} 
                size={168} 
                level="M" 
                includeMargin={false}
              />
            </div>
            <span className="text-[11px] text-gray-400 mt-2.5 flex items-center gap-1.5 font-medium">
              <QrCode className="w-3.5 h-3.5 text-amber-500" />
              Abra o app do seu banco e escaneie o código acima
            </span>
          </div>

          {/* Chave Pix e Copia e Cola */}
          <div className="space-y-2.5">
            {/* Box Chave Pix */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-750">
              <div className="min-w-0 mr-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Chave Pix (E-mail)
                </span>
                <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200 truncate block select-all">
                  {PIX_KEY_DEFAULT}
                </span>
              </div>
              <button
                onClick={() => handleCopy(PIX_KEY_DEFAULT, 'key')}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  copiedType === 'key'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {copiedType === 'key' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </button>
            </div>

            {/* Botão Copia e Cola completo */}
            <button
              onClick={() => handleCopy(pixPayload, 'payload')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-colors ${
                copiedType === 'payload'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
              }`}
            >
              {copiedType === 'payload' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Código Pix Copia e Cola copiado para a área de transferência!</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-amber-500" />
                  <span>Copiar Código Pix Copia e Cola</span>
                </>
              )}
            </button>
          </div>

          {/* Configuração de Frequência / Como exibir (os dois jeitos) */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 flex items-center gap-1 mx-auto transition-colors"
            >
              <Sliders className="w-3 h-3" />
              <span>{showConfig ? 'Ocultar preferências de exibição' : 'Configurar quando este aviso aparece'}</span>
            </button>

            {showConfig && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                <span className="block font-semibold text-gray-700 dark:text-gray-300 text-[11px]">
                  Como você prefere que este aviso apareça?
                </span>

                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  <input
                    type="radio"
                    name="donationPromptMode"
                    value="smart"
                    checked={promptMode === 'smart'}
                    onChange={() => setPromptMode('smart')}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <span><strong>Gatilho Inteligente:</strong> Exibir esporadicamente (a cada poucas inicializações)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  <input
                    type="radio"
                    name="donationPromptMode"
                    value="startup"
                    checked={promptMode === 'startup'}
                    onChange={() => setPromptMode('startup')}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <span><strong>Ao abrir o app:</strong> Lembrar sempre na inicialização</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  <input
                    type="radio"
                    name="donationPromptMode"
                    value="never"
                    checked={promptMode === 'never'}
                    onChange={() => setPromptMode('never')}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <span><strong>Não exibir automaticamente:</strong> Apenas quando eu clicar na barra lateral</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com botão Fechar */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={promptMode === 'never'}
              onChange={(e) => setPromptMode(e.target.checked ? 'never' : 'smart')}
              className="rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Não exibir novamente ao iniciar</span>
          </label>

          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
