import { useState } from "react";
import { useSpaces } from "@/components/providers/spaces-provider";

export default function DebugBookmarksPage() {
  console.log('DebugBookmarksPage: Starting to render');
  
  try {
    console.log('DebugBookmarksPage: About to use useState');
    const [test] = useState('test');
    console.log('DebugBookmarksPage: useState worked:', test);
    
    console.log('DebugBookmarksPage: About to use useSpaces');
    const { currentSpace } = useSpaces();
    console.log('DebugBookmarksPage: useSpaces worked:', currentSpace);
    
    console.log('DebugBookmarksPage: About to return JSX');
    return (
      <div style={{ 
        padding: '40px', 
        color: 'white', 
        background: 'lime', 
        fontSize: '18px',
        minHeight: '100vh'
      }}>
        <h1>Debug Bookmarks Page</h1>
        <p>useState is working: {test}</p>
        <p>SpacesProvider is working!</p>
        <p>Current space: {currentSpace?.profileId || 'No space'}</p>
        <p>Space ID: {currentSpace?.id || 'No ID'}</p>
      </div>
    );
  } catch (error) {
    console.error('DebugBookmarksPage: Error during render:', error);
    return (
      <div style={{ 
        padding: '40px', 
        color: 'white', 
        background: 'red', 
        fontSize: '18px'
      }}>
        <h1>Error in Bookmarks Page</h1>
        <p>Error: {String(error)}</p>
      </div>
    );
  }
}