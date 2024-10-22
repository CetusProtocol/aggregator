export function processEndpoint(endpoint: string): string {
  if (endpoint.endsWith("/find_routes")) {
    return endpoint.replace("/find_routes", "")
  }
  return endpoint
}
