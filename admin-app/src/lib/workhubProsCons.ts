export type WorkhubProsConsSide = 'pros' | 'cons'

export type WorkhubProsConsCustomFieldType = 'text' | 'number' | 'boolean' | 'select'

export type WorkhubProsConsCustomFieldAppliesTo = 'pros' | 'cons' | 'both'

export type WorkhubProsConsChartVariant = 'balance' | 'bars' | 'donut'

export type WorkhubProsConsGroupingMode = 'none' | 'group'

export type WorkhubProsConsScoringMethod = 'weighted_product' | 'weighted_sum'

export type WorkhubProsConsAmountMode = 'none' | 'linear' | 'log'

export type WorkhubProsConsRecommendationTone = 'positive' | 'neutral' | 'negative'

export interface WorkhubProsConsCustomFieldDefinition {
  id: string
  label: string
  type: WorkhubProsConsCustomFieldType
  appliesTo?: WorkhubProsConsCustomFieldAppliesTo
  options?: string[]
  required?: boolean
}

export interface WorkhubProsConsGroup {
  id: string
  label: string
  color?: string
}

export interface WorkhubProsConsScoringConfig {
  method?: WorkhubProsConsScoringMethod
  weightFactor?: number
  impactFactor?: number
  amountMode?: WorkhubProsConsAmountMode
  amountFactor?: number
  amountCap?: number
  goThreshold?: number
  strongGoThreshold?: number
  noGoThreshold?: number
  strongNoGoThreshold?: number
}

export interface WorkhubProsConsItem {
  id: string
  title: string
  details?: string
  amount?: number
  weight?: number
  impact?: number
  groupId?: string
  customValues?: Record<string, string | number | boolean>
}

export interface WorkhubMoodBoardProsCons {
  topic?: string
  objective?: string
  currency?: string
  recommendationNote?: string
  chartVariant?: WorkhubProsConsChartVariant
  groupBy?: WorkhubProsConsGroupingMode
  templateId?: string
  scoring?: WorkhubProsConsScoringConfig
  customFields?: WorkhubProsConsCustomFieldDefinition[]
  groups?: WorkhubProsConsGroup[]
  pros: WorkhubProsConsItem[]
  cons: WorkhubProsConsItem[]
  fixedPropertiesMode?: boolean
  fixedProperties?: string[]
}

export interface WorkhubProsConsRecommendation {
  title: string
  detail: string
  tone: WorkhubProsConsRecommendationTone
}

export interface WorkhubProsConsAnalytics {
  prosScore: number
  consScore: number
  prosPercent: number
  consPercent: number
  prosAmount: number
  consAmount: number
  netAmount: number
  recommendation: WorkhubProsConsRecommendation
}

export interface WorkhubProsConsTemplatePreset {
  id: string
  label: string
  description: string
  data: WorkhubMoodBoardProsCons
}

export const DEFAULT_WORKHUB_PROS_CONS_SCORING: Required<WorkhubProsConsScoringConfig> = {
  method: 'weighted_product',
  weightFactor: 1,
  impactFactor: 1,
  amountMode: 'log',
  amountFactor: 2.2,
  amountCap: 6,
  goThreshold: 8,
  strongGoThreshold: 22,
  noGoThreshold: -8,
  strongNoGoThreshold: -22,
}

const DEFAULT_CUSTOM_FIELD_APPLIES_TO: WorkhubProsConsCustomFieldAppliesTo = 'both'

const DEFAULT_CHART_VARIANT: WorkhubProsConsChartVariant = 'balance'

const DEFAULT_GROUPING_MODE: WorkhubProsConsGroupingMode = 'none'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : (typeof value === 'string' ? Number(value) : Number.NaN)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'field'
}

function uniqueId(seed: string, used: Set<string>): string {
  let candidate = seed
  let suffix = 1
  while (used.has(candidate)) {
    candidate = `${seed}_${suffix++}`
  }
  used.add(candidate)
  return candidate
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const normalized = stripUndefinedDeep(entry)
      if (normalized !== undefined) {
        result[key] = normalized
      }
    }
    return result as T
  }

  return value
}

function normalizeSelectOptions(options: unknown): string[] | undefined {
  if (!Array.isArray(options)) return undefined
  const cleaned = options
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : undefined
}

function normalizeFieldDefinitions(
  fields: WorkhubProsConsCustomFieldDefinition[] | null | undefined,
): WorkhubProsConsCustomFieldDefinition[] {
  const usedIds = new Set<string>()
  return (fields || []).map((field, index) => {
    const nextLabel = typeof field?.label === 'string' ? field.label.trim() : ''
    const nextType: WorkhubProsConsCustomFieldType = field?.type === 'number'
      ? 'number'
      : field?.type === 'boolean'
        ? 'boolean'
        : field?.type === 'select'
          ? 'select'
          : 'text'
    const baseId = typeof field?.id === 'string' && field.id.trim()
      ? slugify(field.id)
      : slugify(nextLabel || `field_${index + 1}`)
    const nextId = uniqueId(baseId, usedIds)

    return stripUndefinedDeep({
      id: nextId,
      label: nextLabel || `Field ${index + 1}`,
      type: nextType,
      appliesTo: field?.appliesTo === 'pros' || field?.appliesTo === 'cons'
        ? field.appliesTo
        : DEFAULT_CUSTOM_FIELD_APPLIES_TO,
      options: nextType === 'select' ? normalizeSelectOptions(field?.options) : undefined,
      required: !!field?.required,
    }) as WorkhubProsConsCustomFieldDefinition
  })
}

function normalizeGroups(groups: WorkhubProsConsGroup[] | null | undefined): WorkhubProsConsGroup[] {
  const usedIds = new Set<string>()
  return (groups || []).map((group, index) => {
    const label = typeof group?.label === 'string' ? group.label.trim() : ''
    const baseId = typeof group?.id === 'string' && group.id.trim()
      ? slugify(group.id)
      : slugify(label || `group_${index + 1}`)
    const nextId = uniqueId(baseId, usedIds)

    return stripUndefinedDeep({
      id: nextId,
      label: label || `Group ${index + 1}`,
      color: typeof group?.color === 'string' && group.color.trim() ? group.color.trim() : undefined,
    }) as WorkhubProsConsGroup
  })
}

function normalizeScoringConfig(
  scoring: WorkhubProsConsScoringConfig | null | undefined,
): Required<WorkhubProsConsScoringConfig> {
  const strongGoThreshold = clamp(toNumber(scoring?.strongGoThreshold, DEFAULT_WORKHUB_PROS_CONS_SCORING.strongGoThreshold), 1, 100)
  const goThreshold = clamp(toNumber(scoring?.goThreshold, DEFAULT_WORKHUB_PROS_CONS_SCORING.goThreshold), 0, strongGoThreshold)
  const strongNoGoThreshold = clamp(toNumber(scoring?.strongNoGoThreshold, DEFAULT_WORKHUB_PROS_CONS_SCORING.strongNoGoThreshold), -100, -1)
  const noGoThreshold = clamp(toNumber(scoring?.noGoThreshold, DEFAULT_WORKHUB_PROS_CONS_SCORING.noGoThreshold), strongNoGoThreshold, 0)

  return {
    method: scoring?.method === 'weighted_sum' ? 'weighted_sum' : DEFAULT_WORKHUB_PROS_CONS_SCORING.method,
    weightFactor: clamp(toNumber(scoring?.weightFactor, DEFAULT_WORKHUB_PROS_CONS_SCORING.weightFactor), 0.1, 5),
    impactFactor: clamp(toNumber(scoring?.impactFactor, DEFAULT_WORKHUB_PROS_CONS_SCORING.impactFactor), 0.1, 5),
    amountMode: scoring?.amountMode === 'none' || scoring?.amountMode === 'linear'
      ? scoring.amountMode
      : DEFAULT_WORKHUB_PROS_CONS_SCORING.amountMode,
    amountFactor: clamp(toNumber(scoring?.amountFactor, DEFAULT_WORKHUB_PROS_CONS_SCORING.amountFactor), 0, 20),
    amountCap: clamp(toNumber(scoring?.amountCap, DEFAULT_WORKHUB_PROS_CONS_SCORING.amountCap), 0, 50),
    goThreshold,
    strongGoThreshold,
    noGoThreshold,
    strongNoGoThreshold,
  }
}

function normalizeCustomValueByType(
  value: unknown,
  field: WorkhubProsConsCustomFieldDefinition,
): string | number | boolean | undefined {
  if (field.type === 'number') {
    const parsed = toNumber(value, Number.NaN)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  if (field.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const next = value.trim().toLowerCase()
      if (next === 'true' || next === '1' || next === 'yes') return true
      if (next === 'false' || next === '0' || next === 'no') return false
    }
    return undefined
  }

  if (field.type === 'select') {
    const next = typeof value === 'string' ? value.trim() : ''
    if (!next) return undefined
    const options = field.options || []
    return options.includes(next) ? next : undefined
  }

  const next = typeof value === 'string' ? value.trim() : ''
  return next || undefined
}

function normalizeItemCustomValues(
  input: Record<string, unknown> | null | undefined,
  fieldDefinitions: WorkhubProsConsCustomFieldDefinition[],
): Record<string, string | number | boolean> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const next: Record<string, string | number | boolean> = {}

  fieldDefinitions.forEach((field) => {
    const normalized = normalizeCustomValueByType((input as Record<string, unknown>)[field.id], field)
    if (normalized !== undefined) {
      next[field.id] = normalized
    }
  })

  return Object.keys(next).length > 0 ? next : undefined
}

function normalizeAmount(value: unknown): number | undefined {
  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeItems(
  items: WorkhubProsConsItem[] | null | undefined,
  fieldDefinitions: WorkhubProsConsCustomFieldDefinition[],
  groups: WorkhubProsConsGroup[],
): WorkhubProsConsItem[] {
  const usedIds = new Set<string>()
  const validGroupIds = new Set(groups.map((group) => group.id))

  return (items || []).map((item, index) => {
    const title = typeof item?.title === 'string' ? item.title.trim() : ''
    const baseId = typeof item?.id === 'string' && item.id.trim()
      ? slugify(item.id)
      : `pc_${index + 1}`
    const nextId = uniqueId(baseId, usedIds)

    return stripUndefinedDeep({
      id: nextId,
      title,
      details: typeof item?.details === 'string' && item.details.trim() ? item.details.trim() : undefined,
      amount: normalizeAmount(item?.amount),
      weight: clamp(toNumber(item?.weight, 3), 1, 5),
      impact: clamp(toNumber(item?.impact, 5), 1, 10),
      groupId: typeof item?.groupId === 'string' && validGroupIds.has(item.groupId) ? item.groupId : undefined,
      customValues: normalizeItemCustomValues(item?.customValues as Record<string, unknown> | undefined, fieldDefinitions),
    }) as WorkhubProsConsItem
  }).filter((item) => item.title.length > 0)
}

export function buildWorkhubProsConsPersistencePayload(
  value: WorkhubMoodBoardProsCons | null | undefined,
): WorkhubMoodBoardProsCons {
  const customFields = normalizeFieldDefinitions(value?.customFields)
  const groups = normalizeGroups(value?.groups)
  const scoring = normalizeScoringConfig(value?.scoring)
  const fixedProperties = Array.isArray(value?.fixedProperties) 
    ? value.fixedProperties.filter((f) => typeof f === 'string') 
    : []

  return stripUndefinedDeep({
    topic: typeof value?.topic === 'string' ? value.topic : '',
    objective: typeof value?.objective === 'string' ? value.objective : '',
    recommendationNote: typeof value?.recommendationNote === 'string' ? value.recommendationNote : '',
    currency: typeof value?.currency === 'string' && value.currency.trim()
      ? value.currency.trim().toUpperCase().slice(0, 6)
      : 'USD',
    chartVariant: value?.chartVariant === 'bars' || value?.chartVariant === 'donut'
      ? value.chartVariant
      : DEFAULT_CHART_VARIANT,
    groupBy: value?.groupBy === 'group' ? 'group' : DEFAULT_GROUPING_MODE,
    templateId: typeof value?.templateId === 'string' && value.templateId.trim() ? value.templateId.trim() : 'blank',
    scoring,
    customFields,
    groups,
    fixedPropertiesMode: !!value?.fixedPropertiesMode,
    fixedProperties,
    pros: normalizeItems(value?.pros, customFields, groups),
    cons: normalizeItems(value?.cons, customFields, groups),
  }) as WorkhubMoodBoardProsCons
}

export function buildWorkhubProsConsDefaults(
  seed?: Partial<WorkhubMoodBoardProsCons>,
): WorkhubMoodBoardProsCons {
  return buildWorkhubProsConsPersistencePayload({
    topic: seed?.topic || '',
    objective: seed?.objective || '',
    recommendationNote: seed?.recommendationNote || '',
    currency: seed?.currency || 'USD',
    chartVariant: seed?.chartVariant || DEFAULT_CHART_VARIANT,
    groupBy: seed?.groupBy || DEFAULT_GROUPING_MODE,
    templateId: seed?.templateId || 'blank',
    scoring: seed?.scoring || DEFAULT_WORKHUB_PROS_CONS_SCORING,
    customFields: seed?.customFields || [],
    groups: seed?.groups || [],
    fixedPropertiesMode: !!seed?.fixedPropertiesMode,
    fixedProperties: seed?.fixedProperties || [],
    pros: seed?.pros || [],
    cons: seed?.cons || [],
  })
}

function calculateItemScore(item: WorkhubProsConsItem, scoring: Required<WorkhubProsConsScoringConfig>): number {
  const weight = clamp(toNumber(item.weight, 3), 1, 5)
  const impact = clamp(toNumber(item.impact, 5), 1, 10)

  const weightedWeight = weight * scoring.weightFactor
  const weightedImpact = impact * scoring.impactFactor

  const base = scoring.method === 'weighted_sum'
    ? weightedWeight + weightedImpact
    : (weightedWeight * weightedImpact) / 5

  const absoluteAmount = Math.abs(toNumber(item.amount, 0))
  let amountInfluence = 0

  if (scoring.amountMode === 'linear') {
    amountInfluence = absoluteAmount * scoring.amountFactor
  } else if (scoring.amountMode === 'log') {
    amountInfluence = Math.log10(absoluteAmount + 1) * scoring.amountFactor
  }

  amountInfluence = Math.min(scoring.amountCap, Math.max(0, amountInfluence))

  return base + amountInfluence
}

function resolveRecommendation(
  deltaPercent: number,
  scoring: Required<WorkhubProsConsScoringConfig>,
): WorkhubProsConsRecommendation {
  if (deltaPercent >= scoring.strongGoThreshold) {
    return {
      title: 'Strong go',
      detail: 'Positive drivers clearly outweigh tradeoffs. Move forward with execution planning.',
      tone: 'positive',
    }
  }

  if (deltaPercent >= scoring.goThreshold) {
    return {
      title: 'Leaning go',
      detail: 'Benefits are ahead, but mitigation for top risks should be defined before committing.',
      tone: 'positive',
    }
  }

  if (deltaPercent <= scoring.strongNoGoThreshold) {
    return {
      title: 'Strong no-go',
      detail: 'Downsides dominate. Pause and revisit assumptions or alternatives first.',
      tone: 'negative',
    }
  }

  if (deltaPercent <= scoring.noGoThreshold) {
    return {
      title: 'Leaning no-go',
      detail: 'Risk and cost pressure are high. Proceed only if constraints can be reduced.',
      tone: 'negative',
    }
  }

  return {
    title: 'Balanced',
    detail: 'Evidence is currently mixed. Add higher-impact proof points to improve confidence.',
    tone: 'neutral',
  }
}

export function evaluateWorkhubProsCons(
  value: WorkhubMoodBoardProsCons | null | undefined,
): WorkhubProsConsAnalytics {
  const normalized = buildWorkhubProsConsPersistencePayload(value)
  const scoring = normalizeScoringConfig(normalized.scoring)

  const prosScore = normalized.pros.reduce((sum, item) => sum + calculateItemScore(item, scoring), 0)
  const consScore = normalized.cons.reduce((sum, item) => sum + calculateItemScore(item, scoring), 0)
  const total = prosScore + consScore

  const prosPercent = total > 0 ? Math.round((prosScore / total) * 100) : 50
  const consPercent = 100 - prosPercent

  const prosAmount = normalized.pros.reduce((sum, item) => sum + toNumber(item.amount, 0), 0)
  const consAmount = normalized.cons.reduce((sum, item) => sum + toNumber(item.amount, 0), 0)
  const netAmount = prosAmount - consAmount

  return {
    prosScore,
    consScore,
    prosPercent,
    consPercent,
    prosAmount,
    consAmount,
    netAmount,
    recommendation: resolveRecommendation(prosPercent - consPercent, scoring),
  }
}

export function groupProsConsItemsByConfiguredGroups(
  items: WorkhubProsConsItem[],
  groups: WorkhubProsConsGroup[],
): Array<{ id: string; label: string; items: WorkhubProsConsItem[] }> {
  if (!groups.length) {
    return [{ id: 'ungrouped', label: 'Ungrouped', items }]
  }

  const entries = new Map<string, WorkhubProsConsItem[]>()
  groups.forEach((group) => entries.set(group.id, []))
  entries.set('ungrouped', [])

  items.forEach((item) => {
    if (item.groupId && entries.has(item.groupId)) {
      entries.get(item.groupId)?.push(item)
      return
    }
    entries.get('ungrouped')?.push(item)
  })

  const output = groups.map((group) => ({
    id: group.id,
    label: group.label,
    items: entries.get(group.id) || [],
  })).filter((entry) => entry.items.length > 0)

  const ungrouped = entries.get('ungrouped') || []
  if (ungrouped.length > 0) {
    output.push({ id: 'ungrouped', label: 'Ungrouped', items: ungrouped })
  }

  return output.length > 0 ? output : [{ id: 'ungrouped', label: 'Ungrouped', items: [] }]
}

const TEMPLATE_PRESETS: WorkhubProsConsTemplatePreset[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch with no assumptions.',
    data: buildWorkhubProsConsDefaults({
      templateId: 'blank',
      groups: [],
      customFields: [],
      pros: [],
      cons: [],
    }),
  },
  {
    id: 'product_launch',
    label: 'Product Launch',
    description: 'Evaluate launch readiness, demand, and operational risk.',
    data: buildWorkhubProsConsDefaults({
      templateId: 'product_launch',
      topic: 'Product launch decision',
      objective: 'Decide whether to launch in the current quarter.',
      groups: [
        { id: 'market', label: 'Market' },
        { id: 'ops', label: 'Operations' },
        { id: 'risk', label: 'Risk' },
      ],
      customFields: [
        { id: 'confidence', label: 'Confidence %', type: 'number', appliesTo: 'both' },
        { id: 'owner', label: 'Owner', type: 'text', appliesTo: 'both' },
        { id: 'horizon', label: 'Horizon', type: 'select', appliesTo: 'both', options: ['Immediate', 'Quarter', 'Year'] },
      ],
    }),
  },
  {
    id: 'vendor_selection',
    label: 'Vendor Selection',
    description: 'Compare cost, reliability, security, and support tradeoffs.',
    data: buildWorkhubProsConsDefaults({
      templateId: 'vendor_selection',
      topic: 'Vendor shortlisting',
      objective: 'Choose a vendor that balances total cost and delivery reliability.',
      groups: [
        { id: 'cost', label: 'Cost' },
        { id: 'delivery', label: 'Delivery' },
        { id: 'security', label: 'Security' },
      ],
      customFields: [
        { id: 'sla', label: 'SLA Tier', type: 'select', appliesTo: 'both', options: ['Gold', 'Silver', 'Bronze'] },
        { id: 'evidence_link', label: 'Evidence Link', type: 'text', appliesTo: 'both' },
      ],
    }),
  },
  {
    id: 'hiring_decision',
    label: 'Hiring Decision',
    description: 'Evaluate impact, budget, and role urgency for headcount approval.',
    data: buildWorkhubProsConsDefaults({
      templateId: 'hiring_decision',
      topic: 'Headcount approval',
      objective: 'Approve or defer role opening based on delivery capacity and budget.',
      groups: [
        { id: 'capacity', label: 'Capacity' },
        { id: 'budget', label: 'Budget' },
        { id: 'timing', label: 'Timing' },
      ],
      customFields: [
        { id: 'criticality', label: 'Criticality', type: 'select', appliesTo: 'both', options: ['High', 'Medium', 'Low'] },
        { id: 'team', label: 'Team', type: 'text', appliesTo: 'both' },
        { id: 'must_have', label: 'Must have', type: 'boolean', appliesTo: 'pros' },
      ],
    }),
  },
]

export function listWorkhubProsConsTemplates(): WorkhubProsConsTemplatePreset[] {
  return TEMPLATE_PRESETS
}

export function resolveWorkhubProsConsTemplate(templateId: string | null | undefined): WorkhubProsConsTemplatePreset {
  const found = TEMPLATE_PRESETS.find((template) => template.id === templateId)
  return found || TEMPLATE_PRESETS[0]
}

export function applyWorkhubProsConsTemplate(
  current: WorkhubMoodBoardProsCons,
  templateId: string,
): WorkhubMoodBoardProsCons {
  const template = resolveWorkhubProsConsTemplate(templateId)
  return buildWorkhubProsConsPersistencePayload({
    ...template.data,
    topic: template.data.topic || current.topic || '',
    objective: template.data.objective || current.objective || '',
    recommendationNote: current.recommendationNote || '',
    currency: current.currency || template.data.currency || 'USD',
    templateId: template.id,
  })
}
