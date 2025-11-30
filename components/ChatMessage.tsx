import React from 'react';
import { Bot, User, FileText, Image as ImageIcon } from 'lucide-react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
          isUser 
            ? 'bg-gray-200 dark:bg-gray-700' 
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}>
          {isUser ? (
            <User size={18} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <Bot size={18} className="text-white" />
          )}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-2xl px-5 py-3 shadow-sm ${
            isUser 
              ? 'bg-gray-100 dark:bg-[#2a2b3d] text-gray-900 dark:text-gray-100 rounded-tr-sm' 
              : 'bg-transparent text-gray-900 dark:text-gray-100 rounded-tl-sm px-0 py-0 shadow-none'
          }`}>
            {/* Attachments Display */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="relative group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.previewUrl} alt="attachment" className="h-32 w-auto object-cover" />
                    ) : (
                      <div className="h-20 w-32 flex flex-col items-center justify-center gap-1 p-2">
                        <FileText size={24} className="text-red-500" />
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">{att.file.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text Content */}
            <div className={`prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed whitespace-pre-wrap ${message.isStreaming ? 'typing-cursor' : ''}`}>
              {message.content}
            </div>
          </div>
          
          <span className="text-[10px] text-gray-400 px-1">
             {isUser ? 'You' : 'Kash Ai'} • {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
      </div>
    </div>
  );
};