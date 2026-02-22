// Natural language command interface for MCP
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@base-ui-components/react';
import { Send, Sparkles, Loader2, Terminal, X } from 'lucide-react';
import { getMCPServer } from '../mcp/server';

interface CommandResult {
  success: boolean;
  action?: string;
  message: string;
  details?: any;
}

interface NaturalLanguageCommandProps {
  onCommandExecuted: () => void;
}

const SUGGESTED_COMMANDS = [
  'group all design related tabs together',
  'organize my openclaw project tabs',
  'mark all videos as unread',
  'close all shopping website tabs',
  'export high priority tabs to Obsidian',
];

export function NaturalLanguageCommand({ onCommandExecuted }: NaturalLanguageCommandProps) {
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<Array<{ command: string; result: CommandResult }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExecute = async () => {
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const mcpServer = getMCPServer();
      
      // Try to parse as natural language first
      const result = await mcpServer.executeTool('execute_command', { command });
      
      const commandResult: CommandResult = {
        success: !result.error,
        action: result.action,
        message: result.error 
          ? `Failed to understand: ${command}` 
          : `Successfully executed: ${getActionDescription(result)}`,
        details: result
      };

      setResult(commandResult);
      setHistory(prev => [...prev.slice(-4), { command, result: commandResult }]);
      
      if (commandResult.success) {
        onCommandExecuted();
        setCommand('');
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Execution failed: ${error}`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Assistant</span>
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-purple-600 hover:text-purple-700"
        >
          {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
        </button>
      </div>

      {/* Command Input */}
      <div className="relative">
        <div className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
          <Terminal className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter natural language command, e.g.: group all design related tabs"
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            disabled={isExecuting}
          />
          <button
            onClick={handleExecute}
            disabled={!command.trim() || isExecuting}
            className={`
              p-1.5 rounded-md transition-colors
              ${command.trim() && !isExecuting
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
            <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-medium mb-2">Try these commands</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_COMMANDS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCommand(cmd);
                    inputRef.current?.focus();
                    setShowSuggestions(false);
                  }}
                  className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 hover:text-purple-600 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`
          p-3 rounded-lg text-sm
          ${result.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }
        `}
        >
          <div className="flex items-start gap-2">
            <span className={result.success ? 'text-green-600' : 'text-amber-600'}>
              {result.success ? '✓' : '⚠'}
            </span>
            <div className="flex-1">
              <p className={result.success ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}>
                {result.message}
              </p>
              {result.details?.count && (
                <p className="text-xs text-zinc-500 mt-1">
                  Affected {result.details.count} tabs
                </p>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="p-0.5 hover:bg-black/5 rounded"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase font-medium mb-2">Recent executions</p>
          <div className="space-y-1">
            {history.slice(-3).map((item, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded text-xs"
              >
                <span className={item.result.success ? 'text-green-500' : 'text-amber-500'}>
                  {item.result.success ? '✓' : '⚠'}
                </span>
                <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{item.command}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getActionDescription(result: any): string {
  switch (result.action) {
    case 'close':
      return `closed ${result.count} ${result.category} tabs`;
    case 'update_status':
      return `marked ${result.count} ${result.category} tabs as ${result.status}`;
    case 'group':
      return `created ${result.groups?.length || 0} groups`;
    default:
      return 'execution completed';
  }
}
