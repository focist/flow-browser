import { ipcMain } from "electron";
import { snoozeService } from "../modules/snooze";
import type { CreateSnoozedItemInput, SnoozeFilter, SnoozedItem } from "~/types/snooze";

// Create a new snoozed item
ipcMain.handle("snooze:create", async (_, input: CreateSnoozedItemInput) => {
  try {
    const snoozedItem = await snoozeService.create(input);
    return { success: true, data: snoozedItem };
  } catch (error) {
    console.error("Failed to create snoozed item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Get all snoozed items
ipcMain.handle("snooze:getAll", async (_, filter?: SnoozeFilter) => {
  try {
    const items = await snoozeService.getAll(filter);
    return { success: true, data: items };
  } catch (error) {
    console.error("Failed to get snoozed items:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Get snoozed item by ID
ipcMain.handle("snooze:getById", async (_, id: string) => {
  try {
    const item = await snoozeService.getById(id);
    if (!item) {
      return { success: false, error: "Snoozed item not found" };
    }
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to get snoozed item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Update snoozed item
ipcMain.handle("snooze:update", async (_, id: string, updates: Partial<SnoozedItem>) => {
  try {
    const item = await snoozeService.update(id, updates);
    if (!item) {
      return { success: false, error: "Snoozed item not found" };
    }
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to update snoozed item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Delete snoozed item
ipcMain.handle("snooze:delete", async (_, id: string) => {
  try {
    const success = await snoozeService.delete(id);
    if (!success) {
      return { success: false, error: "Snoozed item not found" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to delete snoozed item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Wake up snoozed item
ipcMain.handle("snooze:wakeUp", async (_, id: string) => {
  try {
    const success = await snoozeService.wakeUp(id);
    if (!success) {
      return { success: false, error: "Snoozed item not found" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to wake up snoozed item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Wake up all due items
ipcMain.handle("snooze:wakeUpDue", async () => {
  try {
    const result = await snoozeService.wakeUpDue();
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to wake up due items:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Bulk wake up items
ipcMain.handle("snooze:bulkWakeUp", async (_, ids: string[]) => {
  try {
    const result = await snoozeService.bulkWakeUp(ids);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to bulk wake up items:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Check for due items
ipcMain.handle("snooze:checkDueItems", async () => {
  try {
    const items = await snoozeService.checkDueItems();
    return { success: true, data: items };
  } catch (error) {
    console.error("Failed to check due items:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Mark notification as sent
ipcMain.handle("snooze:markNotificationSent", async (_, id: string) => {
  try {
    const success = await snoozeService.markNotificationSent(id);
    if (!success) {
      return { success: false, error: "Snoozed item not found" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification sent:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

// Get snooze statistics
ipcMain.handle("snooze:getStats", async (_, profileId?: string) => {
  try {
    const stats = await snoozeService.getStats(profileId);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Failed to get snooze stats:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});

console.log("Snooze IPC handlers registered");
