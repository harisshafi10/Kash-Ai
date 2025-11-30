import React from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-gray-50 dark:bg-gemini-sidebar border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:h-full flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
          <button onClick={onClose} className="md:hidden ml-2 p-2 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 px-3 uppercase tracking-wider">
            Recent Chats
          </div>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-blue-100 dark:bg-[#32344a] text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <MessageSquare size={16} className={currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'} />
                <span className="flex-1 truncate text-sm font-medium">
                  {session.title}
                </span>
                <button 
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8">
                No recent chats
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Gemini 2.5 Flash Active
            </div>
        </div>
      </aside>
    </>
  );
};