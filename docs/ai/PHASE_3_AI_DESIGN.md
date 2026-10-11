# Phase 3: AI & Reminders - Technical Design

## AI Categorization System Architecture

### 1. AI Service Integration
- **Provider**: Start with OpenAI API (GPT-4 turbo) for content analysis
- **Fallback**: Local classification using simple keyword matching
- **Configuration**: User-configurable AI provider settings

### 2. Bookmark Analysis Pipeline
```
New Bookmark → Fetch Page Content → AI Analysis → Generate Labels → Store in DB
```

**Components:**
- `BookmarkAIAnalyzer` - Main service class
- `ContentFetcher` - Extracts page content/metadata
- `CategoryClassifier` - AI-powered categorization
- `LabelManager` - Manages AI-generated labels

### 3. AI-Generated Data Schema
Already supported in existing `BookmarkLabel` interface:
- `source: 'ai'` - Identifies AI-generated labels
- `confidence: number` - AI confidence score (0-1)
- `category: 'topic' | 'type' | 'project' | 'priority'` - Label classification

### 4. Smart Categories
**Auto-generated categories:**
- **Topic**: Technology, Business, Health, Entertainment, etc.
- **Type**: Article, Tutorial, Documentation, Reference, Tool
- **Priority**: High, Medium, Low (based on content analysis)
- **Project**: Work, Personal, Learning, Research

### 5. Duplicate Detection Algorithm
- URL normalization and comparison
- Title similarity analysis using cosine similarity
- Content fingerprinting for relocated pages
- Confidence scoring for duplicate suggestions

## Reminder System Architecture

### 1. Database Schema Extensions
```sql
-- New table for bookmark reminders
CREATE TABLE bookmark_reminders (
  id TEXT PRIMARY KEY,
  bookmarkId TEXT REFERENCES bookmarks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminderDate DATETIME NOT NULL,
  isRecurring BOOLEAN DEFAULT false,
  recurrencePattern TEXT, -- JSON: {type: 'daily'|'weekly'|'monthly', interval: number}
  isCompleted BOOLEAN DEFAULT false,
  completedAt DATETIME,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME
);
```

### 2. Reminder Components
- `ReminderScheduler` - Handles reminder scheduling/triggering
- `NotificationManager` - Cross-platform notifications
- `RecurrenceEngine` - Manages recurring reminders
- `ReminderStorage` - Database operations

### 3. Notification System
- **Desktop Notifications**: Using Electron's notification API
- **In-App Notifications**: Banner/toast notifications
- **Reminder Queue**: Background processing of due reminders

## Implementation Plan

### Phase 3A: AI Features
1. **AI Service Setup** (1-2 days)
   - OpenAI API integration
   - Configuration management
   - Error handling & rate limiting

2. **Content Analysis** (2-3 days)
   - Page content fetching
   - AI-powered categorization
   - Label generation with confidence

3. **Smart Suggestions** (2-3 days)
   - Browsing pattern analysis
   - Similar bookmark recommendations
   - Auto-categorization suggestions

4. **Duplicate Detection** (1-2 days)
   - URL normalization
   - Content similarity analysis
   - Duplicate suggestions UI

### Phase 3B: Reminder System
1. **Database Schema** (1 day)
   - Add bookmark_reminders table
   - Migration scripts

2. **Reminder Backend** (2-3 days)
   - Scheduling engine
   - Recurrence patterns
   - Background processing

3. **Notification System** (2-3 days)
   - Desktop notifications
   - In-app notification UI
   - Reminder management

4. **UI Integration** (2-3 days)
   - Reminder creation/editing
   - Notification display
   - Reminder management interface

## Configuration & Settings

### AI Settings
```typescript
interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'local';
  apiKey?: string;
  autoAnalyze: boolean;
  confidenceThreshold: number; // Minimum confidence to show AI labels
  categories: {
    topics: boolean;
    types: boolean;
    priority: boolean;
  };
}
```

### Reminder Settings
```typescript
interface ReminderSettings {
  enabled: boolean;
  defaultNotificationTime: number; // minutes before
  showDesktopNotifications: boolean;
  playSound: boolean;
  snoozeOptions: number[]; // [5, 15, 30, 60] minutes
}
```

## Security & Privacy Considerations
- **API Key Storage**: Encrypted storage for OpenAI API keys
- **Content Privacy**: Option to disable content fetching for sensitive bookmarks
- **Local Processing**: Fallback to local analysis when privacy is a concern
- **Data Retention**: Configurable retention period for AI-generated data

## Performance Optimizations
- **Batch Processing**: Analyze multiple bookmarks together
- **Caching**: Cache AI responses to avoid repeated API calls
- **Background Processing**: Non-blocking AI analysis
- **Rate Limiting**: Respect API limits and implement backoff strategies

## User Experience Features
- **AI Confidence Indicators**: Visual indicators for AI label confidence
- **Manual Override**: Users can edit/remove AI-generated labels
- **Learning System**: Track user edits to improve future suggestions
- **Bulk Operations**: Apply AI analysis to existing bookmark collections