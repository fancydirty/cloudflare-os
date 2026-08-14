import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import * as overseerModule from "../src/overseer.js";

describe("code mode dynamic worker", () => {
  it("returns the executed module's value through the harness", async () => {
    const harness = (overseerModule as Record<string, unknown>).CODE_MODE_HARNESS;
    expect(harness).toBeTypeOf("string");

    const entrypoint = env.LOADER.load({
      compatibilityDate: "2026-02-01",
      compatibilityFlags: [
        "disallow_importable_env",
        "allow_irrevocable_stub_storage",
      ],
      mainModule: "harness.js",
      modules: {
        "harness.js": harness as string,
        "agent.js": `export default async function() {
          return { ok: true, count: 2 };
        }`,
      },
      env: {},
      globalOutbound: null,
    }).getEntrypoint<any>();

    await entrypoint.verify();
    await expect(entrypoint.run()).resolves.toEqual({ ok: true, count: 2 });
  });
});
