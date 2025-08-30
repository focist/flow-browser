import path from "path";
import { knex } from "knex";
import { FLOW_DATA_DIR } from "./paths";
import { createHash } from "crypto";

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
        table.integer("visitCount").defaultTo(0);
        table.timestamp("lastVisited");
      });
      console.log("BOOKMARKS: Created bookmarks table");
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
        table.boolean("isAuto").defaultTo(false);
        table.json("rules"); // For smart collections
        table.timestamp("dateCreated").notNullable();
        table.timestamp("dateModified");
      });
      console.log("BOOKMARKS: Created bookmark_collections table");
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
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  profileId: string;
  spaceId: string;
  isGlobal?: boolean;
  dateAdded: Date;
  dateModified?: Date;
  visitCount: number;
  lastVisited?: Date;
  labels?: BookmarkLabel[];
  collections?: string[];
}

export interface BookmarkLabel {
  label: string;
  source: 'user' | 'ai' | 'auto';
  confidence?: number;
  category?: 'topic' | 'type' | 'project' | 'priority';
}

export interface BookmarkCollection {
  id: string;
  name: string;
  description?: string;
  profileId: string;
  spaceId?: string;
  isAuto: boolean;
  rules?: any;
  dateCreated: Date;
  dateModified?: Date;
  bookmarkCount?: number;
}

export interface CreateBookmarkInput {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  profileId: string;
  spaceId: string;
  isGlobal?: boolean;
  labels?: string[];
}

export interface UpdateBookmarkInput {
  title?: string;
  description?: string;
  favicon?: string;
  isGlobal?: boolean;
  labels?: string[];
}

export interface BookmarkFilter {
  profileId?: string;
  spaceId?: string;
  labels?: string[];
  search?: string;
  isGlobal?: boolean;
  collectionId?: string;
}

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
  
  const deletedCount = await db("bookmarks").where({ id }).delete();
  return deletedCount > 0;
}

export async function deleteBookmarks(ids: string[]): Promise<number> {
  await whenDatabaseInitialized;
  
  const deletedCount = await db("bookmarks").whereIn("id", ids).delete();
  return deletedCount;
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

export async function getCollections(profileId?: string): Promise<BookmarkCollection[]> {
  await whenDatabaseInitialized;
  
  let query = db("bookmark_collections")
    .select("bookmark_collections.*", db.raw("COUNT(collection_items.id) as bookmarkCount"))
    .leftJoin("collection_items", "bookmark_collections.id", "collection_items.collectionId")
    .groupBy("bookmark_collections.id");
  
  if (profileId) {
    query = query.where("bookmark_collections.profileId", profileId);
  }
  
  const collections = await query;
  
  return collections.map((c: any) => ({
    ...c,
    rules: c.rules ? JSON.parse(c.rules) : null,
    bookmarkCount: Number(c.bookmarkCount)
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

export interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

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