// Where the reader opens the first time a chat is loaded (YYYY-MM). Falls back to the start of the chat
// if that month does not exist. After that, "where I left off" is remembered.
export const DEFAULT_START_MONTH = '2024-11';

export const DEFAULT_SETTINGS = {
  me: null, // sender name shown on the right
  openAt: 'last', // 'last' | 'start' | 'YYYY-MM'
  lastMsg: null, // index of the last message you were reading
};
