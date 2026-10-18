export interface WorkScenarioStepHeading {
  id: string;
  tagName: string;
  textContent: string | null;
  title?: string;
}

export interface WorkScenarioStep {
  id: string;
  title: string;
  level: 2 | 3;
}

const normalizeTitle = (value: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();
const slugTitle = (value: string) => value.replace(/\s+/g, '-').replace(/[!?！？。，、：:；;“”"'（）()【】\[\]<>《》]/g, '');

export function buildWorkScenarioSteps(headings: Iterable<WorkScenarioStepHeading>): WorkScenarioStep[] {
  const steps: WorkScenarioStep[] = [];
  const usedIds = new Set<string>();

  for (const heading of headings) {
    const level = heading.tagName === 'H2' ? 2 : heading.tagName === 'H3' ? 3 : undefined;
    const title = normalizeTitle(heading.title ?? heading.textContent);
    if (!level || !title || (level === 2 && title === '处理过程')) continue;

    const baseId = heading.id || `work-step-${slugTitle(title)}` || 'work-step';
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    heading.id = id;
    usedIds.add(id);
    steps.push({ id, title, level });
  }

  return steps;
}
