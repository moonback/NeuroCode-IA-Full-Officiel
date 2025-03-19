import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { MCPManager } from '~/lib/modules/mcp/manager';

export default function MCPTab() {
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMCPTools = async () => {
      try {
        const mcpManager = await MCPManager.getInstance();
        const toolsRecord = mcpManager.tools || {};
        const toolsArray = Object.entries(toolsRecord).map(([name, tool]) => ({
          name,
          description: (tool as any).description || 'No description available',
          enabled: true
        }));
        setMcpTools(toolsArray);
      } catch (error) {
        console.error('Error loading MCP tools:', error);
        toast.error('Failed to load MCP tools');
      } finally {
        setLoading(false);
      }
    };

    loadMCPTools();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="i-ph:circle-notch-bold w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:wrench-fill w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Configuration MCP</span>
        </div>

        {mcpTools.length === 0 ? (
          <div className="text-sm text-bolt-elements-textSecondary">
            Aucun outil MCP disponible
          </div>
        ) : (
          <div className="space-y-4">
            {mcpTools.map((tool, index) => (
              <div key={index} className="border-b border-[#E5E5E5] dark:border-[#1A1A1A] pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-bolt-elements-textPrimary">{tool.name}</h3>
                    <p className="text-xs text-bolt-elements-textSecondary mt-1">{tool.description}</p>
                  </div>
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={(checked) => {
                      // Handle tool enable/disable
                      toast.success(`${tool.name} ${checked ? 'activé' : 'désactivé'}`);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}