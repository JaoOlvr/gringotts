export type DebtStrategy = 'SNOWBALL' | 'AVALANCHE';

export interface DebtInput {
  id: string;
  name: string;
  creditor?: string;
  remainingAmountCents: number;
  interestRateMonthly: number; // Ex: 2.5 para 2.5% ao mês
  minimumPaymentCents: number;
  color?: string;
}

export interface DebtPayoffItemResult {
  id: string;
  name: string;
  creditor?: string;
  initialBalanceCents: number;
  totalInterestPaidCents: number;
  totalPaidCents: number;
  paidOffMonth: number;
  rank: number; // 1º a quitar, 2º, etc.
}

export interface MonthlyTimelinePoint {
  month: number;
  dateLabel: string;
  totalRemainingCents: number;
  totalPaidThisMonthCents: number;
  totalInterestThisMonthCents: number;
}

export interface DebtPayoffSimulation {
  strategy: DebtStrategy;
  extraMonthlyBudgetCents: number;
  totalInitialDebtCents: number;
  totalInterestPaidCents: number;
  totalPaidCents: number;
  monthsToDebtFree: number;
  debtFreeDate: Date;
  debtOrder: DebtPayoffItemResult[];
  timeline: MonthlyTimelinePoint[];
  hasDeficitRisk: boolean; // Se o pagamento mínimo não cobre nem os juros
}

export interface StrategyComparison {
  snowball: DebtPayoffSimulation;
  avalanche: DebtPayoffSimulation;
  baselineMinimumOnly: DebtPayoffSimulation;
  interestDifferenceCents: number; // Avalanche vs Snowball (positivo = avalanche economiza mais)
  monthsDifference: number; // Snowball - Avalanche
  fasterFirstWinMonthSnowball: number;
  fasterFirstWinMonthAvalanche: number;
}

/**
 * Ordena a lista de dívidas de acordo com a estratégia escolhida
 */
export function sortDebtsByStrategy(debts: DebtInput[], strategy: DebtStrategy): DebtInput[] {
  const list = [...debts];

  if (strategy === 'SNOWBALL') {
    // Bola de Neve: Menor saldo devedor primeiro
    return list.sort((a, b) => {
      if (a.remainingAmountCents !== b.remainingAmountCents) {
        return a.remainingAmountCents - b.remainingAmountCents;
      }
      return b.interestRateMonthly - a.interestRateMonthly;
    });
  } else {
    // Avalanche: Maior taxa de juros primeiro
    return list.sort((a, b) => {
      if (b.interestRateMonthly !== a.interestRateMonthly) {
        return b.interestRateMonthly - a.interestRateMonthly;
      }
      return a.remainingAmountCents - b.remainingAmountCents;
    });
  }
}

/**
 * Simula a quitação acelerada de dívidas mês a mês com rollover de pagamentos
 */
export function simulateDebtPayoff(
  debts: DebtInput[],
  strategy: DebtStrategy,
  extraMonthlyBudgetCents = 0
): DebtPayoffSimulation {
  const activeDebts = debts.filter((d) => d.remainingAmountCents > 0);
  const totalInitialDebtCents = activeDebts.reduce((sum, d) => sum + d.remainingAmountCents, 0);

  if (activeDebts.length === 0) {
    return {
      strategy,
      extraMonthlyBudgetCents,
      totalInitialDebtCents: 0,
      totalInterestPaidCents: 0,
      totalPaidCents: 0,
      monthsToDebtFree: 0,
      debtFreeDate: new Date(),
      debtOrder: [],
      timeline: [],
      hasDeficitRisk: false,
    };
  }

  // Ordena as dívidas conforme a estratégia
  const sorted = sortDebtsByStrategy(activeDebts, strategy);

  // Pool total fixo que o usuário se compromete a pagar mensalmente:
  // Soma das parcelas mínimas de todas as dívidas + aporte extra
  const baselineTotalMinPayment = sorted.reduce((sum, d) => sum + d.minimumPaymentCents, 0);
  const totalMonthlyBudgetPool = baselineTotalMinPayment + extraMonthlyBudgetCents;

  // Estado interno da simulação
  interface SimDebt {
    id: string;
    name: string;
    creditor?: string;
    balanceCents: number;
    initialBalanceCents: number;
    interestRateMonthly: number;
    minimumPaymentCents: number;
    totalInterestCents: number;
    totalPaidCents: number;
    paidOffMonth: number;
  }

  const simDebts: SimDebt[] = sorted.map((d) => ({
    id: d.id,
    name: d.name,
    creditor: d.creditor,
    balanceCents: d.remainingAmountCents,
    initialBalanceCents: d.remainingAmountCents,
    interestRateMonthly: d.interestRateMonthly,
    minimumPaymentCents: d.minimumPaymentCents,
    totalInterestCents: 0,
    totalPaidCents: 0,
    paidOffMonth: 0,
  }));

  const timeline: MonthlyTimelinePoint[] = [];
  const maxMonths = 600; // Limite de 50 anos
  let month = 0;
  let hasDeficitRisk = false;

  const startDate = new Date();

  while (simDebts.some((d) => d.balanceCents > 0) && month < maxMonths) {
    month++;

    let monthPaidTotal = 0;
    let monthInterestTotal = 0;

    // 1. Aplica juros mensais em todas as dívidas ativas
    for (const d of simDebts) {
      if (d.balanceCents > 0) {
        const monthlyRate = d.interestRateMonthly / 100;
        const interestCents = Math.round(d.balanceCents * monthlyRate);

        // Se o juro gerado for maior que o pagamento mínimo, avisa sobre risco de bola de neve negativa
        if (interestCents >= d.minimumPaymentCents && extraMonthlyBudgetCents === 0) {
          hasDeficitRisk = true;
        }

        d.balanceCents += interestCents;
        d.totalInterestCents += interestCents;
        monthInterestTotal += interestCents;
      }
    }

    // 2. Realiza o pagamento mínimo em cada dívida ativa
    let availableBudgetThisMonth = totalMonthlyBudgetPool;

    for (const d of simDebts) {
      if (d.balanceCents > 0) {
        const minPay = Math.min(d.minimumPaymentCents, d.balanceCents, availableBudgetThisMonth);
        d.balanceCents -= minPay;
        d.totalPaidCents += minPay;
        availableBudgetThisMonth -= minPay;
        monthPaidTotal += minPay;

        if (d.balanceCents === 0 && d.paidOffMonth === 0) {
          d.paidOffMonth = month;
        }
      }
    }

    // 3. Aplica o excedente (snowball rollover + extra) na dívida prioritária ativa do topo
    for (const d of simDebts) {
      if (availableBudgetThisMonth <= 0) break;
      if (d.balanceCents > 0) {
        const payment = Math.min(d.balanceCents, availableBudgetThisMonth);
        d.balanceCents -= payment;
        d.totalPaidCents += payment;
        availableBudgetThisMonth -= payment;
        monthPaidTotal += payment;

        if (d.balanceCents === 0 && d.paidOffMonth === 0) {
          d.paidOffMonth = month;
        }
      }
    }

    // 4. Salva ponto na linha do tempo
    const totalRemaining = simDebts.reduce((sum, d) => sum + d.balanceCents, 0);
    const datePoint = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1);
    const dateLabel = datePoint.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    timeline.push({
      month,
      dateLabel,
      totalRemainingCents: totalRemaining,
      totalPaidThisMonthCents: monthPaidTotal,
      totalInterestThisMonthCents: monthInterestTotal,
    });
  }

  // Prepara ordem de quitação
  const debtOrder: DebtPayoffItemResult[] = simDebts.map((d, index) => ({
    id: d.id,
    name: d.name,
    creditor: d.creditor,
    initialBalanceCents: d.initialBalanceCents,
    totalInterestPaidCents: d.totalInterestCents,
    totalPaidCents: d.totalPaidCents,
    paidOffMonth: d.paidOffMonth || month,
    rank: index + 1,
  }));

  const totalInterestPaidCents = simDebts.reduce((sum, d) => sum + d.totalInterestCents, 0);
  const totalPaidCents = simDebts.reduce((sum, d) => sum + d.totalPaidCents, 0);

  const debtFreeDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1);

  return {
    strategy,
    extraMonthlyBudgetCents,
    totalInitialDebtCents,
    totalInterestPaidCents,
    totalPaidCents,
    monthsToDebtFree: month,
    debtFreeDate,
    debtOrder,
    timeline,
    hasDeficitRisk,
  };
}

/**
 * Compara as duas estratégias (Bola de Neve vs Avalanche) e a linha de base (apenas mínimo)
 */
export function compareStrategies(
  debts: DebtInput[],
  extraMonthlyBudgetCents = 0
): StrategyComparison {
  const snowball = simulateDebtPayoff(debts, 'SNOWBALL', extraMonthlyBudgetCents);
  const avalanche = simulateDebtPayoff(debts, 'AVALANCHE', extraMonthlyBudgetCents);
  const baselineMinimumOnly = simulateDebtPayoff(debts, 'SNOWBALL', 0);

  const interestDifferenceCents = snowball.totalInterestPaidCents - avalanche.totalInterestPaidCents;
  const monthsDifference = snowball.monthsToDebtFree - avalanche.monthsToDebtFree;

  const fasterFirstWinMonthSnowball =
    snowball.debtOrder.length > 0 ? Math.min(...snowball.debtOrder.map((d) => d.paidOffMonth)) : 0;
  const fasterFirstWinMonthAvalanche =
    avalanche.debtOrder.length > 0 ? Math.min(...avalanche.debtOrder.map((d) => d.paidOffMonth)) : 0;

  return {
    snowball,
    avalanche,
    baselineMinimumOnly,
    interestDifferenceCents,
    monthsDifference,
    fasterFirstWinMonthSnowball,
    fasterFirstWinMonthAvalanche,
  };
}

