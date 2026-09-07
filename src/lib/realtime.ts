export type ConversationStream = {
  phoneNumberId: string;
  customerPhoneNumber: string;
};

export type ConversationEvent<TMessage, TStatus = unknown> =
  | { type: "message"; message: TMessage }
  | { type: "status"; status: TStatus };

export type ConversationRealtimeProvider<TMessage, TStatus = unknown> = {
  subscribe(
    stream: ConversationStream,
    onEvent: (event: ConversationEvent<TMessage, TStatus>) => void,
    onError?: (error: Error) => void,
  ): () => void;
};