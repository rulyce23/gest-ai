import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  Save, 
  X, 
  Download, 
  Upload, 
  RotateCcw,
  Eye,
  EyeOff,
  Volume2
} from 'lucide-react';
import type { GestureMapping, GestureDetection } from '../types';
import { storageService } from '../utils/storage';
import { defaultGestureMappings } from '../utils/defaultMappings';

interface GestureMappingPanelProps {
  currentGesture: GestureDetection | null;
  onMappingUpdate: (mappings: GestureMapping[]) => void;
  onManualTTS?: (text: string) => void;
  className?: string;
}

export const GestureMappingPanel: React.FC<GestureMappingPanelProps> = ({
  currentGesture,
  onMappingUpdate,
  onManualTTS,
  className = ''
}) => {
  const [mappings, setMappings] = useState<GestureMapping[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ emoji: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Load mappings on mount
  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const savedMappings = await storageService.getGestureMappings();
      setMappings(savedMappings);
      onMappingUpdate(savedMappings);
    } catch (error) {
      console.error('Failed to load mappings:', error);
      setMappings(defaultGestureMappings);
      onMappingUpdate(defaultGestureMappings);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (mapping: GestureMapping) => {
    setEditingId(mapping.id);
    setEditForm({ emoji: mapping.emoji, text: mapping.text });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ emoji: '', text: '' });
  };

  const saveMapping = async (id: string) => {
    try {
      const updatedMappings = mappings.map(mapping =>
        mapping.id === id
          ? { ...mapping, emoji: editForm.emoji, text: editForm.text }
          : mapping
      );

      setMappings(updatedMappings);
      await storageService.saveGestureMappings(updatedMappings);
      onMappingUpdate(updatedMappings);
      cancelEditing();
    } catch (error) {
      console.error('Failed to save mapping:', error);
    }
  };

  const toggleMapping = async (id: string) => {
    try {
      const updatedMappings = mappings.map(mapping =>
        mapping.id === id ? { ...mapping, enabled: !mapping.enabled } : mapping
      );

      setMappings(updatedMappings);
      await storageService.saveGestureMappings(updatedMappings);
      onMappingUpdate(updatedMappings);
    } catch (error) {
      console.error('Failed to toggle mapping:', error);
    }
  };

  const resetToDefaults = async () => {
    try {
      setMappings(defaultGestureMappings);
      await storageService.saveGestureMappings(defaultGestureMappings);
      onMappingUpdate(defaultGestureMappings);
    } catch (error) {
      console.error('Failed to reset mappings:', error);
    }
  };

  const exportMappings = async () => {
    try {
      const data = await storageService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gesture-mappings.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export mappings:', error);
    }
  };

  const importMappings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.mappings) {
          await storageService.importData(data);
          loadMappings();
        }
      } catch (error) {
        console.error('Failed to import mappings:', error);
      }
    };
    reader.readAsText(file);
  };

  const getCurrentMapping = () => {
    if (!currentGesture) return null;
    return mappings.find(m => m.name === currentGesture.gesture && m.enabled);
  };

  const currentMapping = getCurrentMapping();

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Gesture Mappings
          </h2>
          <div className="flex gap-2">
            <button
              onClick={resetToDefaults}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={exportMappings}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Export mappings"
            >
              <Download className="w-4 h-4" />
            </button>
            <label className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer" title="Import mappings">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={importMappings}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Current Gesture Display */}
        <AnimatePresence>
          {currentMapping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-700"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{currentMapping.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                    {currentMapping.name}
                  </h3>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    Currently Active
                  </p>
                </div>
                <button
                  onClick={() => onManualTTS?.(currentMapping.text)}
                  className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
                  title="Play TTS"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                "{currentMapping.text}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mappings List */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <motion.div
              key={mapping.id}
              layout
              className={`border rounded-lg p-4 transition-all ${
                mapping.enabled
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  : 'border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 opacity-60'
              }`}
            >
              {editingId === mapping.id ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editForm.emoji}
                      onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                      className="w-16 text-center text-2xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                      placeholder="🤚"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {mapping.name}
                      </h3>
                      <textarea
                        value={editForm.text}
                        onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm resize-none"
                        rows={3}
                        placeholder="Enter TTS text..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => saveMapping(mapping.id)}
                      className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{mapping.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mapping.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {mapping.text}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onManualTTS?.(mapping.text)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="Play TTS"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleMapping(mapping.id)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      title={mapping.enabled ? 'Disable' : 'Enable'}
                    >
                      {mapping.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEditing(mapping)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
