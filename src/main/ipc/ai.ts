import { ipcMain } from 'electron';
import { aiService } from '../modules/ai-service';
import { contentFetcher, type FetchOptions } from '../modules/content-fetcher';
import type { AISettings, BookmarkAnalysisRequest } from '~/flow/interfaces/ai';

// AI Settings Management
ipcMain.handle('ai:getSettings', async () => {
  try {
    return { success: true, data: await aiService.getSettings() };
  } catch (error) {
    console.error('Failed to get AI settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai:updateSettings', async (_, settings: Partial<AISettings>) => {
  try {
    await aiService.updateSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai:isEnabled', async () => {
  try {
    return { success: true, data: await aiService.isEnabled() };
  } catch (error) {
    console.error('Failed to check AI status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Bookmark Analysis
ipcMain.handle('ai:analyzeBookmark', async (_, request: BookmarkAnalysisRequest) => {
  try {
    const analysis = await aiService.analyzeBookmark(request);
    return { success: true, data: analysis };
  } catch (error) {
    console.error('Failed to analyze bookmark:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Description Generation
ipcMain.handle('ai:generateDescription', async (_, request: BookmarkAnalysisRequest) => {
  try {
    const description = await aiService.generateDescription(request);
    return { success: true, data: description };
  } catch (error) {
    console.error('Failed to generate description:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Duplicate Detection
ipcMain.handle('ai:findDuplicates', async (_, request: BookmarkAnalysisRequest, existingBookmarks: { id: string; url: string; title: string; description?: string; }[]) => {
  try {
    const duplicates = await aiService.findDuplicates(request, existingBookmarks);
    return { success: true, data: duplicates };
  } catch (error) {
    console.error('Failed to find duplicates:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Content Fetching
ipcMain.handle('ai:fetchPageContent', async (_, url: string, options?: FetchOptions) => {
  try {
    const content = await contentFetcher.fetchPageContent(url, options);
    return { success: true, data: content };
  } catch (error) {
    console.error('Failed to fetch page content:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai:extractBasicInfo', async (_, url: string, title?: string) => {
  try {
    const info = contentFetcher.extractBasicInfo(url, title);
    return { success: true, data: info };
  } catch (error) {
    console.error('Failed to extract basic info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Test available models
ipcMain.handle('ai:listModels', async () => {
  try {
    const settings = await aiService.getSettings();
    if (!settings.apiKey || settings.provider !== 'openai') {
      return { success: false, error: 'OpenAI not configured' };
    }
    
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: settings.apiKey,
    });
    
    const models = await openai.models.list();
    return { success: true, data: models.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

console.log('AI IPC handlers registered');