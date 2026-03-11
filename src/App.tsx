import { startTransition, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Baby,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheckBig,
  Clock3,
  Download,
  HeartHandshake,
  Hospital,
  LayoutGrid,
  ListTodo,
  MapPin,
  PackageOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRoundPen,
  WifiOff,
  X,
} from 'lucide-react';
import { downloadCalendarFile } from './lib/calendar';
import {
  compareDateInputs,
  diffInDays,
  formatCompactDate,
  formatHeaderDate,
  formatLongDate,
  formatMonthDay,
  formatRelativeLabel,
  formatRemainingDays,
  getPregnancyOverview,
  parseDateInput,
  toDateInputValue,
} from './lib/date';
import { buildSeededState, createDefaultProfile } from './data/seed';
import { emptyAppState, loadAppState, saveAppState } from './lib/storage';
import type {
  AppState,
  CalendarExportEvent,
  MilestoneEvent,
  PregnancyProfile,
  Tab,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from './types';

type ProfileDraft = {
  partnerName: string;
  dueDate: string;
  city: string;
  hospital: string;
};

type TaskDraft = {
  title: string;
  dueDate: string;
  category: TaskCategory;
  priority: TaskPriority;
  notes: string;
};

type TaskFilter = 'pending' | 'all' | 'done';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const tabMeta: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutGrid },
  { id: 'tasks', label: '清单', icon: CheckCircle2 },
  { id: 'reminders', label: '提醒', icon: BellRing },
];

const taskFilterMeta: { id: TaskFilter; label: string }[] = [
  { id: 'pending', label: '进行中' },
  { id: 'all', label: '全部' },
  { id: 'done', label: '已完成' },
];

const categoryLabel: Record<TaskCategory, string> = {
  appointment: '产检安排',
  admin: '证件流程',
  health: '健康关注',
  home: '居家准备',
  learning: '学习支持',
  shopping: '采购准备',
};

const categoryTone: Record<TaskCategory, string> = {
  appointment: 'bg-sky-100 text-sky-700',
  admin: 'bg-indigo-100 text-indigo-700',
  health: 'bg-emerald-100 text-emerald-700',
  home: 'bg-amber-100 text-amber-700',
  learning: 'bg-rose-100 text-rose-700',
  shopping: 'bg-violet-100 text-violet-700',
};

const priorityLabel: Record<TaskPriority, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
};

function createTaskDraft(): TaskDraft {
  return {
    title: '',
    dueDate: toDateInputValue(new Date()),
    category: 'home',
    priority: 'medium',
    notes: '',
  };
}

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

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function getStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getCompanionSuggestion(week: number, trimester: string, nextTask?: TaskItem) {
  if (nextTask) {
    return `这周最能帮到她的，不是多说，而是把“${nextTask.title}”提前安排好。`;
  }

  if (trimester === '孕早期') {
    return '孕早期重点是减轻焦虑和体力消耗，替她处理奔波与资料准备最有价值。';
  }

  if (trimester === '孕中期') {
    return '孕中期适合把后续检查、课程和家庭分工先定下来，越晚越容易被打乱。';
  }

  if (week >= 36) {
    return '临近预产期，把路线、证件和夜间出发预案过一遍，比任何“加油”都更实际。';
  }

  return '把日程、补给和情绪缓冲都提前准备好，准爸爸的稳定感会直接传递给伴侣。';
}

function buildCalendarEntries(state: AppState) {
  const taskEntries: CalendarExportEvent[] = state.tasks
    .filter((task) => task.status === 'todo')
    .map((task) => ({
      id: task.id,
      title: `待办：${task.title}`,
      date: task.dueDate,
      description: task.notes || `分类：${categoryLabel[task.category]}`,
      location: state.profile?.hospital || undefined,
    }));

  const milestoneEntries: CalendarExportEvent[] = state.milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    date: milestone.date,
    description: milestone.description,
    location: milestone.location,
  }));

  return [...taskEntries, ...milestoneEntries].sort((left, right) => compareDateInputs(left.date, right.date));
}

function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('pending');
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() => createTaskDraft());
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => {
    const profile = loadAppState().profile;
    return profile ?? createDefaultProfile();
  });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => getStandaloneMode());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  useEffect(() => {
    if (!state.profile) {
      setShowProfileSheet(true);
      setProfileDraft(createDefaultProfile());
    }
  }, [state.profile]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsStandalone(true);
    }

    function handleConnectionChange() {
      setIsOnline(navigator.onLine);
      setIsStandalone(getStandaloneMode());
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  const profile = state.profile;
  const overview = profile ? getPregnancyOverview(profile.dueDate) : null;
  const pendingTasks = state.tasks.filter((task) => task.status === 'todo');
  const completedTasks = state.tasks.filter((task) => task.status === 'done');
  const overdueTasks = pendingTasks.filter((task) => diffInDays(parseDateInput(task.dueDate), new Date()) < 0);
  const upcomingTasks = pendingTasks.filter((task) => {
    const daysUntil = diffInDays(parseDateInput(task.dueDate), new Date());
    return daysUntil >= 0 && daysUntil <= 7;
  });
  const focusTask =
    [...upcomingTasks].sort((left, right) => compareDateInputs(left.dueDate, right.dueDate))[0] ??
    [...pendingTasks].sort((left, right) => compareDateInputs(left.dueDate, right.dueDate))[0];
  const laterTasks = pendingTasks.filter((task) => diffInDays(parseDateInput(task.dueDate), new Date()) > 7);
  const filteredTasks =
    taskFilter === 'all'
      ? sortTasks(state.tasks)
      : taskFilter === 'done'
        ? sortTasks(completedTasks)
        : sortTasks(pendingTasks);
  const calendarEntries = buildCalendarEntries(state);
  const exportedCount =
    state.tasks.filter((task) => task.calendarExported).length +
    state.milestones.filter((milestone) => milestone.exported).length;

  const reminderCards = sortMilestones(state.milestones).slice(0, 6);
  const supportCopy = overview ? getCompanionSuggestion(overview.currentWeek, overview.trimester, focusTask) : '';
  const isAppleMobile =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());

  function setProfileForm(profileValue: PregnancyProfile | ProfileDraft) {
    setProfileDraft({
      partnerName: profileValue.partnerName,
      dueDate: profileValue.dueDate,
      city: profileValue.city,
      hospital: profileValue.hospital,
    });
  }

  function openProfileSheet() {
    setProfileForm(profile ?? createDefaultProfile());
    setShowProfileSheet(true);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextProfile: PregnancyProfile = {
      ...profileDraft,
      partnerName: profileDraft.partnerName.trim() || '爱人',
      city: profileDraft.city.trim(),
      hospital: profileDraft.hospital.trim(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };

    setState((previousState) => buildSeededState(nextProfile, previousState.profile ? previousState : emptyAppState));
    setShowProfileSheet(false);
  }

  function resetDefaultPlan() {
    if (!profileDraft.dueDate) {
      return;
    }

    const nextProfile: PregnancyProfile = {
      ...profileDraft,
      partnerName: profileDraft.partnerName.trim() || '爱人',
      city: profileDraft.city.trim(),
      hospital: profileDraft.hospital.trim(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };

    setState((previousState) => buildSeededState(nextProfile, previousState));
    setShowProfileSheet(false);
  }

  function toggleTaskStatus(taskId: string) {
    setState((previousState) => ({
      ...previousState,
      tasks: sortTasks(
        previousState.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: task.status === 'done' ? 'todo' : 'done',
              }
            : task,
        ),
      ),
    }));
  }

  function deleteTask(taskId: string) {
    setState((previousState) => ({
      ...previousState,
      tasks: previousState.tasks.filter((task) => task.id !== taskId),
    }));
  }

  function addCustomTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = taskDraft.title.trim();
    if (!title) {
      return;
    }

    const nextTask: TaskItem = {
      id: createId('custom-task'),
      title,
      notes: taskDraft.notes.trim(),
      category: taskDraft.category,
      dueDate: taskDraft.dueDate,
      priority: taskDraft.priority,
      status: 'todo',
      system: false,
      calendarExported: false,
    };

    setState((previousState) => ({
      ...previousState,
      tasks: sortTasks([...previousState.tasks, nextTask]),
    }));
    setTaskDraft(createTaskDraft());
  }

  function markMilestoneExported(milestoneId: string) {
    setState((previousState) => ({
      ...previousState,
      milestones: sortMilestones(
        previousState.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, exported: true } : milestone,
        ),
      ),
    }));
  }

  function markTaskExported(taskId: string) {
    setState((previousState) => ({
      ...previousState,
      tasks: sortTasks(
        previousState.tasks.map((task) =>
          task.id === taskId ? { ...task, calendarExported: true } : task,
        ),
      ),
    }));
  }

  function exportOneMilestone(milestone: MilestoneEvent) {
    downloadCalendarFile(
      [
        {
          id: milestone.id,
          title: milestone.title,
          date: milestone.date,
          description: milestone.description,
          location: milestone.location,
        },
      ],
      `${milestone.title}.ics`,
    );
    markMilestoneExported(milestone.id);
  }

  function exportOneTask(task: TaskItem) {
    downloadCalendarFile(
      [
        {
          id: task.id,
          title: `待办：${task.title}`,
          date: task.dueDate,
          description: task.notes || `分类：${categoryLabel[task.category]}`,
          location: profile?.hospital || undefined,
        },
      ],
      `${task.title}.ics`,
    );
    markTaskExported(task.id);
  }

  function exportAllEvents() {
    if (!calendarEntries.length) {
      return;
    }

    downloadCalendarFile(calendarEntries, '准爸爸孕期提醒.ics');
    setState((previousState) => ({
      ...previousState,
      tasks: previousState.tasks.map((task) => ({ ...task, calendarExported: true })),
      milestones: previousState.milestones.map((milestone) => ({ ...milestone, exported: true })),
    }));
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-[430px] px-3 py-4 sm:px-6 sm:py-8">
      <div className="app-shell relative min-h-[calc(100svh-2rem)] overflow-hidden sm:min-h-[860px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(91,124,255,0.2),_transparent_68%)]" />
        <header className="relative z-10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {formatHeaderDate(new Date())}
              </p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-slate-900">
                {activeTab === 'dashboard' ? '准爸爸领航员' : activeTab === 'tasks' ? '陪伴清单' : '提醒日历'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {installPrompt && !isStandalone ? (
                <button className="header-action" type="button" onClick={installApp}>
                  <Download className="h-4 w-4" />
                  安装
                </button>
              ) : null}
              <button className="icon-action" type="button" onClick={openProfileSheet} aria-label="编辑资料">
                <UserRoundPen className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!isOnline ? (
            <div className="glass-banner mt-4">
              <WifiOff className="h-4 w-4" />
              <span>当前处于离线模式，计划与清单仍可正常查看和编辑。</span>
            </div>
          ) : null}

          {!installPrompt && !isStandalone && isAppleMobile ? (
            <div className="glass-banner mt-3">
              <Download className="h-4 w-4" />
              <span>iPhone 可在 Safari 点“分享”后选择“添加到主屏幕”。</span>
            </div>
          ) : null}
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-32">
          {activeTab === 'dashboard' && profile && overview ? (
            <div className="space-y-5 pb-6">
              <section className="hero-card">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-200">
                    为 {profile.partnerName || '爱人'} 和宝宝准备
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-4xl font-semibold tracking-tight text-white">第 {overview.currentWeek} 周</h2>
                      <p className="mt-2 text-sm text-white/80">
                        {overview.trimester} · {formatRemainingDays(overview.daysRemaining)}
                      </p>
                    </div>
                    <div className="progress-ring">
                      <svg viewBox="0 0 36 36" className="h-full w-full">
                        <path
                          d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                          fill="none"
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                          fill="none"
                          stroke="white"
                          strokeLinecap="round"
                          strokeWidth="3"
                          strokeDasharray={`${overview.completion}, 100`}
                        />
                      </svg>
                      <strong>{overview.completion}%</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="hero-pill">
                    <Clock3 className="h-4 w-4" />
                    <div>
                      <span>今日关注</span>
                      <strong>{upcomingTasks.length || 0} 件</strong>
                    </div>
                  </div>
                  <div className="hero-pill">
                    <CircleCheckBig className="h-4 w-4" />
                    <div>
                      <span>已完成</span>
                      <strong>{completedTasks.length} 项</strong>
                    </div>
                  </div>
                  <div className="hero-pill">
                    <Download className="h-4 w-4" />
                    <div>
                      <span>已导日历</span>
                      <strong>{exportedCount}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="ios-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-eyebrow">今日重点</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      {focusTask ? focusTask.title : '今天先留一点弹性给她'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {focusTask
                        ? `${formatMonthDay(focusTask.dueDate)} · ${formatRelativeLabel(focusTask.dueDate)}`
                        : '当前没有紧急待办，可以先陪她散步、补觉，或者把后续检查预约提前确认。'}
                    </p>
                    {overdueTasks.length ? (
                      <p className="mt-2 text-xs font-medium text-rose-500">
                        另有 {overdueTasks.length} 项逾期任务，建议进清单页逐一处理。
                      </p>
                    ) : null}
                  </div>
                  <button
                    className="icon-action shrink-0"
                    type="button"
                    onClick={() => startTransition(() => setActiveTab('tasks'))}
                    aria-label="查看清单"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </section>

              <section className="ios-card bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,255,0.86))]">
                <div className="flex items-center gap-3">
                  <div className="feature-icon bg-indigo-100 text-indigo-700">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="section-eyebrow">准爸爸建议</p>
                    <p className="mt-1 text-[15px] leading-7 text-slate-600">{supportCopy}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-title">本周必须</h3>
                  <span className="text-xs font-medium text-slate-400">{upcomingTasks.length} 项</span>
                </div>
                <div className="space-y-3">
                  {(upcomingTasks.length ? upcomingTasks : pendingTasks.slice(0, 3)).map((task) => (
                    <article key={task.id} className="list-card">
                      <div className="flex items-start gap-3">
                        <button
                          className="mt-1 text-indigo-500"
                          type="button"
                          onClick={() => toggleTaskStatus(task.id)}
                          aria-label="切换完成状态"
                        >
                          {task.status === 'done' ? (
                            <CircleCheckBig className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[16px] font-semibold text-slate-900">{task.title}</h4>
                            <span className={`category-badge ${categoryTone[task.category]}`}>{categoryLabel[task.category]}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{task.notes}</p>
                          <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-400">
                            <span>{formatLongDate(task.dueDate)}</span>
                            <span>{priorityLabel[task.priority]}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-title">后续准备</h3>
                  <span className="text-xs font-medium text-slate-400">{laterTasks.length} 项</span>
                </div>
                <div className="ios-card divide-y divide-slate-100 p-0">
                  {(laterTasks.length ? laterTasks : state.tasks.slice(0, 3)).slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatCompactDate(task.dueDate)} · {formatRelativeLabel(task.dueDate)}
                        </p>
                      </div>
                      <span className={`category-badge ${categoryTone[task.category]}`}>{categoryLabel[task.category]}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="space-y-5 pb-6">
              <section className="ios-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-eyebrow">快速添加</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">把想做的事立刻变成计划</h3>
                  </div>
                  <div className="feature-icon bg-indigo-100 text-indigo-700">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <form className="mt-5 grid gap-3" onSubmit={addCustomTask}>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="例如：提前确认住院停车位置"
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="field-input"
                      type="date"
                      value={taskDraft.dueDate}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                    <select
                      className="field-input"
                      value={taskDraft.category}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, category: event.target.value as TaskCategory }))
                      }
                    >
                      {Object.entries(categoryLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="field-input"
                      value={taskDraft.priority}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))
                      }
                    >
                      {Object.entries(priorityLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="primary-button" type="submit">
                      <Plus className="h-4 w-4" />
                      加入清单
                    </button>
                  </div>
                  <textarea
                    className="field-input min-h-24 resize-none"
                    placeholder="给自己留一句提醒，例如要带什么、提前多久出门。"
                    value={taskDraft.notes}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, notes: event.target.value }))}
                  />
                </form>
              </section>

              <section className="ios-card">
                <div className="flex flex-wrap items-center gap-2">
                  {taskFilterMeta.map((filter) => (
                    <button
                      key={filter.id}
                      className={`chip-button ${taskFilter === filter.id ? 'chip-button-active' : ''}`}
                      type="button"
                      onClick={() => setTaskFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  {filteredTasks.length ? (
                    filteredTasks.map((task) => (
                      <article key={task.id} className="task-row">
                        <button
                          className={`mt-1 ${task.status === 'done' ? 'text-emerald-500' : 'text-slate-300'}`}
                          type="button"
                          onClick={() => toggleTaskStatus(task.id)}
                          aria-label="切换任务状态"
                        >
                          {task.status === 'done' ? (
                            <CircleCheckBig className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-[15px] font-semibold ${
                                task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </p>
                            <span className={`category-badge ${categoryTone[task.category]}`}>{categoryLabel[task.category]}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{task.notes || '没有备注，保持节奏就好。'}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                            <span>{formatLongDate(task.dueDate)}</span>
                            <span>{priorityLabel[task.priority]}</span>
                            {task.calendarExported ? <span>已导出到日历</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button className="ghost-button" type="button" onClick={() => exportOneTask(task)}>
                            <Download className="h-4 w-4" />
                          </button>
                          {!task.system ? (
                            <button className="ghost-button text-rose-500" type="button" onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <PackageOpen className="h-8 w-8 text-slate-300" />
                      <p>这一栏目前没有任务，可以从上面快速加一个。</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'reminders' ? (
            <div className="space-y-5 pb-6">
              <section className="hero-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-200">同步到系统日历</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">关键节点一键导出</h2>
                    <p className="mt-3 max-w-[260px] text-sm leading-6 text-white/80">
                      适合导入苹果日历、Google Calendar 或公司日历，把孕期安排变成真正会提醒你的事件。
                    </p>
                  </div>
                  <button className="header-action bg-white/15 text-white" type="button" onClick={exportAllEvents}>
                    <Download className="h-4 w-4" />
                    导出全部
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="hero-pill">
                    <CalendarDays className="h-4 w-4" />
                    <div>
                      <span>关键节点</span>
                      <strong>{state.milestones.length}</strong>
                    </div>
                  </div>
                  <div className="hero-pill">
                    <ListTodo className="h-4 w-4" />
                    <div>
                      <span>待办提醒</span>
                      <strong>{pendingTasks.length}</strong>
                    </div>
                  </div>
                  <div className="hero-pill">
                    <ShieldCheck className="h-4 w-4" />
                    <div>
                      <span>已导出</span>
                      <strong>{exportedCount}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-title">关键节点</h3>
                  <span className="text-xs font-medium text-slate-400">按孕周排布</span>
                </div>
                <div className="space-y-3">
                  {reminderCards.map((milestone) => (
                    <article key={milestone.id} className="list-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="category-badge bg-indigo-100 text-indigo-700">第 {milestone.week} 周</span>
                            {milestone.exported ? (
                              <span className="category-badge bg-emerald-100 text-emerald-700">已导出</span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-[16px] font-semibold text-slate-900">{milestone.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{milestone.description}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                            <span>{formatLongDate(milestone.date)}</span>
                            {milestone.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {milestone.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button className="ghost-button" type="button" onClick={() => exportOneMilestone(milestone)}>
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ios-card">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="section-title">待办提醒</h3>
                  <span className="text-xs font-medium text-slate-400">最适合放进系统日历</span>
                </div>
                <div className="space-y-3">
                  {pendingTasks.slice(0, 6).map((task) => (
                    <div key={task.id} className="task-row bg-slate-50/80">
                      <div className="feature-icon bg-white text-indigo-700">
                        {task.category === 'appointment' ? (
                          <Hospital className="h-4 w-4" />
                        ) : task.category === 'shopping' ? (
                          <PackageOpen className="h-4 w-4" />
                        ) : task.category === 'admin' ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Baby className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatMonthDay(task.dueDate)} · {formatRelativeLabel(task.dueDate)}
                        </p>
                      </div>
                      <button className="ghost-button" type="button" onClick={() => exportOneTask(task)}>
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </main>

        <nav className="bottom-nav">
          {tabMeta.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
                type="button"
                onClick={() => startTransition(() => setActiveTab(tab.id))}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {showProfileSheet ? (
          <div className="modal-backdrop">
            <div className="modal-sheet">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">{profile ? '更新资料' : '首次设置'}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {profile ? '调整孕期计划' : '先填一个预产期'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    设置后会自动生成适合中国准爸爸的产检、待产和陪伴清单。
                  </p>
                </div>
                {profile ? (
                  <button className="icon-action" type="button" onClick={() => setShowProfileSheet(false)}>
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <form className="mt-6 grid gap-3" onSubmit={saveProfile}>
                <input
                  className="field-input"
                  type="text"
                  placeholder="伴侣昵称，例如：小柚"
                  value={profileDraft.partnerName}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, partnerName: event.target.value }))
                  }
                />
                <input
                  className="field-input"
                  type="date"
                  value={profileDraft.dueDate}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, dueDate: event.target.value }))}
                  required
                />
                <input
                  className="field-input"
                  type="text"
                  placeholder="所在城市，例如：上海"
                  value={profileDraft.city}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, city: event.target.value }))}
                />
                <input
                  className="field-input"
                  type="text"
                  placeholder="常去医院，例如：市妇幼保健院"
                  value={profileDraft.hospital}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, hospital: event.target.value }))
                  }
                />
                <button className="primary-button mt-2" type="submit">
                  <HeartHandshake className="h-4 w-4" />
                  保存并生成计划
                </button>
              </form>

              {profile ? (
                <button className="secondary-button mt-3" type="button" onClick={resetDefaultPlan}>
                  <RefreshCw className="h-4 w-4" />
                  根据当前预产期重建默认计划
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
