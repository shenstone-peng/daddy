import type { AppState, MilestoneEvent, MilestoneKind, PregnancyProfile, TaskCategory, TaskItem, TaskPriority } from '../types';
import { compareDateInputs, getDefaultDueDate, getPregnancyWeekDate, toDateInputValue } from '../lib/date';

type TaskTemplate = {
  key: string;
  title: string;
  notes: string;
  category: TaskCategory;
  priority: TaskPriority;
  week: number;
  offsetDays?: number;
};

type MilestoneTemplate = {
  key: string;
  title: string;
  description: string;
  kind: MilestoneKind;
  week: number;
  offsetDays?: number;
};

const taskTemplates: TaskTemplate[] = [
  {
    key: 'record-filing',
    title: '陪伴侣去医院建档',
    notes: '确认身份证、医保卡、既往检查单都已带齐，提前 20 分钟出门。',
    category: 'appointment',
    priority: 'high',
    week: 12,
  },
  {
    key: 'book-anomaly-scan',
    title: '预约四维彩超',
    notes: '优先锁定上午时段，确认是否需要空腹和家属陪同。',
    category: 'appointment',
    priority: 'high',
    week: 22,
  },
  {
    key: 'glucose-screening',
    title: '提醒并陪同做糖耐检查',
    notes: '前一晚确认医嘱要求，准备零食和保温水，检查当天尽量减少等待压力。',
    category: 'health',
    priority: 'high',
    week: 24,
  },
  {
    key: 'parent-class',
    title: '预约或报名新生儿护理课程',
    notes: '重点关注洗澡、拍嗝、红臀护理和母乳支持。',
    category: 'learning',
    priority: 'medium',
    week: 28,
  },
  {
    key: 'insurance-docs',
    title: '整理生育津贴与报销材料',
    notes: '提前收集结婚证、社保信息、住院押金与公司流程。',
    category: 'admin',
    priority: 'medium',
    week: 30,
  },
  {
    key: 'hospital-bag',
    title: '准备待产包与证件袋',
    notes: '按妈妈、宝宝、证件三类分袋，避免临产时手忙脚乱。',
    category: 'shopping',
    priority: 'high',
    week: 32,
  },
  {
    key: 'crib-assembly',
    title: '组装婴儿床并完成清洁通风',
    notes: '完成安装后保留说明书，确认床品和夜灯位置。',
    category: 'home',
    priority: 'medium',
    week: 34,
  },
  {
    key: 'postpartum-plan',
    title: '确认月子和家人支援安排',
    notes: '和双方父母明确支援节奏、陪护时段和产后头两周的分工。',
    category: 'admin',
    priority: 'medium',
    week: 35,
  },
  {
    key: 'weekly-checkups',
    title: '进入晚孕后固定每周产检节奏',
    notes: '把每周产检、胎动关注和住院路线演练纳入日历。',
    category: 'appointment',
    priority: 'high',
    week: 36,
  },
];

const milestoneTemplates: MilestoneTemplate[] = [
  {
    key: 'nt-record',
    title: '建档与 NT 检查窗口',
    description: '确认医院要求、建档资料与首轮系统检查安排。',
    kind: 'checkup',
    week: 12,
  },
  {
    key: 'anomaly-scan',
    title: '大排畸 / 四维彩超',
    description: '检查前再次确认预约时间、位置和注意事项。',
    kind: 'checkup',
    week: 22,
  },
  {
    key: 'glucose',
    title: '糖耐量筛查',
    description: '这段时间容易焦虑，准爸爸提前安排陪同和补给最有帮助。',
    kind: 'checkup',
    week: 24,
  },
  {
    key: 'kick-count',
    title: '开始规律记录胎动',
    description: '进入孕晚期后，把胎动观察和异常情况响应讲清楚。',
    kind: 'learning',
    week: 28,
  },
  {
    key: 'bag-ready',
    title: '待产包最终检查',
    description: '证件、妈妈用品、宝宝衣物和充电设备全部再核对一次。',
    kind: 'prep',
    week: 32,
  },
  {
    key: 'hospital-route',
    title: '演练去医院路线',
    description: '确认最快路线、夜间停车和备用打车方案。',
    kind: 'prep',
    week: 36,
  },
  {
    key: 'weekly-appointments',
    title: '进入每周产检阶段',
    description: '把每周固定检查预留进日历，提前协调工作安排。',
    kind: 'admin',
    week: 37,
  },
];

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'todo' ? -1 : 1;
    }

    return compareDateInputs(left.dueDate, right.dueDate);
  });
}

function sortMilestones(milestones: MilestoneEvent[]) {
  return [...milestones].sort((left, right) => compareDateInputs(left.date, right.date));
}

export function buildSeededState(profile: PregnancyProfile, existingState?: AppState): AppState {
  const today = toDateInputValue(new Date());
  const existingTaskMap = new Map(
    (existingState?.tasks ?? [])
      .filter((task) => task.system)
      .map((task) => [task.id, task]),
  );

  const existingMilestoneMap = new Map(
    (existingState?.milestones ?? []).map((milestone) => [milestone.id, milestone]),
  );

  const seededTasks = taskTemplates.map((template) => {
    const id = `system-task-${template.key}`;
    const previous = existingTaskMap.get(id);
    const dueDate = getPregnancyWeekDate(profile.dueDate, template.week, template.offsetDays);

    return {
      id,
      title: template.title,
      notes: previous?.notes ?? template.notes,
      category: template.category,
      dueDate,
      priority: template.priority,
      status: previous?.status ?? (compareDateInputs(dueDate, today) < 0 ? 'done' : 'todo'),
      reminderDate: previous?.reminderDate,
      system: true,
      calendarExported: previous?.calendarExported ?? false,
    } satisfies TaskItem;
  });

  const customTasks = (existingState?.tasks ?? []).filter((task) => !task.system);

  const milestones = milestoneTemplates.map((template) => {
    const id = `milestone-${template.key}`;
    const previous = existingMilestoneMap.get(id);

    return {
      id,
      title: template.title,
      description: template.description,
      date: getPregnancyWeekDate(profile.dueDate, template.week, template.offsetDays),
      week: template.week,
      kind: template.kind,
      location: profile.hospital || undefined,
      exported: previous?.exported ?? false,
    } satisfies MilestoneEvent;
  });

  return {
    profile,
    tasks: sortTasks([...seededTasks, ...customTasks]),
    milestones: sortMilestones(milestones),
  };
}

export function createDefaultProfile() {
  return {
    partnerName: '爱人',
    dueDate: getDefaultDueDate(),
    city: '',
    hospital: '',
  };
}
