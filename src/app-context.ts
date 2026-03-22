import { LockManager } from "./locks.js";
import { LogStore } from "./state/log-store.js";
import { ProcessStore } from "./state/process-store.js";
import { SessionStore } from "./state/session-store.js";

export type MetroSessionState = {
  pid: number;
  port: number;
  devServerUrl: string;
  startedAt: number;
};

export type AttachedExpoMcpState = {
  status: "attached" | "detached" | "failed";
  startedAt: number;
  pid?: number;
};

export type AndroidRunState = {
  startedAt: number;
  status: "success" | "failed" | "running";
  phase?: string;
  summary?: string;
};

export type ProjectSessionState = {
  projectRoot: string;
  projectType?: string;
  metro?: MetroSessionState;
  attachedExpoMcp?: AttachedExpoMcpState;
  lastAndroidRun?: AndroidRunState;
};

export type MetroLogEntry = {
  level: "info" | "warn" | "error";
  text: string;
  at: number;
};

export type MetroController = {
  pid: number;
  port: number;
  devServerUrl: string;
  stop: () => Promise<void>;
};

export type ExpoCliIntegration = {
  startMetro: (input: {
    projectRoot: string;
    port: number;
    clear?: boolean;
    onLogLine?: (entry: MetroLogEntry) => void;
  }) => Promise<MetroController>;
};

export type ExpoMcpAttachment = {
  pid: number;
  status: "attached";
  startedAt: number;
  detach: () => Promise<void>;
};

export type ExpoMcpIntegration = {
  attach: (input: { projectRoot: string; devServerUrl: string }) => Promise<ExpoMcpAttachment>;
};

export type AndroidRunResult =
  | {
      ok: true;
      phase: string;
      output: string;
    }
  | {
      ok: false;
      phase: string;
      output: string;
    };

export type AndroidExpoCliIntegration = {
  runAndroid: (input: {
    projectRoot: string;
    onLogLine?: (entry: MetroLogEntry) => void;
  }) => Promise<AndroidRunResult>;
};

export type AdbDevice = {
  id: string;
  platform: "android";
  state: string;
};

export type AdbIntegration = {
  listDevices: () => Promise<AdbDevice[]>;
  recentLogs: (input?: { limit?: number }) => Promise<MetroLogEntry[]>;
};

export type MobileMcpDevice = AdbDevice & { source: "mobile-mcp" };

export type MobileAppActionResult = {
  appId: string;
  deviceId: string;
  status: "launched" | "terminated";
};

export type MobileForegroundAppResult = {
  appId: string;
  deviceId: string;
};

export type MobileUiNode = {
  text?: string;
  contentDescription?: string;
  resourceId?: string;
  className?: string;
  bounds?: string;
  clickable?: boolean;
  enabled?: boolean;
};

export type MobileGestureResult = {
  action: "tap" | "swipe" | "type" | "key_press";
  deviceId?: string;
  message: string;
};

export type MobileMcpIntegration = {
  screenshot: (input: { deviceId?: string }) => Promise<{ path: string }>;
  listDevices?: () => Promise<MobileMcpDevice[]>;
  recentLogs?: (input?: { limit?: number }) => Promise<MetroLogEntry[]>;
  launchApp?: (input: { appId: string; deviceId?: string }) => Promise<MobileAppActionResult>;
  terminateApp?: (input: { appId: string; deviceId?: string }) => Promise<MobileAppActionResult>;
  foregroundApp?: (input: { deviceId?: string }) => Promise<MobileForegroundAppResult>;
  dumpUi?: (input?: { deviceId?: string }) => Promise<{ raw: string; nodes: MobileUiNode[] }>;
  tap?: (input: { x: number; y: number; deviceId?: string }) => Promise<MobileGestureResult>;
  swipe?: (input: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration?: number;
    deviceId?: string;
  }) => Promise<MobileGestureResult>;
  typeText?: (input: { text: string; deviceId?: string }) => Promise<MobileGestureResult>;
  keyPress?: (input: { key: string; deviceId?: string }) => Promise<MobileGestureResult>;
  close?: () => Promise<void>;
};

export type DeviceInfo = AdbDevice & { source: "adb" | "mobile-mcp" };

export type AppContext = {
  clock: () => number;
  locks: LockManager;
  processStore: ProcessStore;
  sessionStore: SessionStore;
  logStore: LogStore;
  integrations: {
    expoCli: ExpoCliIntegration;
    expoMcp?: ExpoMcpIntegration;
    androidExpoCli?: AndroidExpoCliIntegration;
    adb?: AdbIntegration;
    mobileMcp?: MobileMcpIntegration;
  };
  runtime: {
    metroControllers: Map<string, MetroController>;
    expoMcpAttachments: Map<string, ExpoMcpAttachment>;
    activeAndroidRuns: Set<string>;
    latestDeviceInfo: DeviceInfo[];
  };
};

export function createAppContext(input: {
  clock?: () => number;
  integrations: {
    expoCli: ExpoCliIntegration;
    expoMcp?: ExpoMcpIntegration;
    androidExpoCli?: AndroidExpoCliIntegration;
    adb?: AdbIntegration;
    mobileMcp?: MobileMcpIntegration;
  };
}): AppContext {
  return {
    clock: input.clock ?? (() => Date.now()),
    locks: new LockManager(),
    processStore: new ProcessStore(),
    sessionStore: new SessionStore(),
    logStore: new LogStore(),
    integrations: input.integrations,
    runtime: {
      metroControllers: new Map<string, MetroController>(),
      expoMcpAttachments: new Map<string, ExpoMcpAttachment>(),
      activeAndroidRuns: new Set<string>(),
      latestDeviceInfo: []
    }
  };
}

export async function disposeAppContext(context: AppContext): Promise<void> {
  for (const controller of context.runtime.metroControllers.values()) {
    await controller.stop();
  }

  for (const attachment of context.runtime.expoMcpAttachments.values()) {
    await attachment.detach();
  }

  await context.integrations.mobileMcp?.close?.();

  context.runtime.metroControllers.clear();
  context.runtime.expoMcpAttachments.clear();
  context.runtime.activeAndroidRuns.clear();
  context.runtime.latestDeviceInfo = [];
}
