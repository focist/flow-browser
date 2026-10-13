import { useState } from "react";
import { useSpaces } from "@/components/providers/spaces-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function DebugBookmarksContent() {
  console.log("DebugBookmarksPage: Starting to render");

  const [test] = useState("test");
  console.log("DebugBookmarksPage: useState worked:", test);

  const { currentSpace } = useSpaces();
  console.log("DebugBookmarksPage: useSpaces worked:", currentSpace);

  console.log("DebugBookmarksPage: About to return JSX");
  return (
    <div
      style={{
        padding: "40px",
        color: "white",
        background: "lime",
        fontSize: "18px",
        minHeight: "100vh"
      }}
    >
      <h1>Debug Bookmarks Page</h1>
      <p>useState is working: {test}</p>
      <p>SpacesProvider is working!</p>
      <p>Current space: {currentSpace?.profileId || "No space"}</p>
      <p>Space ID: {currentSpace?.id || "No ID"}</p>
    </div>
  );
}

export default function DebugBookmarksPage() {
  return (
    <ErrorBoundary
      fallback={
        <div
          style={{
            padding: "40px",
            color: "white",
            background: "red",
            fontSize: "18px"
          }}
        >
          <h1>Error in Bookmarks Page</h1>
        </div>
      }
    >
      <DebugBookmarksContent />
    </ErrorBoundary>
  );
}
