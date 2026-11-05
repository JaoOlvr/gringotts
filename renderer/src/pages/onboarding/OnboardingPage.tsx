import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepOne } from './steps/StepOne';
import { StepTwo } from './steps/StepTwo';
import { StepThree } from './steps/StepThree';
import { useAccountStore } from '../../store/useAccountStore';
import { api } from '../../lib/ipc';
import { ShieldCheck } from 'lucide-react';
import { GringottsLogo } from '../../components/common/GringottsLogo';

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const setAccounts = useAccountStore((s) => s.setAccounts);

  const completeAndGoHome = async () => {
    try {
      const accs = await api.accounts.getAll();
      setAccounts(accs);
      if (accs.length > 0) {
        const first = accs[0];
        if (!first.isLocked) {
          useAccountStore.getState().unlockAccount(first.id);
        }
      }
    } catch (err) {
      console.warn(err);
    }
    navigate('/');
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completeAndGoHome();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07090e] p-4 sm:p-6 text-gray-100 relative overflow-y-auto overflow-x-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl space-y-5 relative z-10 my-auto py-6">
        {/* Card Principal */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-800/80">
            <div className="flex items-center gap-3">
              <GringottsLogo className="w-10 h-10 rounded-xl shadow-lg shadow-amber-500/20 shrink-0" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Gringotts <span className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 font-normal">v1.3.0</span>
                </h1>
                <span className="text-xs text-gray-400">Controle financeiro pessoal offline</span>
              </div>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step === s 
                      ? 'w-7 bg-primary-500' 
                      : step > s 
                      ? 'w-2 bg-emerald-500' 
                      : 'w-2 bg-gray-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Steps */}
          {step === 1 && <StepOne onNext={handleNext} />}
          {step === 2 && <StepTwo onNext={handleNext} />}
          {step === 3 && <StepThree onNext={handleNext} />}

          {/* Footer Segurança */}
          <div className="mt-8 pt-5 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Seus dados nunca saem deste computador (Local-First SQLite)</span>
            </div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Voltar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
