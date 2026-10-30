import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Calculator as CalcIcon, 
  History, 
  Trash2, 
  Copy, 
  Check, 
  PlusCircle, 
  TrendingUp, 
  Users, 
  Percent,
  RotateCcw
} from 'lucide-react';
import { useCalculatorStore } from '../../store/useCalculatorStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { cn } from '../../lib/utils';

export const CalculatorModal: React.FC = () => {
  const isOpen = useCalculatorStore((state) => state.isOpen);
  const closeCalculator = useCalculatorStore((state) => state.closeCalculator);
  const activeTab = useCalculatorStore((state) => state.activeTab);
  const setActiveTab = useCalculatorStore((state) => state.setActiveTab);
  const history = useCalculatorStore((state) => state.history);
  const addHistoryItem = useCalculatorStore((state) => state.addHistoryItem);
  const clearHistory = useCalculatorStore((state) => state.clearHistory);
  const setQuickAddOpen = useTransactionStore((state) => state.setQuickAddOpen);

  // Estados da Calculadora Padrão
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados dos Juros Compostos
  const [initialDeposit, setInitialDeposit] = useState('1000');
  const [monthlyDeposit, setMonthlyDeposit] = useState('200');
  const [annualRate, setAnnualRate] = useState('12');
  const [years, setYears] = useState('5');

  // Estados da Divisão de Conta
  const [billTotal, setBillTotal] = useState('150');
  const [peopleCount, setPeopleCount] = useState('3');
  const [tipPercent, setTipPercent] = useState('10');

  // Função segura para calcular a expressão matemática
  const calculateResult = (expr: string): string => {
    try {
      if (!expr.trim()) return '0';
      // Converte símbolos visuais para operadores válidos
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '.')
        .replace(/%/g, '*0.01');

      // Validação estrita para evitar injeção
      if (!/^[0-9+\-*/().\s*0.01]+$/.test(sanitized)) {
        return 'Erro';
      }

      // eslint-disable-next-line no-new-func
      const evalResult = new Function(`return (${sanitized})`)();
      if (typeof evalResult !== 'number' || isNaN(evalResult) || !isFinite(evalResult)) {
        return 'Erro';
      }
      return Number(evalResult.toFixed(4)).toString().replace('.', ',');
    } catch {
      return 'Erro';
    }
  };

  const handleInput = (val: string) => {
    if (val === 'C') {
      setExpression('');
      setResult('0');
      return;
    }
    if (val === '⌫') {
      const updated = expression.slice(0, -1);
      setExpression(updated);
      setResult(calculateResult(updated));
      return;
    }
    if (val === '=') {
      const calc = calculateResult(expression);
      if (calc !== 'Erro' && expression.trim() !== '') {
        addHistoryItem(expression, calc);
        setExpression(calc);
        setResult(calc);
      }
      return;
    }
    if (val === '+/-') {
      if (expression.startsWith('-')) {
        const updated = expression.slice(1);
        setExpression(updated);
        setResult(calculateResult(updated));
      } else if (expression.length > 0) {
        const updated = `-${expression}`;
        setExpression(updated);
        setResult(calculateResult(updated));
      }
      return;
    }

    const updated = expression + val;
    setExpression(updated);
    const calc = calculateResult(updated);
    if (calc !== 'Erro') {
      setResult(calc);
    }
  };

  // Suporte a teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora digitação se estiver focado em um input das outras abas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        closeCalculator();
        return;
      }

      if (activeTab !== 'standard') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleInput('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleInput('-');
      } else if (e.key === '*' || e.key === 'x') {
        e.preventDefault();
        handleInput('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleInput('÷');
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleInput(',');
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === '%') {
        e.preventDefault();
        handleInput('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleInput('=');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleInput('⌫');
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleInput('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, expression]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTransaction = (amountValue: string) => {
    closeCalculator();
    setQuickAddOpen(true, amountValue.replace(/\./g, ''));
  };

  // Cálculos de Juros Compostos
  const compoundCalculation = (() => {
    const p = parseFloat(initialDeposit.replace(',', '.')) || 0;
    const pmt = parseFloat(monthlyDeposit.replace(',', '.')) || 0;
    const r = (parseFloat(annualRate.replace(',', '.')) || 0) / 100 / 12;
    const t = (parseFloat(years.replace(',', '.')) || 0) * 12;

    if (t <= 0) return { totalInvested: 0, totalInterest: 0, finalAmount: 0 };

    const totalInvested = p + pmt * t;
    let finalAmount = p * Math.pow(1 + r, t);
    if (r > 0) {
      finalAmount += pmt * ((Math.pow(1 + r, t) - 1) / r);
    } else {
      finalAmount += pmt * t;
    }
    const totalInterest = Math.max(0, finalAmount - totalInvested);

    return {
      totalInvested,
      totalInterest,
      finalAmount,
    };
  })();

  // Cálculos de Divisão de Conta
  const splitCalculation = (() => {
    const total = parseFloat(billTotal.replace(',', '.')) || 0;
    const people = Math.max(1, parseInt(peopleCount, 10) || 1);
    const tip = (parseFloat(tipPercent.replace(',', '.')) || 0) / 100;

    const tipAmount = total * tip;
    const totalWithTip = total + tipAmount;
    const perPerson = totalWithTip / people;

    return {
      subtotal: total,
      tipAmount,
      totalWithTip,
      perPerson,
    };
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalcIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Calculadora Gringotts</h3>
              <span className="text-[10px] text-gray-400">Atalho rápido: Alt+C</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'standard' && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  'p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
                  showHistory && 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
                title="Histórico de Cálculos"
                aria-label="Histórico de Cálculos"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={closeCalculator}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Abas da Ferramenta */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 p-1 gap-1">
          <button
            onClick={() => setActiveTab('standard')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
              activeTab === 'standard'
                ? 'bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <CalcIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Padrão</span>
          </button>

          <button
            onClick={() => setActiveTab('compound')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
              activeTab === 'compound'
                ? 'bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Juros Compostos</span>
          </button>

          <button
            onClick={() => setActiveTab('split')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
              activeTab === 'split'
                ? 'bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Rachar Conta</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Calculadora Padrão */}
        {activeTab === 'standard' && (
          <div className="p-4 space-y-3">
            {/* Display de Resultado */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 text-right">
              <div className="text-xs text-gray-400 font-mono h-4 truncate">
                {expression || ' '}
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 tracking-tight mt-0.5 truncate">
                {result}
              </div>
            </div>

            {/* Ações com o valor calculado */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(result)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                title="Copiar resultado"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={() => handleCreateTransaction(result)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                title="Usar este valor em um novo lançamento"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Lançar Gasto</span>
              </button>
            </div>

            {/* Painel de Histórico (Retrátil) */}
            {showHistory && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400 text-[11px] font-semibold">
                  <span>Cálculos Recentes</span>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-red-500 hover:text-red-600 flex items-center gap-1"
                      title="Limpar histórico"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="text-gray-400 text-center py-2 text-[11px]">Nenhum cálculo registrado ainda.</p>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setExpression(item.result);
                        setResult(item.result);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between font-mono text-[11px] transition-colors"
                    >
                      <span className="text-gray-500 truncate mr-2">{item.expression}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0">= {item.result}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Teclado da Calculadora */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: 'C', val: 'C', style: 'text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100' },
                { label: '(', val: '(', style: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
                { label: ')', val: ')', style: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
                { label: '÷', val: '÷', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/25' },

                { label: '7', val: '7' },
                { label: '8', val: '8' },
                { label: '9', val: '9' },
                { label: '×', val: '×', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/25' },

                { label: '4', val: '4' },
                { label: '5', val: '5' },
                { label: '6', val: '6' },
                { label: '-', val: '-', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/25' },

                { label: '1', val: '1' },
                { label: '2', val: '2' },
                { label: '3', val: '3' },
                { label: '+', val: '+', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/25' },

                { label: '+/-', val: '+/-', style: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
                { label: '0', val: '0' },
                { label: ',', val: ',' },
                { label: '=', val: '=', style: 'bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20' },
              ].map((btn, index) => (
                <button
                  key={index}
                  onClick={() => handleInput(btn.val)}
                  className={cn(
                    'h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-all active:scale-95',
                    btn.style || 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-750'
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 2: Juros Compostos */}
        {activeTab === 'compound' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Aporte Inicial (R$)</label>
                <input
                  type="text"
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Aporte Mensal (R$)</label>
                <input
                  type="text"
                  value={monthlyDeposit}
                  onChange={(e) => setMonthlyDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Taxa Anual (%)</label>
                <input
                  type="text"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Período (Anos)</label>
                <input
                  type="text"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Resultado do Rendimento */}
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase tracking-wider">
                Projeção Acumulada
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                R$ {compoundCalculation.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block">Total Investido:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    R$ {compoundCalculation.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Rendimento em Juros:</span>
                  <span className="font-bold text-emerald-500">
                    + R$ {compoundCalculation.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 3: Rachar Conta */}
        {activeTab === 'split' && (
          <div className="p-4 space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Valor Total da Conta (R$)</label>
                <input
                  type="text"
                  value={billTotal}
                  onChange={(e) => setBillTotal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Número de Pessoas</label>
                  <input
                    type="number"
                    min="1"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Taxa de Serviço (%)</label>
                  <div className="flex gap-1">
                    {['0', '10', '12', '15'].map((tip) => (
                      <button
                        key={tip}
                        type="button"
                        onClick={() => setTipPercent(tip)}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-semibold border transition-all',
                          tipPercent === tip
                            ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                        )}
                      >
                        {tip}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado da Divisão */}
            <div className="p-4 bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20 rounded-2xl space-y-2">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block uppercase tracking-wider">
                Valor por Pessoa
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                R$ {splitCalculation.perPerson.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="pt-2 border-t border-blue-500/20 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Subtotal: R$ {splitCalculation.subtotal.toFixed(2)}</span>
                <span>Serviço: + R$ {splitCalculation.tipAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => handleCreateTransaction(splitCalculation.perPerson.toFixed(2))}
              className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lançar Minha Parte como Despesa</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorModal;
