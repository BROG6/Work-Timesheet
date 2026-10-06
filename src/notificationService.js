import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DAILY_REMINDER_ID = 1001;
const WEEKLY_REMINDER_ID = 1002;

/**
 * Initialize permissions and schedule repeating local notifications
 */
export const initNotifications = async () => {
  try {
    // 1. Request Notification Permissions
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }

    if (perm.display !== 'granted') return;

    // 2. Schedule Daily Weekday Reminder (Mon–Fri at 5:30 PM)
    // Note: Capacitor Local Notifications repeat via matching schedule parameters
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'Timesheet Reminder',
          body: "Don't forget to record your site hours for today!",
          schedule: {
            on: { hour: 17, minute: 30 }, // 5:30 PM
            repeats: true,
          },
        },
        {
          id: WEEKLY_REMINDER_ID,
          title: 'Weekly Timesheet Due',
          body: 'It is Tuesday 6:00 PM—please submit your weekly timesheet for manager review.',
          schedule: {
            on: { weekday: 3, hour: 18, minute: 0 }, // 3 = Tuesday in Capacitor (1: Sun, 2: Mon, 3: Tue...)
            repeats: true,
          },
        },
      ],
    });

    // 3. Attach a listener to clear/cancel daily notifications if today's entry is completed
    await setupNotificationFilter();
  } catch (err) {
    console.error('Failed to initialize local notifications:', err);
  }
};

/**
 * Checks Firestore to see if the user has logged hours today.
 * If logged, suppress the 5:30 PM notification for today.
 */
export const checkAndSuppressDailyReminder = async (userId) => {
  if (!userId) return;

  const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  try {
    // Query your timesheets/entries collection for today's entry
    const q = query(
      collection(db, 'timesheets'),
      where('userId', '==', userId),
      where('date', '==', todayStr)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // User has already completed today's timesheet!
      // Cancel pending daily notification for today
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });

      // Reschedule for tomorrow so future days stay active
      await rescheduleDailyReminder();
    }
  } catch (err) {
    console.error('Error checking timesheet status for notifications:', err);
  }
};

// Re-arm the daily 5:30 PM trigger for future days
const rescheduleDailyReminder = async () => {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_ID,
        title: 'Timesheet Reminder',
        body: "Don't forget to record your site hours for today!",
        schedule: {
          on: { hour: 17, minute: 30 },
          repeats: true,
        },
      },
    ],
  });
};

const setupNotificationFilter = async () => {
  // Listen for incoming notifications when app is active
  LocalNotifications.addListener('localNotificationReceived', async (notification) => {
    // Weekend check for daily reminder (1 = Sun, 7 = Sat)
    const dayOfWeek = new Date().getDay(); // 0 = Sun, 6 = Sat
    if (notification.id === DAILY_REMINDER_ID && (dayOfWeek === 0 || dayOfWeek === 6)) {
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
    }
  });
};
