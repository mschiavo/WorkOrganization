import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localCache, StorageIdentity } from '../storage/localCache';
import { workDataService, StoredTimeEntry } from './workDataService';
import * as supabaseClientModule from '../supabase/client';

describe('P1.2 Offline Writes & Cloud Reconciliation (syncEngine)', () => {
  const testIdentity: StorageIdentity = {
    scope: 'cloud',
    userId: 'user-sync-test',
    projectRef: 'proj-sync',
  };

  beforeEach(() => {
    localStorage.clear();
    localCache.resetForTesting();
    localCache.setActiveIdentity(testIdentity);
    vi.restoreAllMocks();
  });

  it('queues a pending mutation when offline and persists it across simulated app restart', async () => {
    // 1. Simulate offline or unreachable Supabase
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)')),
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    // Save day status while offline
    const saved = await workDataService.saveDayStatus(
      '2026-11-04',
      'smart',
      'Offline Smart Note',
      testIdentity.userId,
      testIdentity
    );

    expect(saved.status).toBe('smart');
    expect(saved.notes).toBe('Offline Smart Note');

    // Verify it is queued in the identity-scoped outbox
    const queue = localCache.getPendingMutations(testIdentity);
    expect(queue.length).toBeGreaterThanOrEqual(1);
    const dayMutation = queue.find((m) => m.date === '2026-11-04');
    expect(dayMutation).toBeDefined();
    expect(dayMutation?.payload.status).toBe('smart');

    // 2. Simulate app restart: re-read outbox from localCache
    const queueAfterRestart = localCache.getPendingMutations(testIdentity);
    expect(queueAfterRestart.length).toBe(queue.length);
    expect(queueAfterRestart[0].date).toBe('2026-11-04');
  });

  it('preserves local pending modifications during cloud reload (loadMonthData does not overwrite pending local edits)', async () => {
    // Pre-populate a pending local mutation for 2026-11-05
    localCache.saveCalendarDay(
      '2026-11-05',
      { date: '2026-11-05', status: 'smart', notes: 'Local pending edit', isConfirmed: true, updatedAt: '2026-11-05T12:00:00Z' },
      testIdentity
    );
    localCache.enqueuePendingMutation(
      {
        id: 'mut-1',
        type: 'save_day_status',
        date: '2026-11-05',
        payload: { date: '2026-11-05', status: 'smart', notes: 'Local pending edit' },
        clientTimestamp: '2026-11-05T12:00:00Z',
        version: 1,
        retryCount: 0,
        status: 'pending',
      },
      testIdentity
    );

    // Remote database returns stale 'presenza' with older or different status
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'calendar_days') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: testIdentity.userId,
                  date: '2026-11-05',
                  status: 'presenza',
                  notes: 'Stale remote note',
                  is_confirmed: true,
                  updated_at: '2026-11-05T10:00:00Z',
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    // Load month data
    const result = await workDataService.loadMonthData(2026, 11, testIdentity.userId, testIdentity);

    // The local pending modification MUST be preserved over stale remote data
    expect(result.days['2026-11-05']?.status).toBe('smart');
    expect(result.days['2026-11-05']?.notes).toBe('Local pending edit');
  });

  it('flushes pending mutations upon reconnection and removes them only after server confirmation', async () => {
    let upsertCalled = false;
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation(async () => {
          upsertCalled = true;
          return { data: [{ id: 1 }], error: null };
        }),
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    // Enqueue a pending mutation
    localCache.enqueuePendingMutation(
      {
        id: 'mut-flush-1',
        type: 'save_day_status',
        date: '2026-11-06',
        payload: { date: '2026-11-06', status: 'ferie', notes: 'Vacation queued' },
        clientTimestamp: '2026-11-06T09:00:00Z',
        version: 1,
        retryCount: 0,
        status: 'pending',
      },
      testIdentity
    );

    expect(localCache.getPendingMutations(testIdentity).length).toBe(1);

    // Flush outbox
    const flushResult = await workDataService.flushPendingMutations(testIdentity.userId, testIdentity);

    expect(upsertCalled).toBe(true);
    expect(flushResult.succeededCount).toBe(1);
    expect(flushResult.failedCount).toBe(0);

    // Outbox must be empty now that server confirmed
    expect(localCache.getPendingMutations(testIdentity).length).toBe(0);
  });

  it('handles out-of-order network responses without overwriting newer local edits', async () => {
    let resolveFirstWrite: (res: any) => void = () => {};
    const firstWritePromise = new Promise((resolve) => {
      resolveFirstWrite = resolve;
    });

    let callCount = 0;
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation(async (payload: any) => {
          callCount++;
          if (payload.status === 'presenza') {
            // First write is delayed
            await firstWritePromise;
            return { error: null };
          }
          // Second write completes immediately
          return { error: null };
        }),
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    // 1. Rapid edit 1: user marks 'presenza' (delayed)
    const p1 = workDataService.saveDayStatus('2026-11-07', 'presenza', 'First Edit', testIdentity.userId, testIdentity);

    // 2. Rapid edit 2: user marks 'smart' (finishes immediately)
    const p2 = workDataService.saveDayStatus('2026-11-07', 'smart', 'Second Edit', testIdentity.userId, testIdentity);
    await p2;

    // Verify current state is 'smart'
    expect(localCache.getCalendarDays(testIdentity)['2026-11-07']?.status).toBe('smart');

    // 3. First write finally resolves late
    resolveFirstWrite(true);
    await p1;

    // State MUST remain 'smart', never reverted to 'presenza'!
    expect(localCache.getCalendarDays(testIdentity)['2026-11-07']?.status).toBe('smart');
    expect(localCache.getCalendarDays(testIdentity)['2026-11-07']?.notes).toBe('Second Edit');
  });

  it('keeps partial failure visible and retryable when saving both calendar day and time punches', async () => {
    // Simulate calendar_days succeeding but time_entries failing
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'calendar_days') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'time_entries') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: { message: 'Network error writing time entries', code: '500' } }),
          };
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const entry: Partial<StoredTimeEntry> = {
      morningIn: '08:30',
      eveningOut: '17:00',
    };

    const res = await workDataService.saveTimeEntry('2026-11-08', entry, testIdentity.userId, testIdentity);

    expect(res.timeEntry.morningIn).toBe('08:30');

    // The failed time_entry write must be recorded in the outbox for retry
    const queue = localCache.getPendingMutations(testIdentity);
    const failedMutation = queue.find((m) => m.type === 'save_time_entry' && m.date === '2026-11-08');
    expect(failedMutation).toBeDefined();
    expect(failedMutation?.status).toBe('error');
    expect(failedMutation?.lastError).toContain('Network error writing time entries');
  });

  it('applies Last-Write-Wins based on updated_at timestamps during conflict reconciliation', async () => {
    // Local has an older modification: 2026-11-09T08:00:00Z
    localCache.saveCalendarDay(
      '2026-11-09',
      {
        date: '2026-11-09',
        status: 'presenza',
        notes: 'Older local',
        isConfirmed: true,
        updatedAt: '2026-11-09T08:00:00Z',
      },
      testIdentity
    );

    // Remote has a newer modification from another device: 2026-11-09T09:30:00Z
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'calendar_days') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: testIdentity.userId,
                  date: '2026-11-09',
                  status: 'smart',
                  notes: 'Newer remote from mobile device',
                  is_confirmed: true,
                  updated_at: '2026-11-09T09:30:00Z',
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    // Load month data
    const result = await workDataService.loadMonthData(2026, 11, testIdentity.userId, testIdentity);

    // Remote is newer (09:30 > 08:00) and no local mutation is pending -> Remote wins!
    expect(result.days['2026-11-09']?.status).toBe('smart');
    expect(result.days['2026-11-09']?.notes).toBe('Newer remote from mobile device');
  });
});
