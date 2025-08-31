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
  deletedAt?: Date;
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
  parentId?: string;
  isAuto: boolean;
  rules?: any;
  dateCreated: Date;
  dateModified?: Date;
  bookmarkCount?: number;
  children?: BookmarkCollection[];
  depth?: number;
}

export interface CreateBookmarkInput {
  url: string;
  title: string;
  profileId: string;
  spaceId: string;
  description?: string;
  favicon?: string;
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

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}

export interface BookmarkFilter {
  profileId?: string;
  spaceId?: string;
  labels?: string[];
  search?: string;
  isGlobal?: boolean;
  collectionId?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export interface BookmarkViewMode {
  type: 'card' | 'list' | 'grid';
  sortBy: 'dateAdded' | 'title' | 'visitCount' | 'lastVisited';
  sortOrder: 'asc' | 'desc';
}

export interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}