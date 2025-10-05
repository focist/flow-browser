import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Bookmark } from '~/types/bookmarks';
import type { CategoryAnalysis, BookmarkLabel, PageContent } from '~/flow/interfaces/ai';

interface PendingAnalysis {
  bookmarkId: string;
  analysis: CategoryAnalysis;
  pageContent?: PageContent;
  status: 'pending_review' | 'approved' | 'rejected';
}

interface BulkReviewStats {
  total: number;
  completed: number;
  skipped: number;
}

interface BulkReviewItem {
  bookmark: Bookmark;
  analysis: CategoryAnalysis;
}

interface AnalysisState {
  isAnalyzing: boolean;
  pendingAnalyses: Map<string, PendingAnalysis>;
  isAIEnabled: boolean;
  aiSettings: any;
  onBookmarkUpdated?: () => void;
  // Panel state
  isPanelOpen: boolean;
  currentBookmark: Bookmark | null;
  currentAnalysis: CategoryAnalysis | null;
  autoAppliedLabels: BookmarkLabel[];
  // Bulk review state
  bulkReviewMode: boolean;
  bulkReviewQueue: BulkReviewItem[];
  bulkReviewIndex: number;
  bulkReviewStats: BulkReviewStats;
}

export const useAIAnalysis = (onBookmarkUpdated?: () => void) => {
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    pendingAnalyses: new Map(),
    isAIEnabled: false,
    aiSettings: null,
    onBookmarkUpdated,
    // Panel state
    isPanelOpen: false,
    currentBookmark: null,
    currentAnalysis: null,
    autoAppliedLabels: [],
    // Bulk review state
    bulkReviewMode: false,
    bulkReviewQueue: [],
    bulkReviewIndex: 0,
    bulkReviewStats: { total: 0, completed: 0, skipped: 0 }
  });

  const [analyzingBookmarks, setAnalyzingBookmarks] = useState<Set<string>>(new Set());

  // Auto-apply logic
  const findLabelsToAutoApply = useCallback((labels: BookmarkLabel[], settings: any, bookmark?: { labels?: any[] }) => {
    console.log('🎯 AUTO-APPLY DEBUG: Starting analysis');
    console.log('📊 Current AI Settings:', settings);
    console.log('📋 All labels received:', labels);
    console.log('🔧 Auto-apply enabled:', settings?.autoApply?.enabled);
    console.log('📈 Confidence threshold:', settings?.confidenceThreshold);
    console.log('🎚️ Threshold as percentage:', settings?.confidenceThreshold ? Math.round(settings.confidenceThreshold * 100) + '%' : 'undefined');
    console.log('🏷️ Existing labels on bookmark:', bookmark?.labels?.length || 0);
    
    if (!settings?.autoApply?.enabled) {
      console.log('❌ Auto-apply is DISABLED - returning all labels as remaining');
      return { autoApplied: [], remaining: labels };
    }
    
    if (!settings?.confidenceThreshold) {
      console.log('❌ No confidence threshold set - returning all labels as remaining');
      return { autoApplied: [], remaining: labels };
    }

    // Check if bookmark already has labels - if so, don't auto-apply
    if (bookmark?.labels && bookmark.labels.length > 0) {
      console.log('🚫 Bookmark already has', bookmark.labels.length, 'labels - skipping auto-apply to preserve user labeling');
      return { autoApplied: [], remaining: labels };
    }

    // Find labels that meet the confidence threshold
    console.log('🔍 Checking each label against threshold...');
    labels.forEach(label => {
      const meetsThreshold = label.confidence >= settings.confidenceThreshold;
      console.log(`   📌 "${label.label}": ${Math.round(label.confidence * 100)}% ${meetsThreshold ? '✅ QUALIFIES' : '❌ below threshold'}`);
    });
    
    const qualifyingLabels = labels.filter(label => label.confidence >= settings.confidenceThreshold);
    console.log('✅ Labels meeting threshold:', qualifyingLabels.length, qualifyingLabels.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`));
    
    if (qualifyingLabels.length === 0) {
      console.log('❌ NO labels meet threshold - returning all as remaining');
      return { autoApplied: [], remaining: labels };
    }

    // Sort by confidence and take the highest one(s) up to maxLabels
    const sortedLabels = qualifyingLabels.sort((a, b) => b.confidence - a.confidence);
    const maxLabels = Math.min(settings.autoApply.maxLabels || 1, sortedLabels.length);
    const autoApplied = sortedLabels.slice(0, maxLabels);
    
    console.log('🎯 Max labels to auto-apply:', maxLabels);
    console.log('🏆 Selected for auto-apply:', autoApplied.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`));
    
    // Remaining labels are those not auto-applied
    const autoAppliedNames = autoApplied.map(l => l.label);
    const remaining = labels.filter(l => !autoAppliedNames.includes(l.label));
    
    console.log('📋 Remaining for manual review:', remaining.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`));
    console.log('🎯 AUTO-APPLY RESULT:', { autoAppliedCount: autoApplied.length, remainingCount: remaining.length });

    return { autoApplied, remaining };
  }, []);

  // Check if AI is enabled on mount
  const checkAIStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking AI status...');
      const [enabledResult, settingsResult] = await Promise.all([
        flow.ai['ai:isEnabled'](),
        flow.ai['ai:getSettings']()
      ]);

      console.log('🔍 AI Status Results:', {
        enabledResult,
        settingsResult
      });

      if (enabledResult.success && settingsResult.success) {
        const isEnabled = enabledResult.data || false;
        console.log('✅ AI Status Updated:', {
          isAIEnabled: isEnabled,
          aiSettings: settingsResult.data
        });
        setState(prev => ({
          ...prev,
          isAIEnabled: isEnabled,
          aiSettings: settingsResult.data
        }));
      } else {
        console.warn('❌ AI Status check failed:', { enabledResult, settingsResult });
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  }, []);

  // Analyze a single bookmark
  const analyzeBookmark = useCallback(async (bookmark: Bookmark, options?: { suppressToast?: boolean }) => {
    if (!state.isAIEnabled) {
      toast.error('AI analysis is not enabled');
      return null;
    }

    setState(prev => ({ ...prev, isAnalyzing: true }));
    setAnalyzingBookmarks(prev => new Set([...prev, bookmark.id]));

    try {
      // First, try to fetch page content for better analysis
      let pageContent: PageContent | undefined;
      let contentFetchError: string | undefined;
      
      try {
        const contentResult = await flow.ai['ai:fetchPageContent'](bookmark.url, {
          maxContentLength: 5000, // Limit content for analysis
          includeMetadata: true,
          timeout: 10000
        });

        if (contentResult.success && contentResult.data) {
          pageContent = contentResult.data;
          console.log('🔍 Content fetched for:', bookmark.url, {
            title: pageContent.title,
            contentLength: pageContent.content?.length || 0,
            hasContent: !!pageContent.content,
            language: pageContent.language,
            siteName: pageContent.siteName
          });
        } else {
          contentFetchError = contentResult.error || 'Unknown content fetch error';
          console.warn('❌ Content fetch failed for:', bookmark.url, contentFetchError);
        }
      } catch (fetchError) {
        contentFetchError = fetchError instanceof Error ? fetchError.message : 'Content fetch timeout/network error';
        console.warn('❌ Content fetch exception for:', bookmark.url, contentFetchError);
      }

      // Prepare analysis request with meaningful fallback content
      const fallbackContent = `
Title: ${bookmark.title}
URL: ${bookmark.url}
Description: ${bookmark.description || 'No description available'}
Domain: ${new URL(bookmark.url).hostname}
Path: ${new URL(bookmark.url).pathname}
Labels: ${bookmark.labels?.map(l => l.label).join(', ') || 'none'}
      `.trim();
      
      const analysisRequest = {
        url: bookmark.url,
        title: pageContent?.title || bookmark.title,
        content: pageContent?.content || fallbackContent,
        existingLabels: bookmark.labels?.map(l => l.label) || []
      };

      console.log('🤖 Sending to AI:', {
        url: analysisRequest.url,
        title: analysisRequest.title,
        contentLength: analysisRequest.content?.length || 0,
        hasContent: !!pageContent?.content,
        usingFallbackContent: !pageContent?.content,
        contentFetchError,
        existingLabels: analysisRequest.existingLabels
      });

      // Perform AI analysis
      const analysisResult = await flow.ai['ai:analyzeBookmark'](analysisRequest);

      if (analysisResult.success && analysisResult.data) {
        console.log('✅ AI Analysis Result:', {
          labelsFound: analysisResult.data.labels.length,
          labels: analysisResult.data.labels.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`),
          hasDescription: !!analysisResult.data.suggestedDescription,
          language: analysisResult.data.language
        });

        const pendingAnalysis: PendingAnalysis = {
          bookmarkId: bookmark.id,
          analysis: analysisResult.data,
          pageContent,
          status: 'pending_review'
        };

        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          pendingAnalyses: new Map(prev.pendingAnalyses.set(bookmark.id, pendingAnalysis))
        }));

        // Only show individual toasts if not suppressed (e.g., during bulk analysis)
        if (!options?.suppressToast) {
          if (analysisResult.data.labels.length === 0) {
            toast.error(`No AI labels found for "${bookmark.title}" - content may be too generic or confidence too low`, {
              duration: 10000,
              dismissible: true
            });
          } else {
            // Return labels for user confirmation instead of auto-applying
            toast.success(`Found ${analysisResult.data.labels.length} AI labels for "${bookmark.title}" - review to apply`, {
              duration: 5000,
              dismissible: true,
              // Custom yellow styling to match AI button (was default green)
              className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              style: {
                backgroundColor: '#fefce8',
                borderColor: '#fef3c7',
                color: '#92400e'
              }
            });
          }
        }
        return pendingAnalysis;
      } else {
        console.error('❌ AI Analysis failed:', analysisResult.error);
        throw new Error(analysisResult.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      setAnalyzingBookmarks(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmark.id);
        return newSet;
      });
      toast.error('Failed to analyze bookmark: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
      setAnalyzingBookmarks(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmark.id);
        return newSet;
      });
    }
  }, [state.isAIEnabled]);

  // Panel management functions
  const openReviewPanel = useCallback((bookmark: Bookmark, analysis: CategoryAnalysis, autoAppliedLabels: BookmarkLabel[] = []) => {
    setState(prev => ({
      ...prev,
      isPanelOpen: true,
      currentBookmark: bookmark,
      currentAnalysis: analysis,
      autoAppliedLabels: autoAppliedLabels.map(label => ({ ...label, isUndone: false } as any))
    }));
  }, []);

  const closeReviewPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPanelOpen: false,
      currentBookmark: null,
      currentAnalysis: null,
      autoAppliedLabels: [],
      // Exit bulk review mode when closing
      bulkReviewMode: false,
      bulkReviewQueue: [],
      bulkReviewIndex: 0,
      bulkReviewStats: { total: 0, completed: 0, skipped: 0 }
    }));
  }, []);

  // Analyze multiple bookmarks with panel workflow
  const analyzeBookmarks = useCallback(async (bookmarks: Bookmark[]) => {
    if (!state.isAIEnabled) {
      toast.error('AI analysis is not enabled');
      return;
    }

    if (bookmarks.length === 0) {
      toast.error('No bookmarks selected for analysis');
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true }));
    let successCount = 0;
    let errorCount = 0;

    // Show initial progress toast
    const progressToastId = toast.loading(`Analyzing ${bookmarks.length} bookmarks...`, {
      description: 'AI is analyzing your selected bookmarks'
    });

    try {
      // Process bookmarks in batches to avoid overwhelming the API
      const batchSize = 3;
      const results: { bookmark: Bookmark; analysis: CategoryAnalysis | null }[] = [];
      
      for (let i = 0; i < bookmarks.length; i += batchSize) {
        const batch = bookmarks.slice(i, i + batchSize);
        
        // Update progress
        toast.loading(`Analyzing bookmark ${i + 1}-${Math.min(i + batchSize, bookmarks.length)} of ${bookmarks.length}...`, {
          id: progressToastId,
          description: `Processing batch ${Math.ceil((i + 1) / batchSize)} of ${Math.ceil(bookmarks.length / batchSize)}`
        });
        
        const batchResults = await Promise.allSettled(
          batch.map(async (bookmark) => {
            try {
              // Suppress individual toasts during batch analysis - progress toast provides feedback
              const result = await analyzeBookmark(bookmark, { suppressToast: true });
              return { bookmark, analysis: result?.analysis || null };
            } catch (error) {
              console.error(`Failed to analyze bookmark ${bookmark.title}:`, error);
              return { bookmark, analysis: null };
            }
          })
        );

        // Process batch results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { bookmark, analysis } = result.value;
            results.push({ bookmark, analysis });
            if (analysis) successCount++;
            else errorCount++;
          } else {
            errorCount++;
          }
        });

        // Small delay between batches to be respectful to the API
        if (i + batchSize < bookmarks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Complete the analysis
      if (successCount > 0) {
        // Start bulk review workflow with the first successful result
        const firstSuccessfulResult = results.find(r => r.analysis);
        if (firstSuccessfulResult) {
          // Initialize bulk review state
          setState(prev => ({
            ...prev,
            bulkReviewMode: true,
            bulkReviewQueue: results.filter(r => r.analysis !== null) as BulkReviewItem[], // Only include successful analyses
            bulkReviewIndex: 0,
            bulkReviewStats: { total: successCount, completed: 0, skipped: 0 }
          }));

          // Open panel for first bookmark
          const { autoApplied, remaining } = findLabelsToAutoApply(
            firstSuccessfulResult.analysis!.labels, 
            state.aiSettings,
            firstSuccessfulResult.bookmark
          );

          // Auto-apply if enabled
          if (autoApplied.length > 0) {
            try {
              const labelsToAdd = autoApplied.map(label => ({
                label: label.label,
                source: 'ai' as const,
                confidence: label.confidence,
                category: label.category
              }));
              await flow.bookmarks.update(firstSuccessfulResult.bookmark.id, {
                addLabels: labelsToAdd
              });
              if (state.onBookmarkUpdated) {
                state.onBookmarkUpdated();
              }
            } catch (error) {
              console.error('Failed to auto-apply labels in bulk:', error);
            }
          }

          openReviewPanel(
            firstSuccessfulResult.bookmark,
            { ...firstSuccessfulResult.analysis!, labels: remaining },
            autoApplied
          );

          toast.success(`Analysis complete! Starting review...`, {
            id: progressToastId,
            description: `${successCount} successful, ${errorCount} errors. Review ${successCount} results.`,
            duration: 3000
          });
        }
      } else {
        toast.error('Analysis complete', {
          id: progressToastId,
          description: `No successful analyses found. ${errorCount} errors occurred.`,
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Batch analysis failed:', error);
      toast.error('Batch analysis failed', {
        id: progressToastId,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      });
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [analyzeBookmark, state.isAIEnabled, findLabelsToAutoApply, state.aiSettings, state.onBookmarkUpdated, openReviewPanel]);

  // Apply AI-suggested labels to a bookmark
  const applyAnalysis = useCallback(async (bookmarkId: string, selectedLabels: BookmarkLabel[]) => {
    const pendingAnalysis = state.pendingAnalyses.get(bookmarkId);
    if (!pendingAnalysis) return false;

    try {
      // Convert AI labels to BookmarkLabel format for addLabels
      const labelsToAdd = selectedLabels.map(label => ({
        label: label.label,
        source: 'ai' as const,
        confidence: label.confidence,
        category: label.category
      }));

      // Update the bookmark using addLabels to preserve existing labels
      const result = await flow.bookmarks.update(bookmarkId, {
        addLabels: labelsToAdd
      });

      if (result) {
        // Update the pending analysis status
        const updatedAnalysis = { ...pendingAnalysis, status: 'approved' as const };
        setState(prev => ({
          ...prev,
          pendingAnalyses: new Map(prev.pendingAnalyses.set(bookmarkId, updatedAnalysis))
        }));

        toast.success('AI labels applied successfully', {
          // Custom yellow styling to match AI button (was default green)
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          style: {
            backgroundColor: '#fefce8',
            borderColor: '#fef3c7',
            color: '#92400e'
          }
        });
        return true;
      } else {
        throw new Error('Failed to update bookmark');
      }
    } catch (error) {
      console.error('Failed to apply AI analysis:', error);
      toast.error('Failed to apply labels: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [state.pendingAnalyses]);

  // Reject AI suggestions for a bookmark
  const rejectAnalysis = useCallback((bookmarkId: string) => {
    const pendingAnalysis = state.pendingAnalyses.get(bookmarkId);
    if (!pendingAnalysis) return;

    const updatedAnalysis = { ...pendingAnalysis, status: 'rejected' as const };
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Map(prev.pendingAnalyses.set(bookmarkId, updatedAnalysis))
    }));

    toast.info('AI suggestions dismissed');
  }, [state.pendingAnalyses]);

  // Clear a pending analysis (remove from state)
  const clearAnalysis = useCallback((bookmarkId: string) => {
    setState(prev => {
      const newPending = new Map(prev.pendingAnalyses);
      newPending.delete(bookmarkId);
      return { ...prev, pendingAnalyses: newPending };
    });
  }, []);

  // Generate description for a bookmark
  const generateDescription = useCallback(async (bookmark: Bookmark) => {
    if (!state.isAIEnabled) {
      toast.error('AI analysis is not enabled');
      return null;
    }

    try {
      // First, try to fetch page content for better description
      let pageContent: PageContent | undefined;
      
      const contentResult = await flow.ai['ai:fetchPageContent'](bookmark.url, {
        maxContentLength: 3000, // Limit content for description
        includeMetadata: true,
        timeout: 10000
      });

      if (contentResult.success && contentResult.data) {
        pageContent = contentResult.data;
      }

      // Prepare description request
      const descriptionRequest = {
        url: bookmark.url,
        title: pageContent?.title || bookmark.title,
        content: pageContent?.content,
      };

      // Generate AI description
      const descriptionResult = await flow.ai['ai:generateDescription'](descriptionRequest);

      if (descriptionResult.success && descriptionResult.data) {
        toast.success('AI description generated successfully', {
          // Custom yellow styling to match AI button (was default green)
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          style: {
            backgroundColor: '#fefce8',
            borderColor: '#fef3c7',
            color: '#92400e'
          }
        });
        return descriptionResult.data;
      } else {
        throw new Error(descriptionResult.error || 'Description generation failed');
      }
    } catch (error) {
      console.error('AI description generation failed:', error);
      toast.error('Failed to generate description: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    }
  }, [state.isAIEnabled]);

  // Apply generated description to a bookmark
  const applyDescription = useCallback(async (bookmarkId: string, description: string) => {
    try {
      const result = await flow.bookmarks.update(bookmarkId, {
        description: description
      });

      if (result) {
        toast.success('AI-generated description applied', {
          // Custom yellow styling to match AI button (was default green)
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          style: {
            backgroundColor: '#fefce8',
            borderColor: '#fef3c7',
            color: '#92400e'
          }
        });
        return true;
      } else {
        throw new Error('Failed to update bookmark');
      }
    } catch (error) {
      console.error('Failed to apply AI description:', error);
      toast.error('Failed to apply description: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, []);

  // Find duplicates for a bookmark
  const findDuplicates = useCallback(async (bookmark: { url: string; title: string; description?: string; }, existingBookmarks: { id: string; url: string; title: string; description?: string; }[]) => {
    if (!state.isAIEnabled) {
      toast.error('AI analysis is not enabled');
      return [];
    }

    try {
      const request = {
        url: bookmark.url,
        title: bookmark.title,
        content: bookmark.description,
      };

      const result = await flow.ai['ai:findDuplicates'](request, existingBookmarks);

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Duplicate detection failed');
      }
    } catch (error) {
      console.error('AI duplicate detection failed:', error);
      toast.error('Failed to detect duplicates: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return [];
    }
  }, [state.isAIEnabled]);

  // Get pending analysis for a bookmark
  const getPendingAnalysis = useCallback((bookmarkId: string) => {
    return state.pendingAnalyses.get(bookmarkId);
  }, [state.pendingAnalyses]);

  // Get all pending analyses
  const getAllPendingAnalyses = useCallback(() => {
    return Array.from(state.pendingAnalyses.values()).filter(
      analysis => analysis.status === 'pending_review'
    );
  }, [state.pendingAnalyses]);

  // Bulk review navigation functions
  const goToNextInBulkReview = useCallback(async () => {
    if (!state.bulkReviewMode || state.bulkReviewIndex >= state.bulkReviewQueue.length - 1) {
      // End of queue, close panel
      closeReviewPanel();
      toast.success(`Bulk review complete!`, {
        description: `${state.bulkReviewStats.completed} completed, ${state.bulkReviewStats.skipped} skipped`,
        duration: 4000
      });
      return;
    }

    // Move to next item in queue
    const nextIndex = state.bulkReviewIndex + 1;
    const nextItem = state.bulkReviewQueue[nextIndex];
    
    if (nextItem) {
      // Check for auto-apply on next item
      const { autoApplied, remaining } = findLabelsToAutoApply(nextItem.analysis.labels, state.aiSettings, nextItem.bookmark);
      
      // Auto-apply if enabled
      if (autoApplied.length > 0) {
        try {
          const labelsToAdd = autoApplied.map(label => ({
            label: label.label,
            source: 'ai' as const,
            confidence: label.confidence,
            category: label.category
          }));
          await flow.bookmarks.update(nextItem.bookmark.id, {
            addLabels: labelsToAdd
          });
          if (state.onBookmarkUpdated) {
            state.onBookmarkUpdated();
          }
        } catch (error) {
          console.error('Failed to auto-apply labels in bulk navigation:', error);
        }
      }

      setState(prev => ({
        ...prev,
        bulkReviewIndex: nextIndex,
        currentBookmark: nextItem.bookmark,
        currentAnalysis: { ...nextItem.analysis, labels: remaining },
        autoAppliedLabels: autoApplied,
        bulkReviewStats: { ...prev.bulkReviewStats, completed: prev.bulkReviewStats.completed + 1 }
      }));
    }
  }, [state.bulkReviewMode, state.bulkReviewIndex, state.bulkReviewQueue, state.bulkReviewStats, state.aiSettings, state.onBookmarkUpdated, closeReviewPanel, findLabelsToAutoApply]);

  const skipCurrentInBulkReview = useCallback(() => {
    setState(prev => ({
      ...prev,
      bulkReviewStats: { ...prev.bulkReviewStats, skipped: prev.bulkReviewStats.skipped + 1 }
    }));
    goToNextInBulkReview();
  }, [goToNextInBulkReview]);

  const applyAllAndContinue = useCallback(async () => {
    if (!state.currentBookmark || !state.currentAnalysis) return;
    
    const success = await applyAnalysis(state.currentBookmark.id, state.currentAnalysis.labels);
    if (success && state.bulkReviewMode) {
      goToNextInBulkReview();
    }
  }, [state.currentBookmark, state.currentAnalysis, state.bulkReviewMode, applyAnalysis, goToNextInBulkReview]);

  // Enhanced analyze bookmark that opens panel
  const analyzeBookmarkWithPanel = useCallback(async (bookmark: Bookmark) => {
    // Show loading toast
    const toastId = toast.loading(`Analyzing "${bookmark.title}"...`, {
      description: 'AI is analyzing this bookmark for suggested labels'
    });
    
    try {
      console.log('🚀 Starting AI analysis with settings:', state.aiSettings);
      // Suppress inner toast since we have our own loading toast
      const result = await analyzeBookmark(bookmark, { suppressToast: true });

      if (result?.analysis) {
        console.log('🔬 AI Analysis completed - checking for auto-apply...');
        console.log('📊 Analysis result:', result.analysis);
        console.log('⚙️ Current AI settings for auto-apply:', state.aiSettings);
        
        const { autoApplied, remaining } = findLabelsToAutoApply(result.analysis.labels, state.aiSettings, bookmark);
        
        console.log('🎯 Auto-apply decision:', { autoAppliedCount: autoApplied.length, remainingCount: remaining.length });
        
        // Auto-apply labels if enabled
        if (autoApplied.length > 0) {
          console.log('✨ PROCEEDING with auto-apply for:', autoApplied.map(l => l.label));
          try {
            const labelsToAdd = autoApplied.map(label => ({
              label: label.label,
              source: 'ai' as const,
              confidence: label.confidence,
              category: label.category
            }));
            const updateResult = await flow.bookmarks.update(bookmark.id, {
              addLabels: labelsToAdd
            });

            if (updateResult) {
              // Show success notification if enabled
              if (state.aiSettings?.autoApply?.notifications) {
                autoApplied.forEach(label => {
                  toast.success(`Auto-applied "${label.label}" (${Math.round(label.confidence * 100)}%)`, {
                    description: `High confidence label added to "${bookmark.title}"`,
                    action: {
                      label: "View",
                      onClick: () => openReviewPanel(bookmark, {
                        ...result.analysis,
                        labels: remaining
                      })
                    },
                    duration: 4000,
                    icon: '✨'
                  });
                });
              }
              
              // Call update callback
              if (state.onBookmarkUpdated) {
                state.onBookmarkUpdated();
              }
            }
          } catch (error) {
            console.error('Failed to auto-apply labels:', error);
            // Don't break the flow, just continue with manual review
          }
        }

        // Always show the panel when there are any labels (remaining or auto-applied)
        if (remaining.length > 0 || autoApplied.length > 0) {
          const updatedAnalysis = { ...result.analysis, labels: remaining };
          
          toast.success(`Analysis complete!`, {
            id: toastId,
            description: autoApplied.length > 0 
              ? `${autoApplied.length} auto-applied, ${remaining.length} pending review`
              : `Found ${remaining.length} suggested label${remaining.length === 1 ? '' : 's'}`,
            duration: 3000
          });
          
          openReviewPanel(bookmark, updatedAnalysis, autoApplied);
        }
      } else {
        // No results toast
        toast.info('Analysis complete', {
          id: toastId,
          description: 'No confident labels found for this bookmark',
          duration: 4000
        });
      }
      
      return result;
    } catch (error) {
      // Error toast
      toast.error('Analysis failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      });
      
      throw error;
    }
  }, [analyzeBookmark, openReviewPanel, findLabelsToAutoApply, state.aiSettings, state.onBookmarkUpdated]);

  // Apply single label from panel
  const applyLabelFromPanel = useCallback(async (label: BookmarkLabel) => {
    if (!state.currentBookmark) return false;
    
    const success = await applyAnalysis(state.currentBookmark.id, [label]);
    if (success) {
      toast.success(`Applied "${label.label}"`, {
        duration: 2000
      });
      if (state.onBookmarkUpdated) {
        state.onBookmarkUpdated();
      }
    } else {
      toast.error(`Failed to apply "${label.label}"`);
    }
    return success;
  }, [state.currentBookmark, state.onBookmarkUpdated, applyAnalysis]);

  // Reject single label from panel 
  const rejectLabelFromPanel = useCallback((label: BookmarkLabel) => {
    if (!state.currentBookmark || !state.currentAnalysis) return;
    
    // Remove the label from current analysis
    const updatedLabels = state.currentAnalysis.labels.filter(l => l.label !== label.label);
    const updatedAnalysis = { ...state.currentAnalysis, labels: updatedLabels };
    
    setState(prev => ({
      ...prev,
      currentAnalysis: updatedAnalysis
    }));
    
    toast.info(`Rejected "${label.label}"`, {
      duration: 2000
    });
  }, [state.currentBookmark, state.currentAnalysis]);

  // Apply all labels from panel
  const applyAllFromPanel = useCallback(async () => {
    if (!state.currentBookmark || !state.currentAnalysis) return false;
    
    const labelCount = state.currentAnalysis.labels.length;
    const success = await applyAnalysis(state.currentBookmark.id, state.currentAnalysis.labels);
    
    if (success) {
      toast.success(`Applied ${labelCount} label${labelCount === 1 ? '' : 's'}`, {
        duration: 3000
      });
      closeReviewPanel();
      if (state.onBookmarkUpdated) {
        state.onBookmarkUpdated();
      }
    } else {
      toast.error('Failed to apply labels');
    }
    return success;
  }, [state.currentBookmark, state.currentAnalysis, state.onBookmarkUpdated, applyAnalysis, closeReviewPanel]);

  // Reject all labels from panel
  const rejectAllFromPanel = useCallback(() => {
    if (!state.currentBookmark) return;
    
    rejectAnalysis(state.currentBookmark.id);
    closeReviewPanel();
  }, [state.currentBookmark, rejectAnalysis, closeReviewPanel]);

  // Remove label from panel (move from accepted back to pending)
  const removeLabelFromPanel = useCallback(async (label: BookmarkLabel) => {
    if (!state.currentBookmark) return false;
    
    // Update the bookmark to remove this specific label
    try {
      const result = await flow.bookmarks.get(state.currentBookmark.id);
      if (result) {
        const currentLabels = result.labels?.map(l => l.label) || [];
        const updatedLabels = currentLabels.filter(l => l !== label.label);
        
        const success = await flow.bookmarks.update(state.currentBookmark.id, {
          labels: updatedLabels
        });
        
        if (success && state.onBookmarkUpdated) {
          state.onBookmarkUpdated();
          toast.info(`Label "${label.label}" removed`);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to remove label:', error);
      toast.error('Failed to remove label');
    }
    return false;
  }, [state.currentBookmark, state.onBookmarkUpdated]);

  // Clear all accepted labels (move all from accepted back to pending)
  const clearAcceptedFromPanel = useCallback(async () => {
    if (!state.currentBookmark || !state.currentAnalysis) return false;
    
    // Remove all AI-suggested labels from the bookmark
    try {
      const result = await flow.bookmarks.get(state.currentBookmark.id);
      if (result) {
        const currentLabels = result.labels?.map(l => l.label) || [];
        const aiLabelNames = state.currentAnalysis.labels.map(l => l.label);
        const updatedLabels = currentLabels.filter(l => !aiLabelNames.includes(l));
        
        const success = await flow.bookmarks.update(state.currentBookmark.id, {
          labels: updatedLabels
        });
        
        if (success && state.onBookmarkUpdated) {
          state.onBookmarkUpdated();
          toast.info('All AI labels removed');
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to clear accepted labels:', error);
      toast.error('Failed to clear labels');
    }
    return false;
  }, [state.currentBookmark, state.currentAnalysis, state.onBookmarkUpdated]);

  // Remove auto-applied label from panel
  const removeAutoAppliedFromPanel = useCallback(async (label: BookmarkLabel) => {
    if (!state.currentBookmark) return false;
    
    // Update the bookmark to remove this specific auto-applied label
    try {
      const result = await flow.bookmarks.get(state.currentBookmark.id);
      if (result) {
        const currentLabels = result.labels?.map(l => l.label) || [];
        const updatedLabels = currentLabels.filter(l => l !== label.label);
        
        const success = await flow.bookmarks.update(state.currentBookmark.id, {
          labels: updatedLabels
        });
        
        if (success) {
          // Mark label as undone but keep it in the auto-applied section
          setState(prev => ({
            ...prev,
            autoAppliedLabels: prev.autoAppliedLabels.map(l => 
              l.label === label.label 
                ? { ...l, isUndone: true } as any
                : l
            )
          }));
          
          if (state.onBookmarkUpdated) {
            state.onBookmarkUpdated();
          }
          toast.info(`Auto-applied label "${label.label}" removed`);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to remove auto-applied label:', error);
      toast.error('Failed to remove auto-applied label');
    }
    return false;
  }, [state.currentBookmark, state.onBookmarkUpdated]);

  // Re-apply auto-applied label that was undone
  const reApplyAutoAppliedLabel = useCallback(async (label: BookmarkLabel) => {
    if (!state.currentBookmark) return false;
    
    try {
      const labelsToAdd = [{
        label: label.label,
        source: 'ai' as const,
        confidence: label.confidence,
        category: label.category
      }];
      
      const success = await flow.bookmarks.update(state.currentBookmark.id, {
        addLabels: labelsToAdd
      });
      
      if (success) {
        // Remove the isUndone flag
        setState(prev => ({
          ...prev,
          autoAppliedLabels: prev.autoAppliedLabels.map(l => 
            l.label === label.label 
              ? { ...l, isUndone: false } as any
              : l
          )
        }));
        
        if (state.onBookmarkUpdated) {
          state.onBookmarkUpdated();
        }
        toast.success(`Re-applied label "${label.label}"`);
        return true;
      }
    } catch (error) {
      console.error('Failed to re-apply auto-applied label:', error);
      toast.error('Failed to re-apply label');
    }
    return false;
  }, [state.currentBookmark, state.onBookmarkUpdated]);

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    isAIEnabled: state.isAIEnabled,
    aiSettings: state.aiSettings,
    analyzingBookmarks,
    isBookmarkAnalyzing: (bookmarkId: string) => analyzingBookmarks.has(bookmarkId),
    
    // Panel state
    isPanelOpen: state.isPanelOpen,
    currentBookmark: state.currentBookmark,
    currentAnalysis: state.currentAnalysis,
    autoAppliedLabels: state.autoAppliedLabels,
    
    // Actions
    checkAIStatus,
    analyzeBookmark,
    analyzeBookmarks,
    applyAnalysis,
    rejectAnalysis,
    clearAnalysis,
    generateDescription,
    applyDescription,
    findDuplicates,
    
    // Panel actions
    analyzeBookmarkWithPanel,
    openReviewPanel,
    closeReviewPanel,
    applyLabelFromPanel,
    rejectLabelFromPanel,
    removeLabelFromPanel,
    removeAutoAppliedFromPanel,
    reApplyAutoAppliedLabel,
    applyAllFromPanel,
    rejectAllFromPanel,
    clearAcceptedFromPanel,
    
    // Bulk review actions
    goToNextInBulkReview,
    skipCurrentInBulkReview,
    applyAllAndContinue,
    
    // Bulk review state
    bulkReviewMode: state.bulkReviewMode,
    bulkReviewStats: state.bulkReviewStats,
    bulkReviewIndex: state.bulkReviewIndex,
    bulkReviewTotal: state.bulkReviewQueue.length,
    
    // Getters
    getPendingAnalysis,
    getAllPendingAnalyses,
    
    // Computed state
    hasPendingAnalyses: state.pendingAnalyses.size > 0,
    pendingCount: Array.from(state.pendingAnalyses.values()).filter(
      analysis => analysis.status === 'pending_review'
    ).length
  };
};