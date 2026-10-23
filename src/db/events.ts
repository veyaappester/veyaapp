import { db, newId } from './schema';
import type { PlanEvent } from './types';

export async function saveEvent(input: Omit<PlanEvent, 'id'>, existingId?: string): Promise<void> {
  await db.events.put({ ...input, id: existingId ?? newId() });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}
