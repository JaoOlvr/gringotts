import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/ipc';
import { Target, Shield, Plane, Car, Home, Calendar, Sparkles } from 'lucide-react';

interface StepThreeProps {
  onNext: () => void;
}

const GOAL_PRESETS = [
  { name: 'Reserva de Emergência', amount: '15000,00', color: '#10b981', icon: Shield },
  { name: 'Viagem de Férias', amount: '6000,00', color: '#3b82f6', icon: Plane },
  { name: 'Carro Novo', amount: '25000,00', color: '#f59e0b', icon: Car },
  { name: 'Casa Própria', amount: '50000,00', color: '#8b5cf6', icon: Home },
];

export const StepThree: React.FC<StepThreeProps> = ({ onNext }) => {
  const [primaryGoal, setPrimaryGoal] = useState('Reserva de Emergência');
  const [goalAmount, setGoalAmount] = useState('15000,00');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [goalDate, setGoalDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0] ?? '';
  });
  const [loading, setLoading] = useState(false);

  const handleSelectPreset = (preset: typeof GOAL_PRESETS[0]) => {
    setPrimaryGoal(preset.name);
    setGoalAmount(preset.amount);
    setSelectedColor(preset.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (primaryGoal) {
        const amountFloat = parseFloat(goalAmount.replace(/\./g, '').replace(',', '.')) || 0;
        await api.goals.create({
          name: primaryGoal,
          targetAmountCents: Math.round(amountFloat * 100),
          currentAmountCents: 0,
          deadline: goalDate ? new Date(goalDate) : null,
          color: selectedColor,
        });
      }
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/70 border border-amber-800 text-amber-300 mb-2">
          <Target className="w-3.5 h-3.5" />
          Passo 3 de 3
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Qual sua primeira meta de economia?
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Pessoas com metas claras poupam até 3x mais rápido.
        </p>
      </div>

      {/* Presets de Metas */}
      <div className="grid grid-cols-2 gap-2.5">
        {GOAL_PRESETS.map((preset) => {
          const isSelected = primaryGoal === preset.name;
          const Icon = preset.icon;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-950/40 text-white shadow-sm ring-1 ring-primary-500'
                  : 'border-gray-800 bg-gray-850/60 text-gray-300 hover:border-gray-700 hover:bg-gray-800'
              }`}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${preset.color}25`, color: preset.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold block truncate">{preset.name}</span>
                <span className="text-[11px] text-gray-400">R$ {preset.amount}</span>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Nome da Meta
          </label>
          <input
            value={primaryGoal}
            onChange={(e) => setPrimaryGoal(e.target.value)}
            placeholder="Ex: Reserva de emergência, Viagem, Casa própria"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Valor Almejado (R$)
            </label>
            <input
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="Ex: 10.000,00"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white placeholder-gray-500 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Data Desejada
            </label>
            <input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-750 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-primary-600/25 text-sm mt-4 transition-all"
        >
          {loading ? 'Finalizando...' : 'Concluir e Abrir Gringotts ✨'}
        </Button>
      </form>
    </div>
  );
};

export default StepThree;