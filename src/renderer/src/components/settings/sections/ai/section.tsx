import { AISettingsComponent } from "../../../ai/ai-settings";
import { ErrorBoundary } from "../../../ui/error-boundary";

export function AISettings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI & Automation</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configure AI-powered features for bookmark analysis and categorization
        </p>
      </div>
      
      <ErrorBoundary fallback={
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">AI Settings Error</h3>
          <p className="text-red-600">
            The AI settings component encountered an error. This is usually a temporary issue.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      }>
        <AISettingsComponent />
      </ErrorBoundary>
    </div>
  );
}