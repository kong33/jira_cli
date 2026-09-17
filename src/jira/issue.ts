import { jiraRequest } from "./client.js";

interface JiraIssueResponse {
  id: string;
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
  };
}




interface JiraIssueResponse {
  id: string;
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
  };
}

interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

interface CreateIssuePayload {
  fields: Record<string, unknown>;
}

export async function getIssue(
  issueKey: string
): Promise<JiraIssueResponse> {
  return jiraRequest<JiraIssueResponse>(
    `/rest/api/3/issue/${issueKey}?fields=summary,description`
  );
}

/**
 * Jira Issue 생성
 */
export async function createIssue(
  payload: CreateIssuePayload
): Promise<CreateIssueResponse> {
  return jiraRequest<CreateIssueResponse>(
    "/rest/api/3/issue",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
