# Flow Browser - Upcoming Features & Development Roadmap

## Executive Summary

This document outlines the upcoming features planned for Flow Browser. The roadmap includes AI enhancements, tab management improvements, and three major new features: Pinned Tabs, Space-Associated Bookmarks Folders, and AI-Powered Tidy functionality.

## 🚧 AI Enhancements

### AI Labeling Dashboard
- Multi-select bookmark AI analysis with bulk operations
- Three-column dashboard layout (bookmarks, suggestions, actions)
- Confidence-based grouping (high/medium/low)
- Bulk accept/reject operations for label suggestions
- Pattern recognition across bookmark collections
- Category-based bulk actions
- Progress tracking and completion status
- Smart pattern detection and auto-labeling rules
- Custom rule creation for automatic labeling
- Learning system that improves from user behavior

**Design Reference**: `docs/design/AI_LABELING_UX_PLAN.md:67-421` (Full Feature Scope)

### Batch Processing Features:
- ⏳ **Implement OpenAI Batch API for bulk bookmark analysis**: 50% cost savings for bulk processing
- ⏳ **Add batch processing for multi-select AI analysis**: Analyze multiple bookmarks in single request
- ⏳ **Create background batch processing for periodic analysis**: Scheduled analysis of all bookmarks
- ⏳ **Add batch job status tracking and results retrieval**: Monitor batch job progress and retrieve results

### Better Integration Features:
- ⏳ **Auto-analyze bookmarks on creation (if enabled)**: Automatic analysis when bookmarks are added
- ⏳ **Show analysis status inline with bookmark metadata**: Display AI status with bookmark info
- ⏳ **Allow quick label editing/removal without complex workflows**: Streamlined label management

## 🚧 Tab Management & Snooze System

- Context Menu Integration: Add "Add to Bookmarks" to tab right-click menu
- Tab Bar Research: Understand current tab drag/drop implementation
- Tab-to-Bookmark Drag: Allow dragging tabs directly into bookmarks viewer (optional advanced feature)
- **Design snooze system database schema**: Complete database schema with Gmail-style snoozing support
- **Implement snooze functionality for tabs**: Tab snoozing with wake-up in original space
- **Implement snooze functionality for bookmarks**: Bookmark snoozing while staying in original location
- **Create unified snoozed section UI**: UI to show both snoozed tabs and bookmarks
- **Implement notification system for wake-ups**: Desktop and in-app notifications for wake-up alerts

### Snooze System Design (Gmail-style):
- **Snooze Tabs**: Right-click tab → "Snooze" → pick wake-up time → tab closes and appears in "Snoozed" section
- **Snooze Bookmarks**: Right-click bookmark → "Snooze" → bookmark stays in original location BUT also shows in "Snoozed" section with snooze indicator
- **Wake-up Behavior**: Snoozed tabs reopen in their original space, bookmarks lose snooze state
- **Cross-space Notifications**: If user is in different space when tab wakes up, show notification "Tab reopened in [Space Name]"
- **Unified Snoozed Section**: Shows both snoozed tabs (with original space info) and snoozed bookmarks with wake-up times

## 🔍 Omnibox Enhancements

Flow Browser already features a comprehensive Spotlight-style omnibox with universal search across websites, URLs, history, tabs, and browser actions ("pedals"). The following enhancements will expand its capabilities:

### Core Search Improvements
- **Enhanced Tab Search**: Improve omnibox search of open tabs with better ranking and filtering
- **Cross-Space Tab Discovery**: Search tabs across all spaces from any space context
- **Advanced Search Syntax**: Support for search operators and filters (site:, type:, space:)

### AI-Powered Search
- **Ask on Page Integration**: AI assistant for current webpage content questions integrated directly into omnibox
- **Instant Links**: AI-powered search that finds results without showing search engines, opening multiple relevant tabs
- **Intelligent Query Expansion**: AI-enhanced search suggestions and query completion

### Custom Search Providers
- Allow users to add custom search engines to omnibox
- Keyword shortcuts for quick provider switching (e.g., "gh react" for GitHub search)
- Import/export search providers from other browsers
- Popular templates (GitHub, Stack Overflow, DuckDuckGo, etc.)
- Security validation and privacy controls for custom providers

### Smart Bookmarks Integration
- **Conversational Bookmark Search**: Natural language queries for bookmark discovery ("Find that React article from last month")
- **Content-Aware Search**: Search within bookmark content and AI-generated descriptions
- **Collection Insights**: Smart suggestions based on bookmark patterns and usage

## 🚧 Advanced Tab Features

### Tab Archive System
- **Auto-Archive with Configurable Timing**: User-configurable timeframes for automatically archiving unused tabs
- **Manual Archive Integration**: Clear button adds tabs to archive instead of permanently closing
- **Archive Organization**: Two sections - "Auto-Closed" and "Manually Closed" tabs
- **Space Filtering**: Filter archived tabs by space for better organization
- **Bookmark Integration**: Easy "Add to Bookmarks" functionality within archive
- **Archive Search**: Dedicated search functionality within the archive (separate from omnibox)
- **Tab Sleeping**: Support for Chrome's native tab sleeping functionality for memory management


## 💬 Chat with Your Bookmarks

*Note: The omnibox search aspects of this feature are covered in the [🔍 Omnibox Enhancements](#-omnibox-enhancements) section above.*

- Dedicated conversational AI interface for bookmark discovery and management
- Content analysis and personalized recommendations beyond search
- Collection insights and pattern discovery
- Advanced bookmark organization and tagging suggestions
- Privacy-first with granular user controls

## 🏷️ Label Management

- Update labels (rename, edit categories, bulk operations)
- Remove labels from bookmarks (X button on labels in info panel)
- Label analytics and insights (usage statistics, duplicate detection)
- Label organization (merging duplicates, templates, search/filtering)
- Integration with existing AI labeling system

## 🎬 Mini Player

- Picture-in-Picture style video player that stays on top while browsing
- Must support YouTube videos (required)
- Support for all video platforms would be nice-to-have
- Resizable, draggable window with playback controls
- Integration with Flow Browser's tab and window management

---

## 🚧 Pinned Tabs

### Overview
A comprehensive pinned tabs system that allows users to pin up to 12 tabs in a responsive grid layout, providing quick access to frequently used tabs while maintaining visual organization.

### Product Requirements

**Core Functionality:**
- **Grid Layout**: Up to 12 pinned tabs in responsive 4 columns × 3 rows maximum
- **Positioning**: Grid displays above regular tabs but below bookmarks folders in sidebar
- **Persistence**: Pinned tabs persist across browser sessions and maintain state
- **Visual Distinction**: Pinned tabs use distinct visual styling to differentiate from regular tabs
- **Management**: Pin/unpin via context menu with drag-and-drop reordering support
- **Cross-Space Support**: Pinned tabs can be space-specific or span multiple spaces/profiles for universal access

**User Experience:**
- **Responsive Design**: Grid adapts to different sidebar widths while maintaining 4-column structure
- **Visual Hierarchy**: Clear separation between bookmarks folders → pinned tabs → regular tabs
- **Quick Access**: One-click activation of pinned tabs
- **Status Indicators**: Show loading state, favicons, and unread indicators
- **Overflow Handling**: Graceful handling when approaching 12-tab limit

### UX Specifications

**Visual Design:**
- **Grid Container**: Compact grid with 8px gaps between items
- **Tab Tiles**:
  - Size: 48px × 48px minimum, scales with sidebar width
  - Border radius: 6px for modern appearance
  - Favicon: Centered 16px × 16px icon
  - Background: Subtle hover and active states
- **Visual States**:
  - Default: Light background with subtle border
  - Hover: Slight elevation and background color change
  - Active: Distinct accent color and border
  - Loading: Pulse animation with skeleton loader

**Interaction Design:**
- **Pinning Actions**:
  - Right-click tab → "Pin Tab" option
  - Maximum 12 tabs with visual feedback when limit approached
  - Confirmation dialog when unpinning tabs with unsaved content
- **Reordering**:
  - Drag-and-drop reordering within pinned grid
  - Smooth animations during reorder operations
  - Visual drop zones and preview positioning
- **Grid Adaptation**:
  - 4 columns maintained across different sidebar widths
  - Tiles scale proportionally while maintaining minimum sizes
  - Responsive text truncation for longer tab titles

### Technical Considerations

**Architecture:**
- **State Management**: Extend existing tab management system with pinned tab state
- **Persistence**: Store pinned tab URLs, positions, and metadata in user profile
- **Session Restoration**: Restore pinned tabs on browser startup with proper ordering
- **Integration**: Seamless integration with existing space and profile systems

**Implementation Stages:**
1. **Core Grid System**: Basic pinned tab grid with pin/unpin functionality
2. **Drag & Drop**: Reordering and visual feedback systems
3. **Persistence**: Session storage and restoration
4. **Polish**: Animations, responsive design, and accessibility features

**Dependencies:**
- Existing tab management system
- Space and profile management
- Sidebar layout system

---

## 🚧 Space-Associated Bookmarks Folders

### Overview
Enhanced bookmarks organization system that associates bookmark folders with specific spaces, providing better contextual organization and improved visual hierarchy in the sidebar.

### Product Requirements

**Core Functionality:**
- **Space Association**: Bookmark folders can be associated with specific spaces for contextual organization
- **Sidebar Positioning**: Folders display above open tabs but below pinned tabs in the visual hierarchy
- **Space-Specific Browsing**: Bookmarks manager shows space-specific folder filtering and organization
- **Intelligent Organization**: Folders automatically organize based on space context and user patterns
- **Cross-Space Access**: Global view available while maintaining space-specific organization

**Organization Features:**
- **Space Filtering**: Filter bookmarks manager by current space or show all spaces
- **Contextual Suggestions**: Suggest appropriate folders when adding bookmarks based on current space
- **Smart Categorization**: AI-powered suggestions for folder associations based on content and usage patterns
- **Visual Indicators**: Clear visual indicators showing which space folders belong to

### UX Specifications

**Visual Hierarchy Design:**
```
Sidebar Layout (Top to Bottom):
├─ Navigation/Search
├─ Bookmarks Folders (Space-Associated)
├─ Pinned Tabs (Grid Layout)
├─ Regular Open Tabs
└─ Footer Controls
```

**Folder Display:**
- **Space Indicators**: Small colored dots or tags indicating space association
- **Collapsed State**: Folders start collapsed with expand/collapse controls
- **Visual Grouping**: Subtle visual separation between space-associated and global folders
- **Quick Actions**: Context menu with "Move to Space", "Duplicate to Space" options

**Bookmarks Manager Integration:**
- **Space Filter Dropdown**: Filter view by specific space or "All Spaces"
- **Space Assignment UI**: Drag-and-drop or dropdown assignment for folder space association
- **Bulk Operations**: Multi-select folders for batch space assignment
- **Visual Organization**: Clear visual grouping by space with collapsible sections

### Technical Considerations

**Database Schema Extensions:
```sql
-- Extend bookmarks_folders table
ALTER TABLE bookmarks_folders ADD COLUMN spaceId TEXT REFERENCES spaces(id);
ALTER TABLE bookmarks_folders ADD COLUMN displayOrder INTEGER DEFAULT 0;
CREATE INDEX idx_folders_space ON bookmarks_folders(spaceId);
```

**Architecture:**
- **Space Integration**: Deep integration with existing space management system
- **Folder Management**: Enhanced folder CRUD operations with space awareness
- **Sync Logic**: Proper synchronization when spaces are created, deleted, or renamed
- **Migration**: Automatic migration of existing folders with smart space assignment suggestions

**Implementation Stages:**
1. **Database Schema**: Extend folder schema with space associations
2. **Core Functionality**: Space assignment and filtering in bookmarks manager
3. **Sidebar Integration**: Visual hierarchy implementation in sidebar
4. **Smart Features**: AI-powered space suggestions and bulk operations

---

### Feature 3: AI-Powered Tab Tidy Feature

#### Overview
An intelligent tab organization system that uses AI analysis to automatically group and organize open tabs into meaningful categories, helping users manage tab overload and improve productivity.

#### Product Requirements

**Core Functionality:**
- **Tidy Button**: Broom icon button placed next to existing clear button in tab management area
- **AI Analysis**: Intelligent analysis of open tab content to determine logical groupings
- **Smart Grouping**: Automatic organization into groups with AI-generated names (e.g., "Shopping", "Research", "Work Projects")
- **User Control**: Review and approve AI suggestions before applying changes
- **Undo Functionality**: Complete undo system to reverse tidy operations
- **Integration**: Seamless integration with existing AI service infrastructure

**Intelligent Features:**
- **Content Analysis**: Analyze page titles, URLs, and content to determine relationships
- **Group Naming**: Generate meaningful group names based on content analysis
- **Priority Scoring**: Prioritize important tabs and suggest logical organization
- **Learning System**: Learn from user feedback to improve future suggestions
- **Batch Processing**: Handle large numbers of tabs efficiently

#### UX Specifications

**Tidy Button Design:**
- **Icon**: Broom/sweep icon (🧹) for clear visual metaphor
- **Placement**: Positioned next to clear button in tab management area
- **Visual States**: Disabled when no tabs available, loading during analysis
- **Tooltip**: "Organize tabs with AI" with keyboard shortcut indication

**Analysis & Review Workflow:**
1. **Trigger**: User clicks tidy button or uses keyboard shortcut
2. **Analysis Phase**:
   - Loading indicator with "Analyzing tabs..." message
   - Progress indication for large numbers of tabs
   - Cancellation option during analysis
3. **Review Phase**:
   - Modal dialog showing proposed groupings
   - Group preview with suggested names and tab counts
   - Edit group names and drag tabs between groups
   - "Apply All", "Apply Selected", or "Cancel" options
4. **Application Phase**:
   - Smooth animations moving tabs into groups
   - Success notification with undo option
   - Updated tab organization in sidebar

**Group Organization UI:**
- **Group Headers**: Collapsible headers with AI-generated names and tab counts
- **Group Actions**: Rename, merge, split, or dissolve group options
- **Visual Distinction**: Subtle visual styling to distinguish grouped vs ungrouped tabs
- **Drag & Drop**: Ability to manually adjust AI suggestions via drag-and-drop

#### Technical Considerations

**AI Service Integration:**
- **Content Analysis**: Extend existing content fetcher to analyze tab content
- **Grouping Algorithm**: Machine learning-based clustering using:
  - URL domain analysis
  - Page title similarity
  - Content topic classification
  - User browsing patterns
- **Confidence Scoring**: Provide confidence levels for grouping suggestions
- **Fallback Logic**: Simple domain-based grouping when AI service unavailable

**Architecture Components:**
- **TabTidyService**: Main orchestration service for tidy operations
- **TabAnalyzer**: Content analysis and similarity detection
- **GroupingEngine**: AI-powered clustering and group generation
- **TidyStateManager**: Manage tidy operations state and undo functionality
- **TidyUI**: Modal interface for reviewing and applying suggestions

**Implementation Stages:**
1. **Core Analysis**: Basic tab content analysis and grouping algorithms
2. **UI Implementation**: Tidy button, review modal, and group management
3. **AI Integration**: Advanced AI-powered grouping with confidence scoring
4. **Learning System**: User feedback integration and algorithm improvement

**Performance Considerations:**
- **Async Processing**: Non-blocking analysis for large tab counts
- **Batch Operations**: Efficient processing of tab movements and updates
- **Memory Management**: Proper cleanup of analysis data and temporary state
- **Rate Limiting**: Respect AI service limits with proper queuing and backoff

---

## 🚧 Additional High-Priority Features

### 4. Library Central Hub 📚
**Unified bookmark/media management**
- Unified location for downloads, archived tabs, media captures, and cross-space management
- Integration point for bookmark management system
- Central hub for all browser-collected content

### 10. Website Screenshots 📸
**Full page & element capture**
- Built-in screenshot tools for full pages and specific elements
- Camera icon in URL bar for intelligent area capture
- Integration with existing browser capture functionality

### 21. Ask on Page 🤖
**AI webpage assistant (see [🔍 Omnibox Enhancements](#-omnibox-enhancements))**
- *Core omnibox integration covered in Omnibox Enhancements section*
- Part of "chat with tabs" feature for cross-tab AI assistance
- Advanced conversational interface for deep webpage analysis

### 22. 5-Second Previews ⚡
**AI webpage summaries on hover**
- AI-generated webpage summaries when hovering over links
- Quick content preview without opening tabs

### 23. Instant Links 🔍
**AI-powered search (see [🔍 Omnibox Enhancements](#-omnibox-enhancements))**
- *Core omnibox integration covered in Omnibox Enhancements section*
- Advanced result ranking and relevance scoring
- Configurable tab opening behavior and result limits

### 24. Live Folders 🗂️
**AI-powered automatic organization**
- AI folders that automatically organize and add content based on user preferences
- Learning system for content categorization

### 25. AI Content Learning 🧠
**Personalized content discovery**
- System that learns user preferences and surfaces relevant content automatically
- Enhanced content recommendation engine

### 27. Drag-to-Split Tab Creation ↗️
**Visual tab splitting**
- Drag tabs to create split views with visual drop indicators
- Enhanced tab management for productivity

### 28. Tab Renaming ✏️
**Custom tab titles**
- Rename tabs with double-click or right-click functionality
- Persistent custom tab names

### 33. Multiple Tab Split Ordering 🔄
**Advanced split positioning**
- Drag tabs to specific positions in split view configurations
- Part of enhanced tab splits functionality

### 39. Cross-Device Syncing 🔗
**Enhanced sync with profiles**
- Sync spaces, pinned tabs, and active tabs across all devices
- Must include profile syncing capabilities

### 40. Favorites Keyboard Shortcuts ⌨️
**Quick access shortcuts**
- Dedicated keyboard shortcuts (Cmd+1-12) for instant favorite access
- Enhanced keyboard navigation for pinned tabs/favorites

### 41. Meeting Integration 💼
**Calendar and video meeting shortcuts**
- "Share This Tab Instead" functionality for meetings
- Quick join shortcuts for active calendar meetings

---

## Implementation Roadmap

### Foundation Development (4-6 weeks)
- Complete AI enhancements including batch processing
- Implement core Pinned Tabs functionality
- Basic Space-Associated Bookmarks Folders

### Advanced Features Development (6-8 weeks)
- Complete Tab Tidy AI implementation
- Advanced drag-and-drop for all features
- Enhanced visual design and animations

### Integration & Polish (4-6 weeks)
- Cross-feature integration and testing
- Performance optimization
- Accessibility improvements
- User feedback incorporation

### Advanced Capabilities (4-6 weeks)
- Complete Tab Snooze system
- Advanced tab management features
- Machine learning improvements for AI features

## Dependencies and Integration Points

### Shared Dependencies:
- **AI Service**: All AI features depend on existing OpenAI integration
- **Space Management**: Pinned tabs and space-associated folders require space system
- **Tab Management**: All tab features build on existing tab management architecture
- **Database**: Schema extensions required for pinned tabs and space associations

### Integration Considerations:
- **Visual Hierarchy**: Careful coordination of sidebar layout between all features
- **Performance**: Tab operations must remain fast and responsive
- **User Experience**: Consistent interaction patterns across all new features
- **Data Migration**: Smooth migration paths for existing user data

### Technical Risks:
- **AI Service Dependencies**: Fallback strategies for AI service unavailability
- **Performance Impact**: Large numbers of tabs or bookmarks affecting responsiveness
- **State Management**: Complex state coordination between features
- **Cross-Platform Compatibility**: Ensuring consistent behavior across operating systems

This roadmap provides a comprehensive foundation for Flow Browser's evolution into a more intelligent and organized browsing experience, with each feature building upon and complementing the others to create a cohesive, powerful productivity tool.
