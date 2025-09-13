import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { CheckCircle, XCircle, Brain, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import type { DuplicateCandidate } from '~/flow/interfaces/ai';

interface AIDuplicateCardProps {
  newBookmark: {
    url: string;
    title: string;
    description?: string;
  };
  duplicates: DuplicateCandidate[];
  onIgnore: () => void;
  onCancel: () => void;
  onViewExisting: (bookmarkId: string) => void;
  className?: string;
}

const formatPercentage = (value: number) => {
  return Math.round(value * 100);
};

const getSimilarityColor = (similarity: number) => {
  if (similarity >= 0.9) return 'text-red-600';
  if (similarity >= 0.8) return 'text-orange-600';
  if (similarity >= 0.7) return 'text-yellow-600';
  return 'text-gray-600';
};

const getSimilarityLabel = (similarity: number) => {
  if (similarity >= 0.95) return 'Nearly Identical';
  if (similarity >= 0.9) return 'Very Similar';
  if (similarity >= 0.8) return 'Similar';
  if (similarity >= 0.7) return 'Somewhat Similar';
  return 'Different';
};

export const AIDuplicateCard: React.FC<AIDuplicateCardProps> = ({
  newBookmark,
  duplicates,
  onIgnore,
  onCancel,
  onViewExisting,
  className = ''
}) => {
  const [selectedDuplicateIndex, setSelectedDuplicateIndex] = useState(0);
  
  const highestSimilarity = duplicates.length > 0 ? duplicates[0].similarity.overall : 0;
  const selectedDuplicate = duplicates[selectedDuplicateIndex];

  return (
    <Card className={`border-2 border-orange-200 bg-orange-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-orange-100 rounded-full">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <CardTitle className="text-lg">Possible Duplicates Found</CardTitle>
          <Brain className="h-4 w-4 text-blue-500" />
        </div>
        
        <CardDescription>
          <div className="space-y-1">
            <div className="font-medium text-sm">Adding: {newBookmark.title}</div>
            <div className="text-xs text-muted-foreground truncate">{newBookmark.url}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-orange-700 bg-orange-100">
                {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} found
              </Badge>
              <Badge variant="outline" className={getSimilarityColor(highestSimilarity)}>
                {formatPercentage(highestSimilarity)}% similar
              </Badge>
            </div>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Duplicate Selection */}
        {duplicates.length > 1 && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="font-medium text-sm mb-2">
              Multiple duplicates found - showing most similar:
            </div>
            <div className="flex gap-2 flex-wrap">
              {duplicates.map((duplicate, index) => (
                <button
                  key={duplicate.existingBookmark.id}
                  onClick={() => setSelectedDuplicateIndex(index)}
                  className={`px-2 py-1 text-xs rounded border ${
                    index === selectedDuplicateIndex 
                      ? 'bg-orange-100 border-orange-300 text-orange-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {formatPercentage(duplicate.similarity.overall)}% match
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Duplicate Details */}
        {selectedDuplicate && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">
                Existing Bookmark ({getSimilarityLabel(selectedDuplicate.similarity.overall)})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewExisting(selectedDuplicate.existingBookmark.id)}
                className="h-6 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>

            {/* Existing bookmark info */}
            <div className="space-y-2 mb-4">
              <div className="text-sm font-medium truncate">
                {selectedDuplicate.existingBookmark.title}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {selectedDuplicate.existingBookmark.url}
              </div>
              {selectedDuplicate.existingBookmark.description && (
                <div className="text-xs text-muted-foreground">
                  {selectedDuplicate.existingBookmark.description}
                </div>
              )}
            </div>

            {/* Similarity breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-medium mb-1">Similarity Breakdown:</div>
              
              <div className="flex items-center justify-between text-xs">
                <span>URL Match</span>
                <div className="flex items-center gap-2">
                  <Progress value={formatPercentage(selectedDuplicate.similarity.url)} className="w-12 h-1.5" />
                  <span className="w-8 text-right">{formatPercentage(selectedDuplicate.similarity.url)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span>Title Match</span>
                <div className="flex items-center gap-2">
                  <Progress value={formatPercentage(selectedDuplicate.similarity.title)} className="w-12 h-1.5" />
                  <span className="w-8 text-right">{formatPercentage(selectedDuplicate.similarity.title)}%</span>
                </div>
              </div>
              
              {selectedDuplicate.similarity.content > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span>Content Match</span>
                  <div className="flex items-center gap-2">
                    <Progress value={formatPercentage(selectedDuplicate.similarity.content)} className="w-12 h-1.5" />
                    <span className="w-8 text-right">{formatPercentage(selectedDuplicate.similarity.content)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Differences */}
            {selectedDuplicate.differences.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-medium mb-1">Key Differences:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedDuplicate.differences.map((diff, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {diff}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button 
            onClick={onIgnore}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Ignore & Add Anyway
          </Button>
          
          <Button 
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          <Info className="h-3 w-3 inline mr-1" />
          Duplicates are detected using URL, title, and content similarity. You can still add the bookmark if you believe it's different enough.
        </div>
      </CardContent>
    </Card>
  );
};