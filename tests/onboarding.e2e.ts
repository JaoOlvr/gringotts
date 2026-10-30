import { test, expect } from '@playwright/test';

test.describe.serial('Fluxo Completo Gringotts E2E', () => {
  test('deve completar o onboarding e criar uma conta', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('/');
    
    // Verificar se redirecionou para onboarding
    await expect(page).toHaveURL(/.*#\/onboarding/);
    
    // Passo 1: Criar conta
    await expect(page.locator('text=Qual sua principal conta ou carteira?')).toBeVisible();
    await page.fill('input[placeholder*="Conta Corrente, Carteira, Nubank"]', 'Minha Conta');
    await page.selectOption('select', 'checking');
    await page.fill('input[placeholder="0,00"]', '1000,00');
    await page.click('button:has-text("Próximo passo")');
    
    // Passo 2: Definir renda
    await expect(page.locator('text=Defina sua renda mensal')).toBeVisible();
    await page.fill('input[placeholder="Ex: 3.500,00"]', '5000,00');
    await page.selectOption('select[aria-label="Frequência de recebimento"]', 'monthly');
    await page.click('button:has-text("Próximo passo")');
    
    // Passo 3: Definir meta
    await expect(page.locator('text=Qual sua primeira meta de economia?')).toBeVisible();
    await page.fill('input[placeholder*="Reserva de emergência, Viagem, Casa própria"]', 'Reserva de Emergência');
    await page.fill('input[placeholder="Ex: 10.000,00"]', '15000,00');
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().split('T')[0] ?? '';
    await page.fill('input[type="date"]', dateString);
    await page.click('button:has-text("Concluir e Abrir Gringotts")');
    
    // Após o onboarding, deve redirecionar para o dashboard
    await expect(page).toHaveURL(/.*#\//);
    await expect(page.locator('text=Visão Geral')).toBeVisible();

    // Testar atalho de teclado Ctrl+N para adicionar transação rápida
    await page.keyboard.press('Control+n');
    
    // Verificar se o modal está aberto
    await expect(page.locator('text=Adicionar Lançamento Rápido')).toBeVisible();
    
    // Preencher o formulário
    await page.fill('input[ref="amountRef"]', '100 + 50');
    await page.fill('input[placeholder="Ex: Almoço no restaurante"]', 'Almoço com cliente');
    await page.selectOption('select', 'EXPENSE');
    
    const today = new Date().toISOString().split('T')[0] ?? '';
    await page.fill('input[type="date"]', today);
    
    // Submeter o formulário
    await page.click('text=Salvar (Enter)');
    
    // Verificar se o modal fechou
    await expect(page.locator('text=Adicionar Lançamento Rápido')).not.toBeVisible();
    
    // Navegar para a página de transações
    await page.click('text=Lançamentos');
    await expect(page).toHaveURL(/.*#\/transactions/);
    await expect(page.locator('text=Almoço com cliente')).toBeVisible();
  });
});