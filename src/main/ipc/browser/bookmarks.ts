import { ipcMain } from "electron";
import {
  createBookmark,
  getBookmark,
  updateBookmark,
  deleteBookmark,
  deleteBookmarks,
  getBookmarks,
  bookmarkExists,
  incrementVisitCount,
  createCollection,
  getCollections,
  addBookmarkToCollection,
  removeBookmarkFromCollection,
  getBookmarksByUrl,
  importChromeBookmarks,
  type Bookmark,
  type BookmarkCollection,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
  type BookmarkFilter,
  type ImportStats
} from "@/modules/bookmarks";

// Bookmark CRUD operations
ipcMain.handle("bookmarks:create", async (_, input: CreateBookmarkInput): Promise<Bookmark> => {
  return await createBookmark(input);
});

ipcMain.handle("bookmarks:get", async (_, id: string): Promise<Bookmark | null> => {
  return await getBookmark(id);
});

ipcMain.handle("bookmarks:update", async (_, id: string, input: UpdateBookmarkInput): Promise<Bookmark | null> => {
  return await updateBookmark(id, input);
});

ipcMain.handle("bookmarks:delete", async (_, id: string): Promise<boolean> => {
  return await deleteBookmark(id);
});

ipcMain.handle("bookmarks:deleteMany", async (_, ids: string[]): Promise<number> => {
  return await deleteBookmarks(ids);
});

ipcMain.handle("bookmarks:getAll", async (_, filter?: BookmarkFilter): Promise<Bookmark[]> => {
  return await getBookmarks(filter);
});

ipcMain.handle("bookmarks:exists", async (_, url: string, profileId: string, spaceId: string): Promise<boolean> => {
  return await bookmarkExists(url, profileId, spaceId);
});

ipcMain.handle("bookmarks:incrementVisit", async (_, id: string): Promise<void> => {
  return await incrementVisitCount(id);
});

ipcMain.handle("bookmarks:getByUrl", async (_, url: string): Promise<Bookmark[]> => {
  return await getBookmarksByUrl(url);
});

// Collection operations
ipcMain.handle("bookmarks:collections:create", async (_, input: {
  name: string;
  description?: string;
  profileId: string;
  spaceId?: string;
  isAuto?: boolean;
  rules?: any;
}): Promise<BookmarkCollection> => {
  return await createCollection(input);
});

ipcMain.handle("bookmarks:collections:getAll", async (_, profileId?: string): Promise<BookmarkCollection[]> => {
  return await getCollections(profileId);
});

ipcMain.handle("bookmarks:collections:addBookmark", async (_, bookmarkId: string, collectionId: string): Promise<void> => {
  return await addBookmarkToCollection(bookmarkId, collectionId);
});

ipcMain.handle("bookmarks:collections:removeBookmark", async (_, bookmarkId: string, collectionId: string): Promise<void> => {
  return await removeBookmarkFromCollection(bookmarkId, collectionId);
});

// Import/Export operations
ipcMain.handle("bookmarks:importChrome", async (_, htmlContent: string, profileId: string, spaceId: string): Promise<ImportStats> => {
  return await importChromeBookmarks(htmlContent, profileId, spaceId);
});