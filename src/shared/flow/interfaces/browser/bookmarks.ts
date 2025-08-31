import { Bookmark, BookmarkCollection, CreateBookmarkInput, UpdateBookmarkInput, UpdateCollectionInput, BookmarkFilter, ImportStats } from "~/types/bookmarks";

export interface FlowBookmarksAPI {
  create(input: CreateBookmarkInput): Promise<Bookmark>;
  get(id: string): Promise<Bookmark | null>;
  update(id: string, input: UpdateBookmarkInput): Promise<Bookmark | null>;
  delete(id: string): Promise<boolean>;
  deleteMany(ids: string[]): Promise<number>;
  getAll(filter?: BookmarkFilter): Promise<Bookmark[]>;
  exists(url: string, profileId: string, spaceId: string): Promise<boolean>;
  incrementVisit(id: string): Promise<void>;
  getByUrl(url: string): Promise<Bookmark[]>;
  restore(id: string): Promise<boolean>;
  permanentlyDelete(id: string): Promise<boolean>;
  
  collections: {
    create(input: {
      name: string;
      description?: string;
      profileId: string;
      spaceId?: string;
      parentId?: string;
      isAuto?: boolean;
      rules?: any;
    }): Promise<BookmarkCollection>;
    update(id: string, input: UpdateCollectionInput): Promise<BookmarkCollection | null>;
    delete(id: string): Promise<boolean>;
    getAll(profileId?: string): Promise<BookmarkCollection[]>;
    addBookmark(bookmarkId: string, collectionId: string): Promise<void>;
    removeBookmark(bookmarkId: string, collectionId: string): Promise<void>;
  };
  
  importChrome(htmlContent: string, profileId: string, spaceId: string): Promise<ImportStats>;
}