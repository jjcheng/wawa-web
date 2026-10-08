export const MAIN_ROUTES = ["/chats", "/tasks", "/catalogs", "/assets", "/ai-agent"];

export function isMainRoute(pathname: string) {
  return MAIN_ROUTES.includes(pathname);
}
