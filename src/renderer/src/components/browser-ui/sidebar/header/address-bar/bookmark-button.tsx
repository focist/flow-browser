import { Button } from "@/components/ui/button";
import { useTabs } from "@/components/providers/tabs-provider";
import { useSpaces } from "@/components/providers/spaces-provider";
import { cn } from "@/lib/utils";
import { BookmarkIcon, BookmarkCheckIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export function BookmarkButton() {
  const { addressUrl, focusedTab } = useTabs();
  const { currentSpace } = useSpaces();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBookmarkId, setCurrentBookmarkId] = useState<string | null>(null);

  // Check if current URL is bookmarked
  const checkBookmarkStatus = useCallback(async () => {
    if (!addressUrl || !currentSpace?.profileId || !currentSpace?.id) {
      setIsBookmarked(false);
      setCurrentBookmarkId(null);
      return;
    }
    
    // Don't check for flow:// or flow-internal:// URLs
    if (addressUrl.startsWith('flow://') || addressUrl.startsWith('flow-internal://')) {
      setIsBookmarked(false);
      setCurrentBookmarkId(null);
      return;
    }
    
    try {
      // Get all bookmarks for this URL (exclude deleted ones)
      const existingBookmarks = await flow.bookmarks.getByUrl(addressUrl);
      
      // Find bookmark for current profile and space that isn't deleted
      const bookmark = existingBookmarks.find(
        b => b.profileId === currentSpace.profileId && b.spaceId === currentSpace.id && !b.deletedAt
      );
      
      if (bookmark) {
        setIsBookmarked(true);
        setCurrentBookmarkId(bookmark.id);
      } else {
        setIsBookmarked(false);
        setCurrentBookmarkId(null);
      }
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
      setIsBookmarked(false);
      setCurrentBookmarkId(null);
    }
  }, [addressUrl, currentSpace?.profileId, currentSpace?.id]);

  useEffect(() => {
    checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to the address bar
    e.stopPropagation();
    
    if (!addressUrl || !currentSpace?.profileId || !currentSpace?.id) {
      toast.error('Cannot bookmark this page - missing profile or space');
      return;
    }

    // Don't bookmark flow:// URLs
    if (addressUrl.startsWith('flow://') || addressUrl.startsWith('flow-internal://')) {
      toast.error('Cannot bookmark internal pages');
      return;
    }

    setIsLoading(true);

    try {
      if (isBookmarked && currentBookmarkId) {
        // Remove bookmark (soft delete)
        const success = await flow.bookmarks.delete(currentBookmarkId);
        if (success) {
          const bookmarkId = currentBookmarkId;
          setIsBookmarked(false);
          setCurrentBookmarkId(null);
          
          // Show undo toast
          toast.success('Bookmark moved to trash', {
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  await flow.bookmarks.restore(bookmarkId);
                  // Refresh bookmark status
                  await checkBookmarkStatus();
                  // Notify bookmark manager to refresh
                  window.dispatchEvent(new CustomEvent('bookmarkChanged'));
                  toast.success('Bookmark restored');
                } catch (error) {
                  console.error('Failed to restore bookmark:', error);
                  toast.error('Failed to restore bookmark');
                }
              }
            }
          });
          
          // Notify bookmark manager to refresh
          window.dispatchEvent(new CustomEvent('bookmarkChanged'));
        } else {
          toast.error('Failed to remove bookmark');
        }
      } else {
        // Add bookmark
        let title = focusedTab?.title || '';
        if (!title) {
          try {
            title = new URL(addressUrl).hostname;
          } catch {
            title = addressUrl;
          }
        }
        
        const newBookmark = await flow.bookmarks.create({
          url: addressUrl,
          title: title,
          profileId: currentSpace.profileId,
          spaceId: currentSpace.id
        });
        
        if (newBookmark) {
          setIsBookmarked(true);
          setCurrentBookmarkId(newBookmark.id);
          toast.success('Bookmark added');
          // Notify bookmark manager to refresh
          window.dispatchEvent(new CustomEvent('bookmarkChanged'));
        } else {
          toast.error('Failed to add bookmark');
        }
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      toast.error(isBookmarked ? 'Failed to remove bookmark' : 'Failed to add bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show for flow:// or flow-internal:// URLs or when there's no URL
  if (!addressUrl || addressUrl.startsWith('flow://') || addressUrl.startsWith('flow-internal://')) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-6",
        "hover:bg-black/10 dark:hover:bg-white/10",
        "transition-all duration-150",
        isBookmarked && "hover:bg-yellow-500/20"
      )}
      onClick={handleBookmarkClick}
      disabled={isLoading}
      title={isBookmarked ? "Remove bookmark (Click to remove)" : "Bookmark this page (Click to save)"}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isBookmarked ? (
        <BookmarkCheckIcon className="size-3.5 text-yellow-500 fill-yellow-500" />
      ) : (
        <BookmarkIcon className="size-3.5 hover:text-yellow-500 transition-colors" />
      )}
    </Button>
  );
}