import "dotenv/config";

const baseUrl = process.env.JIRA_BASE_URL;
const email = process.env.JIRA_EMAIL;
const apiToken = process.env.JIRA_API_TOKEN;

if (!baseUrl || !email || !apiToken) {
  throw new Error(
    "Jira 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요."
  );
}

const auth = Buffer.from(
  `${email}:${apiToken}`
).toString("base64");

export async function jiraRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Jira API Error ${response.status}: ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}