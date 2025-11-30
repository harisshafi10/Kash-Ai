export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
