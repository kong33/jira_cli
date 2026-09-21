
import inquirer from "inquirer";
import process from "process";

import { getIssue, createIssue } from "../jira/issue.js";
import {
  getLastCreatedIssueKey,
  saveLastCreatedIssueKey,
} from "../jira/state.js";
import {
  extractDescriptionFields,
  updateDescriptionValues,
} from "../jira/description.js";

import {
  getIssueTypes,
  getCreateFields,
  searchAssignableUsers,
} from "../jira/metadata.js";
import {
  completeTiming,
  startTiming,
} from "../jira/timing.js";

startTiming();

// ----------------------------------------
// Work Type별 Template Issue
// ----------------------------------------

const templateIssues: Record<string, string> = {
  "Site Creation": "CMSGEN-438",
  "Service Creation": "CMSGEN-332",
  "Site Fixing": "CMSGEN-333",
  "Service Fixing": "CMSGEN-331",
};

// ----------------------------------------
// Jira Issue Type ID
// ----------------------------------------

const EPIC_ISSUE_TYPE_ID = "10000";

const WORK_TYPE_IDS = [
  EPIC_ISSUE_TYPE_ID,
  "13835", // Service Creation
  "13836", // Site Creation
  "13837", // Service Fixing
  "13838", // Site Fixing
];

async function main() {
  // ----------------------------------------
  // 마지막 생성 Issue
  // ----------------------------------------

 let lastCreatedIssueKey =
  getLastCreatedIssueKey();

  // ----------------------------------------
  // 1. Work Type 선택
  // ----------------------------------------

  console.log("");
  console.log("Jira Work Type 조회 중...");
  console.log("");

  const issueTypes = await getIssueTypes();

  const targetIssueTypes =
    issueTypes.filter((issueType) =>
      WORK_TYPE_IDS.includes(
        String(issueType.id)
      )
    );

  // 디버깅용
  console.log("조회된 대상 Work Type:");

  targetIssueTypes.forEach(
    (issueType) => {
      console.log(
        `- ID: ${issueType.id} / Name: ${issueType.name}`
      );
    }
  );

  console.log("");

  if (targetIssueTypes.length === 0) {
    throw new Error(
      "사용 가능한 Work Type을 찾지 못했습니다."
    );
  }

  const issueTypeAnswer =
    await inquirer.prompt([
      {
        type: "select",
        name: "issueTypeId",
        message:
          "생성할 Work Type을 선택하세요:",
        choices:
          targetIssueTypes.map(
            (issueType) => ({
              name: issueType.name,
              value: issueType.id,
            })
          ),
      },
    ]);

  const issueTypeId =
    String(issueTypeAnswer.issueTypeId);

  const selectedIssueType =
    targetIssueTypes.find(
      (issueType) =>
        String(issueType.id) ===
        issueTypeId
    );

  if (!selectedIssueType) {
    throw new Error(
      "선택한 Work Type을 찾을 수 없습니다."
    );
  }

  const workTypeName =
    selectedIssueType.name;

  console.log("");
  console.log(
    `✓ ${workTypeName} 선택`
  );
  console.log(
    `✓ Issue Type ID: ${issueTypeId}`
  );
  console.log("");

  // ----------------------------------------
  // 2. Epic 생성
  // ----------------------------------------

  if (
    issueTypeId === EPIC_ISSUE_TYPE_ID
  ) {
    const summaryAnswer =
      await inquirer.prompt([
        {
          type: "input",
          name: "summary",
          message: "Summary:",
          validate: (
            value: string
          ) => {
            if (!value.trim()) {
              return "Summary를 입력해주세요.";
            }

            return true;
          },
        },
      ]);

    const projectKey =
      process.env.JIRA_PROJECT_KEY;

    if (!projectKey) {
      throw new Error(
        "JIRA_PROJECT_KEY가 설정되지 않았습니다."
      );
    }

    const fields:
      Record<string, unknown> = {
        project: {
          key: projectKey,
        },

        issuetype: {
          id: EPIC_ISSUE_TYPE_ID,
        },

        summary:
          summaryAnswer.summary.trim(),
      };

    console.log("");
    console.log(
      "Jira Epic 생성 중..."
    );
    console.log("");

    const createdIssue =
      await createIssue({
        fields,
      });

    // 마지막 생성 Issue 저장
lastCreatedIssueKey = createdIssue.key;

saveLastCreatedIssueKey(
  createdIssue.key
);

    const baseUrl =
      process.env.JIRA_BASE_URL;

    console.log("");
    console.log(
      "================================"
    );
    console.log(
      "✓ Jira Epic 생성 완료"
    );
    console.log(
      "================================"
    );
    console.log("");

    console.log(
      `Issue Key: ${createdIssue.key}`
    );

    if (baseUrl) {
      console.log(
        `URL: ${baseUrl}/browse/${createdIssue.key}`
      );
    }

    console.log("");

    return;
  }

  // ----------------------------------------
  // 3. Template Issue 찾기
  // ----------------------------------------

  const templateIssueKey =
    templateIssues[workTypeName];

  if (
    !templateIssueKey ||
    templateIssueKey === "TODO"
  ) {
    throw new Error(
      `${workTypeName}의 Template Issue가 아직 설정되지 않았습니다.`
    );
  }

  console.log(
    `Jira Template 조회 중: ${templateIssueKey}`
  );
  console.log("");

  const templateIssue =
    await getIssue(
      templateIssueKey
    );

  if (
    !templateIssue.fields.description
  ) {
    throw new Error(
      "Template Issue에 Description이 없습니다."
    );
  }

  // ----------------------------------------
  // 4. Jira Create Field 조회
  // ----------------------------------------

  const createFields =
    await getCreateFields(
      issueTypeId
    );

  // ----------------------------------------
  // 5. Summary
  // ----------------------------------------

  const summaryAnswer =
    await inquirer.prompt([
      {
        type: "input",
        name: "summary",
        message: "Summary:",
        validate: (
          value: string
        ) => {
          if (!value.trim()) {
            return "Summary를 입력해주세요.";
          }

          return true;
        },
      },
    ]);

  const summary =
    summaryAnswer.summary.trim();

  // ----------------------------------------
  // 6. Priority
  // ----------------------------------------

  const priorityChoices = [
    {
      name: "Critical",
      value: "10000",
    },
    {
      name: "High",
      value: "10005",
    },
    {
      name: "Medium",
      value: "10006",
    },
    {
      name: "Low",
      value: "10007",
    },
  ];

  const priorityAnswer =
    await inquirer.prompt([
      {
        type: "select",
        name: "priority",
        message: "Priority:",
        choices:
          priorityChoices,
      },
    ]);

  const priority: {
    id: string;
  } = {
    id: priorityAnswer.priority,
  };

  // ----------------------------------------
  // 7. Assignee
  // ----------------------------------------

  const assigneeAnswer =
    await inquirer.prompt([
      {
        type: "input",
        name: "assigneeQuery",
        message:
          "담당자 이름을 입력하세요. (Enter = 미지정):",
      },
    ]);

  let assignee:
    | {
        accountId: string;
      }
    | undefined;

  const assigneeQuery =
    assigneeAnswer.assigneeQuery.trim();

  if (assigneeQuery) {
    const users =
      await searchAssignableUsers(
        assigneeQuery
      );

    if (users.length === 0) {
      throw new Error(
        "해당 이름으로 할당 가능한 사용자를 찾지 못했습니다."
      );
    }

    const userAnswer =
      await inquirer.prompt([
        {
          type: "select",
          name: "accountId",
          message:
            "담당자를 선택하세요:",
          choices: users.map(
            (user) => ({
              name: user.displayName,
              value: user.accountId,
            })
          ),
        },
      ]);

    assignee = {
      accountId:
        userAnswer.accountId,
    };
  }

  // ----------------------------------------
  // 8. Start Date
  // ----------------------------------------

  const today = new Date();

  const todayString =
    `${today.getFullYear()}-` +
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const startDateAnswer =
    await inquirer.prompt([
      {
        type: "input",
        name: "startDate",
        message:
          "Start Date (YYYY-MM-DD):",
        default: todayString,
        validate: (
          value: string
        ) => {
          if (!value.trim()) {
            return true;
          }

          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
              value
            )
          ) {
            return "YYYY-MM-DD 형식으로 입력해주세요.";
          }

          return true;
        },
      },
    ]);

  const startDate =
    startDateAnswer.startDate.trim();

  // ----------------------------------------
  // 9. Due Date
  // ----------------------------------------

  const dueDateAnswer =
    await inquirer.prompt([
      {
        type: "input",
        name: "dueDate",
        message:
          "Due Date (YYYY-MM-DD, Enter = 기본값 사용):",
        default: "2026-09-25",
        validate: (
          value: string
        ) => {
          if (!value.trim()) {
            return true;
          }

          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
              value
            )
          ) {
            return "YYYY-MM-DD 형식으로 입력해주세요.";
          }

          return true;
        },
      },
    ]);

  const dueDate =
    dueDateAnswer.dueDate.trim();

  // ----------------------------------------
  // 10. Description 필드 추출
  // ----------------------------------------

  const descriptionFields =
    extractDescriptionFields(
      templateIssue.fields
        .description as any
    );

  if (
    descriptionFields.length === 0
  ) {
    throw new Error(
      "Description에서 입력 가능한 필드를 찾지 못했습니다."
    );
  }

  console.log("");

  console.log(
    `Description에서 ${descriptionFields.length}개 필드를 찾았습니다.`
  );

  // ----------------------------------------
  // 11. Description Value 입력
  // ----------------------------------------

  const values =
    new Map<string, string>();

  let currentSection = "";

  for (
    const field of descriptionFields
  ) {
    if (
      field.section !==
      currentSection
    ) {
      currentSection =
        field.section;

      console.log("");
      console.log(
        `========== ${currentSection} ==========`
      );
      console.log("");
    }

    const fieldId =
      `${field.section}::${field.key}`;

    const answer =
      await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: field.key,
          default:
            field.value || "",
        },
      ]);

    values.set(
      fieldId,
      answer.value
    );
  }

  // ----------------------------------------
  // 12. Description 수정
  // ----------------------------------------

  const description =
    updateDescriptionValues(
      templateIssue.fields
        .description as any,
      values
    );

  // ----------------------------------------
  // 13. 상위항목 선택
  // ----------------------------------------

  let parentIssueKey:
    | string
    | undefined;

  if (lastCreatedIssueKey) {
    const parentAnswer =
      await inquirer.prompt([
        {
          type: "select",
          name: "parentOption",
          message:
            `상위항목을 지정하세요. (마지막 생성: ${lastCreatedIssueKey})`,
          choices: [
            {
              name:
                `마지막 생성 티켓 사용 (${lastCreatedIssueKey})`,
              value: "last",
            },
            {
              name: "상위항목 없음",
              value: "none",
            },
            {
              name: "직접 입력",
              value: "manual",
            },
          ],
        },
      ]);

    if (
      parentAnswer.parentOption ===
      "last"
    ) {
      parentIssueKey =
        lastCreatedIssueKey;
    }

    if (
      parentAnswer.parentOption ===
      "manual"
    ) {
      const manualParentAnswer =
        await inquirer.prompt([
          {
            type: "input",
            name: "parentIssueKey",
            message:
              "상위항목 Issue Key를 입력하세요. (예: CMSGEN-350):",
            validate: (
              value: string
            ) => {
              if (!value.trim()) {
                return "Issue Key를 입력해주세요.";
              }

              if (
                !/^CMSGEN-\d+$/.test(
                  value.trim()
                )
              ) {
                return "CMSGEN-123 형식으로 입력해주세요.";
              }

              return true;
            },
          },
        ]);

      parentIssueKey =
        manualParentAnswer.parentIssueKey.trim();
    }
  }

  // ----------------------------------------
  // 14. Jira 생성 Payload
  // ----------------------------------------

  const projectKey =
    process.env.JIRA_PROJECT_KEY;

  if (!projectKey) {
    throw new Error(
      "JIRA_PROJECT_KEY가 설정되지 않았습니다."
    );
  }

  const fields:
    Record<string, unknown> = {
      project: {
        key: projectKey,
      },

      issuetype: {
        id: issueTypeId,
      },

      summary,

      description,
    };

  if (priority) {
    fields.priority =
      priority;
  }

  if (assignee) {
    fields.assignee =
      assignee;
  }

  if (startDate) {
    fields.customfield_10590 =
      startDate;
  }

  if (dueDate) {
    fields.customfield_10570 =
      dueDate;
  }

  if (parentIssueKey) {
    fields.parent = {
      key: parentIssueKey,
    };
  }

  // ----------------------------------------
  // 15. Jira Issue 생성
  // ----------------------------------------

  console.log("");
  console.log(
    "Jira Issue 생성 중..."
  );
  console.log("");

  const createdIssue =
    await createIssue({
      fields,
    });

  // 마지막 생성 Issue 저장
  lastCreatedIssueKey =
    createdIssue.key;

  completeTiming(
    workTypeName,
    createdIssue.key
  );

  // ----------------------------------------
  // 16. 결과
  // ----------------------------------------

  const baseUrl =
    process.env.JIRA_BASE_URL;

  console.log("");
  console.log(
    "================================"
  );
  console.log(
    "✓ Jira Issue 생성 완료"
  );
  console.log(
    "================================"
  );
  console.log("");

  console.log(
    `Issue Key: ${createdIssue.key}`
  );

  if (baseUrl) {
    console.log(
      `URL: ${baseUrl}/browse/${createdIssue.key}`
    );
  }

  console.log("");
}

// ----------------------------------------
// Ctrl + C 처리
// ----------------------------------------

process.on("SIGINT", () => {
  console.log("");
  console.log("");
  console.log(
    "작업을 취소했습니다."
  );
  console.log("");

  process.exit(0);
});

main().catch((error) => {
  console.error("");
  console.error("✗ 실행 실패");
  console.error(error.message);
  console.error("");

  process.exit(1);
});

