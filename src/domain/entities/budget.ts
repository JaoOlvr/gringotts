export interface Budget {
  id: string;
  categoryId: string;
  amountCents: number;
  month: number; // 1-12
  year: number;
  createdAt: Date;
}
