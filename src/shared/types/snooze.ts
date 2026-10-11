export type SnoozeType = 'later_today' | 'tomorrow' | 'next_week' | 'custom';
export type SnoozeItemType = 'bookmark' | 'tab';

export interface SnoozedItem {
  id: string;
  itemType: SnoozeItemType;
  itemId: string; // bookmarkId or tabId
  profileId: string;
  spaceId: string; // Original space where item should wake up
  snoozeUntil: Date;
  snoozeType: SnoozeType;
  snoozeLabel: string; // Human-readable label like "Later today", "Tomorrow 9 AM"
  originalData: any; // Store original bookmark/tab data for restoration
  snoozedAt: Date;
  snoozedFromSpaceId: string; // Space where snooze action was initiated
  notificationSent: boolean;
  wakeUpNotifiedAt?: Date; // When wake-up notification was sent
}

export interface CreateSnoozedItemInput {
  itemType: SnoozeItemType;
  itemId: string;
  profileId: string;
  spaceId: string;
  snoozeUntil: Date;
  snoozeType: SnoozeType;
  snoozeLabel: string;
  originalData: any;
  snoozedFromSpaceId: string;
}

export interface SnoozePreset {
  id: string;
  label: string;
  type: SnoozeType;
  getSnoozeTime: () => Date;
  description?: string;
}

export interface SnoozeFilter {
  itemType?: SnoozeItemType;
  profileId?: string;
  spaceId?: string;
  isActive?: boolean; // false = already woken up
  dueBeforeDate?: Date;
  dueAfterDate?: Date;
}

export interface WakeUpNotification {
  id: string;
  snoozedItem: SnoozedItem;
  title: string;
  message: string;
  actions: WakeUpAction[];
}

export interface WakeUpAction {
  id: string;
  label: string;
  type: 'open' | 'snooze_again' | 'dismiss';
  data?: any;
}

// Predefined snooze presets
export const SNOOZE_PRESETS: SnoozePreset[] = [
  {
    id: 'later_today',
    label: 'Later today',
    type: 'later_today',
    description: '6 PM today',
    getSnoozeTime: () => {
      const now = new Date();
      const later = new Date(now);
      later.setHours(18, 0, 0, 0); // 6 PM today
      
      // If it's already past 6 PM, snooze until 9 AM tomorrow
      if (later <= now) {
        later.setDate(later.getDate() + 1);
        later.setHours(9, 0, 0, 0);
      }
      
      return later;
    }
  },
  {
    id: 'tomorrow_morning',
    label: 'Tomorrow',
    type: 'tomorrow',
    description: '9 AM tomorrow',
    getSnoozeTime: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      return tomorrow;
    }
  },
  {
    id: 'this_weekend',
    label: 'This weekend',
    type: 'next_week',
    description: 'Saturday 10 AM',
    getSnoozeTime: () => {
      const now = new Date();
      const saturday = new Date(now);
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7; // 6 = Saturday
      
      if (daysUntilSaturday === 0 && now.getHours() >= 10) {
        // If it's already Saturday and past 10 AM, move to next Saturday
        saturday.setDate(saturday.getDate() + 7);
      } else {
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
      }
      
      saturday.setHours(10, 0, 0, 0); // 10 AM Saturday
      return saturday;
    }
  },
  {
    id: 'next_week',
    label: 'Next week',
    type: 'next_week',
    description: 'Monday 9 AM',
    getSnoozeTime: () => {
      const now = new Date();
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 - now.getDay() + 7) % 7; // 1 = Monday
      
      if (daysUntilMonday === 0) {
        // If it's Monday, snooze until next Monday
        nextMonday.setDate(nextMonday.getDate() + 7);
      } else {
        nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      }
      
      nextMonday.setHours(9, 0, 0, 0); // 9 AM next Monday
      return nextMonday;
    }
  }
];