// 概览：一屏看清三件事 —— 现在在做什么、研究结果如何、最近跑过什么。
// 只读取既有接口与归档批次，不改变任何实验行为。
import { api } from '../api'
import type { RunRow } from '../api'
import { CostTotal } from '../components/research'
import { SystemPanel } from '../components/SystemPanel'
import { usePoll } from '../hooks'
import { MODE, fmt, rmode } from '../labels'
import type { RBatch, RTask } from '../research'
import { total } from '../research'
import { bestOf, gainOf, metricName, taskVerdict } from '../researchFormat'
import { useResearchBatch, useResearchList } from '../researchData'

/** 一行话说明一次运行的结果；未跑 final 就说明未运行，不当作失败。 */
function runSummary(r: RunRow): string {
  if (r.status === 'running') return '运行中'
  if (r.final_score != null) return `最终得分 ${fmt.n(r.final_score)}`
  if (r.final_goal_met) return `达标 ${fmt.x(r.final_speedup)}`
  if (r.final_speedup != null) return `未达标 ${fmt.x(r.final_speedup)}`
  if (r.final_status === 'disabled' || r.dev_only) return '仅开发 · final 未启用'
  return 'final 未运行'
}

export function HomeView({ onOpenResearch, onOpenRun }: {
  onOpenResearch: (id: string) => void
  onOpenRun: (id: string) => void
}) {
  const { entries, apiState } = useResearchList()
  const entry = entries.find((e) => e.study !== 'routing') ?? entries[0] ?? null
  const { batch } = useResearchBatch(entry)
  const snaps = usePoll(api.snapshots, [], 5000)
  const runs = usePoll(() => api.runs(), [], 4000)
  const health = usePoll(api.health, [], 3000)

  const active = snaps.data?.active_snapshot_id ?? 'v0'
  const activeRows = snaps.data?.snapshots.find((s) => s.snapshot_id === active)?.experience_count ?? null
  const runningId = health.data?.running_run_id ?? null
  const recent = (runs.data ?? []).slice(0, 7)

  return (
    <div>
      <div className="statusbar">
        <span className={runningId ? 'dot' : 'dot idle'} aria-hidden />
        <span>{runningId ? <>正在运行 <b className="mono">{runningId}</b></> : <>空闲 · 可以发起新的运行</>}</span>
        <span>生效经验 <b className="mono">{active}</b>{activeRows != null && <span className="muted"> · {activeRows} 条</span>}</span>
        {batch?.model?.name && <span>最近批次模型 <b>{batch.model.name}</b></span>}
        <button className="more-link" onClick={() => onOpenResearch(entry?.id ?? '')} disabled={!entry}>研究对照 →</button>
      </div>

      {batch && <Kpis b={batch} />}

      <div className="section-head">
        <h2>任务结果</h2>
        <span className="small muted">{batch ? `${batch.tasks.length} 个任务 · ${batch.finished}/${batch.planned} 轮已完成` : '等待研究批次'}</span>
      </div>
      {batch
        ? (
          <div className="card" style={{ padding: '6px 8px' }}>
            <div className="tbl-wrap">
              <table className="tbl task-table">
                <thead><tr>
                  <th>任务</th><th>类型</th><th>最佳结果</th><th>结论</th><th>请求</th><th>费用</th>
                </tr></thead>
                <tbody>
                  {batch.tasks.map((t) => <TaskRow key={t.id} t={t} onOpen={() => onOpenResearch(batch.id)} />)}
                </tbody>
              </table>
            </div>
          </div>
        )
        : <div className="card"><div className="empty"><b>还没有研究批次</b>运行一次学习或评测后，结果会出现在这里。</div></div>}

      <div className="section-head">
        <h2>最近运行</h2>
        <button className="more-link" onClick={() => { window.location.hash = 'run' }}>全部运行 →</button>
      </div>
      <div className="card home-grid">
        <div>
          {recent.length === 0 && <p className="small muted" style={{ margin: 0 }}>还没有运行记录。</p>}
          {recent.map((r) => (
            <div key={r.run_id} className="run-line" onClick={() => onOpenRun(r.run_id)}>
              <div>
                <b>{r.task_id}</b>
                <span className="muted small"> · {MODE[r.mode] ?? r.mode}{r.snapshot_id ? ` · 读取 ${r.snapshot_id}` : ''}</span>
                <span className="id"> {r.run_id}</span>
              </div>
              <div className="r">{runSummary(r)}</div>
            </div>
          ))}
        </div>
        <div>
          <details className="fold">
            <summary>系统分工数字</summary>
            <SystemPanel />
          </details>
          <p className="footnote" style={{ marginTop: 10 }}>
            数据来源：{entry?.source === 'archive' ? '仓库存档批次' : '研究接口'}
            {apiState === 'missing' ? '（接口未提供，当前展示归档批次）' : ''}。
          </p>
        </div>
      </div>
    </div>
  )
}

function Kpis({ b }: { b: RBatch }) {
  const n = (vs: (number | null)[], f: (v: number) => string = String) => {
    const t = total(vs)
    return t.value == null ? '—' : f(t.value)
  }
  const bests = b.tasks.map((t) => bestOf(t)).filter((x): x is { mode: string; value: number } => !!x)
  const speedups = b.tasks.filter((t) => t.metric === 'speedup').map((t) => bestOf(t)?.value).filter((v): v is number => v != null)
  const medianSpeedup = speedups.length
    ? [...speedups].sort((a, c) => a - c)[Math.floor(speedups.length / 2)]
    : null
  return (
    <div className="kpi-row">
      <div className="kpi-cell">
        <div className="k">超越基线</div>
        <div className="v">{bests.length}<small>/ {b.tasks.length} 任务</small></div>
        <div className="s">{b.study === 'routing' ? '路由消融批次' : '反馈消融批次'}</div>
      </div>
      <div className="kpi-cell">
        <div className="k">中位最佳提速</div>
        <div className="v">{medianSpeedup == null ? '—' : `${medianSpeedup.toFixed(2)}×`}</div>
        <div className="s">只统计加速比任务</div>
      </div>
      <div className="kpi-cell">
        <div className="k">模型请求</div>
        <div className="v">{n(b.runs.map((r) => r.requests))}</div>
        <div className="s">候选 {n(b.runs.map((r) => r.passed))}/{n(b.runs.map((r) => r.proposed))} 通过</div>
      </div>
      <div className="kpi-cell">
        <div className="k">模型费用</div>
        <div className="v"><CostTotal costs={b.runs.map((r) => r.cost)} /></div>
        <div className="s">墙钟 {n(b.runs.map((r) => r.wallS), (v) => fmt.s(v))}</div>
      </div>
    </div>
  )
}

function TaskRow({ t, onOpen }: { t: RTask; onOpen: () => void }) {
  const best = bestOf(t)
  const gain = best ? gainOf(t, best.value) : null
  const verdict = taskVerdict(t, (m) => rmode(m).label)
  return (
    <tr className="click" onClick={onOpen}>
      <td><b>{t.title}</b><div className="small muted mono">{t.id}</div></td>
      <td className="small">{metricName(t.metric)} · {t.source === 'final' ? '最终集' : '开发集'}</td>
      <td className="num">
        {gain ? <> <span className="gain">{gain.big}{gain.unit}</span>{best && <div className="small muted">{rmode(best.mode).label}</div>}</> : <span className="muted">—</span>}
      </td>
      <td className="small">{verdict.text}</td>
      <td className="num">{total(t.runs.map((r) => r.requests)).value ?? '—'}</td>
      <td className="num"><CostTotal costs={t.runs.filter((r) => r.state !== 'planned').map((r) => r.cost)} /></td>
    </tr>
  )
}
