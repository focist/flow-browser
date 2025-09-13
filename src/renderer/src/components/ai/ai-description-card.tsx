import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { CheckCircle, XCircle, Brain, Edit3, FileText } from 'lucide-react';

interface AIDescriptionCardProps {
  bookmarkTitle: string;
  bookmarkUrl: string;
  generatedDescription: string;
  existingDescription?: string;
  onApply: (description: string) => Promise<boolean>;
  onReject: () => void;
  onDismiss: () => void;
  className?: string;
}

export const AIDescriptionCard: React.FC<AIDescriptionCardProps> = ({
  bookmarkTitle,
  bookmarkUrl,
  generatedDescription,
  existingDescription,
  onApply,
  onReject,
  onDismiss,
  className = ''
}) => {
  const [editedDescription, setEditedDescription] = useState(generatedDescription);
  const [isEditing, setIsEditing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const success = await onApply(editedDescription.trim());
      if (success) {
        onDismiss();
      }
    } catch (error) {
      console.error('Failed to apply AI description:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedDescription(generatedDescription);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const hasChanges = editedDescription.trim() !== generatedDescription;
  const isEmpty = editedDescription.trim().length === 0;

  return (
    <Card className={`border-2 border-green-200 bg-green-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-green-100 rounded-full">
            <FileText className="h-4 w-4 text-green-600" />
          </div>
          <CardTitle className="text-lg">AI Description Ready</CardTitle>
          <Brain className="h-4 w-4 text-blue-500" />
        </div>
        
        <CardDescription>
          <div className="space-y-1">
            <div className="font-medium text-sm">{bookmarkTitle}</div>
            <div className="text-xs text-muted-foreground truncate">{bookmarkUrl}</div>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing Description (if any) */}
        {existingDescription && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="font-medium text-sm mb-2">Current Description</div>
            <p className="text-sm text-muted-foreground">
              {existingDescription}
            </p>
          </div>
        )}

        {/* Generated Description */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">AI-Generated Description</span>
            {!isEditing && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleEdit}
                className="h-6 text-xs"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="Enter description..."
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isEmpty}
                  className="text-xs"
                >
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {editedDescription}
            </p>
          )}
        </div>

        {hasChanges && !isEditing && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            Description has been modified from the original AI suggestion
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button 
            onClick={handleApply}
            disabled={isEmpty || isApplying}
            size="sm"
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isApplying ? 'Applying...' : 'Apply Description'}
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