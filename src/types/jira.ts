export interface JiraIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
}
