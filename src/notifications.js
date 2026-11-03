import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DAILY_REMINDER_ID_BASE = 1010; // Base ID for daily slots (1011 to 1015 for Mon-Fri)
const H_S_WEEKLY_REMINDER_ID = 1002;
const TIMESHEET_WEEKLY_REMINDER_ID = 1003;
const CHANNEL_ID = 'timesheet_reminders';

/**
 * Request permissions, setup Android notification channels, and schedule upcoming reminders
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
      name: 'Site Reminders',
      description: 'Daily and weekly reminders for timesheets and H&S documents',
      importance: 5,
      visibility: 1,
      vibration: true,
    });

    // 3. Clear existing notification slots to prevent duplicates
    await LocalNotifications.cancel({
      notifications: [
        { id: 1001 },
        { id: DAILY_REMINDER_ID_BASE + 1 },
        { id: DAILY_REMINDER_ID_BASE + 2 },
        { id: DAILY_REMINDER_ID_BASE + 3 },
        { id: DAILY_REMINDER_ID_BASE + 4 },
        { id: DAILY_REMINDER_ID_BASE + 5 },
        { id: H_S_WEEKLY_REMINDER_ID },
        { id: TIMESHEET_WEEKLY_REMINDER_ID }
      ]
    });

    const notificationsToSchedule = [
      // Monday H&S Reminder
      {
        id: H_S_WEEKLY_REMINDER_ID,
        title: 'Health & Safety Reminder',
        body: "Don't forget to send your health and safety documents to the office!",
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#4F46E5',
        schedule: {
          on: { weekday: 2, hour: 7, minute: 30 }, // Monday at 7:30 AM (Capacitor: 2 = Monday)
          repeats: true,
        },
      },
      // Tuesday Timesheet Reminder
      {
        id: TIMESHEET_WEEKLY_REMINDER_ID,
        title: 'Weekly Timesheet Due',
        body: "Don't forget to send your timesheet!",
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#4F46E5',
        schedule: {
          on: { weekday: 3, hour: 18, minute: 0 }, // Tuesday at 6:00 PM (Capacitor: 3 = Tuesday)
          repeats: true,
        },
      }
    ];

    // 4. Generate upcoming weekday 5:30 PM triggers for daily hours
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + i);
      targetDate.setHours(17, 30, 0, 0); // 5:30 PM

      const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

      if (dayOfWeek >= 1 && dayOfWeek <= 5 && targetDate > now) {
        notificationsToSchedule.push({
          id: DAILY_REMINDER_ID_BASE + dayOfWeek,
          title: 'Timesheet Reminder',
          body: "Don't forget to record your site hours for today!",
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon',
          iconColor: '#4F46E5',
          schedule: {
            at: targetDate,
          },
        });
      }
    }

    // 5. Schedule all notifications
    await LocalNotifications.schedule({
      notifications: notificationsToSchedule,
    });

    console.log('[NotificationService] All notifications successfully scheduled.');
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
  if (today === 0 || today === 6) return;

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const q = query(
      collection(db, 'timesheets'),
      where('userId', '==', userId),
      where('date', '==', todayStr)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
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
