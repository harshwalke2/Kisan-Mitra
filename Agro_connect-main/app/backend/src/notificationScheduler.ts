import cron, { ScheduledTask } from 'node-cron';
import { generateSmartNotificationsForAllUsers } from '../services/smartNotificationService';

let schedulerTask: ScheduledTask | null = null;

const resolveCronExpression = (): string => {
  const fromEnv = String(process.env.NOTIFICATION_CRON_SCHEDULE || '').trim();
  return fromEnv || '0 */4 * * *';
};

const runSchedulerCycle = async () => {
  try {
    const result = await generateSmartNotificationsForAllUsers();
    console.log(
      `[notifications] Smart alert run completed: users=${result.usersProcessed}, created=${result.notificationsCreated}`
    );
  } catch (error) {
    console.error('[notifications] Scheduler run failed', error);
  }
};

export const startNotificationScheduler = (): void => {
  if (schedulerTask) {
    return;
  }

  const expression = resolveCronExpression();
  schedulerTask = cron.schedule(expression, () => {
    void runSchedulerCycle();
  });

  const runOnStart = String(process.env.NOTIFICATION_RUN_ON_START || 'true').toLowerCase() === 'true';
  if (runOnStart) {
    setTimeout(() => {
      void runSchedulerCycle();
    }, 12000);
  }

  console.log(`[notifications] Scheduler started with expression: ${expression}`);
};
