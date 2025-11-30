import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  Video, 
  Sun, 
  Moon, 
  X,
  Sparkles,
  Zap,
  FileText
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { Attachment, ChatSession, Message, Role } from './types';
import { streamGeminiResponse } from './services/geminiService';

const generateId = () => Math.random().toString(36).substring(2, 11);

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Input State
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Theme
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.theme = newTheme;
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle New Chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setInputValue('');
    setAttachments([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Load Session
  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  // Delete Session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        handleSelectSession(newSessions[0].id);
      } else {
        setMessages([]);
        setCurrentSessionId(null);
      }
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachments(prev => [...prev, {
            file,
            previewUrl: URL.createObjectURL(file),
            base64: reader.result as string,
            mimeType: file.type
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send Message Logic
  const handleSend = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

    // 1. Setup Active Session if none
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: inputValue.trim().slice(0, 30) || 'New Conversation',
        messages: [],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      activeSessionId = newSession.id;
      setCurrentSessionId(newSession.id);
    }

    // 2. Add User Message
    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      content: inputValue,
      attachments: [...attachments],
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    // 3. Create Placeholder for Bot Message
    const botMessageId = generateId();
    const botMessagePlaceholder: Message = {
      id: botMessageId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, botMessagePlaceholder]);

    try {
      // 4. Stream Response
      let accumulatedText = "";
      
      await streamGeminiResponse(
        messages, // Send previous history
        userMessage.content,
        userMessage.attachments || [],
        (chunk) => {
          accumulatedText += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, content: accumulatedText }
              : msg
          ));
        }
      );

      // 5. Finalize Bot Message
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));

      // 6. Update Session in Sidebar list
      const updatedSessions = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...newMessages, { ...botMessagePlaceholder, content: accumulatedText, isStreaming: false }],
            title: s.messages.length === 0 ? userMessage.content.slice(0, 30) : s.title,
            updatedAt: Date.now()
          };
        }
        return s;
      });
      // Sort by recency
      setSessions(updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt));

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, content: "**Error:** Failed to generate response. Please check your API key.", isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gemini-dark font-sans text-gray-900 dark:text-white">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gemini-dark/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Kash Ai
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">
                The Ultimate LLM
              </span>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth" id="chat-container">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-80 mt-[-50px]">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Sparkles className="text-white w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Hello, Human.
              </h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                I'm Kash Ai. Ask me anything, upload images or PDFs, and let's create something amazing.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {['Explain quantum computing', 'Write a python script for web scraping', 'Analyze this PDF report', 'Generate a creative story'].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                        setInputValue(suggestion);
                    }}
                    className="p-4 text-left rounded-xl bg-gray-50 dark:bg-[#1e1f2b] border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-32">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gemini-dark dark:via-gemini-dark dark:to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="flex gap-3 mb-3 overflow-x-auto py-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={12} />
                    </button>
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1">
                        <FileText size={20} className="text-gray-500 mb-1" />
                        <span className="text-[8px] text-gray-500 truncate w-full text-center">{att.file.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="bg-gray-100 dark:bg-[#1e1f2b] rounded-3xl p-2 pr-2 flex items-end shadow-sm border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Upload Image or PDF"
               >
                 <PlusIcon />
               </button>

               {/* Hidden File Input */}
               <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  multiple 
                  accept="image/*,application/pdf"
               />

               <textarea
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="Enter a prompt here"
                 className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-32 py-3 px-2 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                 rows={1}
                 style={{ minHeight: '44px' }}
               />

               {inputValue.trim() || attachments.length > 0 ? (
                 <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className={`p-3 mb-1 rounded-full transition-all duration-200 ${
                    isLoading 
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                 >
                   {isLoading ? (
                     <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                   ) : (
                     <Send size={18} />
                   )}
                 </button>
               ) : (
                 <div className="flex items-center gap-1 mb-1 mr-1">
                   <button className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                     <ImageIcon size={20} />
                   </button>
                 </div>
               )}
            </div>
            
            <div className="text-center mt-3">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Kash Ai may display inaccurate info, including about people, so double-check its responses. <br />
                <span className="font-medium text-gray-500 dark:text-gray-400">Created by Haris Shafi</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper components for icons to keep file size optimized
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle">
    <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>
  </svg>
);

export default App;