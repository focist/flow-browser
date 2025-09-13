import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Brain, Key, Settings, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { AISettings } from '~/flow/interfaces/ai';

interface AISettingsProps {
  onSettingsChange?: (settings: AISettings) => void;
  className?: string;
}

export const AISettingsComponent: React.FC<AISettingsProps> = ({
  onSettingsChange,
  className = ''
}) => {
  const [settings, setSettings] = useState<AISettings>({
    enabled: false,
    provider: 'openai',
    model: 'gpt-5-nano',
    autoAnalyze: false,
    confidenceThreshold: 0.7,
    autoApply: {
      enabled: false,
      maxLabels: 1,
      notifications: true,
    },
    categories: {
      topics: true,
      types: true,
      priority: false,
    }
  });
  
  const [apiKey, setApiKey] = useState('');
  const [lastTestedApiKey, setLastTestedApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Model options for each provider
  const modelOptions = {
    openai: [
      { value: 'gpt-5-nano', label: 'GPT-5 Nano (Recommended)', description: '~$0.0001 per bookmark' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Ultra Budget)', description: '~$0.0001 per bookmark' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Budget)', description: '~$0.0005 per bookmark' },
      { value: 'gpt-4o', label: 'GPT-4o (High Quality)', description: '~$0.01 per bookmark' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '~$0.02 per bookmark' }
    ],
    claude: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)', description: '~$0.015 per bookmark' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Budget)', description: '~$0.005 per bookmark' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Cheapest)', description: '~$0.002 per bookmark' }
    ],
    local: []
  };

  const getDefaultModel = (provider: 'openai' | 'claude' | 'local') => {
    switch (provider) {
      case 'openai': return 'gpt-5-nano';
      case 'claude': return 'claude-3-5-sonnet-20241022';
      default: return '';
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await flow.ai['ai:getSettings']();
      if (result.success && result.data) {
        // Ensure autoApply exists with proper defaults
        const loadedSettings = {
          ...result.data,
          autoApply: result.data.autoApply || {
            enabled: false,
            maxLabels: 1,
            notifications: true,
          }
        };
        setSettings(loadedSettings);
        setApiKey(result.data.apiKey || '');
        setLastTestedApiKey(result.data.apiKey || '');
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error('Failed to load AI settings');
    }
  };

  const saveSettings = async (newSettings: Partial<AISettings>) => {
    setIsLoading(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Include API key if provided
      if (apiKey.trim()) {
        updatedSettings.apiKey = apiKey.trim();
      }

      const result = await flow.ai['ai:updateSettings'](updatedSettings);
      
      if (result.success) {
        setSettings(updatedSettings);
        onSettingsChange?.(updatedSettings);
        toast.success('AI settings saved');
        
        // Test connection if enabled, API key provided, and key has changed since last test
        if (updatedSettings.enabled && updatedSettings.apiKey && updatedSettings.apiKey !== lastTestedApiKey) {
          testConnection();
        }
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast.error('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Save settings first to ensure AI service is configured
      const testSettings = { ...settings, enabled: true, apiKey: apiKey.trim() };
      await flow.ai['ai:updateSettings'](testSettings);
      
      // Test by listing available models
      const modelsResult = await flow.ai['ai:listModels']();
      
      if (modelsResult.success && modelsResult.data) {
        setConnectionStatus('success');
        setLastTestedApiKey(apiKey.trim());
        
        // Store available models for display
        const modelNames = modelsResult.data
          .map((m: any) => m.id)
          .filter((id: string) => id && id.trim().length > 0);
        setAvailableModels(modelNames);
        
        toast.success(`AI connection successful! ${modelsResult.data.length} models available.`);
      } else {
        throw new Error(modelsResult.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('AI connection test failed:', error);
      setConnectionStatus('error');
      toast.error('Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSettingChange = <K extends keyof AISettings>(
    key: K,
    value: AISettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    
    // If provider changed, update model to default for that provider
    if (key === 'provider') {
      newSettings.model = getDefaultModel(value as 'openai' | 'claude' | 'local');
    }
    
    setSettings(newSettings);
  };

  const handleCategoryChange = (category: keyof AISettings['categories'], enabled: boolean) => {
    const newCategories = { ...settings.categories, [category]: enabled };
    handleSettingChange('categories', newCategories);
  };

  const handleAutoApplyChange = (setting: keyof AISettings['autoApply'], value: boolean | number) => {
    const newAutoApply = { ...settings.autoApply, [setting]: value };
    handleSettingChange('autoApply', newAutoApply);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle>AI Bookmark Analysis</CardTitle>
            <Badge variant={settings.enabled ? 'default' : 'secondary'}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Use AI to automatically categorize and analyze your bookmarks
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enable AI */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-enabled" className="font-medium">
                Enable AI Analysis
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on AI-powered bookmark categorization
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Provider Selection */}
              <div className="space-y-4 border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="provider-select">AI Provider</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={(value: 'openai' | 'claude' | 'local') => handleSettingChange('provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                      <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                      <SelectItem value="local">Local Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {settings.provider === 'local' 
                      ? 'Uses basic keyword analysis without API calls'
                      : 'Requires API key for advanced AI features'
                    }
                  </p>
                </div>

                {/* Model Selection */}
                {(settings.provider === 'openai' || settings.provider === 'claude') && (
                  <div className="space-y-2">
                    <Label htmlFor="model-select">Model</Label>
                    <Select
                      value={settings.model || getDefaultModel(settings.provider)}
                      onValueChange={(value: string) => handleSettingChange('model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions[settings.provider].map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span>{model.label}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* API Configuration */}
              {(settings.provider === 'openai' || settings.provider === 'claude') && (
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <Label className="font-medium">
                      {settings.provider === 'openai' ? 'OpenAI Configuration' : 'Anthropic Configuration'}
                    </Label>
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={!apiKey.trim() || isTestingConnection}
                      size="sm"
                    >
                      {isTestingConnection ? (
                        'Testing...'
                      ) : (
                        <>
                          {connectionStatus === 'success' && <CheckCircle className="h-4 w-4 mr-1 text-green-600" />}
                          {connectionStatus === 'error' && <AlertCircle className="h-4 w-4 mr-1 text-red-600" />}
                          Test
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings.provider === 'openai' ? (
                      <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></>
                    ) : (
                      <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a></>
                    )}
                  </p>
                  
                  {/* Available Models Display */}
                  {availableModels.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="text-sm font-medium text-green-800 mb-2">
                        Available Models ({availableModels.length}):
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {availableModels.map((model, index) => (
                          <span 
                            key={`${model}-${index}`} 
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border"
                          >
                            {model || 'Unknown Model'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* Analysis Settings */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <Label className="font-medium">Analysis Settings</Label>
                </div>

                {/* Auto-analyze */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-analyze">Auto-analyze new bookmarks</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically analyze bookmarks when they're created
                      {settings.provider === 'local' && ' (limited analysis without API)'}
                    </p>
                  </div>
                  <Switch
                    id="auto-analyze"
                    checked={settings.autoAnalyze}
                    onCheckedChange={(checked) => handleSettingChange('autoAnalyze', checked)}
                  />
                </div>

                {/* Confidence Threshold */}
                <div className="space-y-2">
                  <Label>Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%</Label>
                  <Slider
                    value={[settings.confidenceThreshold]}
                    onValueChange={([value]) => handleSettingChange('confidenceThreshold', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Labels above this confidence level are eligible for auto-apply and manual review
                  </p>
                </div>

                {/* Auto-Apply Settings */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <div>
                        <Label htmlFor="auto-apply">Auto-apply high confidence labels</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically apply the highest confidence label that meets the threshold
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="auto-apply"
                      checked={settings.autoApply.enabled}
                      onCheckedChange={(checked) => handleAutoApplyChange('enabled', checked)}
                    />
                  </div>

                  {settings.autoApply.enabled && (
                    <>
                      <div className="space-y-2 ml-4">
                        <Label>Max auto-applied labels: {settings.autoApply.maxLabels}</Label>
                        <Slider
                          value={[settings.autoApply.maxLabels]}
                          onValueChange={([value]) => handleAutoApplyChange('maxLabels', value)}
                          min={1}
                          max={3}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum number of labels to auto-apply per bookmark
                        </p>
                      </div>

                      <div className="flex items-center justify-between ml-4">
                        <div>
                          <Label htmlFor="auto-apply-notifications">Show notifications</Label>
                          <p className="text-xs text-muted-foreground">
                            Display toast notifications when labels are auto-applied
                          </p>
                        </div>
                        <Switch
                          id="auto-apply-notifications"
                          checked={settings.autoApply.notifications}
                          onCheckedChange={(checked) => handleAutoApplyChange('notifications', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  <Label>Label Categories to Generate</Label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="topics">Topics</Label>
                        <p className="text-xs text-muted-foreground">Technology, Business, Health, etc.</p>
                      </div>
                      <Switch
                        id="topics"
                        checked={settings.categories.topics}
                        onCheckedChange={(checked) => handleCategoryChange('topics', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="types">Content Types</Label>
                        <p className="text-xs text-muted-foreground">Article, Tutorial, Documentation, etc.</p>
                      </div>
                      <Switch
                        id="types"
                        checked={settings.categories.types}
                        onCheckedChange={(checked) => handleCategoryChange('types', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <p className="text-xs text-muted-foreground">High, Medium, Low importance</p>
                      </div>
                      <Switch
                        id="priority"
                        checked={settings.categories.priority}
                        onCheckedChange={(checked) => handleCategoryChange('priority', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="border-t pt-6">
            <Button
              onClick={() => saveSettings(settings)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save AI Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};