export type BusinessAgentStatusChange = {
  phoneNumberId: number;
  agent_running?: boolean;
  meta_agent_id?: string;
};

const EVENT_NAME = "business-agent-status-change";

export function publishBusinessAgentStatus(change: BusinessAgentStatusChange) {
  window.dispatchEvent(new CustomEvent<BusinessAgentStatusChange>(EVENT_NAME, { detail: change }));
}

export function subscribeBusinessAgentStatus(listener: (change: BusinessAgentStatusChange) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<BusinessAgentStatusChange>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
