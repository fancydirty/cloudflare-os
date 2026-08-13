import { describe, expect, it } from "vitest";

describe("agent turn policy", () => {
  it("allows 199 model turns and stops after turn 200", async () => {
    let agent = await import("../src/agent.js") as typeof import("../src/agent.js") & {
      createAgentTurnLimiter?: () => () => boolean;
    };
    let reachedLimit = agent.createAgentTurnLimiter?.();

    expect(reachedLimit).toBeTypeOf("function");
    for (let turn = 1; turn < 200; turn++) {
      expect(reachedLimit!(), `turn ${turn}`).toBe(false);
    }
    expect(reachedLimit!(), "turn 200").toBe(true);
  });
});
