import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DAILY_REMINDER_ID = 1001;
const WEEKLY_REMINDER_ID = 1002;
const CHANNEL_ID = 'timesheet_reminders';

/**
 * Request permissions, setup Android notification channels, and schedule repeating notifications
 */
export const initNotifications = async () => {
  try {
    console.log('[NotificationService] Initializing notifications...');

    // 1. Check and Request Notification Permissions FIRST
    let perm = await LocalNotifications.checkPermissions();
    console.log('[NotificationService] Initial permission state:', perm.display);

    if (perm.display !== 'granted') {
      console.log('[NotificationService] Requesting permission popup from Android OS...');
      perm = await LocalNotifications.requestPermissions();
      console.log('[NotificationService] Post-request permission state:', perm.display);
    }

    if (perm.display !== 'granted') {
      console.warn('[NotificationService] Notification permissions were NOT granted by user.');
      return;
    }

    // 2. Create High-Priority Notification Channel AFTER permission is granted
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Timesheet Reminders',
      description: 'Daily and weekly reminders to log site hours',
      importance: 5, // 5 = High Priority (Banner popup + sound)
      visibility: 1,  // Public on lock screen
      vibration: true,
    });

    // 3. Schedule Daily & Weekly Local Notifications
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'Timesheet Reminder',
          body: "Don't forget to record your site hours for today!",
          channelId: CHANNEL_ID,
          schedule: {
            on: { hour: 17, minute: 30 }, // 5:30 PM
            repeats: true,
          },
        },
        {
          id: WEEKLY_REMINDER_ID,
          title: 'Weekly Timesheet Due',
          body: "Don't forget to send your timesheet!",
          channelId: CHANNEL_ID,
          schedule: {
            on: { weekday: 3, hour: 18, minute: 0 }, // Tuesday at 6:00 PM (1: Sun, 2: Mon, 3: Tue)
            repeats: true,
          },
        },
      ],
    });

    console.log('[NotificationService] Daily and Weekly notifications successfully scheduled.');

    // 4. Attach listener to handle weekend skipping
    setupNotificationFilter();
  } catch (err) {
    console.error('[NotificationService] Failed to initialize local notifications:', err);
  }
};

/**
 * Checks Firestore for today's hours. If logged, cancels today's daily reminder.
 * Call this when the app opens or immediately after a user logs hours.
 */
export const checkAndSuppressDailyReminder = async (userId) => {
  if (!userId) return;

  const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  try {
    // Query Firestore timesheets collection for today's entry
    const q = query(
      collection(db, 'timesheets'),
      where('userId', '==', userId),
      where('date', '==', todayStr)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Hours already logged today -> cancel today's pending 5:30 PM notification
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });

      // Reschedule so the 5:30 PM alarm remains active for upcoming days
      await rescheduleDailyReminder();
    }
  } catch (err) {
    console.error('Error checking timesheet status for notifications:', err);
  }
};

/**
 * Re-arms the daily 5:30 PM reminder sequence for future days
 */
const rescheduleDailyReminder = async () => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'Timesheet Reminder',
          body: "Don't forget to record your site hours for today!",
          channelId: CHANNEL_ID,
          schedule: {
            on: { hour: 17, minute: 30 },
            repeats: true,
          },
        },
      ],
    });
  } catch (err) {
    console.error('Failed to reschedule daily reminder:', err);
  }
};

/**
 * Listener filter to cancel weekday alerts on weekends (Saturday & Sunday)
 */
const setupNotificationFilter = () => {
  LocalNotifications.addListener('localNotificationReceived', async (notification) => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday

    // Ignore daily weekday reminder on weekends
    if (notification.id === DAILY_REMINDER_ID && (dayOfWeek === 0 || dayOfWeek === 6)) {
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
    }
  });
};
