import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Clock, CheckCircle2, RotateCcw, Zap, Sparkles, ArrowRight, SkipForward, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import type { Bookmark } from '~/types/bookmarks';
import type { CategoryAnalysis, BookmarkLabel, LabelReviewState } from '~/flow/interfaces/ai';

interface BulkReviewStats {
  total: number;
  completed: number;
  skipped: number;
}

interface AIReviewPanelProps {
  isOpen: boolean;
  bookmark: Bookmark | null;
  analysis: CategoryAnalysis | null;
  autoAppliedLabels?: BookmarkLabel[]; // Labels that were auto-applied
  onClose: () => void;
  onApplyLabel: (label: BookmarkLabel) => void;
  onRejectLabel: (label: BookmarkLabel) => void;
  onRemoveLabel: (label: BookmarkLabel) => void; // New: move from accepted back to pending
  onRemoveAutoApplied?: (label: BookmarkLabel) => void; // Remove auto-applied label
  onReApplyAutoApplied?: (label: BookmarkLabel) => void; // Re-apply undone auto-applied label
  onApplyAll: () => void;
  onRejectAll: () => void;
  onClearAccepted: () => void; // New: move all accepted back to pending
  isApplying?: boolean;
  // Bulk review props
  bulkReviewMode?: boolean;
  bulkReviewStats?: BulkReviewStats;
  bulkReviewIndex?: number;
  bulkReviewTotal?: number;
  onNext?: () => void;
  onSkip?: () => void;
  onApplyAllAndContinue?: () => void;
}

interface ConfidenceIndicatorProps {
  confidence: number;
  showPercentage?: boolean;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ 
  confidence, 
  showPercentage = true 
}) => {
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  };

  const level = getConfidenceLevel(confidence);
  const dots = Math.ceil(confidence * 3); // 0-3 dots based on confidence

  const levelStyles = {
    high: 'text-green-600 bg-green-100',
    medium: 'text-amber-600 bg-amber-100', 
    low: 'text-red-600 bg-red-100'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i <= dots ? 'bg-current' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      {showPercentage && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${levelStyles[level]}`}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};

interface PendingLabelItemProps {
  label: BookmarkLabel;
  onApply: () => void;
  onReject: () => void;
  isApplying?: boolean;
  isUndoneAutoApplied?: boolean;
}

const PendingLabelItem: React.FC<PendingLabelItemProps> = ({
  label,
  onApply,
  onReject,
  isApplying = false,
  isUndoneAutoApplied = false
}) => {
  
  return (
    <motion.div 
      className={`flex items-center justify-between p-3 border rounded-lg bg-card border-l-4 ${
        isUndoneAutoApplied 
          ? 'border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/20' 
          : 'border-l-orange-400'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isUndoneAutoApplied ? (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                Undone
              </span>
            </div>
          ) : (
            <Zap className="h-3.5 w-3.5 text-orange-500" />
          )}
          <span className="font-medium text-sm truncate">{label.label}</span>
          <ConfidenceIndicator confidence={label.confidence} />
        </div>
        {label.category && (
          <Badge variant="outline" className={`text-xs ${
            isUndoneAutoApplied 
              ? 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300'
              : ''
          }`}>
            {label.category}
          </Badge>
        )}
      </div>
      <div className="flex gap-1 ml-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 bg-green-100 hover:bg-green-200 text-green-700"
          onClick={onApply}
          disabled={isApplying}
          title={isUndoneAutoApplied ? "Re-apply auto-applied label" : "Apply label"}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost" 
          className="h-7 w-7 p-0 bg-red-100 hover:bg-red-200 text-red-700"
          onClick={onReject}
          disabled={isApplying}
          title={isUndoneAutoApplied ? "Permanently reject" : "Reject label"}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};

interface AcceptedLabelItemProps {
  label: BookmarkLabel;
  onRemove: () => void;
  isApplying?: boolean;
}

const AcceptedLabelItem: React.FC<AcceptedLabelItemProps> = ({
  label,
  onRemove,
  isApplying = false
}) => {
  return (
    <motion.div 
      className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-l-4 border-l-green-400 opacity-90"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 0.9, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-sm truncate text-green-800">{label.label}</span>
          <ConfidenceIndicator confidence={label.confidence} showPercentage={false} />
        </div>
        {label.category && (
          <Badge variant="outline" className="text-xs border-green-300 text-green-700">
            {label.category}
          </Badge>
        )}
      </div>
      <div className="flex gap-1 ml-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600"
          onClick={onRemove}
          disabled={isApplying}
          title="Remove label"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};

interface AutoAppliedLabelItemProps {
  label: BookmarkLabel & { isUndone?: boolean };
  onRemove: () => void;
  onReApply?: () => void;
  isApplying?: boolean;
}

const AutoAppliedLabelItem: React.FC<AutoAppliedLabelItemProps> = ({
  label,
  onRemove,
  onReApply,
  isApplying = false
}) => {
  const isUndone = (label as any).isUndone;
  
  return (
    <motion.div 
      className={`flex items-center justify-between p-3 border rounded-lg border-l-4 ${
        isUndone 
          ? 'bg-gray-50/70 border-l-gray-400 dark:bg-gray-800/30 dark:border-l-gray-500' 
          : 'bg-blue-50/70 border-l-blue-500 dark:bg-blue-950/30 dark:border-l-blue-400'
      }`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {isUndone ? (
              <RotateCcw className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <span className={`font-medium text-sm truncate ${
              isUndone 
                ? 'text-gray-600 dark:text-gray-400 line-through' 
                : 'text-blue-900 dark:text-blue-100'
            }`}>
              {label.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              isUndone
                ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
            }`}>
              {isUndone ? 'Undone' : `Auto ${Math.round(label.confidence * 100)}%`}
            </span>
          </div>
        </div>
        {label.category && (
          <Badge variant="outline" className={`text-xs ${
            isUndone
              ? 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
              : 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300'
          }`}>
            {label.category}
          </Badge>
        )}
      </div>
      <div className="flex gap-1 ml-2">
        {isUndone ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-300"
            onClick={onReApply}
            disabled={isApplying}
            title="Re-apply label"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400"
            onClick={onRemove}
            disabled={isApplying}
            title="Remove auto-applied label"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface ExistingLabelItemProps {
  label: any; // Using any to match existing bookmark label structure
}

const ExistingLabelItem: React.FC<ExistingLabelItemProps> = ({ label }) => {
  return (
    <motion.div 
      className="flex items-center justify-between p-2 border rounded bg-gray-50/70 border-l-4 border-l-gray-400 dark:bg-gray-800/30 dark:border-l-gray-500"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Tag className="h-3 w-3 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-xs text-gray-800 dark:text-gray-200 truncate">{label.label}</span>
          {label.source && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {label.source}
            </span>
          )}
        </div>
        {label.category && (
          <Badge variant="outline" className="text-xs mt-1 border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400">
            {label.category}
          </Badge>
        )}
      </div>
    </motion.div>
  );
};

export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({
  isOpen,
  bookmark,
  analysis,
  autoAppliedLabels = [],
  onClose,
  onApplyLabel,
  onRejectLabel,
  onRemoveLabel,
  onRemoveAutoApplied,
  onReApplyAutoApplied,
  onApplyAll,
  onRejectAll: _onRejectAll, // unused for now
  onClearAccepted,
  isApplying = false,
  // Bulk review props
  bulkReviewMode = false,
  bulkReviewStats,
  bulkReviewIndex = 0,
  bulkReviewTotal = 0,
  onNext,
  onSkip,
  onApplyAllAndContinue
}) => {
  const [labelStates, setLabelStates] = useState<LabelReviewState[]>([]);
  const [undoneAutoAppliedLabels, setUndoneAutoAppliedLabels] = useState<BookmarkLabel[]>([]);
  const [undoneAutoAppliedIds, setUndoneAutoAppliedIds] = useState<Set<string>>(new Set());

  // Initialize label states when analysis changes
  useEffect(() => {
    if (analysis?.labels) {
      const newStates: LabelReviewState[] = analysis.labels.map((label, index) => ({
        id: `${label.label}-${label.category}-${index}`,
        label,
        status: 'pending',
        timestamp: new Date()
      }));
      setLabelStates(newStates);
    } else {
      setLabelStates([]);
    }
    // Clear undone auto-applied labels when analysis changes
    setUndoneAutoAppliedLabels([]);
    setUndoneAutoAppliedIds(new Set());
  }, [analysis]);

  const pendingLabels = labelStates.filter(state => state.status === 'pending');
  const acceptedLabels = labelStates.filter(state => state.status === 'accepted');
  
  // Combine pending AI suggestions with undone auto-applied labels
  const allPendingLabels = [
    ...pendingLabels,
    ...undoneAutoAppliedLabels.map((label, index) => ({
      id: `undone-auto-${label.label}-${label.category}-${index}`,
      label,
      status: 'pending' as const,
      timestamp: new Date(),
      isUndoneAutoApplied: true
    }))
  ];

  const handleApplyLabel = (label: BookmarkLabel) => {
    setLabelStates(prev => prev.map(state => 
      state.label.label === label.label && state.label.category === label.category
        ? { ...state, status: 'accepted' as const, timestamp: new Date() }
        : state
    ));
    onApplyLabel(label);
  };

  const handleRejectLabel = (label: BookmarkLabel) => {
    setLabelStates(prev => prev.map(state => 
      state.label.label === label.label && state.label.category === label.category
        ? { ...state, status: 'rejected' as const, timestamp: new Date() }
        : state
    ));
    onRejectLabel(label);
  };

  const handleRemoveLabel = (label: BookmarkLabel) => {
    setLabelStates(prev => prev.map(state => 
      state.label.label === label.label && state.label.category === label.category
        ? { ...state, status: 'pending' as const, timestamp: new Date() }
        : state
    ));
    onRemoveLabel(label);
  };

  const handleApplyAll = () => {
    setLabelStates(prev => prev.map(state => 
      state.status === 'pending'
        ? { ...state, status: 'accepted' as const, timestamp: new Date() }
        : state
    ));
    onApplyAll();
  };

  const handleClearAccepted = () => {
    setLabelStates(prev => prev.map(state => 
      state.status === 'accepted'
        ? { ...state, status: 'pending' as const, timestamp: new Date() }
        : state
    ));
    onClearAccepted();
  };

  const handleRemoveAutoApplied = (label: BookmarkLabel) => {
    const labelId = `${label.label}-${label.category}`;
    
    // Only add to undone list if not already there (prevent duplicates)
    if (!undoneAutoAppliedIds.has(labelId)) {
      setUndoneAutoAppliedLabels(prev => [...prev, label]);
      setUndoneAutoAppliedIds(prev => new Set(prev).add(labelId));
    }
    
    // Call the parent's onRemoveAutoApplied to handle the actual removal
    onRemoveAutoApplied?.(label);
  };

  const handleReapplyUndoneAutoApplied = (label: BookmarkLabel) => {
    const labelId = `${label.label}-${label.category}`;
    
    // Remove from undone list and re-apply
    setUndoneAutoAppliedLabels(prev => prev.filter(l => 
      !(l.label === label.label && l.category === label.category)
    ));
    setUndoneAutoAppliedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(labelId);
      return newSet;
    });
    onReApplyAutoApplied?.(label);
  };

  const handleRejectUndoneAutoApplied = (label: BookmarkLabel) => {
    const labelId = `${label.label}-${label.category}`;
    
    // Just remove from undone list (permanently reject)
    setUndoneAutoAppliedLabels(prev => prev.filter(l => 
      !(l.label === label.label && l.category === label.category)
    ));
    setUndoneAutoAppliedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(labelId);
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">
                  {bulkReviewMode ? 'Bulk AI Review' : 'AI Label Review'}
                </h3>
                {bulkReviewMode && bulkReviewStats && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 rounded-full border border-purple-200 dark:border-purple-700">
                    {bulkReviewIndex + 1} of {bulkReviewTotal}
                  </span>
                )}
                {autoAppliedLabels.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700">
                    <Sparkles className="h-3 w-3" />
                    {autoAppliedLabels.length} auto-applied
                  </span>
                )}
              </div>
              {bookmark && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {bookmark.title}
                </p>
              )}
              {bulkReviewMode && bulkReviewStats && (
                <p className="text-xs text-muted-foreground mt-1">
                  Progress: {bulkReviewStats.completed} completed, {bulkReviewStats.skipped} skipped
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ml-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!analysis ? (
              <div className="flex items-center justify-center h-32 p-4">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No analysis available</p>
                </div>
              </div>
            ) : labelStates.length === 0 ? (
              <div className="text-center py-8 p-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">No Labels Found</p>
                <p className="text-xs text-muted-foreground">
                  AI couldn't find confident labels for this bookmark
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Existing Labels Section */}
                <div className="flex-1 flex flex-col min-h-0" style={{ height: '30%' }}>
                  <div className="flex-shrink-0 bg-background border-b px-4 py-2 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-medium text-sm">
                      Existing Labels ({bookmark?.labels?.length || 0})
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {bookmark?.labels && bookmark.labels.length > 0 ? (
                      <div className="p-4 pb-2">
                        <div className="space-y-1.5">
                          <AnimatePresence mode="popLayout">
                            {bookmark.labels.map((label, index) => (
                              <ExistingLabelItem
                                key={`existing-${label.label}-${label.source}-${index}`}
                                label={label}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-xs text-muted-foreground">
                          No existing labels
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-Applied Section */}
                <div className="flex-1 flex flex-col min-h-0" style={{ height: '30%' }}>
                  <div className="flex-shrink-0 bg-background border-b px-4 py-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-sm">
                      Auto-Applied ({autoAppliedLabels.length})
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {autoAppliedLabels.length > 0 ? (
                      <div className="p-4 pb-2">
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {autoAppliedLabels.map((label, index) => {
                              const labelId = `${label.label}-${label.category}`;
                              const isUndone = undoneAutoAppliedIds.has(labelId);
                              return (
                                <AutoAppliedLabelItem
                                  key={`auto-${label.label}-${label.category}-${index}`}
                                  label={{ ...label, isUndone }}
                                  onRemove={() => handleRemoveAutoApplied(label)}
                                  onReApply={() => onReApplyAutoApplied?.(label)}
                                  isApplying={isApplying}
                                />
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-xs text-muted-foreground">
                          No auto-applied labels
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* New AI Suggestions Section */}
                <div className="flex-1 flex flex-col min-h-0" style={{ height: '30%' }}>
                  <div className="flex-shrink-0 bg-background border-b px-4 py-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <h4 className="font-medium text-sm">
                      New AI Suggestions ({allPendingLabels.length})
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {allPendingLabels.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-xs text-muted-foreground">
                          No new AI suggestions
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 pb-2">
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {allPendingLabels.map((state) => {
                              const isUndoneAutoApplied = (state as any).isUndoneAutoApplied;
                              return (
                                <PendingLabelItem
                                  key={state.id}
                                  label={state.label}
                                  isUndoneAutoApplied={isUndoneAutoApplied}
                                  onApply={() => {
                                    if (isUndoneAutoApplied) {
                                      handleReapplyUndoneAutoApplied(state.label);
                                    } else {
                                      handleApplyLabel(state.label);
                                    }
                                  }}
                                  onReject={() => {
                                    if (isUndoneAutoApplied) {
                                      handleRejectUndoneAutoApplied(state.label);
                                    } else {
                                      handleRejectLabel(state.label);
                                    }
                                  }}
                                  isApplying={isApplying}
                                />
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applied Labels Section - Keep this for the existing workflow */}
                {acceptedLabels.length > 0 && (
                  <div className="flex-shrink-0 border-t">
                    <div className="bg-background px-4 py-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-sm">
                        Applied Labels ({acceptedLabels.length})
                      </h4>
                    </div>
                    
                    <div className="p-4 pb-2 max-h-32 overflow-y-auto">
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {acceptedLabels.map((state) => (
                            <AcceptedLabelItem
                              key={state.id}
                              label={state.label}
                              onRemove={() => handleRemoveLabel(state.label)}
                              isApplying={isApplying}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Details */}
                {analysis.suggestedDescription && (
                  <div className="border-t p-4">
                    <h4 className="font-medium text-sm mb-2">Suggested Description</h4>
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {analysis.suggestedDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {labelStates.length > 0 && (
            <div className="border-t p-4 bg-background">
              {bulkReviewMode ? (
                // Bulk review navigation
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onApplyAllAndContinue}
                      disabled={isApplying || allPendingLabels.length === 0}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Apply & Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSkip}
                      disabled={isApplying}
                      className="text-xs"
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip This
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleApplyAll}
                      disabled={isApplying || allPendingLabels.length === 0}
                      className="text-xs"
                    >
                      Apply All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNext}
                      disabled={isApplying}
                      className="text-xs"
                    >
                      Next
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Single review actions
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyAll}
                    disabled={isApplying || pendingLabels.length === 0}
                    className="text-xs"
                  >
                    Apply All Pending
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAccepted}
                    disabled={isApplying || acceptedLabels.length === 0}
                    className="text-xs"
                  >
                    Clear Applied
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIReviewPanel;