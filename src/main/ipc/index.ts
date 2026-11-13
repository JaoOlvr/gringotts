import { registerAccountsHandlers } from './handlers/accountsHandlers';
import { registerCategoriesHandlers } from './handlers/categoriesHandlers';
import { registerTransactionsHandlers } from './handlers/transactionsHandlers';
import { registerBudgetsHandlers } from './handlers/budgetsHandlers';
import { registerGoalsHandlers } from './handlers/goalsHandlers';
import { registerBackupHandlers } from './handlers/backupHandlers';
import { registerSeedHandlers } from './handlers/seedHandlers';
import { registerUpdaterHandlers } from './handlers/updaterHandlers';
import { registerThemeHandlers } from './handlers/themeHandlers';
import { registerOpenFinanceHandlers } from './handlers/openFinanceHandlers';

export function registerAllHandlers() {
  registerAccountsHandlers();
  registerCategoriesHandlers();
  registerTransactionsHandlers();
  registerBudgetsHandlers();
  registerGoalsHandlers();
  registerBackupHandlers();
  registerSeedHandlers();
  registerUpdaterHandlers();
  registerThemeHandlers();
  registerOpenFinanceHandlers();
}
