import BrowserContent from "@/components/browser-ui/browser-content";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/resizable-sidebar";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BrowserSidebar } from "@/components/browser-ui/browser-sidebar";
import { SpacesProvider, useSpaces } from "@/components/providers/spaces-provider";
import { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { TabsProvider, useTabs } from "@/components/providers/tabs-provider";
import { SettingsProvider, useSettings } from "@/components/providers/settings-provider";
import { TabDisabler } from "@/components/logic/tab-disabler";
import { BrowserActionProvider } from "@/components/providers/browser-action-provider";
import { ExtensionsProviderWithSpaces } from "@/components/providers/extensions-provider";
import { SidebarHoverDetector } from "@/components/browser-ui/sidebar/hover-detector";
import MinimalToastProvider from "@/components/providers/minimal-toast-provider";
import { AppUpdatesProvider } from "@/components/providers/app-updates-provider";
import { ActionsProvider } from "@/components/providers/actions-provider";
import { SidebarAddressBar } from "@/components/browser-ui/sidebar/header/address-bar/address-bar";
import { toast } from "sonner";

export type CollapseMode = "icon" | "offcanvas";
export type SidebarVariant = "sidebar" | "floating";
export type SidebarSide = "left" | "right";

export type WindowType = "main" | "popup";

function InternalBrowserUI({ isReady, type }: { isReady: boolean; type: WindowType }) {
  const { open, setOpen } = useSidebar();
  const { getSetting } = useSettings();
  const { focusedTab, tabGroups, addressUrl } = useTabs();
  const { currentSpace } = useSpaces();

  const [variant, setVariant] = useState<SidebarVariant>("sidebar");
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  const side: SidebarSide = getSetting<SidebarSide>("sidebarSide") ?? "left";

  const sidebarCollapseMode = getSetting<CollapseMode>("sidebarCollapseMode");

  const dynamicTitle: string | null = useMemo(() => {
    if (!focusedTab) return null;

    return focusedTab.title;
  }, [focusedTab]);

  const openedNewTabRef = useRef(false);
  useEffect(() => {
    if (isReady && !openedNewTabRef.current) {
      openedNewTabRef.current = true;
      if (tabGroups.length === 0) {
        flow.newTab.open();
      }
    }
  }, [isReady, tabGroups.length]);

  const isActiveTabLoading = focusedTab?.isLoading || false;

  useEffect(() => {
    if (!isHoveringSidebar && open && variant === "floating") {
      setOpen(false);
    }
  }, [isHoveringSidebar, open, variant, setOpen, setVariant]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd+D (Mac) or Ctrl+D (Windows/Linux) for bookmark
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        
        // Don't bookmark internal pages
        if (!addressUrl || addressUrl.startsWith('flow://') || addressUrl.startsWith('flow-internal://')) {
          toast.error('Cannot bookmark internal pages');
          return;
        }

        if (!currentSpace?.profileId || !currentSpace?.id) {
          toast.error('Cannot bookmark - missing profile or space');
          return;
        }

        try {
          // Check if already bookmarked
          const existingBookmarks = await flow.bookmarks.getByUrl(addressUrl);
          const bookmark = existingBookmarks.find(
            b => b.profileId === currentSpace.profileId && b.spaceId === currentSpace.id
          );

          if (bookmark) {
            // Remove bookmark
            const success = await flow.bookmarks.delete(bookmark.id);
            if (success) {
              toast.success('Bookmark removed');
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
              toast.success('Bookmark added');
              window.dispatchEvent(new CustomEvent('bookmarkChanged'));
            } else {
              toast.error('Failed to add bookmark');
            }
          }
        } catch (error) {
          console.error('Failed to toggle bookmark:', error);
          toast.error('Failed to update bookmark');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [addressUrl, focusedTab, currentSpace]);

  // Only show the browser content if the focused tab is in full screen mode
  if (focusedTab?.fullScreen) {
    return <BrowserContent />;
  }

  const sidebar = (
    <BrowserSidebar
      collapseMode={sidebarCollapseMode}
      variant={variant}
      side={side}
      setIsHoveringSidebar={setIsHoveringSidebar}
      setVariant={setVariant}
    />
  );

  const hasSidebar = type === "main";

  return (
    <MinimalToastProvider sidebarSide={side}>
      <ActionsProvider>
        {dynamicTitle && <title>{`${dynamicTitle} | Flow`}</title>}
        {/* Sidebar on Left Side */}
        {hasSidebar && side === "left" && sidebar}

        <SidebarInset className="bg-transparent">
          <div
            className={cn(
              "dark flex-1 flex p-2 app-drag",
              (open || (!open && sidebarCollapseMode === "icon")) &&
                hasSidebar &&
                variant === "sidebar" &&
                (side === "left" ? "pl-0.5" : "pr-0.5"),
              type === "popup" && "pt-[calc(env(titlebar-area-y)+env(titlebar-area-height))]"
            )}
          >
            {/* Topbar */}
            <div className="absolute top-0 left-0 w-full h-2 flex justify-center items-center">
              <AnimatePresence>
                {isActiveTabLoading && (
                  <motion.div
                    className="w-28 h-1 bg-gray-200/30 dark:bg-white/10 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="h-full bg-gray-800/90 dark:bg-white/90 rounded-full"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{
                        duration: 1,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "loop",
                        repeatDelay: 0.1
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar Hover Detector */}
            <SidebarHoverDetector
              side={side}
              started={() => {
                if (!open && variant === "sidebar" && sidebarCollapseMode === "offcanvas") {
                  setIsHoveringSidebar(true);
                  setVariant("floating");
                  setOpen(true);
                }
              }}
            />

            {/* Content */}
            <div className="flex flex-col flex-1 h-full w-full">
              <div className="remove-app-drag">{type === "popup" && <SidebarAddressBar className="rounded-lg" />}</div>
              <BrowserContent />
            </div>
          </div>
        </SidebarInset>

        {/* Sidebar on Right Side */}
        {hasSidebar && side === "right" && sidebar}
      </ActionsProvider>
    </MinimalToastProvider>
  );
}

export function BrowserUI({ type }: { type: WindowType }) {
  const [isReady, setIsReady] = useState(false);

  // No transition on first load
  useEffect(() => {
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  return (
    <div
      className={cn(
        "w-screen h-screen",
        "bg-gradient-to-br from-space-background-start/75 to-space-background-end/75",
        isReady && "transition-colors duration-300"
      )}
    >
      <TabDisabler />
      <SidebarProvider>
        <SettingsProvider>
          <SpacesProvider windowType={type}>
            <TabsProvider>
              <BrowserActionProvider>
                <ExtensionsProviderWithSpaces>
                  <AppUpdatesProvider>
                    <InternalBrowserUI isReady={isReady} type={type} />
                  </AppUpdatesProvider>
                </ExtensionsProviderWithSpaces>
              </BrowserActionProvider>
            </TabsProvider>
          </SpacesProvider>
        </SettingsProvider>
      </SidebarProvider>
    </div>
  );
}
