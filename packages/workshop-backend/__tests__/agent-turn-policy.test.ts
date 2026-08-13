import { describe, expect, it } from "vitest";
import { createAgentTurnLimiter, EXECUTION_DISCIPLINE } from "../src/agent.js";

describe("agent turn policy", () => {
  it("allows 199 model turns and stops after turn 200", () => {
    let reachedLimit = createAgentTurnLimiter();

    expect(reachedLimit).toBeTypeOf("function");
    for (let turn = 1; turn < 200; turn++) {
      expect(reachedLimit!(), `turn ${turn}`).toBe(false);
    }
    expect(reachedLimit!(), "turn 200").toBe(true);
  });

  it("keeps connector-depth diagnosis in the shared execution discipline", () => {
    expect(EXECUTION_DISCIPLINE).toBeTypeOf("string");
    expect(EXECUTION_DISCIPLINE).toContain("Subrequest depth limit exceeded");
    expect(EXECUTION_DISCIPLINE).toMatch(/rejected.*not.*permission/is);
    expect(EXECUTION_DISCIPLINE).toMatch(/shallowest.*binding/is);
  });
});
