import { describe, expect, it } from 'vitest'
import {
  applyWorkhubProsConsTemplate,
  buildWorkhubProsConsPersistencePayload,
  evaluateWorkhubProsCons,
  listWorkhubProsConsTemplates,
} from '../src/lib/workhubProsCons'

describe('workhub pros/cons engine', () => {
  it('computes recommendation and percentages from default scoring', () => {
    const analytics = evaluateWorkhubProsCons({
      topic: 'Ship release',
      currency: 'usd',
      pros: [
        { id: 'p1', title: 'Revenue upside', weight: 5, impact: 9, amount: 40000 },
        { id: 'p2', title: 'Customer retention', weight: 4, impact: 8, amount: 12000 },
      ],
      cons: [
        { id: 'c1', title: 'Operational risk', weight: 3, impact: 5, amount: 4000 },
      ],
    })

    expect(analytics.prosPercent).toBeGreaterThan(analytics.consPercent)
    expect(analytics.recommendation.tone).toBe('positive')
    expect(analytics.netAmount).toBe(48000)
  })

  it('respects custom scoring formula and recommendation thresholds', () => {
    const analytics = evaluateWorkhubProsCons({
      topic: 'Rollout timing',
      scoring: {
        method: 'weighted_sum',
        amountMode: 'none',
        weightFactor: 1,
        impactFactor: 1,
        goThreshold: 35,
        strongGoThreshold: 50,
        noGoThreshold: -15,
        strongNoGoThreshold: -30,
      },
      pros: [
        { id: 'p1', title: 'Market window', weight: 4, impact: 7 },
      ],
      cons: [
        { id: 'c1', title: 'Support load', weight: 4, impact: 6 },
      ],
    })

    expect(analytics.prosPercent - analytics.consPercent).toBeLessThan(35)
    expect(analytics.recommendation.title).toBe('Balanced')
  })

  it('normalizes persistence payload with custom fields, groups, and item metadata', () => {
    const payload = buildWorkhubProsConsPersistencePayload({
      topic: 'Vendor decision',
      currency: 'usd-long',
      chartVariant: 'donut',
      groupBy: 'group',
      customFields: [
        { id: 'confidence', label: 'Confidence', type: 'number', appliesTo: 'both' },
        { id: 'confidence', label: 'Confidence Duplicate', type: 'number', appliesTo: 'both' },
        { id: 'tier', label: 'Tier', type: 'select', appliesTo: 'both', options: ['Gold', '', 'Silver', 'Gold'] },
      ],
      groups: [
        { id: 'cost', label: 'Cost' },
        { id: 'cost', label: 'Cost duplicate' },
      ],
      pros: [
        {
          id: 'pro',
          title: 'Lower cost',
          groupId: 'cost',
          customValues: {
            confidence: '88',
            tier: 'Gold',
            ignored: 'x',
          },
        },
        {
          id: 'skip',
          title: '   ',
        },
      ],
      cons: [
        {
          id: 'con',
          title: 'Migration effort',
          groupId: 'missing-group',
          customValues: {
            confidence: 'bad-number',
            tier: 'NotAnOption',
          },
        },
      ],
    })

    expect(payload.currency).toBe('USD-LO')
    expect(payload.customFields?.length).toBe(3)
    expect(payload.groups?.length).toBe(2)
    expect(payload.pros.length).toBe(1)
    expect(payload.pros[0].groupId).toBe('cost')
    expect(payload.pros[0].customValues).toEqual({ confidence: 88, tier: 'Gold' })
    expect(payload.cons[0].groupId).toBeUndefined()
    expect(payload.cons[0].customValues).toBeUndefined()
  })

  it('applies templates and keeps deterministic template metadata', () => {
    const templates = listWorkhubProsConsTemplates()
    expect(templates.map((template) => template.id)).toEqual(
      expect.arrayContaining(['blank', 'product_launch', 'vendor_selection', 'hiring_decision']),
    )

    const seeded = applyWorkhubProsConsTemplate({
      topic: 'Current topic',
      objective: 'Current objective',
      currency: 'EUR',
      pros: [],
      cons: [],
    }, 'vendor_selection')

    expect(seeded.templateId).toBe('vendor_selection')
    expect((seeded.groups || []).length).toBeGreaterThan(0)
    expect((seeded.customFields || []).length).toBeGreaterThan(0)
    expect(seeded.currency).toBe('EUR')
  })
})
