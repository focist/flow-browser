import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { CheckCircle, XCircle, Brain, Info, Sparkles } from 'lucide-react';
import type { CategoryAnalysis, BookmarkLabel } from '~/flow/interfaces/ai';

interface AIAnalysisCardProps {
  bookmarkTitle: string;
  bookmarkUrl: string;
  analysis: CategoryAnalysis;
  onApply: (selectedLabels: BookmarkLabel[]) => Promise<boolean>;
  onReject: () => void;
  onDismiss: () => void;
  className?: string;
}

const getCategoryColor = (category: BookmarkLabel['category']) => {
  switch (category) {
    case 'topic':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'type':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'priority':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCategoryIcon = (category: BookmarkLabel['category']) => {
  switch (category) {
    case 'topic':
      return '🏷️';
    case 'type':
      return '📄';
    case 'priority':
      return '⭐';
    default:
      return '🔖';
  }
};

const formatConfidence = (confidence: number) => {
  return Math.round(confidence * 100);
};

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  bookmarkTitle,
  bookmarkUrl,
  analysis,
  onApply,
  onReject,
  onDismiss,
  className = ''
}) => {
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const handleLabelToggle = (labelText: string, checked: boolean) => {
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(labelText);
      } else {
        newSet.delete(labelText);
      }
      return newSet;
    });
  };

  const handleApply = async () => {
    if (selectedLabels.size === 0) {
      return;
    }

    setIsApplying(true);
    try {
      const labelsToApply = analysis.labels.filter(label => 
        selectedLabels.has(label.label)
      );
      
      const success = await onApply(labelsToApply);
      if (success) {
        onDismiss();
      }
    } catch (error) {
      console.error('Failed to apply AI analysis:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLabels.size === analysis.labels.length) {
      setSelectedLabels(new Set());
    } else {
      setSelectedLabels(new Set(analysis.labels.map(l => l.label)));
    }
  };

  const selectedCount = selectedLabels.size;
  const totalCount = analysis.labels.length;

  return (
    <Card className={`border-2 border-blue-200 bg-blue-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-100 rounded-full">
            <Brain className="h-4 w-4 text-blue-600" />
          </div>
          <CardTitle className="text-lg">AI Analysis Ready</CardTitle>
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </div>
        
        <CardDescription>
          <div className="space-y-1">
            <div className="font-medium text-sm">{bookmarkTitle}</div>
            <div className="text-xs text-muted-foreground truncate">{bookmarkUrl}</div>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Summary */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Suggested Labels ({totalCount})</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSelectAll}
              className="h-6 text-xs"
            >
              {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          {analysis.labels.length > 0 ? (
            <div className="space-y-2">
              {analysis.labels.map((label, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border bg-gray-50">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedLabels.has(label.label)}
                      onCheckedChange={(checked) => 
                        handleLabelToggle(label.label, checked as boolean)
                      }
                    />
                    
                    <div className="flex items-center gap-2 flex-1">
                      <Badge 
                        variant="outline" 
                        className={getCategoryColor(label.category)}
                      >
                        {getCategoryIcon(label.category)} {label.label}
                      </Badge>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Progress 
                          value={formatConfidence(label.confidence)} 
                          className="w-12 h-1.5"
                        />
                        <span>{formatConfidence(label.confidence)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {label.reasoning && (
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 p-2 bg-black text-white text-xs rounded shadow-lg">
                        {label.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No labels suggested for this bookmark
            </div>
          )}
        </div>

        {/* Generated Description */}
        {analysis.suggestedDescription && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="font-medium text-sm mb-2">Suggested Description</div>
            <p className="text-sm text-muted-foreground">
              {analysis.suggestedDescription}
            </p>
          </div>
        )}

        {/* Language Detection */}
        {analysis.language && analysis.language !== 'en' && (
          <div className="text-xs text-muted-foreground">
            Detected language: {analysis.language.toUpperCase()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button 
            onClick={handleApply}
            disabled={selectedCount === 0 || isApplying}
            size="sm"
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isApplying ? 'Applying...' : `Apply ${selectedCount} Label${selectedCount !== 1 ? 's' : ''}`}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onReject}
            size="sm"
            disabled={isApplying}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={onDismiss}
            size="sm"
            disabled={isApplying}
            className="text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};