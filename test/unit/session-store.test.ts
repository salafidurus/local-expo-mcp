import { describe, expect, it } from "vitest";
import { SessionStore } from "../../src/state/session-store.js";

describe("SessionStore", () => {
  it("normalizes project roots for lookups", () => {
    const store = new SessionStore();

    store.upsert({
      projectRoot: "C:\\dev\\app\\",
      projectType: "expo"
    });

    expect(store.get("C:/dev/app")).toMatchObject({
      projectRoot: "C:/dev/app",
      projectType: "expo"
    });
  });

  it("merges nested session updates without dropping existing fields", () => {
    const store = new SessionStore();

    store.upsert({
      projectRoot: "C:/dev/app",
      projectType: "expo",
      metro: {
        pid: 1234,
        port: 8081,
        devServerUrl: "http://127.0.0.1:8081",
        startedAt: 100
      }
    });

    store.merge("C:/dev/app", {
      lastAndroidRun: {
        startedAt: 200,
        status: "running"
      }
    });

    expect(store.get("C:/dev/app")).toMatchObject({
      projectRoot: "C:/dev/app",
      projectType: "expo",
      metro: {
        pid: 1234,
        port: 8081
      },
      lastAndroidRun: {
        startedAt: 200,
        status: "running"
      }
    });
  });
});
