// 经验：把原「经验」「版本」「经验阶段」「经验对照」四页收敛成一页两栏 —— 经验库 / 版本与回退。
// 只做入口合并，各页数据与操作保持不变。
import { useState } from 'react'
import { CompareView } from './CompareView'
import { ExperienceView } from './ExperienceView'
import { OverviewView } from './OverviewView'
import { VersionView } from './VersionView'

export function MemoryView({ snapshotId, setSnapshotId, focus, onOpenRun, onChanged }: {
  snapshotId: string
  setSnapshotId: (s: string) => void
  focus: string | null
  onOpenRun: (id: string) => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'exp' | 'ver' | 'cmp' | 'phase'>('exp')
  return (
    <div className="stack">
      <div className="tabs-inline">
        <button className={tab === 'exp' ? 'on' : ''} onClick={() => setTab('exp')}>经验库</button>
        <button className={tab === 'ver' ? 'on' : ''} onClick={() => setTab('ver')}>版本与回退</button>
        <button className={tab === 'cmp' ? 'on' : ''} onClick={() => setTab('cmp')}>快照对照</button>
        <button className={tab === 'phase' ? 'on' : ''} onClick={() => setTab('phase')}>学习阶段</button>
      </div>
      {tab === 'exp' && <ExperienceView snapshotId={snapshotId} setSnapshotId={setSnapshotId} focus={focus} onOpenRun={onOpenRun} />}
      {tab === 'ver' && <VersionView onOpenSnapshot={(s) => setSnapshotId(s)} onOpenRun={onOpenRun} onChanged={onChanged} />}
      {tab === 'cmp' && <CompareView selected={null} onSelect={() => {}} onOpenRun={onOpenRun} />}
      {tab === 'phase' && <OverviewView onOpenRun={onOpenRun} onOpenComparison={() => setTab('cmp')} />}
    </div>
  )
}
