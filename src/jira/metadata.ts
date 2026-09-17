
import { jiraRequest } from "./client.js";

interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  issuetypes: JiraIssueType[];
}

interface CreateMetaResponse {
  projects: JiraProject[];
}

export async function getIssueTypes(): Promise<JiraIssueType[]> {
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!projectKey) {
    throw new Error("JIRA_PROJECT_KEY가 설정되지 않았습니다.");
  }

  const data = await jiraRequest<CreateMetaResponse>(
    `/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`
  );

  return data.projects[0]?.issuetypes ?? [];
}

interface JiraCreateField {
  fieldId: string;
  key: string;
  name: string;
  required: boolean;
  hasDefaultValue: boolean;
  operations: string[];

  schema?: {
    type?: string;
    custom?: string;
    customId?: number;
    items?: string;
  };

  // Jira가 제공하는 선택 가능한 값
  allowedValues?: Array<{
    id?: string;
    value?: string;
    name?: string;
    accountId?: string;
    displayName?: string;
  }>;
}

interface CreateFieldsResponse {
  fields: JiraCreateField[];
}

export async function getCreateFields(
  issueTypeId: string
): Promise<JiraCreateField[]> {
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!projectKey) {
    throw new Error("JIRA_PROJECT_KEY가 설정되지 않았습니다.");
  }

  const data = await jiraRequest<CreateFieldsResponse>(
    `/rest/api/3/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`
  );

  return data.fields;
}



interface JiraUser {
  accountId: string;
  displayName: string;
  active: boolean;
}

export async function searchAssignableUsers(
  query: string
): Promise<JiraUser[]> {
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!projectKey) {
    throw new Error(
      "JIRA_PROJECT_KEY가 설정되지 않았습니다."
    );
  }

  const params = new URLSearchParams({
    project: projectKey,
    query,
    maxResults: "20",
  });

  return jiraRequest<JiraUser[]>(
    `/rest/api/3/user/assignable/search?${params.toString()}`
  );
}

