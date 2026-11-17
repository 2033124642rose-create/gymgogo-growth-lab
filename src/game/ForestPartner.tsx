import { PARTNER, type PartnerState } from './PartnerBattle'
import './partner.css'

const labels: Record<PartnerState, string> = {
  idle: '待机', cheer: '好样的！', attack: '伙伴助攻', combo: '组合攻击', victory: '一起赢啦！',
}

export default function ForestPartner({ state, energy, sequence, damage, featured = false }: {
  state: PartnerState
  energy: number
  sequence: number
  featured?: boolean
  damage: number
}) {
  return <aside className={featured ? "forest-partner partner-featured" : "forest-partner"} aria-label="虚拟队友伙伴">
    <div key={sequence} className={`partner-motion partner-${state}`} aria-hidden="true">
      <div className="partner-pet">
        <i className="partner-leaf"/><i className="partner-eyes"/><i className="partner-mouth"/>
      </div>
    </div>
    <div className="partner-info">
      <strong>伙伴</strong>
      <span role="status">{labels[state]}{damage > 0 ? ` · −${damage} HP` : ''}</span>
      <meter aria-label="组合能量" min={0} max={PARTNER.comboTarget} value={energy}/>
      <small>能量 {energy}/{PARTNER.comboTarget}</small>
    </div>
  </aside>
}
