export const PARTNER = { intervalMs: 8000, assistDamage: 3, comboDamage: 5, comboTarget: 3, comboPriorityMs: 80 }

export type PartnerState = 'idle' | 'cheer' | 'attack' | 'combo' | 'victory'

export class PartnerBattle {
  energy = 0
  damage = 0
  private remaining = PARTNER.intervalMs
  private activated = false
  private since: number | null = null

  resume(now: number) {
    if (this.activated) this.since ??= now
  }

  pause(now: number) {
    if (this.since !== null) this.remaining = Math.max(0, this.remaining - (now - this.since))
    this.since = null
  }

  nextLevel() {
    this.energy = 0
    this.damage = 0
  }

  rep(now: number, remainingHp: number) {
    if (!this.activated) {
      this.activated = true
      this.resume(now)
    }
    this.energy++
    if (this.energy < PARTNER.comboTarget) return 0
    this.energy = 0
    if (this.since !== null && now - this.since >= this.remaining - PARTNER.comboPriorityMs) {
      this.since = now
      this.remaining = PARTNER.intervalMs
    }
    return this.addDamage(PARTNER.comboDamage, remainingHp)
  }

  assist(now: number, remainingHp: number) {
    if (this.since === null || now - this.since < this.remaining + PARTNER.comboPriorityMs) return null
    this.since = now
    this.remaining = PARTNER.intervalMs
    return this.addDamage(PARTNER.assistDamage, remainingHp)
  }

  private addDamage(amount: number, remainingHp: number) {
    const applied = Math.min(amount, Math.max(0, remainingHp - 1))
    this.damage += applied
    return applied
  }
}

export function soloHealth(count: number, target: number, partnerDamage: number) {
  return count >= target ? 0 : Math.max(1, (target - count) * 10 - partnerDamage)
}
