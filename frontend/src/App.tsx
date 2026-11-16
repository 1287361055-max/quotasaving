import { useEffect, useState } from 'react'
import { api } from './api'
import { usePoll } from './hooks'
import { useResearchBatch, useResearchList } from './researchData'
import { ConsoleView } from './views/ConsoleView'
import { HomeView } from './views/HomeView'
import { LiveView } from './views/LiveView'
import { MemoryView } from './views/MemoryView'
import { ResearchView } from './views/ResearchView'
import { RunView } from './views/RunView'

type Tab = 'home' | 'run' | 'mem' | 'res' | 'live' | 'admin'

// 简洁版信息架构：三个主入口（概览 / 运行 / 经验），其余收进「更多」。
const TABS: { id: Tab; lbl: string; title: string; desc: string }[] = [
  { id: 'home', lbl: '概览', title: '概览', desc: '研究结果、预算消耗与最近运行，一屏看完' },
  { id: 'run', lbl: '运行', title: '运行', desc: '发起一次研究运行，跟踪每一步决策与外部评测' },
  { id: 'mem', lbl: '经验', title: '经验', desc: '可执行经验快照：条目、版本链与安全回退' },
  { id: 'res', lbl: '研究对照', title: '研究对照', desc: '按任务比较各组路由与反馈策略的结果' },
  { id: 'live', lbl: '实时', title: '实时', desc: '正在执行的运行与对照进度' },
  { id: 'admin', lbl: '后台', title: '后台', desc: '批次配置、逐轮明细与统计口径' },
]
const PRIMARY: Tab[] = ['home', 'run', 'mem']
const MORE: Tab[] = ['res', 'live', 'admin']

type Theme = 'dark' | 'light'

/** ?theme=light|dark 优先（用于分享链接与截图），其次是上次选择；storage 可能不可用。 */
function initialTheme(): Theme {
  const q = new URLSearchParams(window.location.search).get('theme')
  if (q === 'light' || q === 'dark') return q
  try { return (window.localStorage.getItem('quotacrux.theme') ?? 'light') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

/** 兼容旧链接：#exp / #ver 等归入「经验」。 */
function readHash(): { tab: Tab; arg: string | null } {
  const [raw, arg] = window.location.hash.replace('#', '').split('/')
  const alias: Record<string, Tab> = { exp: 'mem', ver: 'mem', hist: 'mem', cmp: 'mem' }
  const tab = (TABS.some((t) => t.id === raw) ? raw : alias[raw] ?? 'home') as Tab
  return { tab, arg: arg ?? null }
}

export default function App() {
  const [{ tab, arg }, setRoute] = useState(readHash)
  const [runId, setRunId] = useState<string | null>(tab === 'run' ? arg : null)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [focusExp, setFocusExp] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { window.localStorage.setItem('quotacrux.theme', theme) } catch { /* 仅供本机偏好 */ }
  }, [theme])
  const health = usePoll(api.health, [], 3000)
  const snaps = usePoll(api.snapshots, [], 5000)
  const active = snaps.data?.active_snapshot_id ?? 'v0'
  // 顶栏展示的是最近研究批次实际使用的模型，而不是固定标签。
  const research = useResearchList()
  const latest = useResearchBatch(research.entries.find((e) => e.study !== 'routing') ?? research.entries[0] ?? null).batch

  useEffect(() => {
    const on = () => { setRoute(readHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (t: Tab, a?: string) => { window.location.hash = a ? `${t}/${a}` : t }

  const openRun = (id: string) => { setRunId(id); go('run', id) }
  const openExperience = (snap: string, exp?: string) => { setSnapshot(snap); setFocusExp(exp ?? null); go('mem') }
  const meta = TABS.find((t) => t.id === tab)!
  const running = !!health.data?.running_run_id

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" aria-label="QuotaSaving 枢决"><span className="logo" aria-hidden="true">Q</span><span className="name">QuotaSaving<span className="slash"> / </span>枢决</span></div>
        <nav className="nav">
          {PRIMARY.map((id) => {
            const t = TABS.find((x) => x.id === id)!
            return <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>{t.lbl}</button>
          })}
        </nav>
        <details className={`more ${MORE.includes(tab) ? 'on' : ''}`} key={tab}>
          <summary>{MORE.includes(tab) ? meta.lbl : '更多'} ▾</summary>
          <div className="menu">
            {MORE.map((id) => {
              const t = TABS.find((x) => x.id === id)!
              return <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>{t.lbl}</button>
            })}
          </div>
        </details>
        <div className="status">
          {latest?.model?.name && <span className="model" title="最近研究批次使用的模型"><b>{latest.model.name}</b></span>}
          {running && <span><span className="pulse" />运行中</span>}
          <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'} title={theme === 'dark' ? '浅色' : '深色'}>{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </header>
      <main>
        {tab !== 'home' && (
          <header className="masthead">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.desc}</p>
            </div>
          </header>
        )}
        {tab === 'home' && <HomeView onOpenResearch={(id) => go('res', id)} onOpenRun={openRun} />}
        {tab === 'res' && <ResearchView selected={arg} onSelect={(id) => go('res', id)} onOpenConsole={(id) => go('admin', id)} />}
        {tab === 'admin' && <ConsoleView selected={arg} onSelect={(id) => go('admin', id)} onOpenRun={openRun} />}
        {tab === 'run' && <RunView runId={runId} setRunId={openRun} activeSnapshot={active} onOpenExperience={openExperience} />}
        {tab === 'mem' && <MemoryView snapshotId={snapshot ?? active} setSnapshotId={setSnapshot} focus={focusExp} onOpenRun={openRun} onChanged={() => snaps.refresh()} />}
        {tab === 'live' && <LiveView onOpenRun={openRun} onOpenResearch={(id) => go('res', id)} />}
      </main>
    </div>
  )
}
