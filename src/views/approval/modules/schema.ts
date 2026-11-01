import type {
  ApprovalFlowNode,
  ApprovalFormConfig,
  ApprovalFormField,
  ApprovalFormFieldType,
  ApprovalFormOption,
} from '@/apis/approval'

export const formFieldTypes: Array<{ label: string, value: ApprovalFormFieldType }> = [
  { label: '单行文本', value: 'TEXT' },
  { label: '多行文本', value: 'TEXTAREA' },
  { label: '数字', value: 'NUMBER' },
  { label: '金额', value: 'AMOUNT' },
  { label: '日期', value: 'DATE' },
  { label: '日期范围', value: 'DATERANGE' },
  { label: '下拉选择', value: 'SELECT' },
  { label: '单选', value: 'RADIO' },
]

const formFieldTypeValues = formFieldTypes.map((item) => item.value)

export function createDefaultFormConfig(): ApprovalFormConfig {
  return {
    version: 1,
    fields: [{
      id: 'reason',
      key: 'reason',
      label: '申请说明',
      type: 'TEXTAREA',
      required: true,
      placeholder: '请填写申请原因',
      validation: { maxLength: 1000 },
    }],
  }
}

export function createApprovalField(type: ApprovalFormFieldType = 'TEXT'): ApprovalFormField {
  const id = `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const field: ApprovalFormField = { id, key: id, label: '新字段', type, required: false, placeholder: '' }
  if (type === 'TEXT' || type === 'TEXTAREA') field.validation = { maxLength: 1000 }
  if (type === 'SELECT' || type === 'RADIO') field.options = [{ label: '选项 1', value: 'option_1' }]
  return field
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string, message: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error(message)
  }
}

export function parseFormConfig(value?: string): ApprovalFormConfig {
  if (!value?.trim()) return createDefaultFormConfig()
  const parsed = parseJson(value, '申请表单配置不是有效的 JSON')
  if (!isRecord(parsed) || !Array.isArray(parsed.fields)) throw new Error('申请表单配置必须包含字段列表')
  if (!parsed.fields.length) throw new Error('请至少添加一个申请字段')
  if (parsed.fields.length > 30) throw new Error('申请字段不能超过 30 个')

  const fields = parsed.fields.map((item) => {
    if (!isRecord(item)
      || typeof item.id !== 'string'
      || typeof item.key !== 'string'
      || typeof item.label !== 'string'
      || typeof item.type !== 'string'
      || !formFieldTypeValues.includes(item.type as ApprovalFormFieldType)) {
      throw new Error('申请表单包含不支持的字段配置')
    }
    if (item.options !== undefined && (!Array.isArray(item.options) || item.options.some((option) =>
      !isRecord(option) || typeof option.label !== 'string' || typeof option.value !== 'string'))) {
      throw new Error(`字段「${item.label}」的选项配置无效`)
    }
    return {
      ...item,
      type: item.type as ApprovalFormFieldType,
      required: Boolean(item.required),
      options: item.options as ApprovalFormOption[] | undefined,
    } as ApprovalFormField
  })
  const config: ApprovalFormConfig = { version: 1, fields }
  validateFormConfig(config)
  return config
}

export function validateFormConfig(config: ApprovalFormConfig) {
  if (!config.fields.length) throw new Error('请至少添加一个申请字段')
  if (config.fields.length > 30) throw new Error('申请字段不能超过 30 个')
  const keys = new Set<string>()
  const ids = new Set<string>()
  config.fields.forEach((field) => {
    if (!/^[A-Z]\w{0,49}$/i.test(field.id)) throw new Error(`字段「${field.label || field.id}」的编号格式无效`)
    if (ids.has(field.id)) throw new Error(`字段编号「${field.id}」重复`)
    ids.add(field.id)
    if (!/^[A-Z]\w{0,49}$/i.test(field.key)) throw new Error(`字段「${field.label || field.key}」的编码格式无效`)
    if (keys.has(field.key)) throw new Error(`字段编码「${field.key}」重复`)
    keys.add(field.key)
    if (!field.label.trim() || field.label.length > 100) throw new Error('字段名称不能为空且长度不能超过 100')

    const validation = field.validation
    if (validation?.minLength !== undefined && validation.minLength < 0) throw new Error('最小长度不能小于 0')
    if (validation?.maxLength !== undefined && validation.maxLength < 1) throw new Error('最大长度必须大于 0')
    if (validation?.maxLength !== undefined && validation.maxLength > 5000) throw new Error('最大长度不能超过 5000')
    if (validation?.minLength !== undefined && validation.maxLength !== undefined
      && validation.minLength > validation.maxLength) throw new Error('长度范围无效')
    if (validation?.min !== undefined && validation.max !== undefined && validation.min > validation.max) {
      throw new Error('数值范围无效')
    }

    if (field.type === 'SELECT' || field.type === 'RADIO') {
      if (!field.options?.length) throw new Error(`字段「${field.label}」必须配置选项`)
      if (field.options.length > 50) throw new Error('字段选项不能超过 50 个')
      const optionValues = new Set<string>()
      field.options.forEach((option) => {
        if (!option.label.trim() || option.label.length > 100) {
          throw new Error('选项名称不能为空且长度不能超过 100')
        }
        if (!option.value.trim() || option.value.length > 100) {
          throw new Error('选项值不能为空且长度不能超过 100')
        }
        if (optionValues.has(option.value)) throw new Error('选项值不能重复')
        optionValues.add(option.value)
      })
    }
  })
}

export function serializeFormConfig(config: ApprovalFormConfig) {
  validateFormConfig(config)
  return JSON.stringify({ version: 1, fields: config.fields })
}

function normalizeId(value: unknown) {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  throw new Error('流程包含无效用户 ID；请重新选择审批人')
}

export function parseFlowConfig(value?: string): ApprovalFlowNode[] {
  if (!value) throw new Error('流程配置不能为空')
  const parsed = parseJson(value, '流程配置不是有效的 JSON')
  if (!isRecord(parsed) || !Array.isArray(parsed.nodes)) throw new Error('流程配置必须包含节点列表')
  const ids = new Set<string>()
  return parsed.nodes.map((item) => {
    if (!isRecord(item)
      || typeof item.id !== 'string'
      || typeof item.name !== 'string'
      || item.type !== 'APPROVAL'
      || item.approverType !== 'USER'
      || (item.approveMode !== 'AND' && item.approveMode !== 'OR')
      || !Array.isArray(item.approvers)) {
      throw new Error('当前仅支持指定用户的顺序审批节点；原配置已保留，禁止覆盖保存')
    }
    if (!item.id.trim() || item.id.length > 50 || !item.name.trim() || item.name.length > 100) {
      throw new Error('节点编号或名称无效；原配置已保留，禁止覆盖保存')
    }
    if (ids.has(item.id)) throw new Error('流程节点编号不能重复')
    ids.add(item.id)
    const approvers = item.approvers.map(normalizeId)
    if (!approvers.length) throw new Error(`节点「${item.name}」至少需要一名审批人`)
    if (new Set(approvers).size !== approvers.length) throw new Error(`节点「${item.name}」的审批人不能重复`)
    return {
      id: item.id,
      name: item.name,
      type: 'APPROVAL',
      approverType: 'USER',
      approvers,
      approveMode: item.approveMode,
    }
  })
}

export function serializeFlowConfig(nodes: ApprovalFlowNode[]) {
  if (!nodes.length) throw new Error('请至少添加一个审批节点')
  const json = JSON.stringify({ nodes })
  parseFlowConfig(json)
  return json
}

export function formValueDefaults(config: ApprovalFormConfig): Record<string, unknown> {
  return Object.fromEntries(config.fields.map((field) => [field.key, field.defaultValue ?? null]))
}

export function parseFormData(value?: string): Record<string, unknown> {
  if (!value?.trim()) return {}
  const parsed = parseJson(value, '申请数据不是有效的 JSON')
  return isRecord(parsed) ? parsed : {}
}
