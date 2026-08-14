import { describe, expect, it, vi } from "vitest";
import * as overseerModule from "../src/overseer.js";
import { CodeModeTailLoopback } from "../src/overseer.js";

function trace(rpcMethod: string, message: string): TraceItem {
  return {
    event: { rpcMethod },
    eventTimestamp: 1,
    logs: [{ timestamp: 1, level: "log", message: [message] }],
    exceptions: [],
    diagnosticsChannelEvents: [],
    scriptName: "code-mode-test",
    outcome: "ok",
    executionModel: "stateless",
    truncated: false,
    cpuTime: 1,
    wallTime: 1,
  } as unknown as TraceItem;
}

describe("code mode output", () => {
  it("delivers the run trace when a tail batch also contains verify", async () => {
    const deliverCodeModeTrace = vi.fn(async () => undefined);
    const durableObject = {
      idFromString: vi.fn((id: string) => id),
      get: vi.fn(() => ({ deliverCodeModeTrace })),
    };
    const loopback = {
      ctx: {
        props: { executionId: "execution-1", overseerId: "overseer-1" },
        exports: { OverseerDurableObject: durableObject },
      },
    };

    await CodeModeTailLoopback.prototype.tail.call(
      loopback as unknown as CodeModeTailLoopback,
      [trace("verify", "verify-output"), trace("run", "run-output")],
    );

    expect(deliverCodeModeTrace).toHaveBeenCalledOnce();
    expect(deliverCodeModeTrace).toHaveBeenCalledWith(
      "execution-1",
      expect.objectContaining({
        event: expect.objectContaining({ rpcMethod: "run" }),
        logs: [expect.objectContaining({ message: ["run-output"] })],
      }),
    );
  });

  it("formats a returned object when the executed module did not log", () => {
    const formatCodeModeReturnValue = (
      overseerModule as Record<string, unknown>
    ).formatCodeModeReturnValue;

    expect(formatCodeModeReturnValue).toBeTypeOf("function");
    expect((formatCodeModeReturnValue as (value: unknown) => string)({
      ok: true,
      count: 2,
    })).toBe('{"ok":true,"count":2}');
  });
});
