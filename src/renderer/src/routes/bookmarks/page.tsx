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
  CloudUpload
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<SortBy>('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<BookmarkFilter>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Load bookmarks on mount and filter changes
  useEffect(() => {
    console.log('Loading bookmarks effect triggered');
    loadBookmarks();
  }, [filter]);

  // Listen for bookmark changes (custom event)
  useEffect(() => {
    const handleBookmarkChange = () => {
      console.log('Bookmark change event received, reloading...');
      loadBookmarks();
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
    let filtered = bookmarks;

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
  }, [bookmarks, searchQuery, sortBy]);

  const handleDeleteBookmark = async (id: string) => {
    try {
      await flow.bookmarks.delete(id);
      toast.success('Bookmark deleted');
      loadBookmarks();
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };

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
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
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
              className="text-xs text-muted-foreground mb-2 break-all"
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
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {bookmark.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenBookmark(bookmark)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDeleteBookmark(bookmark.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {new Date(bookmark.dateAdded).toLocaleDateString()}
          </div>
          {bookmark.visitCount > 0 && (
            <div className="flex items-center gap-1">
              <span>{bookmark.visitCount} visits</span>
            </div>
          )}
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
      </CardContent>
    </Card>
  );

  const BookmarkListItem = ({ bookmark }: { bookmark: Bookmark }) => (
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
        {bookmark.visitCount > 0 && (
          <span>{bookmark.visitCount} visits</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleOpenBookmark(bookmark)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => handleDeleteBookmark(bookmark.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
                  className="flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setFilter({})}
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
                    setSortBy('visitCount');
                    setFilter({});
                  }}
                >
                  <Star className="h-4 w-4" />
                  Most Visited
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
              <h1 className="text-xl font-semibold">Bookmarks</h1>
              <p className="text-sm text-muted-foreground">
                {filteredBookmarks.length} bookmarks
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
                    <div 
                      key={bookmark.id}
                      className="group aspect-square bg-card border border-border rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer flex flex-col"
                      onClick={() => handleOpenBookmark(bookmark)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {bookmark.favicon && (
                          <img src={bookmark.favicon} alt="" className="w-6 h-6 rounded" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleOpenBookmark(bookmark);}}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {e.stopPropagation(); handleDeleteBookmark(bookmark.id);}}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{bookmark.title}</h3>
                      <p 
                        className="text-xs text-muted-foreground flex-1 break-all"
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
                      
                      {bookmark.labels && bookmark.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmark.labels.slice(0, 2).map((label, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {label.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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