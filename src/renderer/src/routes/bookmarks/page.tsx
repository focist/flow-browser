import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
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
  MoreHorizontal,
  Trash2,
  Edit3,
  Upload,
  FileText,
  CloudUpload,
  RotateCcw,
  X,
  Link,
  Info
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { Bookmark, BookmarkFilter, ImportStats } from "~/types/bookmarks";

type ViewMode = 'card' | 'list' | 'grid';
type SortBy = 'dateAdded' | 'title' | 'visitCount' | 'lastVisited';

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
  console.log('BookmarksPage component rendering...');
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [deletedBookmarks, setDeletedBookmarks] = useState<Bookmark[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<SortBy>('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<BookmarkFilter>({});
  const [showDeleted, setShowDeleted] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedBookmarkInfo, setSelectedBookmarkInfo] = useState<Bookmark | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const loadBookmarks = async () => {
    console.log('Loading bookmarks with filter:', filter);
    setIsLoading(true);
    try {
      const result = await flow.bookmarks.getAll(filter);
      console.log('Loaded bookmarks:', result);
      setBookmarks(result);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeletedBookmarks = async () => {
    console.log('Loading deleted bookmarks');
    setIsLoading(true);
    try {
      const result = await flow.bookmarks.getAll({ onlyDeleted: true });
      console.log('Loaded deleted bookmarks:', result);
      setDeletedBookmarks(result);
    } catch (error) {
      console.error('Failed to load deleted bookmarks:', error);
      toast.error('Failed to load deleted bookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await flow.bookmarks.delete(bookmarkId);
      toast.success('Bookmark moved to trash');
      
      // Refresh both lists
      await loadBookmarks();
      await loadDeletedBookmarks();
      
      // Notify about changes
      window.dispatchEvent(new CustomEvent('bookmarkChanged'));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      toast.error('Failed to delete bookmark');
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

  // Context menu component for bookmarks
  const BookmarkContextMenu = ({ bookmark, children }: { bookmark: Bookmark; children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
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

  // Load bookmarks on mount and filter changes
  useEffect(() => {
    console.log('Loading bookmarks effect triggered');
    if (showDeleted) {
      loadDeletedBookmarks();
    } else {
      loadBookmarks();
    }
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

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = showDeleted ? deletedBookmarks : bookmarks;

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
  }, [bookmarks, deletedBookmarks, showDeleted, searchQuery, sortBy]);

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

  const handleDragOver = (e: React.DragEvent) => {
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


  const BookmarkCard = ({ bookmark }: { bookmark: Bookmark }) => (
    <BookmarkContextMenu bookmark={bookmark}>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer relative">
        <CardContent className="px-3 pt-3 pb-12">
          <div className="mb-1">
            <div className="flex items-center gap-2 mb-1">
              {bookmark.favicon && (
                <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm" />
              )}
              <h3 
                className="font-medium text-sm truncate hover:text-primary" 
                onClick={() => handleOpenBookmark(bookmark)}
              >
                {bookmark.title}
              </h3>
            </div>
            <p 
              className="text-xs text-muted-foreground mb-1 break-all"
              style={{ 
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                lineHeight: '1.3'
              }}
              title={bookmark.url}
            >
              {formatUrlForDisplay(bookmark.url, 60)}
            </p>
            {bookmark.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                {bookmark.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {new Date(bookmark.dateAdded).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <span>{bookmark.visitCount || 0} visits</span>
            </div>
          </div>

          {bookmark.labels && bookmark.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {bookmark.labels.slice(0, 3).map((label, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {label.label}
                </Badge>
              ))}
              {bookmark.labels.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{bookmark.labels.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                  className="h-7 w-7 p-0 hover:bg-purple-100 hover:text-purple-600"
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
  );

  const BookmarkListItem = ({ bookmark }: { bookmark: Bookmark }) => (
    <BookmarkContextMenu bookmark={bookmark}>
      <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
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

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                className="h-7 w-7 p-0 hover:bg-purple-100 hover:text-purple-600"
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
  );

  return (
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
                  className={`flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${!showDeleted ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    setShowDeleted(false);
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
                  className="flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => {
                    setShowDeleted(false);
                    setSortBy('dateAdded');
                    setFilter({});
                  }}
                >
                  <Calendar className="h-4 w-4" />
                  Recently Added
                </button>
                
                <button 
                  className="flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => {
                    setShowDeleted(false);
                    setSortBy('visitCount');
                    setFilter({});
                  }}
                >
                  <Star className="h-4 w-4" />
                  Most Visited
                </button>

                <button 
                  className={`flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors ${showDeleted ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    setShowDeleted(true);
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

            {/* Collections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">COLLECTIONS</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0"
                  onClick={() => {
                    toast.info('Collections feature coming soon!');
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground italic">
                No collections yet
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">LABELS</span>
              </div>
              <div className="text-xs text-muted-foreground italic">
                Labels will appear here
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
              <h1 className="text-xl font-semibold">
                {showDeleted ? 'Deleted Bookmarks' : 'Bookmarks'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredBookmarks.length} {showDeleted ? 'deleted ' : ''}bookmarks
              </p>
            </div>

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
                      onDragOver={handleDragOver}
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

          {/* Bulk Actions */}
          {selectedBookmarks.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {selectedBookmarks.size} bookmark(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedBookmarks(new Set())}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="max-w-md">
                {/* Large Icon with gradient background */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl" />
                  <div className="relative bg-card border border-border rounded-full p-6 shadow-lg">
                    <BookmarkIcon className="h-16 w-16 text-primary" />
                  </div>
                </div>

                {/* Title and Description */}
                <h3 className="text-2xl font-semibold mb-3">
                  {searchQuery ? 'No bookmarks found' : 'Welcome to Bookmarks'}
                </h3>
                <p className="text-muted-foreground mb-8 text-base">
                  {searchQuery 
                    ? `No bookmarks match "${searchQuery}". Try a different search term.`
                    : 'Save your favorite websites for quick access. Organize them with labels and collections.'}
                </p>

                {/* Quick Tips or Actions */}
                {!searchQuery && (
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
              </div>
            </div>
          ) : (
            <div className="p-4">
              {viewMode === 'list' ? (
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
                    <BookmarkContextMenu key={bookmark.id} bookmark={bookmark}>
                      <div 
                        className="group aspect-square bg-card border border-border rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer flex flex-col relative"
                        onClick={() => handleOpenBookmark(bookmark)}
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
                      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                            toast.success('URL copied to clipboard');
                          }}
                          title="Copy URL"
                        >
                          <Link className="h-3 w-3" />
                        </Button>
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
                              className="h-6 w-6 p-0 hover:bg-purple-100 hover:text-purple-600"
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
    </div>
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