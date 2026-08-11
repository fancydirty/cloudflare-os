import type { ClassifiedTool } from "@gadgets/mcp-shared/tools";

const FULL_AUTHORITY_TOOL = "code";

export function isFullAuthorityEndpoint(
  endpoint: string,
  configuredEndpoint: string | undefined,
): boolean {
  if (!configuredEndpoint || endpoint !== configuredEndpoint ||
      configuredEndpoint.includes("?") || configuredEndpoint.includes("#")) return false;
  try {
    const url = new URL(configuredEndpoint);
    return url.protocol === "https:" && url.href === configuredEndpoint &&
      url.pathname === "/mcp" && !url.username && !url.password &&
      !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function applyFullAuthorityPolicy(
  tools: ClassifiedTool[],
  endpoint: string,
  configuredEndpoint: string | undefined,
): ClassifiedTool[] {
  if (!isFullAuthorityEndpoint(endpoint, configuredEndpoint)) return tools;
  return tools.map(entry => entry.mode === "action"
    ? { ...entry, autoApprovable: entry.tool.name === FULL_AUTHORITY_TOOL }
    : entry);
}
