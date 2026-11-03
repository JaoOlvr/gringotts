import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/ipc';
import { Landmark, Wallet, CreditCard, Sparkles, Check } from 'lucide-react';

interface StepOneProps {
  onNext: () => void;
}

const BANK_PRESETS = [
  { name: 'Nubank', type: 'checking', color: '#820ad1', bg: 'bg-purple-950/40 border-purple-600/40 text-purple-300' },
  { name: 'Banco Inter', type: 'checking', color: '#ff7a00', bg: 'bg-orange-950/40 border-orange-600/40 text-orange-300' },
  { name: 'Itaú', type: 'checking', color: '#ec7000', bg: 'bg-amber-950/40 border-amber-600/40 text-amber-300' },
  { name: 'Carteira Física', type: 'cash', color: '#10b981', bg: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300' },
  { name: 'Banco do Brasil', type: 'checking', color: '#facc15', bg: 'bg-yellow-950/40 border-yellow-600/40 text-yellow-300' },
  { name: 'Outro Banco', type: 'checking', color: '#3b82f6', bg: 'bg-blue-950/40 border-blue-600/40 text-blue-300' },
];

export const StepOne: React.FC<StepOneProps> = ({ onNext }) => {
  const [accountName, setAccountName] = useState('Nubank');
  const [accountType, setAccountType] = useState('checking');
  const [initialBalance, setInitialBalance] = useState('1500,00');
  const [selectedColor, setSelectedColor] = useState('#820ad1');
  const [loading, setLoading] = useState(false);

  const handleSelectPreset = (preset: typeof BANK_PRESETS[0]) => {
    setAccountName(preset.name);
    setAccountType(preset.type);
    setSelectedColor(preset.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const balanceFloat = parseFloat(initialBalance.replace(/\./g, '').replace(',', '.')) || 0;
      const balanceCents = Math.round(balanceFloat * 100);

      const acc = await api.accounts.create({
        name: accountName || 'Conta Principal',
        type: accountType as any,
        balanceCents,
        currency: 'BRL',
        color: selectedColor,
        isActive: true,
        includeInTotal: true,
      });

      onNext();
    } catch (err) {
      console.error(err);
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-950/70 border border-primary-800 text-primary-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Passo 1 de 3
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Qual sua principal conta ou carteira?
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Selecione um banco ou personalize com a conta que você mais movimenta.
        </p>
      </div>

      {/* Presets Rápidos */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
          Sugestões rápidas
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {BANK_PRESETS.map((preset) => {
            const isSelected = accountName === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected 
                    ? 'border-primary-500 bg-primary-950/40 text-white shadow-sm ring-1 ring-primary-500' 
                    : 'border-gray-800 bg-gray-850/60 text-gray-300 hover:border-gray-700 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: preset.color }} 
                  />
                  <span className="text-xs font-medium truncate">{preset.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Nome da Conta
          </label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ex: Conta Corrente, Carteira, Nubank"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Tipo
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="checking">Conta Corrente</option>
              <option value="savings">Poupança</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="cash">Dinheiro / Carteira</option>
              <option value="investment">Investimentos</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Saldo Inicial (R$)
            </label>
            <input
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white placeholder-gray-500 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-md shadow-primary-600/20 text-sm mt-4 transition-all"
        >
          {loading ? 'Criando conta...' : 'Próximo passo →'}
        </Button>
      </form>
    </div>
  );
};

export default StepOne;
