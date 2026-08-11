import { describe, expect, it } from "vitest";

import type { ClassifiedTool } from "@gadgets/mcp-shared/tools";
import { applyFullAuthorityPolicy } from "../src/full-authority.js";

const action = (name: string): ClassifiedTool => ({
  tool: { name },
  mode: "action",
  autoApprovable: false,
  classifiedBy: "default",
});

describe("applyFullAuthorityPolicy", () => {
  it("auto-approves only the code action at the exact configured endpoint", () => {
    const tools = [action("code"), action("gitPush")];

    const result = applyFullAuthorityPolicy(
      tools,
      "https://agent.example/mcp",
      "https://agent.example/mcp",
    );

    expect(result).toEqual([
      { ...action("code"), autoApprovable: true },
      action("gitPush"),
    ]);
  });

  it("does not preserve another action's approval at the exact configured endpoint", () => {
    const tools = [action("code"), { ...action("gitPush"), autoApprovable: true }];

    expect(applyFullAuthorityPolicy(
      tools,
      "https://agent.example/mcp",
      "https://agent.example/mcp",
    )).toEqual([
      { ...action("code"), autoApprovable: true },
      action("gitPush"),
    ]);
  });

  it.each([
    ["https://agent.example/mcp/", "https://agent.example/mcp"],
    ["https://agent-sibling.example/mcp", "https://agent.example/mcp"],
    ["https://agent.example/mcp", undefined],
  ])("leaves actions unchanged when the endpoint is not exact", (endpoint, configuredEndpoint) => {
    const tools = [action("code"), action("gitPush")];

    expect(applyFullAuthorityPolicy(tools, endpoint, configuredEndpoint)).toEqual(tools);
  });

  it("leaves a read-only code entry unchanged", () => {
    const tools = [{ ...action("code"), mode: "read" as const }];

    expect(applyFullAuthorityPolicy(
      tools,
      "https://agent.example/mcp",
      "https://agent.example/mcp",
    )).toEqual(tools);
  });
});
