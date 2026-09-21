import fs from "node:fs";
import path from "node:path";

interface TimingLog {
  startedAt: string;
  completedAt: string | null;
  elapsedMs: number | null;
  elapsedSeconds: number | null;
  workType?: string;
  issueKey?: string;
}

const TIMING_FILE = path.resolve(
  process.cwd(),
  ".jira-cli-timing.json"
);

const startedAt = new Date();
const startedAtMs = Date.now();

const timingLog: TimingLog = {
  startedAt: startedAt.toISOString(),
  completedAt: null,
  elapsedMs: null,
  elapsedSeconds: null,
};

function loadTimingLogs(): TimingLog[] {
  if (!fs.existsSync(TIMING_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(
      TIMING_FILE,
      "utf-8"
    );
    const parsed = JSON.parse(content) as
      | TimingLog
      | TimingLog[];

    return Array.isArray(parsed)
      ? parsed
      : [parsed];
  } catch {
    return [];
  }
}

function saveTimingLog(timingLogs: TimingLog[]): void {
  fs.writeFileSync(
    TIMING_FILE,
    JSON.stringify(timingLogs, null, 2),
    "utf-8"
  );
}

export function startTiming(): void {
}

export function completeTiming(
  workType: string,
  issueKey: string
): void {
  const completedAt = new Date();
  const elapsedMs = Date.now() - startedAtMs;

  timingLog.completedAt = completedAt.toISOString();
  timingLog.elapsedMs = elapsedMs;
  timingLog.elapsedSeconds = Number(
    (elapsedMs / 1000).toFixed(3)
  );
  timingLog.workType = workType;
  timingLog.issueKey = issueKey;

  const timingLogs = loadTimingLogs();
  timingLogs.push(timingLog);
  saveTimingLog(timingLogs);
}