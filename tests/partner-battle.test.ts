import { describe, expect, it } from 'vitest'
import { PartnerBattle, soloHealth } from '../src/game/PartnerBattle'

describe('forest partner battle', () => {
  it('only activates on the first accepted rep and does not double-fire an assist', () => {
    const partner = new PartnerBattle()
    partner.resume(0)
    expect(partner.assist(8000, 100)).toBeNull()
    expect(partner.rep(9000, 90)).toBe(0)
    expect(partner.assist(16999, 90)).toBeNull()
    expect(partner.assist(17080, 90)).toBe(3)
    expect(partner.assist(17080, 87)).toBeNull()
    expect(partner.assist(25160, 87)).toBe(3)
  })

  it('repeats each three-rep combo and clears its energy', () => {
    const partner = new PartnerBattle()
    expect([1, 2, 3, 4, 5, 6].map(rep => partner.rep(rep * 1000, 100 - rep * 10))).toEqual([0, 0, 5, 0, 0, 5])
    expect(partner.energy).toBe(0)
    expect(partner.damage).toBe(10)
  })

  it('keeps the remaining cooldown across pause and gives a simultaneous combo priority', () => {
    const partner = new PartnerBattle()
    partner.rep(0, 90)
    partner.rep(2000, 80)
    partner.pause(3000)
    expect(partner.assist(100000, 80)).toBeNull()
    partner.resume(100000)
    expect(partner.assist(104999, 80)).toBeNull()
    expect(partner.rep(105000, 70)).toBe(5)
    expect(partner.assist(105080, 65)).toBeNull()
    expect(partner.assist(113080, 65)).toBe(3)
  })

  it('caps partner damage and preserves the tenth player hit for settlement', () => {
    const partner = new PartnerBattle()
    partner.rep(0, 90)
    expect(partner.assist(8080, 2)).toBe(1)
    expect(partner.assist(16160, 1)).toBe(0)
    expect(soloHealth(9, 10, 100)).toBe(1)
    expect(soloHealth(10, 10, 100)).toBe(0)
    expect(new PartnerBattle()).toMatchObject({ energy: 0, damage: 0 })
  })
})
