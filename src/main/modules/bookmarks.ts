import path from "path";
import { knex } from "knex";
import { FLOW_DATA_DIR } from "./paths";
import { createHash } from "crypto";
import type { 
  Bookmark,
  BookmarkFilter, 
  BookmarkCollection, 
  CreateBookmarkInput,
  UpdateBookmarkInput,
  UpdateCollectionInput,
  ImportStats 
} from "~/types/bookmarks";

const dbPath = path.join(FLOW_DATA_DIR, "bookmarks.db");

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

async function configureDatabasePragmas() {
  try {
    await db.raw("PRAGMA journal_mode = WAL");
    await db.raw("PRAGMA synchronous = NORMAL");
    await db.raw("PRAGMA cache_size = -64000");
    await db.raw("PRAGMA busy_timeout = 3000");
    console.log("BOOKMARKS: Configured SQLite pragmas for bookmarks database");
  } catch (err) {
    console.error("BOOKMARKS: Error configuring SQLite pragmas:", err);
  }
}

let databaseInitialized = false;
let resolveDatabaseInitialized: () => void = () => {
  databaseInitialized = true;
};
const whenDatabaseInitialized = new Promise<void>((resolve) => {
  if (databaseInitialized) {
    resolve();
  } else {
    resolveDatabaseInitialized = resolve;
  }
});

async function initDatabase() {
  try {
    console.log("BOOKMARKS: Starting database initialization...");

    await configureDatabasePragmas();

    const hasBookmarksTable = await db.schema.hasTable("bookmarks");
    if (!hasBookmarksTable) {
      await db.schema.createTable("bookmarks", (table) => {
        table.string("id").primary();
        table.string("url").notNullable().index();
        table.string("title").notNullable();
        table.text("description");
        table.string("favicon");
        table.string("profileId").notNullable().index();
        table.string("spaceId").notNullable().index();
        table.boolean("isGlobal").defaultTo(false);
        table.timestamp("dateAdded").notNullable();
        table.timestamp("dateModified");
        table.timestamp("deletedAt");
        table.integer("visitCount").defaultTo(0);
        table.timestamp("lastVisited");
      });
      console.log("BOOKMARKS: Created bookmarks table");
    }

    // Add deletedAt column if it doesn't exist
    const hasDeletedAtColumn = await db.schema.hasColumn("bookmarks", "deletedAt");
    if (!hasDeletedAtColumn) {
      await db.schema.alterTable("bookmarks", (table) => {
        table.timestamp("deletedAt");
      });
      console.log("BOOKMARKS: Added deletedAt column to bookmarks table");
    }

    const hasLabelsTable = await db.schema.hasTable("bookmark_labels");
    if (!hasLabelsTable) {
      await db.schema.createTable("bookmark_labels", (table) => {
        table.increments("id").primary();
        table.string("bookmarkId").references("id").inTable("bookmarks").onDelete("CASCADE");
        table.string("label").notNullable();
        table.string("source").notNullable(); // 'user' | 'ai' | 'auto'
        table.float("confidence"); // For AI labels
        table.string("category"); // 'topic' | 'type' | 'project' | 'priority'
        table.index(["bookmarkId", "label"]);
      });
      console.log("BOOKMARKS: Created bookmark_labels table");
    }

    const hasCollectionsTable = await db.schema.hasTable("bookmark_collections");
    if (!hasCollectionsTable) {
      await db.schema.createTable("bookmark_collections", (table) => {
        table.string("id").primary();
        table.string("name").notNullable();
        table.text("description");
        table.string("profileId").notNullable().index();
        table.string("spaceId").index();
        table.string("parentId").index(); // Parent collection ID
        table.boolean("isAuto").defaultTo(false);
        table.json("rules"); // For smart collections
        table.timestamp("dateCreated").notNullable();
        table.timestamp("dateModified");
        table.timestamp("deletedAt");
      });
      console.log("BOOKMARKS: Created bookmark_collections table");
    } else {
      // Check if parentId column exists, add it if not (migration)
      const hasParentIdColumn = await db.schema.hasColumn("bookmark_collections", "parentId");
      if (!hasParentIdColumn) {
        await db.schema.alterTable("bookmark_collections", (table) => {
          table.string("parentId").index();
        });
        console.log("BOOKMARKS: Added parentId column to bookmark_collections table");
      }
      
      // Check if deletedAt column exists, add it if not (migration)
      const hasDeletedAtColumn = await db.schema.hasColumn("bookmark_collections", "deletedAt");
      if (!hasDeletedAtColumn) {
        await db.schema.alterTable("bookmark_collections", (table) => {
          table.timestamp("deletedAt");
        });
        console.log("BOOKMARKS: Added deletedAt column to bookmark_collections table");
      }
    }

    const hasCollectionItemsTable = await db.schema.hasTable("collection_items");
    if (!hasCollectionItemsTable) {
      await db.schema.createTable("collection_items", (table) => {
        table.increments("id").primary();
        table.string("collectionId").references("id").inTable("bookmark_collections").onDelete("CASCADE");
        table.string("bookmarkId").references("id").inTable("bookmarks").onDelete("CASCADE");
        table.integer("position").defaultTo(0);
        table.unique(["collectionId", "bookmarkId"]);
      });
      console.log("BOOKMARKS: Created collection_items table");
    }

    // Snooze system tables
    const hasSnoozedItemsTable = await db.schema.hasTable("snoozed_items");
    if (!hasSnoozedItemsTable) {
      await db.schema.createTable("snoozed_items", (table) => {
        table.string("id").primary();
        table.string("itemType").notNullable(); // 'bookmark' | 'tab'
        table.string("itemId").notNullable(); // bookmarkId or tabId
        table.string("profileId").notNullable().index();
        table.string("spaceId").notNullable().index(); // Original space where item should wake up
        table.timestamp("snoozeUntil").notNullable().index(); // When item should wake up
        table.string("snoozeType").notNullable(); // 'later_today' | 'tomorrow' | 'next_week' | 'custom'
        table.string("snoozeLabel"); // Human-readable label like "Later today", "Tomorrow 9 AM"
        table.json("originalData"); // Store original bookmark/tab data for restoration
        table.timestamp("snoozedAt").notNullable();
        table.string("snoozedFromSpaceId"); // Space where snooze action was initiated
        table.boolean("notificationSent").defaultTo(false);
        table.timestamp("wakeUpNotifiedAt"); // When wake-up notification was sent
        table.index(["itemType", "itemId"]);
        table.index(["snoozeUntil", "notificationSent"]);
      });
      console.log("BOOKMARKS: Created snoozed_items table");
    }

    resolveDatabaseInitialized();
    console.log("BOOKMARKS: Database initialized successfully");
  } catch (err) {
    console.error("BOOKMARKS: Failed to initialize bookmark database:", err);
    throw err;
  }
}

// Initialize with retries
let retryCount = 0;
const maxRetries = 3;

async function initDatabaseWithRetry() {
  try {
    await initDatabase();
  } catch {
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(initDatabaseWithRetry, 1000 * retryCount);
    } else {
      console.error("BOOKMARKS: Failed to initialize database after multiple attempts");
      resolveDatabaseInitialized();
    }
  }
}

initDatabaseWithRetry();

// Types

// Re-export types from shared module for convenience
export type {
  Bookmark,
  BookmarkCollection,
  BookmarkLabel,
  CreateBookmarkInput,
  UpdateBookmarkInput,
  UpdateCollectionInput,
  BookmarkFilter,
  BookmarkViewMode,
  ImportStats
} from "~/types/bookmarks";

// CRUD Operations

export async function createBookmark(input: CreateBookmarkInput): Promise<Bookmark> {
  await whenDatabaseInitialized;
  
  console.log(`BOOKMARKS: Creating bookmark for URL: ${input.url}`);
  
  const id = createHash("md5").update(`${input.url}${input.profileId}${input.spaceId}${Date.now()}`).digest("hex");
  
  return await db.transaction(async (trx) => {
    const bookmark = {
      id,
      url: input.url,
      title: input.title,
      description: input.description || null,
      favicon: input.favicon || null,
      profileId: input.profileId,
      spaceId: input.spaceId,
      isGlobal: input.isGlobal || false,
      dateAdded: new Date(),
      visitCount: 0,
      lastVisited: null
    };
    
    console.log(`BOOKMARKS: Inserting bookmark with ID: ${id}`);
    
    await trx("bookmarks").insert(bookmark);
    
    if (input.labels && input.labels.length > 0) {
      const labelRecords = input.labels.map(label => ({
        bookmarkId: id,
        label,
        source: 'user' as const,
        category: null,
        confidence: null
      }));
      await trx("bookmark_labels").insert(labelRecords);
    }
    
    const result = await trx("bookmarks").where({ id }).first();
    const labels = await trx("bookmark_labels").where({ bookmarkId: id });
    
    console.log(`BOOKMARKS: Bookmark created successfully: ${id}`);
    
    return {
      ...result,
      labels: labels.map((l: any) => ({
        label: l.label,
        source: l.source,
        confidence: l.confidence,
        category: l.category
      }))
    };
  });
}

export async function getBookmark(id: string): Promise<Bookmark | null> {
  await whenDatabaseInitialized;
  
  const bookmark = await db("bookmarks").where({ id }).first();
  if (!bookmark) return null;
  
  const labels = await db("bookmark_labels").where({ bookmarkId: id });
  
  return {
    ...bookmark,
    labels: labels.map((l: any) => ({
      label: l.label,
      source: l.source,
      confidence: l.confidence,
      category: l.category
    }))
  };
}

export async function updateBookmark(id: string, input: UpdateBookmarkInput): Promise<Bookmark | null> {
  await whenDatabaseInitialized;
  
  return await db.transaction(async (trx) => {
    const exists = await trx("bookmarks").where({ id }).first();
    if (!exists) return null;
    
    const updates: any = {
      dateModified: new Date()
    };
    
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.favicon !== undefined) updates.favicon = input.favicon;
    if (input.isGlobal !== undefined) updates.isGlobal = input.isGlobal;
    
    await trx("bookmarks").where({ id }).update(updates);
    
    if (input.labels !== undefined) {
      await trx("bookmark_labels").where({ bookmarkId: id, source: 'user' }).delete();
      
      if (input.labels.length > 0) {
        const labelRecords = input.labels.map(label => ({
          bookmarkId: id,
          label,
          source: 'user' as const,
          category: null,
          confidence: null
        }));
        await trx("bookmark_labels").insert(labelRecords);
      }
    }
    
    // Handle adding labels without replacing existing ones (for AI labels)
    if (input.addLabels !== undefined && input.addLabels.length > 0) {
      // Get existing labels to avoid duplicates
      const existingLabels = await trx("bookmark_labels").where({ bookmarkId: id }).select('label');
      const existingLabelNames = existingLabels.map(l => l.label);
      
      // Filter out labels that already exist
      const newLabels = input.addLabels.filter(newLabel => 
        !existingLabelNames.includes(newLabel.label)
      );
      
      if (newLabels.length > 0) {
        const labelRecords = newLabels.map(label => ({
          bookmarkId: id,
          label: label.label,
          source: label.source,
          category: label.category || null,
          confidence: label.confidence || null
        }));
        await trx("bookmark_labels").insert(labelRecords);
      }
    }
    
    const result = await trx("bookmarks").where({ id }).first();
    const labels = await trx("bookmark_labels").where({ bookmarkId: id });
    
    return {
      ...result,
      labels: labels.map((l: any) => ({
        label: l.label,
        source: l.source,
        confidence: l.confidence,
        category: l.category
      }))
    };
  });
}

export async function deleteBookmark(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  const updatedCount = await db("bookmarks")
    .where({ id })
    .update({ 
      deletedAt: new Date(),
      dateModified: new Date()
    });
  
  return updatedCount > 0;
}

export async function restoreBookmark(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  const updatedCount = await db("bookmarks")
    .where({ id })
    .update({ 
      deletedAt: null,
      dateModified: new Date()
    });
  
  return updatedCount > 0;
}

export async function permanentlyDeleteBookmark(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  const transaction = await db.transaction();
  
  try {
    // Delete associated labels
    await transaction("bookmark_labels").where({ bookmarkId: id }).delete();
    
    // Delete from collections
    await transaction("collection_items").where({ bookmarkId: id }).delete();
    
    // Delete the bookmark
    const deletedCount = await transaction("bookmarks").where({ id }).delete();
    
    await transaction.commit();
    
    return deletedCount > 0;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deleteBookmarks(ids: string[]): Promise<number> {
  await whenDatabaseInitialized;
  
  const updatedCount = await db("bookmarks")
    .whereIn("id", ids)
    .update({ 
      deletedAt: new Date(),
      dateModified: new Date()
    });
  
  return updatedCount;
}

export async function getBookmarks(filter?: BookmarkFilter): Promise<Bookmark[]> {
  await whenDatabaseInitialized;
  
  let query = db("bookmarks").select("bookmarks.*");
  
  if (filter) {
    if (filter.profileId) {
      query = query.where(function() {
        this.where("bookmarks.profileId", filter.profileId).orWhere("bookmarks.isGlobal", true);
      });
    }
    
    if (filter.spaceId) {
      query = query.where("bookmarks.spaceId", filter.spaceId);
    }
    
    if (filter.isGlobal !== undefined) {
      query = query.where("bookmarks.isGlobal", filter.isGlobal);
    }
    
    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      query = query.where(function() {
        this.where("bookmarks.title", "like", searchTerm)
          .orWhere("bookmarks.url", "like", searchTerm)
          .orWhere("bookmarks.description", "like", searchTerm);
      });
    }
    
    if (filter.labels && filter.labels.length > 0) {
      query = query
        .join("bookmark_labels", "bookmarks.id", "bookmark_labels.bookmarkId")
        .whereIn("bookmark_labels.label", filter.labels)
        .groupBy("bookmarks.id")
        .having(db.raw("COUNT(DISTINCT bookmark_labels.label) = ?", [filter.labels.length]));
    }
    
    if (filter.collectionId) {
      query = query
        .join("collection_items", "bookmarks.id", "collection_items.bookmarkId")
        .where("collection_items.collectionId", filter.collectionId)
        .orderBy("collection_items.position");
    }

    // Handle deleted filter
    if (filter.onlyDeleted) {
      query = query.whereNotNull("bookmarks.deletedAt");
    } else if (!filter.includeDeleted) {
      // By default, exclude deleted bookmarks
      query = query.whereNull("bookmarks.deletedAt");
    }
  } else {
    // By default, exclude deleted bookmarks when no filter is provided
    query = query.whereNull("bookmarks.deletedAt");
  }
  
  query = query.orderBy("bookmarks.dateAdded", "desc");
  
  const bookmarks = await query;
  
  // Fetch labels for all bookmarks
  const bookmarkIds = bookmarks.map((b: any) => b.id);
  const labels = await db("bookmark_labels").whereIn("bookmarkId", bookmarkIds);
  
  const labelsByBookmark = labels.reduce((acc: any, label: any) => {
    if (!acc[label.bookmarkId]) acc[label.bookmarkId] = [];
    acc[label.bookmarkId].push({
      label: label.label,
      source: label.source,
      confidence: label.confidence,
      category: label.category
    });
    return acc;
  }, {});
  
  return bookmarks.map((b: any) => ({
    ...b,
    labels: labelsByBookmark[b.id] || []
  }));
}

export async function bookmarkExists(url: string, profileId: string, spaceId: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  const count = await db("bookmarks")
    .where({ url, profileId, spaceId })
    .count("* as count")
    .first();
  
  return (count && Number(count.count) > 0) ?? false;
}

export async function incrementVisitCount(id: string): Promise<void> {
  await whenDatabaseInitialized;
  
  await db("bookmarks")
    .where({ id })
    .update({
      visitCount: db.raw("visitCount + 1"),
      lastVisited: new Date()
    });
}

// Collection operations

export async function createCollection(input: {
  name: string;
  description?: string;
  profileId: string;
  spaceId?: string;
  parentId?: string;
  isAuto?: boolean;
  rules?: any;
}): Promise<BookmarkCollection> {
  await whenDatabaseInitialized;
  
  const id = createHash("md5").update(`${input.name}${input.profileId}${Date.now()}`).digest("hex");
  
  const collection = {
    id,
    name: input.name,
    description: input.description,
    profileId: input.profileId,
    spaceId: input.spaceId,
    parentId: input.parentId || null,
    isAuto: input.isAuto || false,
    rules: input.rules ? JSON.stringify(input.rules) : null,
    dateCreated: new Date()
  };
  
  await db("bookmark_collections").insert(collection);
  
  const result = await db("bookmark_collections").where({ id }).first();
  return {
    ...result,
    rules: result.rules ? JSON.parse(result.rules) : null
  };
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<BookmarkCollection | null> {
  await whenDatabaseInitialized;
  
  const updateData: any = {
    dateModified: new Date()
  };
  
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  
  const updatedRows = await db("bookmark_collections")
    .where({ id })
    .update(updateData);
  
  if (updatedRows === 0) {
    return null;
  }
  
  const result = await db("bookmark_collections").where({ id }).first();
  if (!result) {
    return null;
  }
  
  return {
    ...result,
    rules: result.rules ? JSON.parse(result.rules) : null
  };
}

export async function deleteCollection(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  return await db.transaction(async (trx) => {
    // First, check if this collection has child collections
    const childCollections = await trx("bookmark_collections")
      .where({ parentId: id })
      .whereNull("deletedAt") // Only consider non-deleted child collections
      .select("id");
    
    // Move child collections to have the same parent as the deleted collection
    if (childCollections.length > 0) {
      const parentCollection = await trx("bookmark_collections")
        .where({ id })
        .select("parentId")
        .first();
      
      const newParentId = parentCollection?.parentId || null;
      
      await trx("bookmark_collections")
        .whereIn("id", childCollections.map(c => c.id))
        .update({ 
          parentId: newParentId,
          dateModified: new Date()
        });
    }
    
    // Soft delete the collection by setting deletedAt timestamp
    const deletedRows = await trx("bookmark_collections")
      .where({ id })
      .whereNull("deletedAt") // Only delete if not already deleted
      .update({ 
        deletedAt: new Date(),
        dateModified: new Date()
      });
    
    return deletedRows > 0;
  });
}

export async function getCollections(profileId?: string): Promise<BookmarkCollection[]> {
  await whenDatabaseInitialized;
  
  let query = db("bookmark_collections")
    .select("bookmark_collections.*", db.raw("COUNT(collection_items.id) as bookmarkCount"))
    .leftJoin("collection_items", "bookmark_collections.id", "collection_items.collectionId")
    .whereNull("bookmark_collections.deletedAt") // Only get non-deleted collections
    .groupBy("bookmark_collections.id");
  
  if (profileId) {
    query = query.where("bookmark_collections.profileId", profileId);
  }
  
  const collections = await query;
  
  const processedCollections = collections.map((c: any) => ({
    ...c,
    rules: c.rules ? JSON.parse(c.rules) : null,
    bookmarkCount: Number(c.bookmarkCount),
    children: []
  }));
  
  // Build tree structure
  const collectionsMap = new Map<string, any>();
  const rootCollections: any[] = [];
  
  // First pass: create map of all collections
  processedCollections.forEach((collection: any) => {
    collectionsMap.set(collection.id, collection);
  });
  
  // Second pass: build hierarchy
  processedCollections.forEach((collection: any) => {
    if (collection.parentId) {
      const parent = collectionsMap.get(collection.parentId);
      if (parent) {
        parent.children.push(collection);
      } else {
        // Parent doesn't exist, treat as root
        rootCollections.push(collection);
      }
    } else {
      rootCollections.push(collection);
    }
  });
  
  // Flatten tree for current UI compatibility
  const flattenedCollections: any[] = [];
  
  function addCollectionAndChildren(collection: any, depth = 0) {
    flattenedCollections.push({
      ...collection,
      depth
    });
    
    // Sort children by dateCreated
    collection.children?.sort((a: any, b: any) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
    
    collection.children?.forEach((child: any) => 
      addCollectionAndChildren(child, depth + 1)
    );
  }
  
  // Sort root collections by dateCreated
  rootCollections.sort((a: any, b: any) => 
    new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
  );
  
  rootCollections.forEach((collection: any) => 
    addCollectionAndChildren(collection, 0)
  );
  
  return flattenedCollections;
}

export async function restoreCollection(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  const updatedCount = await db("bookmark_collections")
    .where({ id })
    .whereNotNull("deletedAt")
    .update({ 
      deletedAt: null,
      dateModified: new Date()
    });
  
  return updatedCount > 0;
}

export async function permanentlyDeleteCollection(id: string): Promise<boolean> {
  await whenDatabaseInitialized;
  
  return await db.transaction(async (trx) => {
    // Delete collection_items relationships
    await trx("collection_items")
      .where({ collectionId: id })
      .delete();
    
    // Permanently delete the collection
    const deletedRows = await trx("bookmark_collections")
      .where({ id })
      .delete();
    
    return deletedRows > 0;
  });
}

export async function getDeletedCollections(profileId?: string): Promise<BookmarkCollection[]> {
  await whenDatabaseInitialized;
  
  let query = db("bookmark_collections")
    .select("*")
    .whereNotNull("deletedAt");
  
  if (profileId) {
    query = query.where("profileId", profileId);
  }
  
  const collections = await query;
  
  return collections.map((c: any) => ({
    ...c,
    rules: c.rules ? JSON.parse(c.rules) : null,
    bookmarkCount: 0 // Deleted collections don't show bookmark counts
  }));
}

export async function addBookmarkToCollection(bookmarkId: string, collectionId: string): Promise<void> {
  await whenDatabaseInitialized;
  
  const maxPosition = await db("collection_items")
    .where({ collectionId })
    .max("position as max")
    .first();
  
  const position = (maxPosition?.max || 0) + 1;
  
  await db("collection_items").insert({
    bookmarkId,
    collectionId,
    position
  }).onConflict(["collectionId", "bookmarkId"]).ignore();
}

export async function removeBookmarkFromCollection(bookmarkId: string, collectionId: string): Promise<void> {
  await whenDatabaseInitialized;
  
  await db("collection_items")
    .where({ bookmarkId, collectionId })
    .delete();
}

export async function moveBookmarkToCollection(bookmarkId: string, fromCollectionId: string | null, toCollectionId: string): Promise<void> {
  await whenDatabaseInitialized;

  await db.transaction(async (trx) => {
    // Remove from the original collection if it exists
    if (fromCollectionId) {
      await trx("collection_items")
        .where({ bookmarkId, collectionId: fromCollectionId })
        .delete();
    }

    // Add to the new collection
    const maxPosition = await trx("collection_items")
      .where({ collectionId: toCollectionId })
      .max("position as max")
      .first();

    const position = (maxPosition?.max || 0) + 1;

    await trx("collection_items").insert({
      bookmarkId,
      collectionId: toCollectionId,
      position
    }).onConflict(["collectionId", "bookmarkId"]).ignore();
  });
}

export async function getBookmarksByUrl(url: string): Promise<Bookmark[]> {
  await whenDatabaseInitialized;
  
  const bookmarks = await db("bookmarks").where({ url });
  
  const bookmarkIds = bookmarks.map((b: any) => b.id);
  const labels = await db("bookmark_labels").whereIn("bookmarkId", bookmarkIds);
  
  const labelsByBookmark = labels.reduce((acc: any, label: any) => {
    if (!acc[label.bookmarkId]) acc[label.bookmarkId] = [];
    acc[label.bookmarkId].push({
      label: label.label,
      source: label.source,
      confidence: label.confidence,
      category: label.category
    });
    return acc;
  }, {});
  
  return bookmarks.map((b: any) => ({
    ...b,
    labels: labelsByBookmark[b.id] || []
  }));
}

// Import functionality


export async function importChromeBookmarks(
  htmlContent: string, 
  profileId: string, 
  spaceId: string
): Promise<ImportStats> {
  await whenDatabaseInitialized;
  
  const stats: ImportStats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // Parse Chrome's HTML bookmark format
    const bookmarks = parseChromeBookmarkHtml(htmlContent);
    stats.total = bookmarks.length;
    
    console.log(`BOOKMARKS: Starting import of ${stats.total} bookmarks`);
    
    for (const bookmark of bookmarks) {
      try {
        // Check if bookmark already exists
        const exists = await bookmarkExists(bookmark.url, profileId, spaceId);
        if (exists) {
          stats.skipped++;
          continue;
        }
        
        // Create bookmark
        await createBookmark({
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          profileId,
          spaceId,
          labels: bookmark.labels
        });
        
        stats.imported++;
      } catch (error) {
        console.error(`BOOKMARKS: Failed to import bookmark ${bookmark.url}:`, error);
        stats.errors++;
      }
    }
    
    console.log(`BOOKMARKS: Import completed - ${stats.imported} imported, ${stats.skipped} skipped, ${stats.errors} errors`);
    return stats;
    
  } catch (error) {
    console.error('BOOKMARKS: Failed to parse bookmark file:', error);
    throw new Error('Failed to parse bookmark file');
  }
}

interface ParsedBookmark {
  url: string;
  title: string;
  description?: string;
  labels?: string[];
}

function parseChromeBookmarkHtml(htmlContent: string): ParsedBookmark[] {
  const bookmarks: ParsedBookmark[] = [];
  
  // Chrome bookmark format uses <A> tags with HREF attributes
  // Match pattern: <A HREF="url" ADD_DATE="timestamp" ...>Title</A>
  const bookmarkRegex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
  
  let match;
  while ((match = bookmarkRegex.exec(htmlContent)) !== null) {
    const [, url, title] = match;
    
    // Skip empty or invalid URLs
    if (!url || !title || url.trim() === '' || title.trim() === '') {
      continue;
    }
    
    // Skip javascript: and other non-http(s) URLs except for common protocols
    if (!url.match(/^(https?|ftp|file):/i)) {
      continue;
    }
    
    bookmarks.push({
      url: url.trim(),
      title: title.trim(),
      description: undefined,
      labels: []
    });
  }
  
  return bookmarks;
}

export async function addAILabels(bookmarkId: string, aiLabels: Array<{label: string; confidence: number; category: string}>): Promise<Bookmark | null> {
  await whenDatabaseInitialized;
  
  return await db.transaction(async (trx) => {
    const exists = await trx("bookmarks").where({ id: bookmarkId }).first();
    if (!exists) return null;
    
    // Remove existing AI labels for this bookmark
    await trx("bookmark_labels").where({ bookmarkId, source: 'ai' }).delete();
    
    // Add new AI labels
    if (aiLabels.length > 0) {
      const labelRecords = aiLabels.map(aiLabel => ({
        bookmarkId,
        label: aiLabel.label,
        source: 'ai' as const,
        category: aiLabel.category,
        confidence: aiLabel.confidence
      }));
      await trx("bookmark_labels").insert(labelRecords);
    }
    
    // Return updated bookmark with all labels
    const result = await trx("bookmarks").where({ id: bookmarkId }).first();
    const labels = await trx("bookmark_labels").where({ bookmarkId });
    
    return {
      ...result,
      labels: labels.map((l: any) => ({
        label: l.label,
        source: l.source,
        confidence: l.confidence,
        category: l.category
      }))
    };
  });
}

