import { create } from 'zustand';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

interface ChatFolder {
  id: string;
  name: string;
  chats: Chat[];
}

interface ChatState {
  folders: ChatFolder[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  createNewChat: (folderId: string, title: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  folders: [],
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  addMessage: (chatId, message) =>
    set((state) => ({
      folders: state.folders.map((folder) => ({
        ...folder,
        chats: folder.chats.map((chat) =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, message] }
            : chat
        ),
      })),
    })),
  createNewChat: (folderId, title) =>
    set((state) => {
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title,
        messages: [],
      };
      return {
        folders: state.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, chats: [newChat, ...folder.chats] }
            : folder
        ),
        activeChatId: newChat.id,
      };
    }),
}));