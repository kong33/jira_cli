
import fs from "node:fs";
import path from "node:path";

interface JiraCliState {
  lastCreatedIssueKey?: string;
}

const STATE_FILE = path.resolve(
  process.cwd(),
  ".jira-cli-state.json"
);

export function getLastCreatedIssueKey(): string | undefined {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return undefined;
    }

    const content = fs.readFileSync(
      STATE_FILE,
      "utf-8"
    );

    const state = JSON.parse(
      content
    ) as JiraCliState;

    return state.lastCreatedIssueKey;
  } catch (error) {
    console.warn(
      "마지막 생성 티켓 정보를 불러오지 못했습니다."
    );

    return undefined;
  }
}

export function saveLastCreatedIssueKey(
  issueKey: string
): void {
  const state: JiraCliState = {
    lastCreatedIssueKey: issueKey,
  };

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2),
    "utf-8"
  );
}

