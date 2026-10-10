import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DAILY_REMINDER_ID_BASE = 1010; // Base ID for daily slots (e.g., 1011 to 1015 for Mon-Fri)
const WEEKLY_REMINDER_ID = 1002;
const CHANNEL_ID = 'timesheet_reminders';

/**
 * Request permissions, setup Android notification channels, and schedule upcoming weekday reminders
 */
export const initNotifications = async () => {
  try {
    console.log('[NotificationService] Initializing notifications...');

    // 1. Check and Request Notification Permissions FIRST
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }

    if (perm.display !== 'granted') {
      console.warn('[NotificationService] Notification permissions were NOT granted.');
      return;
    }

    // 2. Create High-Priority Notification Channel
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Timesheet Reminders',
      description: 'Daily and weekly reminders to log site hours',
      importance: 5,
      visibility: 1,
      vibration: true,
    });

    // 3. Clear existing daily slots (1011-1015) and weekly reminder to prevent duplicates
    await LocalNotifications.cancel({
      notifications: [
        { id: DAILY_REMINDER_ID_BASE + 1 },
        { id: DAILY_REMINDER_ID_BASE + 2 },
        { id: DAILY_REMINDER_ID_BASE + 3 },
        { id: DAILY_REMINDER_ID_BASE + 4 },
        { id: DAILY_REMINDER_ID_BASE + 5 },
        { id: WEEKLY_REMINDER_ID }
      ]
    });

    const notificationsToSchedule = [
      {
        id: WEEKLY_REMINDER_ID,
        title: 'Weekly Timesheet Due',
        body: "Don't forget to send your timesheet!",
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#4F46E5',
        schedule: {
          on: { weekday: 3, hour: 18, minute: 0 }, // Tuesday at 6:00 PM
          repeats: true,
        },
      }
    ];

    // 4. Generate upcoming weekday 5:30 PM triggers (looks ahead through the current/next 7 days)
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + i);
      targetDate.setHours(17, 30, 0, 0); // 5:30 PM

      const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

      // Only schedule if it's a weekday (Mon-Fri) and the time hasn't already passed today
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && targetDate > now) {
        notificationsToSchedule.push({
          id: DAILY_REMINDER_ID_BASE + dayOfWeek, // Unique ID per weekday (1 to 5)
          title: 'Timesheet Reminder',
          body: "Don't forget to record your site hours for today!",
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon',
          iconColor: '#4F46E5',
          schedule: {
            at: targetDate, // Exact target timestamp
          },
        });
      }
    }

    // 5. Schedule all notifications
    await LocalNotifications.schedule({
      notifications: notificationsToSchedule,
    });

    console.log('[NotificationService] Weekday and weekly notifications successfully scheduled.');
  } catch (err) {
    console.error('[NotificationService] Failed to initialize local notifications:', err);
  }
};

/**
 * Checks Firestore for today's hours. If logged, cancels today's daily reminder.
 */
export const checkAndSuppressDailyReminder = async (userId) => {
  if (!userId) return;

  const today = new Date().getDay();
  if (today === 0 || today === 6) return; // Skip on weekends

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const q = query(
      collection(db, 'timesheets'),
      where('userId', '==', userId),
      where('date', '==', todayStr)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Cancel today's specific weekday slot ID (e.g., DAILY_REMINDER_ID_BASE + 1 for Monday)
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID_BASE + today }] });
    }
  } catch (err) {
    console.error('Error checking timesheet status for notifications:', err);
  }
};

/**
 * Triggers an immediate practice notification after 3 seconds
 */
export const triggerTestNotification = async () => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title: 'SJR Timesheet Test',
          body: 'This is a practice notification to test your custom icon!',
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon',
          iconColor: '#4F46E5',
          schedule: {
            at: new Date(Date.now() + 3000),
          },
        },
      ],
    });
    console.log('[NotificationService] Test notification scheduled for 3 seconds from now.');
  } catch (err) {
    console.error('[NotificationService] Failed to schedule test notification:', err);
  }
};
