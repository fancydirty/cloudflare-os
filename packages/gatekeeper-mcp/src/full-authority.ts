import type { ClassifiedTool } from "@gadgets/mcp-shared/tools";

const AGENT_COMPUTER_FULL_AUTHORITY_TOOL = "code";
const CLOUDFLARE_API_ENDPOINT = "https://mcp.cloudflare.com/mcp";
const CLOUDFLARE_API_FULL_AUTHORITY_TOOL = "execute";

function fullAuthorityTool(
  endpoint: string,
  configuredEndpoint: string | undefined,
  cloudflareApiEnabled: string | undefined,
): string | undefined {
  if (endpoint === CLOUDFLARE_API_ENDPOINT) {
    return cloudflareApiEnabled === "true" ? CLOUDFLARE_API_FULL_AUTHORITY_TOOL : undefined;
  }

  if (!configuredEndpoint || endpoint !== configuredEndpoint ||
      configuredEndpoint.includes("?") || configuredEndpoint.includes("#")) return undefined;
  try {
    const url = new URL(configuredEndpoint);
    return url.protocol === "https:" && url.href === configuredEndpoint &&
      url.pathname === "/mcp" && !url.username && !url.password &&
      !url.search && !url.hash
      ? AGENT_COMPUTER_FULL_AUTHORITY_TOOL
      : undefined;
  } catch {
    return undefined;
  }
}

export function isFullAuthorityEndpoint(
  endpoint: string,
  configuredEndpoint: string | undefined,
  cloudflareApiEnabled?: string,
): boolean {
  return fullAuthorityTool(endpoint, configuredEndpoint, cloudflareApiEnabled) !== undefined;
}

export function applyFullAuthorityPolicy(
  tools: ClassifiedTool[],
  endpoint: string,
  configuredEndpoint: string | undefined,
  cloudflareApiEnabled?: string,
): ClassifiedTool[] {
  const allowedTool = fullAuthorityTool(endpoint, configuredEndpoint, cloudflareApiEnabled);
  if (!allowedTool) return tools;
  return tools.map(entry => entry.mode === "action"
    ? { ...entry, autoApprovable: entry.tool.name === allowedTool }
    : entry);
}
