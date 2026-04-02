import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Brain, Key, Settings, AlertCircle, CheckCircle, Sparkles, Loader2, DollarSign, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import type { AISettings, ModelMetadata } from '~/flow/interfaces/ai';

interface AISettingsProps {
  onSettingsChange?: (settings: AISettings) => void;
  className?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
}

interface ModelCardProps {
  model: ModelMetadata;
  selected: boolean;
  onSelect: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, selected, onSelect }) => {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base">{model.name}</h4>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {model.description}
          </p>
        </div>

        {selected && (
          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {model.tags.includes('recommended') && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
            Recommended
          </Badge>
        )}
        {model.tags.includes('budget') && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            Budget
          </Badge>
        )}
        {model.tags.includes('fast') && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
            Fast
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          <span>
            ${model.pricing.inputCostPerMillion.toFixed(2)} / $
            {model.pricing.outputCostPerMillion.toFixed(2)} per 1M tokens
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span>{(model.contextWindow / 1000).toFixed(0)}K context</span>
          {model.capabilities.vision && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> Vision
            </span>
          )}
          {model.capabilities.functionCalling && (
            <span className="flex items-center gap-1">
              <Code className="h-3 w-3" /> Functions
            </span>
          )}
        </div>
      </div>
    </label>
  );
};

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

  // Dynamic provider and model data
  // Note: providers and isLoadingProviders are available for future provider selection UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const getDefaultModel = (provider: 'openai' | 'claude' | 'local') => {
    switch (provider) {
      case 'openai': return 'gpt-5-nano';
      case 'claude': return 'claude-3-5-sonnet-20241022';
      default: return '';
    }
  };

  // Load settings and providers on mount
  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    if (settings.provider && settings.provider !== 'local') {
      loadModelsForProvider(settings.provider);
    } else {
      setModels([]);
    }
  }, [settings.provider]);

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

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const result = await flow.ai['ai:listProviders']();
      if (result.success && result.data) {
        setProviders(result.data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      toast.error('Failed to load AI providers');
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const loadModelsForProvider = async (providerId: string) => {
    setIsLoadingModels(true);
    try {
      // Normalize provider ID (claude -> anthropic)
      const normalizedProviderId = providerId === 'claude' ? 'anthropic' : providerId;
      const result = await flow.ai['ai:listModels'](normalizedProviderId);
      if (result.success && result.data) {
        setModels(result.data);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      // Don't show error toast here as models might not be available without API key
      setModels([]);
    } finally {
      setIsLoadingModels(false);
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

      // Normalize provider ID (claude -> anthropic)
      const normalizedProviderId = settings.provider === 'claude' ? 'anthropic' : settings.provider;

      // Test by listing available models
      const modelsResult = await flow.ai['ai:listModels'](normalizedProviderId);

      if (modelsResult.success && modelsResult.data) {
        setConnectionStatus('success');
        setLastTestedApiKey(apiKey.trim());

        // Store models with full metadata
        setModels(modelsResult.data);

        // Store model IDs for backward compatibility
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

                {/* Model Selection - Radio Card Grid */}
                {(settings.provider === 'openai' || settings.provider === 'claude') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Select Model</Label>
                      {isLoadingModels && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading models...
                        </div>
                      )}
                    </div>

                    {models.length === 0 && !isLoadingModels ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800">
                          Enter your API key and test the connection to load available models
                        </p>
                      </div>
                    ) : models.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {models.map((model) => (
                          <ModelCard
                            key={model.id}
                            model={model}
                            selected={settings.model === model.id}
                            onSelect={() => handleSettingChange('model', model.id)}
                          />
                        ))}
                      </div>
                    ) : null}
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