import path from "path";
import { knex } from "knex";
import { FLOW_DATA_DIR } from "./paths";
import { randomUUID } from "crypto";
import type {
  SnoozedItem,
  CreateSnoozedItemInput,
  SnoozeFilter,
  WakeUpNotification,
  WakeUpAction
} from "~/types/snooze";

// Raw database row for snoozed_items (dates stored as ISO strings, JSON as text)
interface SnoozedItemRow {
  id: string;
  itemType: SnoozedItem["itemType"];
  itemId: string;
  profileId: string;
  spaceId: string;
  snoozeUntil: string;
  snoozeType: SnoozedItem["snoozeType"];
  snoozeLabel: string;
  originalData: string | null;
  snoozedAt: string;
  snoozedFromSpaceId: string;
  notificationSent: number | boolean;
  wakeUpNotifiedAt?: string | null;
}

const dbPath = path.join(FLOW_DATA_DIR, "bookmarks.db"); // Reuse bookmarks database

const db = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: dbPath
  },
  pool: {
    min: 1,
    max: 5,
    acquireTimeoutMillis: 1000,
    createTimeoutMillis: 1000
  },
  asyncStackTraces: false
});

class SnoozeService {
  // Create a new snoozed item
  async create(input: CreateSnoozedItemInput): Promise<SnoozedItem> {
    const id = randomUUID();
    const now = new Date();

    const snoozedItem: SnoozedItem = {
      id,
      ...input,
      snoozedAt: now,
      notificationSent: false
    };

    await db("snoozed_items").insert({
      id,
      itemType: input.itemType,
      itemId: input.itemId,
      profileId: input.profileId,
      spaceId: input.spaceId,
      snoozeUntil: input.snoozeUntil.toISOString(),
      snoozeType: input.snoozeType,
      snoozeLabel: input.snoozeLabel,
      originalData: JSON.stringify(input.originalData),
      snoozedAt: now.toISOString(),
      snoozedFromSpaceId: input.snoozedFromSpaceId,
      notificationSent: false,
      wakeUpNotifiedAt: null
    });

    return snoozedItem;
  }

  // Get all snoozed items with optional filtering
  async getAll(filter?: SnoozeFilter): Promise<SnoozedItem[]> {
    let query = db("snoozed_items").select("*");

    if (filter?.itemType) {
      query = query.where("itemType", filter.itemType);
    }

    if (filter?.profileId) {
      query = query.where("profileId", filter.profileId);
    }

    if (filter?.spaceId) {
      query = query.where("spaceId", filter.spaceId);
    }

    if (filter?.isActive !== undefined) {
      if (filter.isActive) {
        // Active = not yet due or due but not processed
        query = query.where("snoozeUntil", ">", new Date().toISOString());
      } else {
        // Inactive = already due and processed
        query = query.where("snoozeUntil", "<=", new Date().toISOString());
      }
    }

    if (filter?.dueBeforeDate) {
      query = query.where("snoozeUntil", "<", filter.dueBeforeDate.toISOString());
    }

    if (filter?.dueAfterDate) {
      query = query.where("snoozeUntil", ">", filter.dueAfterDate.toISOString());
    }

    query = query.orderBy("snoozeUntil", "asc");

    const rows = await query;
    return rows.map(this.mapRowToSnoozedItem);
  }

  // Get a specific snoozed item by ID
  async getById(id: string): Promise<SnoozedItem | null> {
    const row = await db("snoozed_items").where("id", id).first();
    return row ? this.mapRowToSnoozedItem(row) : null;
  }

  // Update a snoozed item
  async update(id: string, updates: Partial<SnoozedItem>): Promise<SnoozedItem | null> {
    const updateData: Record<string, unknown> = {};

    if (updates.snoozeUntil) updateData.snoozeUntil = updates.snoozeUntil.toISOString();
    if (updates.snoozeType) updateData.snoozeType = updates.snoozeType;
    if (updates.snoozeLabel) updateData.snoozeLabel = updates.snoozeLabel;
    if (updates.originalData) updateData.originalData = JSON.stringify(updates.originalData);
    if (updates.notificationSent !== undefined) updateData.notificationSent = updates.notificationSent;
    if (updates.wakeUpNotifiedAt) updateData.wakeUpNotifiedAt = updates.wakeUpNotifiedAt.toISOString();

    const affected = await db("snoozed_items").where("id", id).update(updateData);

    if (affected === 0) {
      return null;
    }

    return await this.getById(id);
  }

  // Delete a snoozed item
  async delete(id: string): Promise<boolean> {
    const affected = await db("snoozed_items").where("id", id).del();
    return affected > 0;
  }

  // Wake up a specific item (remove from snooze)
  async wakeUp(id: string): Promise<boolean> {
    // In Gmail-style snoozing, waking up means removing the snooze record
    // The original item remains in place
    return await this.delete(id);
  }

  // Check for items that are due to wake up
  async checkDueItems(): Promise<SnoozedItem[]> {
    const now = new Date();
    const rows = await db("snoozed_items").where("snoozeUntil", "<=", now.toISOString()).orderBy("snoozeUntil", "asc");

    return rows.map(this.mapRowToSnoozedItem);
  }

  // Wake up all due items and generate notifications
  async wakeUpDue(): Promise<{ wokenUp: number; notifications: WakeUpNotification[] }> {
    const dueItems = await this.checkDueItems();
    const notifications: WakeUpNotification[] = [];
    let wokenUp = 0;

    for (const item of dueItems) {
      // Create wake-up notification
      const notification = this.createWakeUpNotification(item);
      notifications.push(notification);

      // Remove from snooze (wake up)
      await this.delete(item.id);
      wokenUp++;
    }

    return { wokenUp, notifications };
  }

  // Bulk wake up multiple items
  async bulkWakeUp(ids: string[]): Promise<{ wokenUp: number; failed: string[] }> {
    const failed: string[] = [];
    let wokenUp = 0;

    for (const id of ids) {
      const success = await this.wakeUp(id);
      if (success) {
        wokenUp++;
      } else {
        failed.push(id);
      }
    }

    return { wokenUp, failed };
  }

  // Mark that a wake-up notification has been sent
  async markNotificationSent(id: string): Promise<boolean> {
    const affected = await db("snoozed_items").where("id", id).update({
      notificationSent: true,
      wakeUpNotifiedAt: new Date().toISOString()
    });

    return affected > 0;
  }

  // Get snooze statistics
  async getStats(profileId?: string): Promise<{
    totalSnoozed: number;
    dueToday: number;
    overdue: number;
    byType: Record<string, number>;
  }> {
    let query = db("snoozed_items");

    if (profileId) {
      query = query.where("profileId", profileId);
    }

    const allItems = await query.select("*");
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const totalSnoozed = allItems.length;
    const dueToday = allItems.filter((item) => {
      const dueDate = new Date(item.snoozeUntil);
      return dueDate >= now && dueDate <= endOfToday;
    }).length;
    const overdue = allItems.filter((item) => {
      const dueDate = new Date(item.snoozeUntil);
      return dueDate < now;
    }).length;

    const byType: Record<string, number> = {};
    allItems.forEach((item) => {
      byType[item.itemType] = (byType[item.itemType] || 0) + 1;
    });

    return {
      totalSnoozed,
      dueToday,
      overdue,
      byType
    };
  }

  // Helper method to map database row to SnoozedItem
  private mapRowToSnoozedItem(row: SnoozedItemRow): SnoozedItem {
    return {
      id: row.id,
      itemType: row.itemType,
      itemId: row.itemId,
      profileId: row.profileId,
      spaceId: row.spaceId,
      snoozeUntil: new Date(row.snoozeUntil),
      snoozeType: row.snoozeType,
      snoozeLabel: row.snoozeLabel,
      originalData: JSON.parse(row.originalData || "{}") as SnoozedItem["originalData"],
      snoozedAt: new Date(row.snoozedAt),
      snoozedFromSpaceId: row.snoozedFromSpaceId,
      notificationSent: Boolean(row.notificationSent),
      wakeUpNotifiedAt: row.wakeUpNotifiedAt ? new Date(row.wakeUpNotifiedAt) : undefined
    };
  }

  // Helper method to create wake-up notifications
  private createWakeUpNotification(item: SnoozedItem): WakeUpNotification {
    const actions: WakeUpAction[] = [
      {
        id: "open",
        label: "Open",
        type: "open",
        data: { itemId: item.itemId, spaceId: item.spaceId }
      },
      {
        id: "snooze_again",
        label: "Snooze Again",
        type: "snooze_again",
        data: { originalSnoozeId: item.id }
      },
      {
        id: "dismiss",
        label: "Dismiss",
        type: "dismiss"
      }
    ];

    let title = "";
    let message = "";

    if (item.itemType === "bookmark") {
      title = "Snoozed Bookmark Ready";
      message = `Your bookmark "${item.originalData.title || "Untitled"}" is ready`;
    } else if (item.itemType === "tab") {
      title = "Snoozed Tab Ready";
      message = `Your tab "${item.originalData.title || "Untitled"}" is ready`;
    }

    return {
      id: randomUUID(),
      snoozedItem: item,
      title,
      message,
      actions
    };
  }
}

export const snoozeService = new SnoozeService();
