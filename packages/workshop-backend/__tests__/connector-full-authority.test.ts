import { describe, expect, it } from "vitest";
import type { AiChatAuthorInfo } from "@gadgets/workshop-shared/api";
import type { ActionRecord } from "../src/overseer.js";
import {
  ConnectorFullAuthorityExecutor,
  connectorFullAuthorityEnabled,
} from "../src/connector-full-authority.js";

const OWNER: AiChatAuthorInfo = {
  type: "user",
  id: "owner@example.com",
  name: "Owner",
};

function action(id: number, gatekeeperId = 1): ActionRecord & {type: "action"} {
  return {
    id,
    gatekeeperId,
    caller: { from: "agent", chatId: 9 },
    createdAt: new Date(),
    state: "pending",
    type: "action",
    action: id,
    description: {
      title: `Action ${id}`,
      description: `Action ${id}`,
      implementsRevert: false,
      awaitDecision: true,
      autoApprovable: false,
    },
  };
}

describe("ConnectorFullAuthorityExecutor", () => {
  it("fails closed unless the deployment flag and one owner are both present", () => {
    expect(connectorFullAuthorityEnabled({
      SINGLE_USER_CONNECTOR_FULL_AUTHORITY: "true",
      ADMINS: ["owner@example.com"],
    })).toBe(true);
    expect(connectorFullAuthorityEnabled({
      SINGLE_USER_CONNECTOR_FULL_AUTHORITY: "true",
      ADMINS: [],
    })).toBe(false);
    expect(connectorFullAuthorityEnabled({
      SINGLE_USER_CONNECTOR_FULL_AUTHORITY: "true",
      ADMINS: ["owner@example.com", "second@example.com"],
    })).toBe(false);
    expect(connectorFullAuthorityEnabled({
      SINGLE_USER_CONNECTOR_FULL_AUTHORITY: "false",
      ADMINS: ["owner@example.com"],
    })).toBe(false);
  });

  it("applies an action without any per-tool auto-approval signal", async () => {
    const applied: Array<{id: number; owner: AiChatAuthorInfo}> = [];
    const executor = new ConnectorFullAuthorityExecutor(
      async () => OWNER,
      async (record, owner) => { applied.push({id: record.id, owner}); },
    );

    await executor.run(action(1));

    expect(applied).toEqual([{id: 1, owner: OWNER}]);
  });

  it("serializes actions from one connector in submission order", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const executor = new ConnectorFullAuthorityExecutor(
      async () => OWNER,
      async record => {
        events.push(`start:${record.id}`);
        if (record.id === 1) await firstGate;
        events.push(`end:${record.id}`);
      },
    );

    const first = executor.run(action(1));
    const second = executor.run(action(2));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(events).toEqual(["start:1"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["start:1", "end:1", "start:2", "end:2"]);
  });

  it("reports a failed action and does not poison later work", async () => {
    const applied: number[] = [];
    const executor = new ConnectorFullAuthorityExecutor(
      async () => OWNER,
      async record => {
        applied.push(record.id);
        if (record.id === 1) throw new Error("provider failed");
      },
    );

    const first = executor.run(action(1));
    const second = executor.run(action(2));

    await expect(first).rejects.toThrow("provider failed");
    await expect(second).resolves.toBeUndefined();
    expect(applied).toEqual([1, 2]);
  });

  it("does not make unrelated connectors wait for each other", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const executor = new ConnectorFullAuthorityExecutor(
      async () => OWNER,
      async record => {
        events.push(`start:${record.gatekeeperId}`);
        if (record.gatekeeperId === 1) await firstGate;
        events.push(`end:${record.gatekeeperId}`);
      },
    );

    const first = executor.run(action(1, 1));
    const second = executor.run(action(2, 2));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(events).toContain("start:2");
    releaseFirst();
    await Promise.all([first, second]);
  });
});
