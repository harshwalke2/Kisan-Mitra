import cron, { ScheduledTask } from 'node-cron';
import { syncSchemesFromSource } from '../services/schemeSyncService';

let schedulerTask: ScheduledTask | null = null;

const resolveCronExpression = (): string => {
  const fromEnv = String(process.env.SCHEME_SYNC_CRON_SCHEDULE || '').trim();
  return fromEnv || '0 */12 * * *';
};

const runSchemeSyncCycle = async () => {
  try {
    const result = await syncSchemesFromSource();
    if (!result.sourceEnabled) {
      return;
    }

    console.log(
      `[schemes-sync] completed: fetched=${result.totalFetched}, inserted=${result.inserted}, skipped=${result.skipped}, errors=${result.errors}`
    );
  } catch (error) {
    console.error('[schemes-sync] Scheduler run failed', error);
  }
};

export const startSchemeSyncScheduler = (): void => {
  if (schedulerTask) {
    return;
  }

  const expression = resolveCronExpression();
  schedulerTask = cron.schedule(expression, () => {
    void runSchemeSyncCycle();
  });

  const runOnStart = String(process.env.SCHEME_SYNC_RUN_ON_START || 'true').toLowerCase() === 'true';
  if (runOnStart) {
    setTimeout(() => {
      void runSchemeSyncCycle();
    }, 18000);
  }

  console.log(`[schemes-sync] Scheduler started with expression: ${expression}`);
};