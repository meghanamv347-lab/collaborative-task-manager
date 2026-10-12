import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownUp, ArrowRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardList, Clock3, Command, Filter, LayoutDashboard,
  ListTodo, LogOut, Menu, Moon, MoreHorizontal, Plus, Search, ShieldCheck, Sun, Users, X,
} from 'lucide-react';
import {
  createTask, deleteTask, getActivity, getTasks, getUsers, login, register, updateTask,
} from './api.js';

const statuses = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];
const priorities = ['low', 'medium', 'high'];

function readSession() {
  try { return JSON.parse(localStorage.getItem('taskmanager.session') || 'null'); } catch { return null; }
}
function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}
function niceDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No due date' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [theme, setTheme] = useState(() => localStorage.getItem('taskmanager.theme') || 'light');
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(readSession()));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityTask, setActivityTask] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const isManager = session?.user?.role === 'manager';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('taskmanager.theme', theme);
  }, [theme]);
  useEffect(() => { if (session?.token) refreshData(session); }, [session?.token]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function refreshData(current = session) {
    if (!current?.token) return;
    setLoading(true);
    setError('');
    try {
      const [taskData, userData] = await Promise.all([
        getTasks(current.token),
        current.user.role === 'manager' ? getUsers(current.token) : Promise.resolve([]),
      ]);
      setTasks(taskData);
      setUsers(userData);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.description} ${task.assignedTo?.name || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'all' || task.status === statusFilter)
      && (priorityFilter === 'all' || task.priority === priorityFilter);
  }), [tasks, query, statusFilter, priorityFilter]);
  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => task.status === 'in-progress').length,
    done: tasks.filter((task) => task.status === 'completed').length,
    overdue: tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed').length,
  }), [tasks]);

  async function handleAuth(action, values) {
    setBusy(true); setError('');
    try {
      const nextSession = await action(values);
      localStorage.setItem('taskmanager.session', JSON.stringify(nextSession));
      setSession(nextSession);
      setNotice(`Welcome, ${nextSession.user.name.split(' ')[0]}.`);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  function signOut() {
    localStorage.removeItem('taskmanager.session'); setSession(null); setTasks([]); setUsers([]); setError('');
  }
  async function saveTask(values) {
    setBusy(true); setError('');
    try {
      if (modal?.task) await updateTask(session.token, modal.task.id, values);
      else await createTask(session.token, values);
      setModal(null); await refreshData(); setNotice(modal?.task ? 'Task changes saved.' : 'Task added to the workspace.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function changeStatus(task, status) {
    try { await updateTask(session.token, task.id, { status }); await refreshData(); setNotice('Task status updated.'); }
    catch (requestError) { setError(requestError.message); }
  }
  async function removeTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This also removes its activity history.`)) return;
    try { await deleteTask(session.token, task.id); await refreshData(); setNotice('Task deleted.'); }
    catch (requestError) { setError(requestError.message); }
  }
  async function showActivity(task) {
    setActivityTask(task); setActivity([]);
    try { setActivity(await getActivity(session.token, task.id)); }
    catch (requestError) { setError(requestError.message); }
  }

  if (!session?.token) return <AuthScreen busy={busy} error={error} onSubmit={handleAuth} theme={theme} setTheme={setTheme} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#overview" aria-label="Workroom home"><span className="brand-mark"><Command size={19} strokeWidth={2.5} /></span><span>workroom<span className="brand-period">.</span></span></a>
      <div className="workspace-switcher"><div className="workspace-icon">W</div><div className="workspace-copy"><strong>Workspace</strong><span>Personal space</span></div><ChevronDown size={15} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Workspace navigation">
        <a href="#overview" className="nav-link active"><LayoutDashboard size={17} />Overview</a>
        <a href="#tasks" className="nav-link"><ListTodo size={17} />{isManager ? 'All tasks' : 'My tasks'}<span className="nav-count">{tasks.length}</span></a>
        {isManager && <a href="#team" className="nav-link"><Users size={17} />Team<span className="nav-count">{users.length}</span></a>}
      </nav>
      <div className="sidebar-projects"><div className="nav-caption project-caption">YOUR SPACE <button type="button" className="icon-button small" title="Add space"><Plus size={15} /></button></div><a className="project-link" href="#tasks"><span className="project-dot dot-green" />Product launch</a><a className="project-link" href="#tasks"><span className="project-dot dot-blue" />Team operations</a></div>
      <div className="sidebar-bottom"><div className="upgrade-note"><span className="upgrade-icon"><ShieldCheck size={16} /></span><div><strong>{isManager ? 'Manager view' : 'Member view'}</strong><span>Role-based workspace</span></div></div><button type="button" className="profile-button" onClick={signOut} title="Sign out"><span className="avatar avatar-user">{initials(session.user.name)}</span><span className="profile-copy"><strong>{session.user.name}</strong><span>{session.user.email}</span></span><LogOut size={16} /></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button type="button" className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div><div className="topbar-actions"><button type="button" className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle appearance" title="Toggle appearance">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button type="button" className="icon-button notification-button" title="Notifications"><Bell size={18} /><i /></button><span className="avatar avatar-top">{initials(session.user.name)}</span></div></header>
      <div className="page-content">
        <section className="welcome-row" id="overview"><div><div className="eyebrow"><span className="eyebrow-dot" />{isManager ? 'MANAGER DASHBOARD' : 'TEAM DASHBOARD'}</div><h1>Good to see you, {session.user.name.split(' ')[0]}<span className="heading-period">.</span></h1><p className="welcome-subtitle">{isManager ? 'Here’s what is happening across the work you lead.' : 'Here’s your work at a glance. Keep the momentum going.'}</p></div><div className="welcome-controls"><div className="date-chip"><CalendarDays size={16} />{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'long', day: 'numeric' }).format(new Date())}</div>{isManager && <button type="button" className="button button-primary" onClick={() => { setError(''); setModal({ task: null }); }}><Plus size={17} />New task</button>}</div></section>
        {error && <div className="alert alert-error"><CircleHelp size={17} /><span>{error}</span><button type="button" className="icon-button small" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        <section className="stats-grid" aria-label="Task summary"><StatCard icon={<ClipboardList size={18} />} label={isManager ? 'Tasks you created' : 'Assigned to me'} value={stats.total} tone="green" hint="in this workspace" /><StatCard icon={<Clock3 size={18} />} label="In progress" value={stats.active} tone="blue" hint="moving forward" /><StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={stats.done} tone="mint" hint="across your tasks" /><StatCard icon={<CalendarDays size={18} />} label="Needs attention" value={stats.overdue} tone="orange" hint="past due date" /></section>
        <section className="tasks-panel" id="tasks">
          <div className="panel-heading"><div><div className="section-kicker">YOUR WORKSPACE</div><h2>{isManager ? 'Tasks you lead' : 'Your tasks'} <span className="task-total">{visibleTasks.length}</span></h2></div><button type="button" className="button button-quiet" onClick={() => refreshData()} title="Refresh tasks"><ArrowDownUp size={15} /><span>Refresh</span></button></div>
          <div className="task-toolbar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" /><kbd>⌘ K</kbd></label><div className="toolbar-filters"><label className="select-wrap"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap priority-filter"><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority"><option value="all">Priority</option>{priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select><ChevronDown size={14} /></label></div></div>
          <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>{isManager ? 'Assignee' : 'Created by'}</th><th>Due date</th><th aria-label="Task actions" /></tr></thead><tbody>
            {loading ? <tr><td colSpan="6"><div className="table-message"><span className="spinner" />Loading your tasks…</div></td></tr> : visibleTasks.length === 0 ? <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon"><Check size={20} /></span><strong>{tasks.length ? 'No matching tasks' : 'Nothing on your plate yet'}</strong><span>{tasks.length ? 'Try changing your search or filters.' : isManager ? 'Create a task and assign it to someone on your team.' : 'Tasks assigned to you will show up here.'}</span>{isManager && !tasks.length && <button className="button button-primary" type="button" onClick={() => setModal({ task: null })}><Plus size={16} />Create a task</button>}</div></td></tr> : visibleTasks.map((task) => <TaskRow key={task.id} task={task} isManager={isManager} onStatus={changeStatus} onEdit={() => { setError(''); setModal({ task }); }} onDelete={() => removeTask(task)} onActivity={() => showActivity(task)} />)}
          </tbody></table></div>
          <div className="table-footer"><span>Showing <strong>{visibleTasks.length}</strong> of <strong>{tasks.length}</strong> tasks</span><a href="#tasks" onClick={(event) => { event.preventDefault(); setQuery(''); setStatusFilter('all'); setPriorityFilter('all'); }}>Clear filters <ArrowRight size={14} /></a></div>
        </section>
        {isManager && <section className="team-strip" id="team"><div className="team-strip-title"><span className="team-icon"><Users size={17} /></span><div><strong>Your team</strong><span>{users.length} people in this workspace</span></div></div><div className="team-avatars">{users.slice(0, 6).map((user, index) => <span className={`avatar team-avatar team-avatar-${index % 4}`} key={user.id} title={user.name}>{initials(user.name)}</span>)}{users.length > 6 && <span className="avatar more-avatar">+{users.length - 6}</span>}</div><span className="team-strip-spacer" /></section>}
        <footer className="page-footer"><span>Workroom <span className="footer-mark">●</span> built for focused teams</span><span><ShieldCheck size={14} />Secure workspace</span></footer>
      </div>
    </main>
    {modal && <TaskModal task={modal.task} users={users.filter((user) => user.role === 'user')} busy={busy} onClose={() => setModal(null)} onSave={saveTask} />}
    {activityTask && <ActivityModal task={activityTask} events={activity} onClose={() => setActivityTask(null)} />}
    {notice && <div className="toast"><CheckCircle2 size={17} />{notice}</div>}
  </div>;
}

function StatCard({ icon, label, value, tone, hint }) {
  return <article className="stat-card"><span className={`stat-icon tone-${tone}`}>{icon}</span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></article>;
}

function TaskRow({ task, isManager, onStatus, onEdit, onDelete, onActivity }) {
  const person = isManager ? task.assignedTo : task.createdBy;
  const label = statuses.find((status) => status.value === task.status)?.label || task.status;
  const late = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  return <tr><td><div className="task-title-cell"><span className={`task-check task-check-${task.status}`}>{task.status === 'completed' ? <Check size={13} /> : <span />}</span><div><strong>{task.title}</strong>{task.description && <span>{task.description}</span>}</div></div></td><td>{isManager ? <span className={`status-pill status-${task.status}`}><i />{label}</span> : <label className={`status-pill status-${task.status} status-select`}><i /><select value={task.status} onChange={(event) => onStatus(task, event.target.value)} aria-label={`Update status for ${task.title}`}>{statuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select><ChevronDown size={12} /></label>}</td><td><span className={`priority-label priority-${task.priority}`}><i />{task.priority}</span></td><td><div className="person-cell"><span className="avatar avatar-small">{initials(person?.name || 'Unassigned')}</span><span>{person?.name || 'Unassigned'}</span></div></td><td><span className={`due-date ${late ? 'due-late' : ''}`}><CalendarDays size={14} />{niceDate(task.dueDate)}</span></td><td><div className="row-actions"><button type="button" className="icon-button small" onClick={onActivity} title="View activity" aria-label={`View activity for ${task.title}`}><Activity size={16} /></button>{isManager && <><button type="button" className="icon-button small" onClick={onEdit} title="Edit task" aria-label={`Edit ${task.title}`}><MoreHorizontal size={17} /></button><button type="button" className="icon-button small danger-on-hover" onClick={onDelete} title="Delete task" aria-label={`Delete ${task.title}`}><X size={16} /></button></>}</div></td></tr>;
}

function AuthScreen({ busy, error, onSubmit, theme, setTheme }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  function submit(event) {
    event.preventDefault(); setFormError('');
    if (mode === 'register' && name.trim().length < 2) return setFormError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Enter a valid email address.');
    if (password.length < 8) return setFormError('Password must be at least 8 characters.');
    onSubmit(mode === 'login' ? login : register, { name: name.trim(), email: email.trim(), password });
  }
  return <main className="auth-screen"><div className="auth-top"><a className="brand auth-brand" href="#home"><span className="brand-mark"><Command size={19} strokeWidth={2.5} /></span><span>workroom<span className="brand-period">.</span></span></a><button type="button" className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle appearance">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div>
    <div className="auth-layout"><section className="auth-story"><div className="story-overline"><span />TEAMWORK, IN GOOD ORDER</div><h1>Make room<br />for <em>good work.</em></h1><p>A calmer place to plan, share progress, and get meaningful work across the line.</p><div className="story-task"><span className="story-task-mark"><Check size={15} /></span><span><strong>Launch the next big thing</strong><small>Assigned to Maya Chen <i>·</i> Due Oct 18</small></span><span className="story-priority">HIGH PRIORITY</span></div><div className="story-decor story-decor-one" /><div className="story-decor story-decor-two" /><div className="story-index">01 <span>/</span> 03</div></section>
      <section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-mobile-heading"><div className="eyebrow"><span className="eyebrow-dot" />YOUR TEAM WORKSPACE</div><h1>Make room for good work.</h1></div><div className="auth-title"><span className="auth-kicker">GET STARTED</span><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{mode === 'login' ? 'Sign in to get back to what matters.' : 'Join your team and find your flow.'}</p></div><div className="auth-tabs" role="tablist"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setFormError(''); }}>Sign in</button><button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setFormError(''); }}>Create account</button></div>
      <form className="auth-form" onSubmit={submit} noValidate>{mode === 'register' && <label className="field-label">Full name<div className="input-wrap"><Users size={17} /><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></div></label>}<label className="field-label">Work email<div className="input-wrap"><span className="input-at">@</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></div></label><label className="field-label">Password<div className="input-wrap"><ShieldCheck size={17} /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} /></div></label>{(formError || error) && <div className="form-error"><CircleHelp size={16} />{formError || error}</div>}<button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? <span className="spinner spinner-white" /> : <>{mode === 'login' ? 'Sign in to workspace' : 'Create account'}<ArrowRight size={17} /></>}</button></form>
      <div className="auth-security"><ShieldCheck size={15} /><span>Your account is secured with encrypted credentials.</span></div><div className="auth-switch">{mode === 'login' ? <>New to the workspace? <button type="button" onClick={() => { setMode('register'); setFormError(''); }}>Create an account</button></> : <>Already have an account? <button type="button" onClick={() => { setMode('login'); setFormError(''); }}>Sign in instead</button></>}</div></div><div className="auth-footer"><span>© {new Date().getFullYear()} Workroom</span><span>Built for teams, made for focus</span></div></section></div></main>;
}

function TaskModal({ task, users, busy, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ title: task?.title || '', description: task?.description || '', priority: task?.priority || 'medium', status: task?.status || 'todo', assignedTo: task?.assignedTo?.id ? String(task.assignedTo.id) : '', dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '' }));
  const [formError, setFormError] = useState('');
  function update(field, value) { setValues((current) => ({ ...current, [field]: value })); }
  function submit(event) {
    event.preventDefault();
    if (values.title.trim().length < 2) return setFormError('Task title must have at least 2 characters.');
    onSave({ ...values, title: values.title.trim(), assignedTo: values.assignedTo || null, dueDate: values.dueDate || null });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog task-dialog" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><header className="dialog-header"><div><span className="dialog-kicker">TASK DETAILS</span><h2 id="task-dialog-title">{task ? 'Edit task' : 'Create a task'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header><form onSubmit={submit} className="dialog-form" noValidate><label className="field-label">Task name<input className="text-input" value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="What needs to get done?" autoFocus /></label><label className="field-label">Description <span className="optional-label">OPTIONAL</span><textarea className="text-input text-area" value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Add a little context for your team…" rows="3" /></label><div className="form-grid"><label className="field-label">Assignee<select className="text-input" value={values.assignedTo} onChange={(event) => update('assignedTo', event.target.value)}><option value="">Unassigned</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label><label className="field-label">Due date<input className="text-input" type="date" value={values.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label></div><div className="form-grid"><label className="field-label">Priority<select className="text-input" value={values.priority} onChange={(event) => update('priority', event.target.value)}>{priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label><label className="field-label">Status<select className="text-input" value={values.status} onChange={(event) => update('status', event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>{formError && <div className="form-error"><CircleHelp size={16} />{formError}</div>}<footer className="dialog-footer"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <span className="spinner spinner-white" /> : task ? 'Save changes' : <><Plus size={16} />Create task</>}</button></footer></form></section></div>;
}

function ActivityModal({ task, events, onClose }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog activity-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-title"><header className="dialog-header"><div><span className="dialog-kicker">TASK HISTORY</span><h2 id="activity-title">Activity</h2><p className="activity-task-title">{task.title}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close activity"><X size={18} /></button></header><div className="activity-list">{events.length ? events.map((event) => <article className="activity-event" key={event.id}><span className={`activity-mark activity-${event.action}`}><Activity size={14} /></span><div><p>{event.details}</p><span>{event.actor_name || 'Former member'} <i>·</i> {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(event.created_at))}</span></div></article>) : <div className="empty-activity"><Activity size={20} /><span>No activity recorded yet.</span></div>}</div></section></div>;
}
