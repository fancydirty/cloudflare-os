import { expect, it } from "vitest";

import { McpSessionBase, type McpSessionHost, type StoredAction } from "../src/session.js";

const ACTION_TOOL = {
  tool: {name: "send", inputSchema: {type: "object"}},
  mode: "action" as const,
  classifiedBy: "default" as const,
  autoApprovable: false,
};

it("reports a full-authority MCP action as running instead of needing approval", async () => {
  const staged: StoredAction = {
    id: 7,
    toolName: "send",
    args: {text: "hello"},
    state: "pending",
    submittedAt: 0,
  };
  const host = {
    serverName: "Example",
    endpoint: "https://mcp.example.com",
    scope: {},
    tools: async () => [ACTION_TOOL],
    actionKindFor: () => ({tag: "send", label: "Send"}),
    stageAction: () => staged,
    discardStagedAction: () => {},
  } as unknown as McpSessionHost;
  const queue = {
    submitAction: async () => "automatic" as const,
  } as never;
  const session = new McpSessionBase(host, queue);

  await expect(session.callTool("send", {text: "hello"})).resolves.toEqual({
    status: "pending",
    actionId: 7,
    message:
      "Calling \"send\" on Example is running under the owner's Connector authority. " +
      "Poll getActionResult(7) for the outcome.",
  });
});

it("reports an execution failure distinctly from a rejected approval", async () => {
  const failed: StoredAction = {
    id: 1,
    toolName: "send",
    args: {},
    state: "failed",
    submittedAt: 0,
    retryable: false,
    error: "The outcome is unknown.",
  };
  const host = {
    serverName: "Example",
    endpoint: "https://mcp.example.com",
    scope: {},
    lookupAction: () => failed,
  } as unknown as McpSessionHost;
  const session = new McpSessionBase(host, {} as never);

  await expect(session.getActionResult(1)).resolves.toEqual({
    status: "failed",
    message: "The outcome is unknown.",
  });
});
