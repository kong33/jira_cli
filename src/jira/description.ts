
interface ADFNode {
  type: string;
  text?: string;
  content?: ADFNode[];
  attrs?: Record<string, unknown>;
}

export interface DescriptionField {
  section: string;
  key: string;
  value: string;
  required: string;
  example: string;
  tableIndex: number;
  rowIndex: number;
}

/**
 * ADF 노드 안의 모든 text를 하나의 문자열로 합침
 */
function getText(node: ADFNode): string {
  if (node.text) {
    return node.text;
  }

  if (!node.content) {
    return "";
  }

  return node.content
    .map((child) => getText(child))
    .join("");
}

/**
 * Table Cell 안의 텍스트를 가져옴
 */
function getCellText(cell: ADFNode): string {
  return getText(cell).trim();
}

/**
 * 테이블의 헤더가
 * Key | Value | Required | Example
 * 형태인지 확인
 */
function isInputTable(rows: ADFNode[]): boolean {
  if (rows.length === 0) {
    return false;
  }

  const headerRow = rows[0];

  if (!headerRow.content) {
    return false;
  }

  const cells = headerRow.content.filter(
    (cell) =>
      cell.type === "tableCell" ||
      cell.type === "tableHeader"
  );

  if (cells.length < 4) {
    return false;
  }

  const headers = cells.slice(0, 4).map((cell) =>
    getCellText(cell).toLowerCase()
  );

  return (
    headers[0] === "key" &&
    headers[1] === "value" &&
    headers[2] === "required" &&
    headers[3] === "example"
  );
}

/**
 * Jira Description의 ADF에서
 *
 * Key | Value | Required | Example
 *
 * 구조의 테이블만 찾아냄.
 */
export function extractDescriptionFields(
  description: ADFNode
): DescriptionField[] {
  const result: DescriptionField[] = [];

  let tableIndex = 0;
  let currentSection = "";

  /**
   * 현재 노드가 heading이면 section으로 사용
   */
  function getHeadingText(node: ADFNode): string {
    if (node.type !== "heading") {
      return "";
    }

    return getText(node).trim();
  }

  function walk(node: ADFNode) {
    // Heading 발견
    const heading = getHeadingText(node);

    if (heading) {
      currentSection = heading;
    }

    // Table 발견
    if (node.type === "table" && node.content) {
      const rows = node.content.filter(
        (child) => child.type === "tableRow"
      );

      // Key / Value / Required / Example 테이블인지 확인
      if (isInputTable(rows)) {
        rows.slice(1).forEach((row, rowIndex) => {
          if (!row.content) {
            return;
          }

          const cells = row.content.filter(
            (cell) =>
              cell.type === "tableCell" ||
              cell.type === "tableHeader"
          );

          // 최소 4개 열이 있어야 함
          if (cells.length < 4) {
            return;
          }

          const key = getCellText(cells[0]);
          const value = getCellText(cells[1]);
          const required = getCellText(cells[2]);
          const example = getCellText(cells[3]);

          // Key가 없는 행은 입력 필드로 보지 않음
          if (!key) {
            return;
          }

          result.push({
            section: currentSection,
            key,
            value,
            required,
            example,
            tableIndex,
            rowIndex: rowIndex + 1,
          });
        });
      }

      tableIndex++;
    }

    // 하위 노드 탐색
    if (node.content) {
      node.content.forEach((child) => {
        walk(child);
      });
    }
  }

  walk(description);

  return result;
}

/**
 * 특정 필드의 Value를 ADF에서 변경
 *
 * Key / Required / Example은 그대로 유지하고
 * 두 번째 열(Value)만 변경한다.
 */
export function updateDescriptionValues(
  description: ADFNode,
  values: Map<string, string>
): ADFNode {
  // 원본 Description을 직접 수정하지 않도록 복사
  const cloned = JSON.parse(
    JSON.stringify(description)
  ) as ADFNode;

  let currentSection = "";

  function getHeadingText(node: ADFNode): string {
    if (node.type !== "heading") {
      return "";
    }

    return getText(node).trim();
  }

  function createTextContent(value: string): ADFNode[] {
    if (!value) {
      return [];
    }

    return [
      {
        type: "text",
        text: value,
      },
    ];
  }

  function updateCellValue(
    cell: ADFNode,
    value: string
  ) {
    cell.content = [
      {
        type: "paragraph",
        content: createTextContent(value),
      },
    ];
  }

  function walk(node: ADFNode) {
    const heading = getHeadingText(node);

    if (heading) {
      currentSection = heading;
    }

    if (node.type === "table" && node.content) {
      const rows = node.content.filter(
        (child) => child.type === "tableRow"
      );

      if (isInputTable(rows)) {
        rows.slice(1).forEach((row) => {
          if (!row.content) {
            return;
          }

          const cells = row.content.filter(
            (cell) =>
              cell.type === "tableCell" ||
              cell.type === "tableHeader"
          );

          if (cells.length < 4) {
            return;
          }

          const key = getCellText(cells[0]);

          if (!key) {
            return;
          }

          const fieldId = `${currentSection}::${key}`;

          if (values.has(fieldId)) {
            const newValue = values.get(fieldId) ?? "";

            // ★ 두 번째 열(Value)만 수정
            updateCellValue(cells[1], newValue);
          }
        });
      }
    }

    if (node.content) {
      node.content.forEach((child) => {
        walk(child);
      });
    }
  }

  walk(cloned);

  return cloned;
}

