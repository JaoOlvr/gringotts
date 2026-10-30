import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Sparkles, Calendar, TrendingUp, DollarSign } from 'lucide-react';

interface StepTwoProps {
  onNext: () => void;
}

const INCOME_PRESETS = ['3500,00', '5000,00', '8000,00', '12000,00'];

export const StepTwo: React.FC<StepTwoProps> = ({ onNext }) => {
  const [expectedIncome, setExpectedIncome] = useState('5000,00');
  const [incomeFrequency, setIncomeFrequency] = useState('monthly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const incomeNum = parseFloat(expectedIncome.replace(/\./g, '').replace(',', '.')) || 0;
  const recommendedSavings = incomeNum * 0.2; // 20% regra 50-30-20

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/70 border border-emerald-800 text-emerald-300 mb-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Passo 2 de 3
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Defina sua renda mensal
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Usamos esse valor para projetar seu fluxo de caixa e sua taxa de poupança ideal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Renda líquida estimada
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
              R$
            </span>
            <input
              type="text"
              value={expectedIncome}
              onChange={(e) => setExpectedIncome(e.target.value)}
              placeholder="Ex: 3.500,00"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-750 bg-gray-900 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Sugestões de valores */}
          <div className="flex gap-2 mt-2.5">
            {INCOME_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setExpectedIncome(val)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  expectedIncome === val
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                    : 'border-gray-800 bg-gray-850/50 text-gray-400 hover:border-gray-700 hover:text-white'
                }`}
              >
                R$ {val}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Frequência de recebimento
          </label>
          <select
            aria-label="Frequência de recebimento"
            value={incomeFrequency}
            onChange={(e) => setIncomeFrequency(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-750 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="monthly">Mensal (Salário / Pró-labore)</option>
            <option value="biweekly">Quinzenal</option>
            <option value="weekly">Semanal</option>
            <option value="variable">Variável / Freelancer</option>
          </select>
        </div>

        {incomeNum > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/20 border border-emerald-800/40 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 block">Dica Financeira (Regra 50/30/20)</span>
              <p className="text-xs text-gray-300 mt-0.5">
                Poupando 20% da sua renda, sua meta de reserva seria de cerca de{' '}
                <strong className="text-emerald-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recommendedSavings)}/mês
                </strong>.
              </p>
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20 text-sm mt-4 transition-all"
        >
          Próximo passo →
        </Button>
      </form>
    </div>
  );
};

export default StepTwo;
