import type { SnoozedItem, CreateSnoozedItemInput, SnoozeFilter, WakeUpNotification } from "~/types/snooze";

export interface SnoozeFlowInterface {
  // Snooze operations
  "snooze:create": (input: CreateSnoozedItemInput) => Promise<{ success: boolean; data?: SnoozedItem; error?: string }>;
  "snooze:getAll": (filter?: SnoozeFilter) => Promise<{ success: boolean; data?: SnoozedItem[]; error?: string }>;
  "snooze:getById": (id: string) => Promise<{ success: boolean; data?: SnoozedItem; error?: string }>;
  "snooze:update": (
    id: string,
    updates: Partial<SnoozedItem>
  ) => Promise<{ success: boolean; data?: SnoozedItem; error?: string }>;
  "snooze:delete": (id: string) => Promise<{ success: boolean; error?: string }>;
  "snooze:wakeUp": (id: string) => Promise<{ success: boolean; error?: string }>;

  // Batch operations
  "snooze:wakeUpDue": () => Promise<{
    success: boolean;
    data?: { wokenUp: number; notifications: WakeUpNotification[] };
    error?: string;
  }>;
  "snooze:bulkWakeUp": (
    ids: string[]
  ) => Promise<{ success: boolean; data?: { wokenUp: number; failed: string[] }; error?: string }>;

  // Utility operations
  "snooze:checkDueItems": () => Promise<{ success: boolean; data?: SnoozedItem[]; error?: string }>;
  "snooze:markNotificationSent": (id: string) => Promise<{ success: boolean; error?: string }>;

  // Statistics
  "snooze:getStats": (profileId?: string) => Promise<{
    success: boolean;
    data?: {
      totalSnoozed: number;
      dueToday: number;
      overdue: number;
      byType: Record<string, number>;
    };
    error?: string;
  }>;
}
