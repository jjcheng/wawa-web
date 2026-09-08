export type ConversationStream = {
  phoneNumberId: string;
  customerWAId?: string;
  customerMetaUserId?: string;
};

export type ConversationEvent<TMessage, TStatus = unknown> =
  | { type: "message"; message: TMessage }
  | { type: "status"; status: TStatus }
  | { type: "connection"; state: string };

export type ConversationRealtimeProvider<TMessage, TStatus = unknown> = {
  subscribe(
    stream: ConversationStream,
    onEvent: (event: ConversationEvent<TMessage, TStatus>) => void,
    onError?: (error: Error) => void,
  ): () => void;
};