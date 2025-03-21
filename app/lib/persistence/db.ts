import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { IChatMetadata } from '~/types/chat';

const logger = createScopedLogger('ChatHistory');
const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // ms

let dbInstance: IDBDatabase | undefined;

export interface ChatHistoryItem {
  id: string;
  messages: Message[];
  urlId: string;
  description: string;
  timestamp: string;
  metadata?: IChatMetadata;
  favorite?: boolean;
}

// this is used at the top level and never rejects
export async function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === 'undefined') {
    console.error('indexedDB n\'est pas disponible dans cet environnement.');
    return undefined;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open('boltHistory', 2);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('chats')) {
        const store = db.createObjectStore('chats', { keyPath: 'id' });
        store.createIndex('id', 'id', { unique: true });
        store.createIndex('urlId', 'urlId', { unique: true });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      // Handle connection closing
      dbInstance.onclose = () => {
        dbInstance = undefined;
      };

      // Handle version change
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = undefined;
      };

      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      resolve(undefined);
      logger.error((event.target as IDBOpenDBRequest).error);
    };
  });
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // If database is closed, try to reopen it
      if (!dbInstance) {
        await openDatabase();
      }

      return await operation();
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.name === 'InvalidStateError') {
        dbInstance = undefined;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      throw error;
    }
  }
  throw lastError;
}

export async function getAll(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction('chats', 'readonly');
        const store = transaction.objectStore('chats');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function setMessages(
  db: IDBDatabase,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
  timestamp?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction('chats', 'readwrite');
        const store = transaction.objectStore('chats');

        if (timestamp && isNaN(Date.parse(timestamp))) {
          reject(new Error('Invalid timestamp'));
          return;
        }

        const request = store.put({
          id,
          messages,
          urlId,
          description,
          timestamp: timestamp ?? new Date().toISOString(),
          metadata,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getMessages(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return (await getMessagesById(db, id)) || (await getMessagesByUrlId(db, id));
}

export async function getMessagesByUrlId(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('urlId');
    const request = index.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function getMessagesById(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteById(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.delete(id);

    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getNextId(db: IDBDatabase): Promise<string> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const highestId = request.result.reduce((cur, acc) => Math.max(+cur, +acc), 0);
      resolve(String(+highestId + 1));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getUrlId(db: IDBDatabase, id: string): Promise<string> {
  const idList = await getUrlIds(db);

  if (!idList.includes(id)) {
    return id;
  } else {
    let i = 2;

    while (idList.includes(`${id}-${i}`)) {
      i++;
    }

    return `${id}-${i}`;
  }
}

async function getUrlIds(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const idList: string[] = [];

    const request = store.openCursor();

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        idList.push(cursor.value.urlId);
        cursor.continue();
      } else {
        resolve(idList);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function forkChat(db: IDBDatabase, chatId: string, messageId: string): Promise<string> {
  const chat = await getMessages(db, chatId);

  if (!chat) {
    throw new Error('Chat non trouvé');
  }

  // Find the index of the message to fork at
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message non trouvé');
  }

  // Get messages up to and including the selected message
  const messages = chat.messages.slice(0, messageIndex + 1);

  return createChatFromMessages(
    db,
    chat.description ? `${chat.description} (forké)` : 'Chat forké',
    messages,
    chat.metadata,
  );
}

export async function duplicateChat(db: IDBDatabase, id: string): Promise<string> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat non trouvé');
  }

  return createChatFromMessages(db, `${chat.description || 'Chat'} (copy)`, chat.messages, chat.metadata);
}
export interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;
}
export async function createChatFromMessages(
  db: IDBDatabase,
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
  
): Promise<string> {
  const newId = await getNextId(db);
  const newUrlId = await getUrlId(db, newId); // Get a new urlId for the duplicated chat

  await setMessages(
    db,
    newId,
    messages,
    newUrlId, // Use the new urlId
    description,
    undefined,
    metadata,
  );

  return newUrlId; // Return the urlId instead of id for navigation
}

export async function updateChatDescription(db: IDBDatabase, id: string, description: string): Promise<void> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat non trouvé');
  }

  if (!description.trim()) {
    throw new Error('La description ne peut pas être vide');
  }

  await setMessages(db, id, chat.messages, chat.urlId, description, chat.timestamp);
}

export async function toggleFavorite(db: IDBDatabase, id: string): Promise<void> {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction('chats', 'readwrite');
        const store = transaction.objectStore('chats');
        const request = store.get(id);

        request.onsuccess = () => {
          const chat = request.result as ChatHistoryItem;
          if (chat) {
            chat.favorite = !chat.favorite;
            store.put(chat).onsuccess = () => resolve();
          } else {
            reject(new Error('Chat non trouvé'));
          }
        };

        request.onerror = () => reject(request.error);
      }),
  );
}
