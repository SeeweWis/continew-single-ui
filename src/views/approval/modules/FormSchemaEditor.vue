<template>
  <div class="schema-editor">
    <div v-for="(field, index) in modelValue.fields" :key="field.id" class="schema-field">
      <div class="schema-field__header">
        <strong>字段 {{ index + 1 }}</strong>
        <a-space>
          <a-button type="text" size="small" :disabled="index === 0" @click="moveField(index, -1)">上移</a-button>
          <a-button type="text" size="small" :disabled="index === modelValue.fields.length - 1" @click="moveField(index, 1)">下移</a-button>
          <a-button type="text" size="small" status="danger" @click="removeField(index)">删除</a-button>
        </a-space>
      </div>
      <a-row :gutter="16">
        <a-col :xs="24" :md="8">
          <a-form-item label="字段名称" required>
            <a-input :model-value="field.label" :max-length="100" @update:model-value="value => updateField(field, { label: value })" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="8">
          <a-form-item label="字段编码" required>
            <a-input :model-value="field.key" :max-length="50" @update:model-value="value => updateField(field, { key: value })" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="8">
          <a-form-item label="字段类型" required>
            <a-select :model-value="field.type" :options="formFieldTypes" @update:model-value="value => changeType(field, value)" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="提示文字">
            <a-input :model-value="field.placeholder" :max-length="200" @update:model-value="value => updateField(field, { placeholder: value })" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="6">
          <a-form-item label="必填">
            <a-switch :model-value="field.required" @update:model-value="value => updateField(field, { required: value })" />
          </a-form-item>
        </a-col>
        <a-col v-if="field.type === 'TEXT' || field.type === 'TEXTAREA'" :xs="24" :md="6">
          <a-form-item label="最大长度">
            <a-input-number
              :model-value="field.validation?.maxLength"
              :min="1"
              :max="5000"
              placeholder="不限"
              @update:model-value="value => updateValidation(field, { maxLength: value })"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row v-if="field.type === 'NUMBER' || field.type === 'AMOUNT'" :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="最小值">
            <a-input-number :model-value="field.validation?.min" @update:model-value="value => updateValidation(field, { min: value })" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="最大值">
            <a-input-number :model-value="field.validation?.max" @update:model-value="value => updateValidation(field, { max: value })" />
          </a-form-item>
        </a-col>
      </a-row>
      <div v-if="field.type === 'SELECT' || field.type === 'RADIO'" class="schema-options">
        <div class="schema-options__header">
          <span>选项</span>
          <a-button
            type="text"
            size="small"
            :disabled="(field.options?.length ?? 0) >= 50"
            @click="addOption(field)"
          >
            <template #icon><icon-plus /></template>
            添加选项
          </a-button>
        </div>
        <a-row v-for="(option, optionIndex) in field.options" :key="`${field.id}-${optionIndex}`" :gutter="12" align="center">
          <a-col :xs="10" :md="9">
            <a-input :model-value="option.label" :max-length="100" placeholder="显示名称" @update:model-value="value => updateOption(field, optionIndex, { label: value })" />
          </a-col>
          <a-col :xs="10" :md="9">
            <a-input :model-value="option.value" :max-length="100" placeholder="提交值" @update:model-value="value => updateOption(field, optionIndex, { value })" />
          </a-col>
          <a-col :xs="4" :md="6">
            <a-button type="text" status="danger" @click="removeOption(field, optionIndex)">删除</a-button>
          </a-col>
        </a-row>
      </div>
    </div>
    <a-empty v-if="!modelValue.fields.length" description="尚未添加表单字段" />
    <a-button type="dashed" long :disabled="modelValue.fields.length >= 30" @click="addField">
      <template #icon><icon-plus /></template>
      添加字段
    </a-button>
    <div class="schema-hint">字段编码须以英文字母开头，且最多 50 个字符；字段顺序与申请表一致。</div>
  </div>
</template>

<script setup lang="ts">
import { createApprovalField, formFieldTypes } from './schema'
import type { ApprovalFormConfig, ApprovalFormField, ApprovalFormFieldType, ApprovalFormOption, ApprovalFormValidation } from '@/apis/approval'

const props = defineProps<{ modelValue: ApprovalFormConfig }>()
const emit = defineEmits<{
  'update:modelValue': [value: ApprovalFormConfig]
}>()

function commit(fields: ApprovalFormField[]) {
  emit('update:modelValue', { version: 1, fields })
}

function updateField(field: ApprovalFormField, patch: Partial<ApprovalFormField>) {
  commit(props.modelValue.fields.map((item) => item.id === field.id ? { ...item, ...patch } : item))
}

function changeType(field: ApprovalFormField, value: string | number | undefined) {
  const type = value as ApprovalFormFieldType
  const patch: Partial<ApprovalFormField> = { type, options: undefined, validation: undefined }
  if (type === 'TEXT' || type === 'TEXTAREA') patch.validation = { maxLength: 1000 }
  if (type === 'SELECT' || type === 'RADIO') patch.options = [{ label: '选项 1', value: 'option_1' }]
  updateField(field, patch)
}

function updateValidation(field: ApprovalFormField, patch: Partial<ApprovalFormValidation>) {
  updateField(field, { validation: { ...field.validation, ...patch } })
}

function updateOption(field: ApprovalFormField, index: number, patch: Partial<ApprovalFormOption>) {
  const options = (field.options ?? []).map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option)
  updateField(field, { options })
}

function addOption(field: ApprovalFormField) {
  const options = [...(field.options ?? [])]
  if (options.length >= 50) return
  let optionNumber = options.length + 1
  while (options.some((option) => option.value === `option_${optionNumber}`)) optionNumber++
  options.push({ label: `选项 ${optionNumber}`, value: `option_${optionNumber}` })
  updateField(field, { options })
}

function removeOption(field: ApprovalFormField, index: number) {
  updateField(field, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })
}

function addField() {
  commit([...props.modelValue.fields, createApprovalField()])
}

function moveField(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= props.modelValue.fields.length) return
  const fields = [...props.modelValue.fields]
  ;[fields[index], fields[target]] = [fields[target], fields[index]]
  commit(fields)
}

function removeField(index: number) {
  commit(props.modelValue.fields.filter((_, fieldIndex) => fieldIndex !== index))
}
</script>

<style scoped lang="scss">
.schema-field {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-2);
}

.schema-field__header,
.schema-options__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.schema-options {
  margin: 0 0 12px;
}

.schema-hint {
  margin-top: 8px;
  color: var(--color-text-3);
  font-size: 12px;
}
</style>
