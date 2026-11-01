<template>
  <a-form-item
    v-for="field in config.fields"
    :key="field.id"
    :field="fieldPrefix ? `${fieldPrefix}.${field.key}` : field.key"
    :label="field.label"
    :required="!readonly && field.required"
    :rules="!readonly && field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined"
  >
    <div v-if="readonly" class="approval-form-value">
      {{ displayValue(field) }}
    </div>
    <a-input
      v-else-if="field.type === 'TEXT'"
      :model-value="textValue(field)"
      :placeholder="field.placeholder"
      :max-length="field.validation?.maxLength"
      allow-clear
      @update:model-value="value => update(field, value)"
    />
    <a-textarea
      v-else-if="field.type === 'TEXTAREA'"
      :model-value="textValue(field)"
      :placeholder="field.placeholder"
      :max-length="field.validation?.maxLength"
      :auto-size="{ minRows: 3, maxRows: 8 }"
      show-word-limit
      @update:model-value="value => update(field, value)"
    />
    <a-input-number
      v-else-if="field.type === 'NUMBER' || field.type === 'AMOUNT'"
      :model-value="numberValue(field)"
      :min="field.validation?.min"
      :max="field.validation?.max"
      :precision="field.type === 'AMOUNT' ? 2 : undefined"
      :placeholder="field.placeholder"
      style="width: 100%"
      @update:model-value="value => update(field, value)"
    />
    <a-date-picker
      v-else-if="field.type === 'DATE'"
      :model-value="dateValue(field)"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      :placeholder="field.placeholder || '请选择日期'"
      style="width: 100%"
      @update:model-value="value => update(field, value)"
    />
    <a-range-picker
      v-else-if="field.type === 'DATERANGE'"
      :model-value="rangeValue(field)"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      style="width: 100%"
      @update:model-value="value => update(field, value)"
    />
    <a-select
      v-else-if="field.type === 'SELECT'"
      :model-value="textValue(field)"
      :options="field.options"
      :placeholder="field.placeholder || '请选择'"
      allow-clear
      @update:model-value="value => update(field, value)"
    />
    <a-radio-group
      v-else-if="field.type === 'RADIO'"
      :model-value="textValue(field)"
      @update:model-value="value => update(field, value)"
    >
      <a-radio v-for="option in field.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </a-radio>
    </a-radio-group>
  </a-form-item>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { ApprovalFormConfig, ApprovalFormField } from '@/apis/approval'

const props = withDefaults(defineProps<{
  config: ApprovalFormConfig
  modelValue: Record<string, unknown>
  readonly?: boolean
  fieldPrefix?: string
}>(), {
  readonly: false,
  fieldPrefix: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

function rawValue(field: ApprovalFormField) {
  return props.modelValue[field.key]
}

function textValue(field: ApprovalFormField) {
  const value = rawValue(field)
  return typeof value === 'string' ? value : undefined
}

function numberValue(field: ApprovalFormField) {
  const value = rawValue(field)
  return typeof value === 'number' ? value : undefined
}

function dateValue(field: ApprovalFormField) {
  const value = rawValue(field)
  if (typeof value === 'number') return dayjs(value).format('YYYY-MM-DD')
  return typeof value === 'string' ? value : undefined
}

function rangeValue(field: ApprovalFormField) {
  const value = rawValue(field)
  if (!Array.isArray(value) || value.length !== 2) return undefined
  return value.map((item) => typeof item === 'number' ? dayjs(item).format('YYYY-MM-DD') : String(item))
}

function displayValue(field: ApprovalFormField) {
  const value = rawValue(field)
  if (field.type === 'DATE' && typeof value === 'number') return dayjs(value).format('YYYY-MM-DD')
  if (field.type === 'DATERANGE' && Array.isArray(value)) {
    return value.map((item) => typeof item === 'number' ? dayjs(item).format('YYYY-MM-DD') : String(item)).join(' 至 ')
  }
  if (field.type === 'SELECT' || field.type === 'RADIO') {
    return field.options?.find((option) => option.value === String(value))?.label ?? String(value ?? '—')
  }
  if (Array.isArray(value)) return value.join(' 至 ')
  return String(value ?? '—')
}

function update(field: ApprovalFormField, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [field.key]: value })
}
</script>

<style scoped lang="scss">
.approval-form-value {
  min-height: 32px;
  line-height: 32px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
