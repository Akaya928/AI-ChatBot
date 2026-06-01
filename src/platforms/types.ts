export interface InternalMessage {
  type: "group" | "private";
  userId: string;
  groupId?: string;
  message: any;
  rawMessage: string;
  messageId?: number;
}

export interface PlatformAdapter {
  name: string;
  onStart: (handler: (msg: InternalMessage) => Promise<void>) => void;
  sendMessage: (target: { type: "group" | "private"; userId: string; groupId?: string }, text: string) => void;
  sendSticker?: (target: { type: "group" | "private"; userId: string; groupId?: string }, url: string) => void;
}
