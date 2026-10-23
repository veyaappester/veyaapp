import { db, newId } from './schema';
import type { Expense } from './types';

export async function saveExpense(input: Omit<Expense, 'id'>, existingId?: string): Promise<void> {
  await db.expenses.put({ ...input, id: existingId ?? newId() });
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}
