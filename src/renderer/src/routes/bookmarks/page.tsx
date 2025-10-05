import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Grid3X3, 
  List, 
  LayoutGrid,
  Star,
  BookmarkIcon,
  Tag,
  Calendar,
  ExternalLink,
  Trash2,
  Edit3,
  Upload,
  CloudUpload,
  RotateCcw,
  X,
  Link,
  Info,
  Folder,
  FolderPlus,
  ChevronRight,
  Pencil,
  Sparkles,
  FileText
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Bookmark, BookmarkCollection, BookmarkFilter, ImportStats } from "~/types/bookmarks";
import { useAIAnalysis } from "../../hooks/use-ai-analysis";
import { AIReviewPanel } from "../../components/ai/ai-review-panel";
import { AILabelingDashboard } from "../../components/ai/ai-labeling-dashboard";
// Removed AI card components - using auto-apply with toast undo instead
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  useDraggable,
  useDroppable,
  MouseSensor,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ViewMode = 'card' | 'list' | 'grid';
type SortBy = 'dateAdded' | 'title' | 'visitCount' | 'lastVisited';

// Folder Context Menu Component  
function FolderContextMenu({ 
  folder, 
  children, 
  onCreateChildFolder,
  onRenameFolder,
  onDeleteFolder
}: { 
  folder: BookmarkCollection; 
  children: React.ReactNode;
  onCreateChildFolder: (parentFolder: BookmarkCollection) => void;
  onRenameFolder: (folder: BookmarkCollection) => void;
  onDeleteFolder: (folder: BookmarkCollection) => void;
}) {
  const handleCreateChildFolder = () => {
    onCreateChildFolder(folder);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCreateChildFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Subfolder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onRenameFolder(folder)}>
          <Edit3 className="h-4 w-4 mr-2" />
          Rename Folder
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onDeleteFolder(folder)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Folder Component
function FolderItem({
  folder,
  onCreateChildFolder,
  onRenameFolder,
  onDeleteFolder,
  isSelected,
  onSelect,
  folderInfo
}: {
  folder: BookmarkCollection;
  onCreateChildFolder: (parentFolder: BookmarkCollection) => void;
  onRenameFolder: (folder: BookmarkCollection) => void;
  onDeleteFolder: (folder: BookmarkCollection) => void;
  isSelected: boolean;
  onSelect: () => void;
  folderInfo: any;
}) {
  const droppableId = `folder-${folder.id}`;
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: {
      type: 'folder',
      folderId: folder.id,
      folderName: folder.name
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`transition-colors rounded-lg ${
        isOver ? 'bg-primary/10 border border-primary/20' : ''
      }`}
    >
      <FolderContextMenu
        folder={folder}
        onCreateChildFolder={onCreateChildFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      >
        <div className="flex items-center group">
          <button
            className={`flex items-center gap-2 flex-1 p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${
              isSelected ? 'bg-muted/50' : ''
            }`}
            style={{ marginLeft: `${folderInfo.depth * 16}px` }}
            onClick={onSelect}
            title={folderInfo.isSubfolder ? `Subfolder (depth ${folderInfo.depth})` : folder.name}
          >
            <Folder className={`h-4 w-4 ${folderInfo.isSubfolder ? 'text-muted-foreground' : ''}`} />
            <span className={`flex-1 text-left truncate ${folderInfo.isSubfolder ? 'text-muted-foreground' : ''}`}>
              {folderInfo.displayName}
            </span>
            {folder.bookmarkCount !== undefined && folder.bookmarkCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {folder.bookmarkCount}
              </Badge>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onRenameFolder(folder);
            }}
            title="Rename folder"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </FolderContextMenu>
    </div>
  );
}

// New Folder Component
function NewFolderButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg">
      <button
        className="flex items-center gap-2 w-full p-2 text-sm rounded-lg transition-colors hover:bg-muted/50 hover:border-muted-foreground/50"
        onClick={onClick}
      >
        <FolderPlus className="h-4 w-4" />
        <span className="text-muted-foreground">New Folder</span>
      </button>
    </div>
  );
}

// Create Folder Form Component
function CreateFolderForm({ onSuccess, onCancel, parentFolder }: { 
  onSuccess: () => void; 
  onCancel: () => void;
  parentFolder?: BookmarkCollection | null;
}) {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsLoading(true);
    try {
      // For now, use demo values for profileId and spaceId
      // In a real implementation, these would come from the current user session        
      await flow.bookmarks.collections.create({
        name: folderName.trim(),
        description: description.trim() || undefined,
        profileId: 'default-profile', // TODO: get from current session
        spaceId: 'default-space', // TODO: get from current session
        parentId: parentFolder?.id,
        isAuto: false
      });
      
      toast.success('Folder created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parentFolder && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Creating subfolder in: <span className="font-medium">{parentFolder.name}</span>
          </p>
        </div>
      )}
      <div>
        <label htmlFor="folderName" className="text-sm font-medium">
          {parentFolder ? 'Subfolder' : 'Folder'} Name *
        </label>
        <Input
          id="folderName"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder={`Enter ${parentFolder ? 'subfolder' : 'folder'} name`}
          className="mt-1"
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          className="mt-1"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!folderName.trim() || isLoading}>
          {isLoading ? 'Creating...' : 'Create Folder'}
        </Button>
      </div>
    </form>
  );
}

// Utility function to get folder display info based on depth
const getFolderDisplayInfo = (folder: BookmarkCollection): { isSubfolder: boolean; displayName: string; depth: number } => {
  return {
    isSubfolder: (folder.depth || 0) > 0,
    displayName: folder.name,
    depth: folder.depth || 0
  };
};

// Utility function to format URLs for display
const formatUrlForDisplay = (url: string, maxLength: number = 50): string => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    // If the full URL is short enough, return it
    if (url.length <= maxLength) {
      return url;
    }
    
    // If just domain + path is short enough
    const domainPath = domain + path;
    if (domainPath.length <= maxLength) {
      return domainPath;
    }
    
    // If domain is long, truncate it
    if (domain.length > maxLength - 10) {
      return domain.substring(0, maxLength - 3) + '...';
    }
    
    // Truncate path
    const availablePathLength = maxLength - domain.length - 3;
    const truncatedPath = path.length > availablePathLength 
      ? path.substring(0, availablePathLength) + '...'
      : path;
    
    return domain + truncatedPath;
  } catch {
    // If URL parsing fails, just truncate the string
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
};

function BookmarksPage() {
  console.log("🚀 BOOKMARKS PAGE LOADED - THIS SHOULD ALWAYS APPEAR");
  console.log('BookmarksPage component rendering...');
  console.error('🔴 BOOKMARKS PAGE IS RENDERING!');
  (window as any).BOOKMARKS_PAGE_LOADED = true;
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  console.log('📦 Current bookmarks state:', bookmarks.length, 'bookmarks');
  const [deletedBookmarks, setDeletedBookmarks] = useState<Bookmark[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<SortBy>('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [lastClickedBookmarkId, setLastClickedBookmarkId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'select' | 'deselect' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<BookmarkFilter>({});
  const [showDeleted, setShowDeleted] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedBookmarkInfo, setSelectedBookmarkInfo] = useState<Bookmark | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [folders, setFolders] = useState<BookmarkCollection[]>([]);
  const [deletedFolders, setDeletedFolders] = useState<BookmarkCollection[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'recent' | 'popular' | 'deleted'>('all');
  const [minVisitCount, setMinVisitCount] = useState(3);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [parentFolder, setParentFolder] = useState<BookmarkCollection | null>(null);
  const [recentlyDeletedIds, setRecentlyDeletedIds] = useState<Set<string>>(new Set());
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [folderToRename, setFolderToRename] = useState<BookmarkCollection | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<BookmarkCollection | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedBookmark, setDraggedBookmark] = useState<Bookmark | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectAnimationComplete, setCollectAnimationComplete] = useState(false);
  const [collectingBookmarks, setCollectingBookmarks] = useState<Bookmark[]>([]);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  // AI Dashboard state
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardBookmarks, setDashboardBookmarks] = useState<Array<{
    bookmark: Bookmark;
    analysis: any;
    autoAppliedLabels?: any[];
  }>>([]);

  // Label filter state
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(null);

  // Extract unique labels from current bookmarks
  const uniqueLabels = useMemo(() => {
    // bookmarks array is already filtered by folder at backend level
    const labelMap = new Map<string, { count: number; category?: string }>();
    
    bookmarks.forEach(bookmark => {
      bookmark.labels?.forEach(label => {
        const existing = labelMap.get(label.label);
        if (existing) {
          existing.count++;
        } else {
          labelMap.set(label.label, { 
            count: 1, 
            category: label.category 
          });
        }
      });
    });
    
    // Convert to array and sort by count (descending)
    return Array.from(labelMap.entries())
      .map(([label, info]) => ({ label, ...info }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // Handle label filter
  const handleLabelFilter = (label: string) => {
    if (activeLabelFilter === label) {
      // Clear filter if clicking same label
      setActiveLabelFilter(null);
    } else {
      // Set new filter
      setActiveLabelFilter(label);
    }
  };

  // Drag and drop sensors - restrict to left mouse button only
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadBookmarks = async () => {
    console.log('AI TEST: Loading bookmarks with filter:', filter);
    console.error('AI TEST ERROR: Loading bookmarks'); 
    try {
      const result = await flow.bookmarks.getAll(filter);
      console.log('AI TEST: Loaded bookmarks:', result);
      setBookmarks(result || []); // Ensure we always set an array
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      toast.error('Failed to load bookmarks');
      setBookmarks([]); // Set empty array on error
    }
  };

  const loadDeletedBookmarks = async () => {
    console.log('Loading deleted bookmarks');
    try {
      const result = await flow.bookmarks.getAll({ onlyDeleted: true });
      console.log('Loaded deleted bookmarks:', result);
      setDeletedBookmarks(result);
    } catch (error) {
      console.error('Failed to load deleted bookmarks:', error);
      toast.error('Failed to load deleted bookmarks');
    }
  };

  // AI Analysis
  const aiAnalysis = useAIAnalysis(loadBookmarks);
  const { 
    isAIEnabled,
    analyzeBookmarkWithPanel,
    generateDescription,
    checkAIStatus,
    isBookmarkAnalyzing,
    // Panel state
    isPanelOpen,
    currentBookmark,
    currentAnalysis,
    autoAppliedLabels,
    // Panel actions
    closeReviewPanel,
    applyLabelFromPanel,
    rejectLabelFromPanel,
    removeLabelFromPanel,
    removeAutoAppliedFromPanel,
    reApplyAutoAppliedLabel,
    applyAllFromPanel,
    rejectAllFromPanel,
    clearAcceptedFromPanel
  } = aiAnalysis;

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      // Mark as recently deleted first (optimistic update)
      setRecentlyDeletedIds(prev => new Set([...prev, bookmarkId]));
      
      // Delete the bookmark
      await flow.bookmarks.delete(bookmarkId);
      
      // Show undo toast
      toast.success('Bookmark moved to trash', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await flow.bookmarks.restore(bookmarkId);
              // Remove from recently deleted
              setRecentlyDeletedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(bookmarkId);
                return newSet;
              });
              toast.success('Bookmark restored');
            } catch (error) {
              console.error('Failed to restore bookmark:', error);
              toast.error('Failed to restore bookmark');
              // If restore fails, reload to get accurate state
              await loadBookmarks();
            }
          }
        }
      });
      
      // Remove from recently deleted after a delay (if not undone)
      setTimeout(async () => {
        setRecentlyDeletedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmarkId);
          return newSet;
        });
        // Refresh lists to get accurate counts
        await loadBookmarks();
        await loadDeletedBookmarks();
      }, 5000); // 5 seconds to undo
      
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      toast.error('Failed to delete bookmark');
      // Remove from recently deleted on error
      setRecentlyDeletedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmarkId);
        return newSet;
      });
    }
  };

  const handleRestoreBookmark = async (bookmarkId: string) => {
    try {
      await flow.bookmarks.restore(bookmarkId);
      toast.success('Bookmark restored');
      
      // Refresh both lists
      await loadBookmarks();
      await loadDeletedBookmarks();
      
      // Notify about changes
      window.dispatchEvent(new CustomEvent('bookmarkChanged'));
    } catch (error) {
      console.error('Failed to restore bookmark:', error);
      toast.error('Failed to restore bookmark');
    }
  };

  const handlePermanentlyDeleteBookmark = async (bookmarkId: string) => {
    try {
      await flow.bookmarks.permanentlyDelete(bookmarkId);
      toast.success('Bookmark permanently deleted');
      
      // Refresh deleted list
      await loadDeletedBookmarks();
      
      // Notify about changes
      window.dispatchEvent(new CustomEvent('bookmarkChanged'));
    } catch (error) {
      console.error('Failed to permanently delete bookmark:', error);
      toast.error('Failed to permanently delete bookmark');
    }
  };

  // Handle individual AI analysis with panel
  const handleAnalyzeBookmark = async (bookmark: Bookmark) => {
    // Prevent duplicate simultaneous analysis calls for the same bookmark
    if (isBookmarkAnalyzing(bookmark.id)) {
      console.log('🔄 AI analysis already in progress for bookmark:', bookmark.id);
      toast.info('Analysis already in progress for this bookmark');
      return;
    }
    
    if (!isAIEnabled) {
      toast.error('AI analysis is not enabled');
      return;
    }

    try {
      console.log('🔍 Starting AI analysis for bookmark:', {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url
      });

      // Use the new panel-based analysis (handles its own toasts)
      await analyzeBookmarkWithPanel(bookmark);
      
    } catch (error) {
      console.error('💥 AI analysis failed:', error);
      toast.error('AI analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };


  // Handle individual AI description generation
  const handleGenerateDescription = async (bookmark: Bookmark) => {
    if (!isAIEnabled) {
      // debug message removed('❌ AI analysis is not enabled', 'error');
      return;
    }

    const description = await generateDescription(bookmark);
    if (description) {
    }
  };

  // Description generation functionality removed - keeping simple

  // Context menu component for bookmarks
  const BookmarkContextMenu = ({ bookmark, children }: { bookmark: Bookmark; children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}>
        <ContextMenuItem onClick={() => handleOpenBookmark(bookmark)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open bookmark
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          navigator.clipboard.writeText(bookmark.url);
          toast.success('URL copied to clipboard');
        }}>
          <Link className="h-4 w-4 mr-2" />
          Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          toast.info('Edit functionality coming soon!');
        }}>
          <Edit3 className="h-4 w-4 mr-2" />
          Edit bookmark
        </ContextMenuItem>
        {isAIEnabled && (
          <>
            <ContextMenuItem onSelect={async () => {
              // Immediately run analysis and ignore all selection bullshit
              await handleAnalyzeBookmark(bookmark);
            }}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Analyze
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleGenerateDescription(bookmark)}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Description
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        {showDeleted ? (
          <>
            <ContextMenuItem 
              className="text-blue-600"
              onClick={() => handleRestoreBookmark(bookmark.id)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore bookmark
            </ContextMenuItem>
            <ContextMenuItem 
              className="text-destructive"
              onClick={() => handlePermanentlyDeleteBookmark(bookmark.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Delete forever
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem 
            className="text-destructive"
            onClick={() => handleDeleteBookmark(bookmark.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Move to trash
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );

  // Initialize from localStorage when folders are loaded (only on mount)
  useEffect(() => {
    const saved = localStorage.getItem('bookmarks-selected-folder');
    if (saved && folders.length > 0 && !selectedFolder && !showDeleted) {
      const folderExists = folders.some(f => f.id === saved);
      if (folderExists) {
        console.log('Restoring folder selection from localStorage:', saved);
        setSelectedFolder(saved);
        setFilter({ collectionId: saved });
      } else {
        // Clean up localStorage if folder no longer exists
        localStorage.removeItem('bookmarks-selected-folder');
      }
    }
  }, [folders]); // Only run when folders change, not when selectedFolder changes

  // Initialize AI status on component mount
  useEffect(() => {
    console.log("Component mounted, checking AI status");
    checkAIStatus();
  }, [checkAIStatus]);

  // Log AI status changes
  useEffect(() => {
    console.log("AI Status Changed:", isAIEnabled);
  }, [isAIEnabled]);

  // Show AI status directly in UI instead of broken logs

  // Persist selectedFolder to localStorage (only when not viewing deleted)
  useEffect(() => {
    if (selectedFolder && !showDeleted) {
      localStorage.setItem('bookmarks-selected-folder', selectedFolder);
    } else if (!selectedFolder) {
      localStorage.removeItem('bookmarks-selected-folder');
    }
  }, [selectedFolder, showDeleted]);

  // Load bookmarks on mount and filter changes
  useEffect(() => {
    console.log('Loading bookmarks effect triggered with filter:', filter, 'showDeleted:', showDeleted);
    if (showDeleted) {
      loadDeletedBookmarks();
      loadDeletedFolders();
    } else {
      loadBookmarks();
    }
    loadFolders();
  }, [filter, showDeleted]);

  // Load deleted bookmarks once on mount
  useEffect(() => {
    loadDeletedBookmarks();
  }, []);

  // Listen for bookmark changes (custom event)
  useEffect(() => {
    const handleBookmarkChange = () => {
      console.log('Bookmark change event received, reloading...');
      if (showDeleted) {
        loadDeletedBookmarks();
      } else {
        loadBookmarks();
      }
      // Always refresh deleted bookmarks for the sidebar count
      loadDeletedBookmarks();
      // Also refresh folders to update bookmark counts
      loadFolders();
    };

    console.log('Setting up bookmark change listeners');

    // Listen for custom bookmark change events
    window.addEventListener('bookmarkChanged', handleBookmarkChange);
    
    // Also refresh when the window becomes focused (in case bookmarks changed elsewhere)
    window.addEventListener('focus', handleBookmarkChange);

    return () => {
      console.log('Cleaning up bookmark change listeners');
      window.removeEventListener('bookmarkChanged', handleBookmarkChange);
      window.removeEventListener('focus', handleBookmarkChange);
    };
  }, []);

  // Initialize AI status
  useEffect(() => {
    aiAnalysis.checkAIStatus();
  }, []);

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = showDeleted ? deletedBookmarks : bookmarks;

    // Apply view-specific filters
    if (activeView === 'popular') {
      // Filter by minimum visit count for Most Visited view
      filtered = filtered.filter(bookmark => (bookmark.visitCount || 0) >= minVisitCount);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark => 
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        bookmark.description?.toLowerCase().includes(query) ||
        bookmark.labels?.some(label => label.label.toLowerCase().includes(query))
      );
    }

    // Label filter
    if (activeLabelFilter) {
      filtered = filtered.filter(bookmark => 
        bookmark.labels?.some(label => label.label === activeLabelFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'visitCount':
          return b.visitCount - a.visitCount;
        case 'lastVisited':
          const aVisited = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
          const bVisited = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
          return bVisited - aVisited;
        case 'dateAdded':
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });

    return filtered;
  }, [bookmarks, deletedBookmarks, showDeleted, searchQuery, sortBy, activeView, minVisitCount, activeLabelFilter]);


  const handleDeleteSelected = async () => {
    if (selectedBookmarks.size === 0) return;
    
    try {
      await flow.bookmarks.deleteMany(Array.from(selectedBookmarks));
      toast.success(`${selectedBookmarks.size} bookmarks deleted`);
      setSelectedBookmarks(new Set());
      loadBookmarks();
    } catch (error) {
      console.error('Failed to delete bookmarks:', error);
      toast.error('Failed to delete bookmarks');
    }
  };

  const handleOpenBookmark = async (bookmark: Bookmark) => {
    try {
      await flow.bookmarks.incrementVisit(bookmark.id);
      // Open in current tab
      await flow.tabs.newTab(bookmark.url, true);
    } catch (error) {
      console.error('Failed to open bookmark:', error);
    }
  };

  const handleShowInfoPanel = (bookmark: Bookmark) => {
    setSelectedBookmarkInfo(bookmark);
    setShowInfoPanel(true);
  };

  // Labels sidebar handlers
  const handleClearLabelFilter = () => {
    setActiveLabelFilter(null);
  };


  const getBookmarkRange = (fromId: string, toId: string, currentBookmarks: Bookmark[]): string[] => {
    const fromIndex = currentBookmarks.findIndex(b => b.id === fromId);
    const toIndex = currentBookmarks.findIndex(b => b.id === toId);
    
    if (fromIndex === -1 || toIndex === -1) {
      return [toId]; // If one of the bookmarks is not found, just return the current one
    }
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    return currentBookmarks.slice(startIndex, endIndex + 1).map(b => b.id);
  };

  const handleRangeSelection = (fromId: string, toId: string, action: 'select' | 'deselect') => {
    const rangeIds = getBookmarkRange(fromId, toId, filteredBookmarks);
    
    setSelectedBookmarks(prev => {
      const newSet = new Set(prev);
      
      if (action === 'select') {
        rangeIds.forEach(id => newSet.add(id));
      } else {
        rangeIds.forEach(id => newSet.delete(id));
      }
      
      return newSet;
    });
  };

  const loadFolders = async () => {
    try {
      // For now, get all folders - later we can filter by profile
      const allFolders = await flow.bookmarks.collections.getAll();
      console.log('Loaded folders:', allFolders.map(f => ({ id: f.id, name: f.name })));
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadDeletedFolders = async () => {
    try {
      const deletedFoldersList = await flow.bookmarks.collections.getDeleted();
      setDeletedFolders(deletedFoldersList);
    } catch (error) {
      console.error('Failed to load deleted folders:', error);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, we'll use default profile and space IDs
    // In a real app, these would come from the browser context
    const defaultProfileId = 'default-profile';
    const defaultSpaceId = 'default-space';

    setIsImporting(true);
    setImportProgress(0);
    setImportStats(null);

    try {
      const content = await file.text();
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const stats = await flow.bookmarks.importChrome(
        content, 
        defaultProfileId, 
        defaultSpaceId
      );

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportStats(stats);
      
      // Refresh bookmarks list
      await loadBookmarks();
      
      // Notify about changes
      window.dispatchEvent(new CustomEvent('bookmarkChanged'));
      
      toast.success(`Import completed: ${stats.imported} bookmarks imported, ${stats.skipped} skipped`);
      
      // Reset the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import bookmarks');
    } finally {
      setIsImporting(false);
      setTimeout(() => {
        setImportProgress(0);
        setImportStats(null);
      }, 3000);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const htmlFile = files.find(file => file.name.endsWith('.html'));
    
    if (htmlFile) {
      // Create a fake input event
      const fakeEvent = {
        target: { files: [htmlFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImportFile(fakeEvent);
    } else {
      toast.error('Please drop an HTML file');
    }
  };

  const handleFileInputClick = () => {
    document.getElementById('bookmark-file')?.click();
  };

  const handleRenameFolder = (folder: BookmarkCollection) => {
    setFolderToRename(folder);
    setRenameFolderName(folder.name);
    setShowRenameFolderDialog(true);
  };

  const handleDeleteFolder = (folder: BookmarkCollection) => {
    setFolderToDelete(folder);
    setShowDeleteFolderDialog(true);
  };

  const handleStartInlineRename = (folder: BookmarkCollection) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleCancelInlineRename = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleSaveInlineRename = async () => {
    if (!editingFolderId || !editingFolderName.trim()) return;
    
    // Find the current folder to check if name actually changed
    const currentFolder = folders.find(f => f.id === editingFolderId);
    if (currentFolder && currentFolder.name === editingFolderName.trim()) {
      // Name hasn't changed, just exit edit mode
      setEditingFolderId(null);
      setEditingFolderName('');
      return;
    }
    
    try {
      await flow.bookmarks.collections.update(editingFolderId, {
        name: editingFolderName.trim()
      });
      
      await loadFolders();
      setEditingFolderId(null);
      setEditingFolderName('');
      toast.success('Folder renamed successfully');
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  // Drag event handlers

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const bookmarkId = active.id as string;
    setActiveId(bookmarkId);
    
    const bookmark = filteredBookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      setDraggedBookmark(bookmark);
      
      // Calculate what the selection will be for multi-drag visual effects
      let finalSelection: Set<string>;
      if (!selectedBookmarks.has(bookmarkId)) {
        // If dragged item isn't selected, we're dragging just this single item
        finalSelection = new Set([bookmarkId]);
        // DON'T auto-select it - just use for drag visuals
      } else {
        // If dragged item is selected, we're dragging the entire selection
        finalSelection = selectedBookmarks;
      }

      // Change cursor to grabbing during drag
      document.body.style.cursor = 'grabbing';
      
      // Trigger collect animation if we have multiple items selected
      if (finalSelection.size > 1) {
        setIsCollecting(true);
        setCollectAnimationComplete(false);
        
        // Get the bookmarks that will animate (excluding the dragged one)
        const animatingBookmarks = filteredBookmarks.filter(b => 
          finalSelection.has(b.id) && b.id !== bookmarkId
        );
        setCollectingBookmarks(animatingBookmarks);
        
        // Start the animation almost immediately
        setTimeout(() => {
          setCollectAnimationComplete(true);
          // Clear after animation
          setTimeout(() => {
            setCollectingBookmarks([]);
            setIsCollecting(false);
          }, 500);
        }, 1); // Almost instant!
      }
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (isCollecting && activeId) {
      // Get the original position of the dragged element
      const draggedEl = document.querySelector(`[data-bookmark-id="${activeId}"]`);
      if (draggedEl) {
        const rect = draggedEl.getBoundingClientRect();
        setDragPosition({ 
          x: rect.left + event.delta.x, 
          y: rect.top + event.delta.y 
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedBookmark(null);
    setIsCollecting(false);
    setCollectAnimationComplete(false);
    setCollectingBookmarks([]);
    setDragPosition(null);
    
    // Reset cursor
    document.body.style.cursor = '';

    if (!over) return;

    const bookmarkId = active.id as string;
    const overId = over.id as string;

    // Handle dropping on folder
    if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '');
      try {
        // Check if multiple bookmarks are selected
        if (selectedBookmarks.has(bookmarkId) && selectedBookmarks.size > 1) {
          // Move all selected bookmarks
          const bookmarkIds = Array.from(selectedBookmarks);
          for (const id of bookmarkIds) {
            await flow.bookmarks.moveToCollection(id, selectedFolder, folderId);
          }
          toast.success(`${bookmarkIds.length} bookmarks moved to folder`);
          setSelectedBookmarks(new Set());
        } else {
          // Move single bookmark
          await flow.bookmarks.moveToCollection(bookmarkId, selectedFolder, folderId);
          toast.success('Bookmark moved to folder');
        }
        await loadBookmarks();
        await loadFolders();
      } catch (error) {
        console.error('Failed to move bookmark(s):', error);
        toast.error('Failed to move bookmark(s)');
      }
    }
  };

  const handleConfirmRenameFolder = async () => {
    if (!folderToRename || !renameFolderName.trim()) {
      toast.error('Please enter a valid folder name');
      return;
    }

    // Check if name actually changed
    if (folderToRename.name === renameFolderName.trim()) {
      // Name hasn't changed, just close dialog
      setShowRenameFolderDialog(false);
      setFolderToRename(null);
      setRenameFolderName('');
      return;
    }

    try {
      setIsLoading(true);
      const result = await flow.bookmarks.collections.update(folderToRename.id, {
        name: renameFolderName.trim()
      });

      if (result) {
        toast.success('Folder renamed successfully');
        setShowRenameFolderDialog(false);
        setFolderToRename(null);
        setRenameFolderName('');
        await loadFolders();
      } else {
        toast.error('Failed to rename folder');
      }
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      setIsLoading(true);
      const success = await flow.bookmarks.collections.delete(folderToDelete.id);

      if (success) {
        toast.success('Folder moved to trash successfully');
        setShowDeleteFolderDialog(false);
        setFolderToDelete(null);
        
        // Clear selected folder if it was the deleted one
        if (selectedFolder === folderToDelete.id) {
          setSelectedFolder(null);
          setFilter({}); // Also clear the filter
        }
        
        await loadFolders();
        await loadBookmarks();
      } else {
        toast.error('Failed to delete folder');
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setIsLoading(false);
    }
  };

  // Draggable Bookmark Card Component
  const BookmarkCard = ({ bookmark }: { bookmark: Bookmark }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({ 
      id: bookmark.id,
      data: { 
        type: 'bookmark',
        bookmark 
      }
    });
    

    const isSelected = selectedBookmarks.has(bookmark.id);
    const isMultiDrag = selectedBookmarks.size > 1 && activeId;
    const isDraggedItem = bookmark.id === activeId;
    
    // Apply ghost effect to all selected items when multi-dragging, except the dragged item
    const shouldShowGhost = isDragging || (isSelected && isMultiDrag && !isDraggedItem);
    
    // For other selected items in multi-drag, we want them to animate toward the dragged item
    // But ONLY after a delay (when collectAnimationComplete becomes true)
    const shouldCollect = isCollecting && collectAnimationComplete && isSelected && isMultiDrag && !isDraggedItem && !isDragging;
    
    let finalTransform: string;
    if (isDragging || (isSelected && isMultiDrag)) {
      // ALL placeholders (dragged item AND other selected items) stay in place
      // No transforms, no animations for any placeholders
      finalTransform = 'none';
    } else {
      // Normal positioning for non-selected items only
      finalTransform = CSS.Transform.toString(transform) || '';
    }
    
    const style = {
      transform: finalTransform,
      opacity: shouldShowGhost ? 0.3 : 1,
      filter: shouldShowGhost ? 'grayscale(100%)' : 'none',
      transition: shouldCollect ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
      zIndex: shouldCollect ? 50 : undefined,
      // Force placeholder to maintain size when dragging
      ...(isDragging && {
        width: 'auto',
        height: '160px',
        minWidth: '100%',
        minHeight: '160px'
      })
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            const isChecked = e.target.checked;
            const action = isChecked ? 'select' : 'deselect';
            const shiftKey = (e.nativeEvent as MouseEvent).shiftKey;

            if (shiftKey && lastClickedBookmarkId && lastAction) {
              // Handle range selection
              handleRangeSelection(lastClickedBookmarkId, bookmark.id, action);
            } else {
              // Handle single selection
              if (isChecked) {
                setSelectedBookmarks(prev => new Set([...prev, bookmark.id]));
              } else {
                setSelectedBookmarks(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(bookmark.id);
                  return newSet;
                });
              }
            }
            
            // Update tracking state
            setLastClickedBookmarkId(bookmark.id);
            setLastAction(action);
          }}
          className={`absolute top-2 left-2 z-10 w-4 h-4 cursor-pointer ${isDragging ? 'opacity-30' : ''}`}
          onClick={(e) => e.stopPropagation()}
        />
        <div
          ref={setNodeRef}
          style={isDragging ? { transform: 'none', opacity: 0.3 } : style}
          data-bookmark-id={bookmark.id}
          data-is-dragging={isDragging}
          className={isDragging ? 'pointer-events-none' : ''}
          {...listeners}
          {...attributes}
        >
          <BookmarkContextMenu bookmark={bookmark}>
            <Card 
              className={`group hover:shadow-lg transition-all duration-200 relative min-h-[160px] h-[180px] flex flex-col select-none cursor-grab py-0 ${isDragging ? 'cursor-grabbing opacity-30' : ''} ${
                recentlyDeletedIds.has(bookmark.id) ? 'opacity-60' : ''
              } ${isDragging ? 'shadow-lg' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            >
            <CardContent className="p-4 pb-0 flex flex-col h-full">
              {/* Header Section - Better height distribution */}
              <div className="flex-shrink-0 min-h-[50px] max-h-[70px] flex flex-col items-center justify-center text-center mb-3 px-6">
                <div className="flex items-start gap-2 max-w-full">
                  {bookmark.favicon && (
                    <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0 mt-0.5" />
                  )}
                  <h3
                    className="font-medium text-base leading-tight line-clamp-3 hover:text-primary text-center cursor-pointer flex-1 min-w-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBookmark(bookmark);
                    }}
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </h3>
                </div>
              </div>

              {/* Content Area - Flexible height with better spacing */}
              <div className="flex-1 flex flex-col items-center justify-start space-y-2 overflow-hidden min-h-0">
                {/* Existing Labels */}
                {bookmark.labels && bookmark.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center max-w-full">
                    {bookmark.labels.slice(0, 3).map((label, index) => (
                      <Badge key={index} variant="secondary" className="text-xs py-1 px-2" title={label.label}>
                        {label.label}
                      </Badge>
                    ))}
                    {bookmark.labels.length > 3 && (
                      <Badge variant="outline" className="text-xs py-1 px-2">
                        +{bookmark.labels.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

              </div>

              {/* Action Area - Bottom Actions */}
              <div
                className={`flex-shrink-0 h-[44px] flex items-center justify-center gap-3 mt-auto ${isDragging ? 'opacity-30 pointer-events-none' : ''}`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleOpenBookmark(bookmark);
                  }}
                  title="Open bookmark"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(bookmark.url);
                    toast.success('URL copied to clipboard');
                  }}
                  title="Copy URL"
                >
                  <Link className="h-4 w-4" />
                </Button>
                {isAIEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-yellow-100 hover:text-yellow-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeBookmark(bookmark);
                    }}
                    title="AI Analyze"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info('Edit functionality coming soon!');
                  }}
                  title="Edit bookmark"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowInfoPanel(bookmark);
                      }}
                      title="Show bookmark info"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">{bookmark.title}</h4>
                      <p className="text-xs text-muted-foreground break-all">{bookmark.url}</p>
                      <div className="flex justify-between text-xs">
                        <span>Added: {new Date(bookmark.dateAdded).toLocaleDateString()}</span>
                        <span>{bookmark.visitCount || 0} visits</span>
                      </div>
                      {bookmark.description && (
                        <p className="text-xs text-muted-foreground">{bookmark.description}</p>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {showDeleted ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                      onClick={(e) => {e.stopPropagation(); handleRestoreBookmark(bookmark.id);}}
                      title="Restore bookmark"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                      onClick={(e) => {e.stopPropagation(); handlePermanentlyDeleteBookmark(bookmark.id);}}
                      title="Delete forever"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : recentlyDeletedIds.has(bookmark.id) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await flow.bookmarks.restore(bookmark.id);
                        setRecentlyDeletedIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(bookmark.id);
                          return newSet;
                        });
                        toast.success('Bookmark restored');
                      } catch (error) {
                        console.error('Failed to restore bookmark:', error);
                        toast.error('Failed to restore bookmark');
                        await loadBookmarks();
                      }
                    }}
                    title="Undo delete"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {e.stopPropagation(); handleDeleteBookmark(bookmark.id);}}
                    title="Delete bookmark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
            </Card>
          </BookmarkContextMenu>
        </div>
      </div>
    );
  };

  const BookmarkListItem = ({ bookmark }: { bookmark: Bookmark }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({ 
      id: bookmark.id,
      data: { 
        type: 'bookmark',
        bookmark 
      }
    });


    const isSelected = selectedBookmarks.has(bookmark.id);
    const isMultiDrag = selectedBookmarks.size > 1 && activeId;
    const isDraggedItem = bookmark.id === activeId;
    
    // Apply ghost effect to all selected items when multi-dragging, except the dragged item
    const shouldShowGhost = isDragging || (isSelected && isMultiDrag && !isDraggedItem);
    
    // For other selected items in multi-drag, we want them to animate toward the dragged item
    // But ONLY after a delay (when collectAnimationComplete becomes true)
    const shouldCollect = isCollecting && collectAnimationComplete && isSelected && isMultiDrag && !isDraggedItem && !isDragging;
    
    
    let finalTransform: string;
    if (isDragging || (isSelected && isMultiDrag)) {
      // ALL placeholders (dragged item AND other selected items) stay in place
      // No transforms, no animations for any placeholders - floating overlay handles animation
      finalTransform = 'none';
    } else {
      // Normal positioning for non-selected items only
      finalTransform = CSS.Transform.toString(transform) || '';
    }
    
    const style = {
      transform: finalTransform,
      opacity: shouldShowGhost ? 0.3 : 1,
      filter: shouldShowGhost ? 'grayscale(100%)' : 'none',
      transition: shouldCollect ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
      zIndex: shouldCollect ? 50 : undefined,
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            const isChecked = e.target.checked;
            const action = isChecked ? 'select' : 'deselect';
            const shiftKey = (e.nativeEvent as MouseEvent).shiftKey;

            if (shiftKey && lastClickedBookmarkId && lastAction) {
              // Handle range selection
              handleRangeSelection(lastClickedBookmarkId, bookmark.id, action);
            } else {
              // Handle single selection
              if (isChecked) {
                setSelectedBookmarks(prev => new Set([...prev, bookmark.id]));
              } else {
                setSelectedBookmarks(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(bookmark.id);
                  return newSet;
                });
              }
            }
            
            // Update tracking state
            setLastClickedBookmarkId(bookmark.id);
            setLastAction(action);
          }}
          className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 cursor-pointer ${isDragging ? 'opacity-30' : ''}`}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            // Prevent right-click from triggering checkbox
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <BookmarkContextMenu bookmark={bookmark}>
          <div 
            ref={setNodeRef}
            style={style}
            data-bookmark-id={bookmark.id}
            className={`group flex items-center gap-3 p-3 pl-10 rounded-lg hover:bg-muted/50 transition-colors select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''} ${
              recentlyDeletedIds.has(bookmark.id) ? 'opacity-60' : ''
            } ${isDragging ? 'shadow-lg' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            {...listeners}
            {...attributes}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
          {bookmark.favicon && (
            <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 
                className="font-medium text-sm truncate hover:text-primary cursor-pointer" 
                onClick={() => handleOpenBookmark(bookmark)}
              >
                {bookmark.title}
              </h3>
              {bookmark.labels && bookmark.labels.length > 0 && (
                <div className="flex gap-1">
                  {bookmark.labels.slice(0, 2).map((label, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {label.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <p 
              className="text-xs text-muted-foreground flex-1 break-all"
              style={{ 
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                lineHeight: '1.3'
              }}
              title={bookmark.url}
            >
              {formatUrlForDisplay(bookmark.url, 80)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(bookmark.dateAdded).toLocaleDateString()}</span>
          <span>{bookmark.visitCount || 0} visits</span>
        </div>

        <div className={`flex items-center gap-1 ${isDragging ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
            onClick={(e) => {e.stopPropagation(); handleOpenBookmark(bookmark);}}
            title="Open bookmark"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(bookmark.url);
              toast.success('URL copied to clipboard');
            }}
            title="Copy URL"
          >
            <Link className="h-3.5 w-3.5" />
          </Button>
          {isAIEnabled && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 hover:bg-yellow-100 hover:text-yellow-600"
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyzeBookmark(bookmark);
              }}
              title="AI Analyze"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              toast.info('Edit functionality coming soon!');
            }}
            title="Edit bookmark"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowInfoPanel(bookmark);
                }}
                title="Show bookmark info"
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{bookmark.title}</h4>
                <p className="text-xs text-muted-foreground break-all">{bookmark.url}</p>
                <div className="flex justify-between text-xs">
                  <span>Added: {new Date(bookmark.dateAdded).toLocaleDateString()}</span>
                  <span>{bookmark.visitCount || 0} visits</span>
                </div>
                {bookmark.description && (
                  <p className="text-xs text-muted-foreground">{bookmark.description}</p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
          {showDeleted ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                onClick={(e) => {e.stopPropagation(); handleRestoreBookmark(bookmark.id);}}
                title="Restore bookmark"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                onClick={(e) => {e.stopPropagation(); handlePermanentlyDeleteBookmark(bookmark.id);}}
                title="Delete forever"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : recentlyDeletedIds.has(bookmark.id) ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await flow.bookmarks.restore(bookmark.id);
                  setRecentlyDeletedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(bookmark.id);
                    return newSet;
                  });
                  toast.success('Bookmark restored');
                } catch (error) {
                  console.error('Failed to restore bookmark:', error);
                  toast.error('Failed to restore bookmark');
                  await loadBookmarks();
                }
              }}
              title="Undo delete"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
              onClick={(e) => {e.stopPropagation(); handleDeleteBookmark(bookmark.id);}}
              title="Delete bookmark"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
          </div>
        </BookmarkContextMenu>
      </div>
    );
  };

  // Draggable Bookmark Grid Item Component
  const BookmarkGridItem = ({ bookmark }: { bookmark: Bookmark }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({ 
      id: bookmark.id,
      data: { 
        type: 'bookmark',
        bookmark 
      }
    });


    const isSelected = selectedBookmarks.has(bookmark.id);
    const isMultiDrag = selectedBookmarks.size > 1 && activeId;
    const isDraggedItem = bookmark.id === activeId;
    
    // Apply ghost effect to all selected items when multi-dragging, except the dragged item
    const shouldShowGhost = isDragging || (isSelected && isMultiDrag && !isDraggedItem);
    
    // For other selected items in multi-drag, we want them to animate toward the dragged item
    // But ONLY after a delay (when collectAnimationComplete becomes true)
    const shouldCollect = isCollecting && collectAnimationComplete && isSelected && isMultiDrag && !isDraggedItem && !isDragging;
    
    
    let finalTransform: string;
    if (isDragging || (isSelected && isMultiDrag)) {
      // ALL placeholders (dragged item AND other selected items) stay in place
      // No transforms, no animations for any placeholders - floating overlay handles animation
      finalTransform = 'none';
    } else {
      // Normal positioning for non-selected items only
      finalTransform = CSS.Transform.toString(transform) || '';
    }
    
    const style = {
      transform: finalTransform,
      opacity: shouldShowGhost ? 0.3 : 1,
      filter: shouldShowGhost ? 'grayscale(100%)' : 'none',
      transition: shouldCollect ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
      zIndex: shouldCollect ? 50 : undefined,
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            const isChecked = e.target.checked;
            const action = isChecked ? 'select' : 'deselect';
            const shiftKey = (e.nativeEvent as MouseEvent).shiftKey;

            if (shiftKey && lastClickedBookmarkId && lastAction) {
              // Handle range selection
              handleRangeSelection(lastClickedBookmarkId, bookmark.id, action);
            } else {
              // Handle single selection
              if (isChecked) {
                setSelectedBookmarks(prev => new Set([...prev, bookmark.id]));
              } else {
                setSelectedBookmarks(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(bookmark.id);
                  return newSet;
                });
              }
            }
            
            // Update tracking state
            setLastClickedBookmarkId(bookmark.id);
            setLastAction(action);
          }}
          className={`absolute top-1 left-1 z-10 w-3 h-3 cursor-pointer ${isDragging ? 'opacity-30' : ''}`}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            // Prevent right-click from triggering checkbox
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <BookmarkContextMenu bookmark={bookmark}>
          <div 
            ref={setNodeRef}
            style={style}
            data-bookmark-id={bookmark.id}
            className={`group aspect-square bg-card border border-border rounded-lg p-3 hover:shadow-lg transition-all flex flex-col relative select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''} ${
              recentlyDeletedIds.has(bookmark.id) ? 'opacity-60' : ''
            } ${isDragging ? 'shadow-lg' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            {...listeners}
            {...attributes}
          >
            <div className="flex items-center mb-2">
              {bookmark.favicon && (
                <img src={bookmark.favicon} alt="" className="w-6 h-6 rounded" />
              )}
            </div>
            
            <h3 className="font-medium text-sm line-clamp-2 mb-1">{bookmark.title}</h3>
            <p 
              className="text-xs text-muted-foreground break-all mb-1"
              style={{ 
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                lineHeight: '1.3'
              }}
              title={bookmark.url}
            >
              {(() => {
                try {
                  return new URL(bookmark.url).hostname;
                } catch {
                  return formatUrlForDisplay(bookmark.url, 25);
                }
              })()}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <span>{bookmark.visitCount || 0} visits</span>
            </div>
            
            {bookmark.labels && bookmark.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {bookmark.labels.slice(0, 2).map((label, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {label.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className={`absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1 ${isDragging ? 'opacity-50 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                onClick={(e) => {e.stopPropagation(); handleOpenBookmark(bookmark);}}
                title="Open bookmark"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(bookmark.url);
                  toast.success('URL copied to clipboard', {
                    // Enhanced green styling to match copy success (was default green but now more vibrant)
                    className: 'bg-green-50 border-green-200 text-green-800',
                    style: {
                      backgroundColor: '#f0fdf4',
                      borderColor: '#bbf7d0',
                      color: '#166534'
                    }
                  });
                }}
                title="Copy URL"
              >
                <Link className="h-3 w-3" />
              </Button>
              {isAIEnabled && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnalyzeBookmark(bookmark);
                  }}
                  title="AI Analyze"
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info('Edit functionality coming soon!');
                }}
                title="Edit bookmark"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowInfoPanel(bookmark);
                    }}
                    title="Show bookmark info"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{bookmark.title}</h4>
                    <p className="text-xs text-muted-foreground break-all">{bookmark.url}</p>
                    <div className="flex justify-between text-xs">
                      <span>Added: {new Date(bookmark.dateAdded).toLocaleDateString()}</span>
                      <span>{bookmark.visitCount || 0} visits</span>
                    </div>
                    {bookmark.description && (
                      <p className="text-xs text-muted-foreground">{bookmark.description}</p>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
              {showDeleted ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                    onClick={(e) => {e.stopPropagation(); handleRestoreBookmark(bookmark.id);}}
                    title="Restore bookmark"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {e.stopPropagation(); handlePermanentlyDeleteBookmark(bookmark.id);}}
                    title="Delete forever"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : recentlyDeletedIds.has(bookmark.id) ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await flow.bookmarks.restore(bookmark.id);
                      setRecentlyDeletedIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(bookmark.id);
                        return newSet;
                      });
                      toast.success('Bookmark restored');
                    } catch (error) {
                      console.error('Failed to restore bookmark:', error);
                      toast.error('Failed to restore bookmark');
                      await loadBookmarks();
                    }
                  }}
                  title="Undo delete"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                  onClick={(e) => {e.stopPropagation(); handleDeleteBookmark(bookmark.id);}}
                  title="Delete bookmark"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </BookmarkContextMenu>
      </div>
    );
  };

  return (
    <>
    <style>{`
      [data-is-dragging="true"] {
        transform: none !important;
        width: auto !important;
        height: 160px !important;
      }
      .!transform-none {
        transform: none !important;
      }
    `}</style>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Bookmarks</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => {
                // TODO: Add new bookmark manually
                toast.info('Manual bookmark creation coming soon!');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Quick Filters */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">QUICK FILTERS</div>
              <div className="space-y-1">
                <button 
                  className={`flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${!showDeleted && !selectedFolder && activeView === 'all' ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    setShowDeleted(false);
                    setSelectedFolder(null);
                    setActiveView('all');
                    setFilter({});
                  }}
                >
                  <BookmarkIcon className="h-4 w-4" />
                  All Bookmarks
                  {bookmarks.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {bookmarks.length}
                    </Badge>
                  )}
                </button>
                
                <button 
                  className={`flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${activeView === 'recent' ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    console.log('Recently Added clicked');
                    setShowDeleted(false);
                    setSelectedFolder(null);
                    setActiveView('recent');
                    localStorage.removeItem('bookmarks-selected-folder');
                    setFilter({});
                    setSortBy('dateAdded');
                  }}
                >
                  <Calendar className="h-4 w-4" />
                  Recently Added
                </button>
                
                <div className={`flex items-center justify-between w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${activeView === 'popular' ? 'bg-muted/50' : ''}`}>
                  <button 
                    className="flex items-center gap-2 flex-1"
                    onClick={() => {
                      console.log('Most Visited clicked');
                      setShowDeleted(false);
                      setSelectedFolder(null);
                      setActiveView('popular');
                      localStorage.removeItem('bookmarks-selected-folder');
                      setFilter({});
                      setSortBy('visitCount');
                    }}
                  >
                    <Star className="h-4 w-4" />
                    Most Visited
                  </button>
                  
                  {activeView === 'popular' && (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={minVisitCount}
                      onChange={(e) => setMinVisitCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-10 px-1 py-0.5 text-xs border rounded ml-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                <button 
                  className={`flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${showDeleted ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    setShowDeleted(true);
                    setSelectedFolder(null);
                    setActiveView('deleted');
                    setFilter({});
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Deleted Bookmarks
                  {deletedBookmarks.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {deletedBookmarks.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Folders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">FOLDERS</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0"
                  onClick={() => setShowCreateFolderDialog(true)}
                  title="Create new folder"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {folders.length > 0 ? (
                  folders.map((folder) => {
                    const folderInfo = getFolderDisplayInfo(folder);
                    return (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        folderInfo={folderInfo}
                        isSelected={selectedFolder === folder.id}
                        onSelect={() => {
                          if (selectedFolder === folder.id && !showDeleted) {
                            // Deselect folder
                            setSelectedFolder(null);
                            setActiveView('all');
                            setFilter({});
                            localStorage.removeItem('bookmarks-selected-folder');
                          } else {
                            // Select folder
                            setSelectedFolder(folder.id);
                            setActiveView('all');
                            setFilter({ collectionId: folder.id });
                            setShowDeleted(false);
                            localStorage.setItem('bookmarks-selected-folder', folder.id);
                          }
                        }}
                        onCreateChildFolder={(parentFolder) => {
                          setParentFolder(parentFolder);
                          setShowCreateFolderDialog(true);
                        }}
                        onRenameFolder={handleRenameFolder}
                        onDeleteFolder={handleDeleteFolder}
                      />
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No folders yet
                  </div>
                )}
                
                {/* New Folder Drop Zone */}
                <NewFolderButton onClick={() => setShowCreateFolderDialog(true)} />
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">LABELS</span>
                {activeLabelFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveLabelFilter(null)}
                    title="Clear label filter"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {uniqueLabels.length > 0 ? (
                  uniqueLabels.slice(0, 10).map(({ label, count }) => (
                    <button
                      key={label}
                      className={`flex items-center justify-between w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${
                        activeLabelFilter === label ? 'bg-muted/50 text-primary' : ''
                      }`}
                      onClick={() => handleLabelFilter(label)}
                      title={`Filter by ${label} (${count} bookmark${count === 1 ? '' : 's'})`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="truncate">{label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {count}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No labels yet
                  </div>
                )}
                {uniqueLabels.length > 10 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    +{uniqueLabels.length - 10} more labels
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                toast.info('Import/Export coming soon!');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Import/Export
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              Press Cmd+D to bookmark current page
            </div>
          </div>
        </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              {selectedFolder && !showDeleted ? (
                (() => {
                  const currentFolder = folders.find(f => f.id === selectedFolder);
                  if (!currentFolder) return null;
                  
                  // Build breadcrumb path
                  const breadcrumbPath: BookmarkCollection[] = [];
                  let folder: BookmarkCollection | undefined = currentFolder;
                  while (folder) {
                    breadcrumbPath.unshift(folder);
                    folder = folder?.parentId ? folders.find(f => f.id === folder?.parentId) : undefined;
                  }
                  
                  return (
                    <>
                      {editingFolderId === currentFolder.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Folder className="h-6 w-6 text-muted-foreground" />
                          <Input
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            className="text-xl font-semibold h-10 flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveInlineRename();
                              } else if (e.key === 'Escape') {
                                handleCancelInlineRename();
                              }
                            }}
                            onBlur={handleSaveInlineRename}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleCancelInlineRename}
                            title="Cancel rename"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Folder className="h-6 w-6 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setSelectedFolder(null);
                                setFilter({});
                                setShowDeleted(false);
                                localStorage.removeItem('bookmarks-selected-folder');
                              }}
                              className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Bookmarks
                            </button>
                            {breadcrumbPath.map((folder, index) => (
                              <React.Fragment key={folder.id}>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                {index === breadcrumbPath.length - 1 ? (
                                  <h1 
                                    className="text-xl font-semibold cursor-text select-text"
                                    onClick={() => handleStartInlineRename(folder)}
                                    title="Click to rename folder"
                                  >
                                    {folder.name}
                                  </h1>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedFolder(folder.id);
                                      setFilter({ collectionId: folder.id });
                                      localStorage.setItem('bookmarks-selected-folder', folder.id);
                                    }}
                                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {folder.name}
                                  </button>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {filteredBookmarks.length} bookmarks
                      </p>
                    </>
                  );
                })()
              ) : (
                <>
                  <h1 className="text-xl font-semibold">
                    {showDeleted 
                      ? 'Deleted Bookmarks'
                      : activeView === 'recent' 
                        ? 'Recently Added'
                        : activeView === 'popular'
                          ? 'Most Visited'
                          : activeLabelFilter
                            ? `Bookmarks labeled "${activeLabelFilter}"`
                            : 'Bookmarks'
                    }
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {filteredBookmarks.length} {showDeleted ? 'deleted ' : ''}bookmarks
                    </p>
                    {activeLabelFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleClearLabelFilter}
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selection UI - moved to header */}
            {selectedBookmarks.size > 0 && (
              <div className="flex items-center gap-3 px-3 py-1 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedBookmarks.size} selected
                </span>
                <div className="flex gap-1">
                  {aiAnalysis.isAIEnabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-yellow-600 hover:text-yellow-700"
                      onClick={async () => {
                        const selectedBookmarksArray = filteredBookmarks.filter(b =>
                          selectedBookmarks.has(b.id)
                        );

                        // Open dashboard immediately with empty state
                        setDashboardBookmarks([]);
                        setShowDashboard(true);

                        // Analyze bookmarks in background
                        const total = selectedBookmarksArray.length;
                        let remaining = total;
                        const toastId = toast.loading(`Analyzing ${remaining} bookmarks...`);

                        try {
                          const analyzedBookmarks = [];
                          for (let i = 0; i < selectedBookmarksArray.length; i++) {
                            const bookmark = selectedBookmarksArray[i];
                            // Suppress individual toasts during bulk analysis - dashboard provides feedback
                            const result = await aiAnalysis.analyzeBookmark(bookmark, { suppressToast: true });
                            if (result) {
                              const analyzed = {
                                bookmark,
                                analysis: result.analysis,
                                autoAppliedLabels: []
                              };
                              analyzedBookmarks.push(analyzed);
                              // Update dashboard incrementally as each bookmark is analyzed
                              setDashboardBookmarks([...analyzedBookmarks]);
                              // Update toast with countdown
                              remaining--;
                              if (remaining > 0) {
                                toast.loading(`Analyzing ${remaining} bookmarks...`, { id: toastId });
                              }
                            }
                          }

                          toast.success('Analysis complete', {
                            id: toastId,
                            description: `${analyzedBookmarks.length} bookmarks analyzed`,
                            duration: 2000
                          });
                        } catch (error) {
                          toast.error('Analysis failed', {
                            id: toastId,
                            description: error instanceof Error ? error.message : 'Unknown error',
                            duration: 5000
                          });
                        }
                      }}
                      disabled={aiAnalysis.isAnalyzing}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      {aiAnalysis.isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2"
                    onClick={() => setSelectedBookmarks(new Set())}
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Bookmark
              </Button>
              
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Import Bookmarks</DialogTitle>
                    <DialogDescription>
                      Import bookmarks from Chrome's HTML export format.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      id="bookmark-file"
                      type="file"
                      accept=".html"
                      onChange={handleImportFile}
                      disabled={isImporting}
                      className="hidden"
                    />
                    
                    {/* Drag and drop area */}
                    <div
                      onDragOver={handleFileDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
                        ${isDragOver 
                          ? 'border-primary bg-primary/5 scale-[1.02]' 
                          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                        }
                        ${isImporting ? 'pointer-events-none opacity-50' : ''}
                      `}
                      onClick={handleFileInputClick}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-3 rounded-full bg-muted">
                          <CloudUpload className={`h-6 w-6 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {isDragOver ? 'Drop your bookmark file here' : 'Choose bookmark file or drag & drop'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Accepts HTML files exported from Chrome, Firefox, Safari, or Edge
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="pointer-events-none">
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                    
                    {isImporting && (
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                            <span>Importing bookmarks...</span>
                          </div>
                          <span className="font-medium">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                      </div>
                    )}
                    
                    {importStats && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 rounded-full bg-green-100 dark:bg-green-900">
                            <FileText className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                            Import Complete
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-medium">{importStats.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Imported:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{importStats.imported}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Skipped:</span>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{importStats.skipped}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Errors:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{importStats.errors}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>


          {/* Search and Controls */}
          <div className="flex items-center gap-4 px-4 pb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAdded">Date Added</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="visitCount">Visit Count</SelectItem>
                  <SelectItem value="lastVisited">Last Visited</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border border-border rounded-lg">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none border-r"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="rounded-none border-r"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {/* Deleted Folders Section */}
          {showDeleted && deletedFolders.length > 0 && (
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Deleted Folders ({deletedFolders.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {deletedFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 bg-card border border-red-200 dark:border-red-800 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-red-800 dark:text-red-200 truncate block">
                          {folder.name}
                        </span>
                        {folder.description && (
                          <span className="text-xs text-red-600 dark:text-red-400 truncate block">
                            {folder.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                        onClick={async () => {
                          try {
                            await flow.bookmarks.collections.restore(folder.id);
                            await loadFolders();
                            await loadDeletedFolders();
                            toast.success('Folder restored');
                          } catch (error) {
                            console.error('Failed to restore folder:', error);
                            toast.error('Failed to restore folder');
                          }
                        }}
                        title="Restore folder"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await flow.bookmarks.collections.permanentlyDelete(folder.id);
                            await loadDeletedFolders();
                            toast.success('Folder permanently deleted');
                          } catch (error) {
                            console.error('Failed to permanently delete folder:', error);
                            toast.error('Failed to permanently delete folder');
                          }
                        }}
                        title="Delete permanently"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4">
            {/* AI cards removed - now using auto-apply with toast undo */}

            {filteredBookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="max-w-md">
                {/* Large Icon with gradient background */}
                <div className="relative mb-6 mx-auto w-fit">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl" />
                  <div className="relative bg-card border border-border rounded-full p-6 shadow-lg w-28 h-28 flex items-center justify-center">
                    {showDeleted ? (
                      <Trash2 className="h-16 w-16 text-muted-foreground" />
                    ) : selectedFolder ? (
                      <Folder className="h-16 w-16 text-muted-foreground" />
                    ) : (
                      <BookmarkIcon className="h-16 w-16 text-primary" />
                    )}
                  </div>
                </div>

                {/* Title and Description */}
                <h3 className="text-2xl font-semibold mb-3">
                  {showDeleted 
                    ? (deletedFolders.length > 0 ? 'No deleted bookmarks' : 'Trash is empty')
                    : searchQuery 
                      ? 'No bookmarks found' 
                      : selectedFolder
                        ? 'Empty Folder'
                        : 'Welcome to Bookmarks'}
                </h3>
                <p className="text-muted-foreground mb-8 text-base">
                  {showDeleted
                    ? (deletedFolders.length > 0 
                        ? 'No deleted bookmarks found, but there are deleted folders above.' 
                        : 'Your trash is empty. Deleted bookmarks and folders will appear here.')
                    : searchQuery 
                      ? `No bookmarks match "${searchQuery}". Try a different search term.`
                      : selectedFolder
                        ? `This folder is empty.`
                        : 'Save your favorite websites for quick access. Organize them with labels and collections.'}
                </p>

                {/* Quick Tips or Actions */}
                {!searchQuery && !showDeleted && !selectedFolder && (
                  <div className="space-y-4 mb-8">
                    <div className="bg-muted/30 rounded-lg p-4 text-left">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Quick Tip: Bookmark Current Page
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Click the star icon in the address bar to bookmark the page you're viewing.
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 text-left">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-blue-500" />
                        Organize with Labels
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add labels to your bookmarks to categorize and find them easily.
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 text-left">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4 text-green-500" />
                        Multiple View Options
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Switch between card, list, and grid views to browse your bookmarks your way.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!showDeleted && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {searchQuery ? (
                      <Button 
                        variant="outline" 
                        onClick={() => setSearchQuery('')}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    ) : (
                      <>
                      <Button 
                        onClick={() => {
                          // Go back to browsing
                          window.history.back();
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Start Browsing
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          // TODO: Show import dialog
                          toast.info('Import feature coming soon!');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Import Bookmarks
                      </Button>
                    </>
                  )}
                  </div>
                )}
              </div>
            </div>
            ) : (
              viewMode === 'list' ? (
                <div className="space-y-1">
                  {filteredBookmarks.map((bookmark) => (
                    <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
                  ))}
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredBookmarks.map((bookmark) => (
                    <BookmarkCard key={bookmark.id} bookmark={bookmark} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {filteredBookmarks.map((bookmark) => (
                    <BookmarkGridItem key={bookmark.id} bookmark={bookmark} />
                  ))}
                </div>
              )
            )}
            </div>
          </div>
        </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {parentFolder ? `Create Subfolder in "${parentFolder.name}"` : 'Create New Folder'}
            </DialogTitle>
            <DialogDescription>
              {parentFolder 
                ? `Create a new subfolder within "${parentFolder.name}".`
                : 'Create a new folder to organize your bookmarks.'
              }
            </DialogDescription>
          </DialogHeader>
          <CreateFolderForm 
            parentFolder={parentFolder}
            onSuccess={() => {
              setShowCreateFolderDialog(false);
              setParentFolder(null);
              loadFolders(); // Reload folders
            }}
            onCancel={() => {
              setShowCreateFolderDialog(false);
              setParentFolder(null);
            }}
          />
        </DialogContent>
      </Dialog>


      {/* Rename Folder Dialog */}
      <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Change the name of "{folderToRename?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="rename-folder-name" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="rename-folder-name"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmRenameFolder();
                  }
                }}
                placeholder="Enter folder name"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowRenameFolderDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRenameFolder}
              disabled={isLoading || !renameFolderName.trim()}
            >
              {isLoading ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteFolderDialog} onOpenChange={setShowDeleteFolderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to move "{folderToDelete?.name}" to trash? 
              {folderToDelete && (
                <div className="mt-2 text-sm">
                  <p>This action will:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Move the folder to trash (can be restored later)</li>
                    <li>Move any subfolders to the parent level</li>
                    <li>Remove bookmarks from this folder (bookmarks themselves will not be deleted)</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    You can restore this folder from the trash later if needed.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteFolderDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDeleteFolder}
              disabled={isLoading}
            >
              {isLoading ? 'Moving to Trash...' : 'Move to Trash'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Panel - Slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          showInfoPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedBookmarkInfo && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bookmark Info</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowInfoPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Favicon and Title */}
              <div className="flex items-start gap-3">
                {selectedBookmarkInfo.favicon ? (
                  <img
                    src={selectedBookmarkInfo.favicon}
                    alt=""
                    className="w-8 h-8 rounded flex-shrink-0 mt-1"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg leading-tight mb-2">
                    {selectedBookmarkInfo.title}
                  </h3>
                  <p className="text-sm text-muted-foreground break-all">
                    {selectedBookmarkInfo.url}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedBookmarkInfo.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedBookmarkInfo.description}
                  </p>
                </div>
              )}

              {/* Labels */}
              {selectedBookmarkInfo.labels && selectedBookmarkInfo.labels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Labels</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBookmarkInfo.labels.map((label, index) => (
                      <Badge key={index} variant="secondary">
                        {label.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Date Added</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedBookmarkInfo.dateAdded).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Visit Count</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedBookmarkInfo.visitCount || 0} visits
                  </p>
                </div>
                {selectedBookmarkInfo.lastVisited && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium mb-1">Last Visited</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedBookmarkInfo.lastVisited).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Button
                  className="w-full justify-start"
                  onClick={() => {
                    handleOpenBookmark(selectedBookmarkInfo);
                    setShowInfoPanel(false);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Bookmark
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedBookmarkInfo.url);
                    toast.success('URL copied to clipboard');
                  }}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('Edit functionality coming soon!');
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Bookmark
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay */}
      {showInfoPanel && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowInfoPanel(false)}
        />
      )}


      {/* Collect animation overlay */}
      {isCollecting && collectingBookmarks.length > 0 && activeId && (
        <div className="fixed inset-0 pointer-events-none z-[9998]">
          {collectingBookmarks.map((bookmark) => {
            const sourceEl = document.querySelector(`[data-bookmark-id="${bookmark.id}"]`);
            
            if (!sourceEl) return null;
            
            const sourceRect = sourceEl.getBoundingClientRect();
            
            // Target the center of the screen where the dragged item typically appears
            let targetX, targetY;
            if (collectAnimationComplete) {
              // Use live drag position if available, otherwise center of viewport
              if (dragPosition) {
                targetX = dragPosition.x;
                targetY = dragPosition.y;
              } else {
                targetX = window.innerWidth / 2;
                targetY = window.innerHeight / 2;
              }
            } else {
              // Before animation, use the original placeholder position
              const targetEl = document.querySelector(`[data-bookmark-id="${activeId}"]`);
              if (!targetEl) return null;
              const targetRect = targetEl.getBoundingClientRect();
              targetX = targetRect.left;
              targetY = targetRect.top;
            }
            
            return (
              <div
                key={bookmark.id}
                className={`absolute bg-card border border-border rounded-lg p-2 shadow-lg transition-all duration-500 ${collectAnimationComplete ? 'opacity-0' : 'opacity-70'}`}
                style={{
                  left: sourceRect.left + 'px',
                  top: sourceRect.top + 'px',
                  width: Math.min(sourceRect.width, 200) + 'px',
                  height: '40px',
                  transform: collectAnimationComplete 
                    ? `translate(${targetX - sourceRect.left}px, ${targetY - sourceRect.top}px) scale(0.2)`
                    : 'translate(0, 0) scale(1)',
                }}
              >
                <div className="flex items-center gap-2">
                  {bookmark.favicon && (
                    <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm" />
                  )}
                  <span className="text-sm truncate">{bookmark.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeId && draggedBookmark && (
          <div className="pointer-events-none opacity-90 scale-105 shadow-2xl"
               style={{ transform: 'rotate(3deg)' }}>
            {viewMode === 'list' ? (
              <div className="group bg-card border-2 border-primary rounded-lg p-3 pl-10 shadow-2xl hover:bg-muted/50 transition-colors relative" style={{ width: 'calc(100vw - 320px)' }}>
                {/* Checkbox for drag overlay */}
                <input
                  type="checkbox"
                  checked={selectedBookmarks.has(draggedBookmark.id)}
                  readOnly
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 cursor-pointer"
                />
                {selectedBookmarks.size > 1 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                    {selectedBookmarks.size}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {draggedBookmark.favicon && (
                    <img src={draggedBookmark.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">
                        {draggedBookmark.title}
                      </h3>
                      {draggedBookmark.labels && draggedBookmark.labels.length > 0 && (
                        <div className="flex gap-1">
                          {draggedBookmark.labels.slice(0, 2).map((label, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {label.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate break-all">
                      {formatUrlForDisplay(draggedBookmark.url, 80)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(draggedBookmark.dateAdded).toLocaleDateString()}</span>
                    <span>{draggedBookmark.visitCount || 0} visits</span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-50">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600">
                      <Link className="h-3.5 w-3.5" />
                    </Button>
                    {isAIEnabled && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-yellow-100 hover:text-yellow-600">
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="group aspect-square bg-card border-2 border-primary rounded-lg p-3 shadow-2xl flex flex-col relative w-[200px] h-[200px]">
                {/* Checkbox for drag overlay */}
                <input
                  type="checkbox"
                  checked={selectedBookmarks.has(draggedBookmark.id)}
                  readOnly
                  className="absolute top-1 left-1 z-10 w-3 h-3 cursor-pointer"
                />
                {selectedBookmarks.size > 1 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                    {selectedBookmarks.size}
                  </div>
                )}
                <div className="flex items-center mb-2">
                  {draggedBookmark.favicon && (
                    <img src={draggedBookmark.favicon} alt="" className="w-6 h-6 rounded" />
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{draggedBookmark.title}</h3>
                <p 
                  className="text-xs text-muted-foreground break-all mb-1"
                  style={{ 
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    lineHeight: '1.3'
                  }}
                >
                  {(() => {
                    try {
                      return new URL(draggedBookmark.url).hostname;
                    } catch {
                      return formatUrlForDisplay(draggedBookmark.url, 25);
                    }
                  })()}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <span>{draggedBookmark.visitCount || 0} visits</span>
                </div>
                {draggedBookmark.labels && draggedBookmark.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {draggedBookmark.labels.slice(0, 2).map((label, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {label.label}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1 opacity-50">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600">
                    <Link className="h-3 w-3" />
                  </Button>
                  {isAIEnabled && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-yellow-100 hover:text-yellow-600">
                      <Sparkles className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="shadow-2xl border-2 border-primary h-[160px] flex flex-col w-64 relative">
                {/* Checkbox for drag overlay */}
                <input
                  type="checkbox"
                  checked={selectedBookmarks.has(draggedBookmark.id)}
                  readOnly
                  className="absolute top-1 left-1 z-10 w-3 h-3 cursor-pointer"
                />
                {selectedBookmarks.size > 1 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                    {selectedBookmarks.size}
                  </div>
                )}
                <CardContent className="px-3 pt-3 pb-12 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      {draggedBookmark.favicon && (
                        <img src={draggedBookmark.favicon} alt="" className="w-4 h-4 rounded-sm" />
                      )}
                      <h3 className="font-medium text-sm line-clamp-2 hover:text-primary flex-1">
                        {draggedBookmark.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1" title={draggedBookmark.url}>
                      {formatUrlForDisplay(draggedBookmark.url, 45)}
                    </p>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {draggedBookmark.description || ''}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1 opacity-50">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600">
                      <Link className="h-3.5 w-3.5" />
                    </Button>
                    {isAIEnabled && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-yellow-100 hover:text-yellow-600">
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DragOverlay>
    </div>
    </DndContext>

    {/* AI Review Panel */}
    <AIReviewPanel
      isOpen={isPanelOpen}
      bookmark={currentBookmark}
      analysis={currentAnalysis}
      autoAppliedLabels={autoAppliedLabels}
      onClose={closeReviewPanel}
      onApplyLabel={applyLabelFromPanel}
      onRejectLabel={rejectLabelFromPanel}
      onRemoveLabel={removeLabelFromPanel}
      onRemoveAutoApplied={removeAutoAppliedFromPanel}
      onReApplyAutoApplied={reApplyAutoAppliedLabel}
      onApplyAll={applyAllFromPanel}
      onRejectAll={rejectAllFromPanel}
      onClearAccepted={clearAcceptedFromPanel}
      isApplying={false}
      // Bulk review props
      bulkReviewMode={aiAnalysis.bulkReviewMode}
      bulkReviewStats={aiAnalysis.bulkReviewStats}
      bulkReviewIndex={aiAnalysis.bulkReviewIndex}
      bulkReviewTotal={aiAnalysis.bulkReviewTotal}
      onNext={aiAnalysis.goToNextInBulkReview}
      onSkip={aiAnalysis.skipCurrentInBulkReview}
      onApplyAllAndContinue={aiAnalysis.applyAllAndContinue}
    />

    {/* AI Labeling Dashboard */}
    <AILabelingDashboard
      bookmarks={dashboardBookmarks}
      isOpen={showDashboard}
      onClose={() => setShowDashboard(false)}
      onBookmarkUpdated={loadBookmarks}
      isAnalyzing={aiAnalysis.isAnalyzing}
    />

    </>
  );
}

export default function BookmarksRoute() {
  return (
    <>
      <title>Bookmarks - Flow Browser</title>
      <BookmarksPage />
    </>
  );
}