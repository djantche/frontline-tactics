export function browserWebSocketUrl(configuredUrl: string, pageUrl: string) {
  const websocket = new URL(configuredUrl);
  const page = new URL(pageUrl);
  const isLoopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

  // A development URL pointing at localhost must follow the page's host when
  // another device opens the game on the local network.
  if (isLoopback(websocket.hostname) && !isLoopback(page.hostname)) {
    websocket.hostname = page.hostname;

    if (page.protocol === "https:") {
      websocket.protocol = "wss:";
    }
  }

  return websocket.toString();
}
