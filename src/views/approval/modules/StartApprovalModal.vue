<template>
  <a-drawer
    v-model:visible="visible"
    title="发起审批"
    :width="width >= 720 ? 720 : '100%'"
    :body-style="{ padding: width >= 768 ? '24px 32px' : '20px 16px', minHeight: 0, overflowY: 'auto' }"
    :mask-closable="false"
    :esc-to-close="false"
    :ok-loading="saving"
    :ok-button-props="{ disabled: definitionsLoading || loading || saving || !!loadError || !definitionId }"
    @before-ok="submit"
    @cancel="closeDrawer"
    @close="reset"
  >
    <a-spin :loading="loading" class="approval-drawer-content approval-start-content">
      <a-alert v-if="loadError" type="error" class="start-alert">{{ loadError }}</a-alert>
      <a-form v-else ref="formRef" :model="startForm" layout="vertical">
        <a-form-item label="审批定义" field="definitionId" required :rules="[{ required: true, message: '请选择审批定义' }]">
          <a-select
            :model-value="startForm.definitionId"
            :options="definitionOptions"
            :loading="definitionsLoading"
            placeholder="请选择审批定义"
            allow-search
            @change="selectDefinition"
          >
            <template #empty>
              <a-empty description="没有数据" />
            </template>
          </a-select>
        </a-form-item>
        <a-row :gutter="24">
          <a-col :xs="24" :md="12">
            <a-form-item label="业务类型" field="businessType" :rules="[{ required: true, message: '请输入业务类型' }]">
              <a-input v-model="startForm.businessType" :max-length="50" placeholder="例如：费用报销" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="业务单号" field="businessKey" :rules="[{ required: true, message: '请输入业务单号' }]">
              <a-input v-model="startForm.businessKey" :max-length="100" placeholder="请输入关联业务单号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="申请标题" field="title" :rules="[{ required: true, message: '请输入申请标题' }]">
              <a-input v-model="startForm.title" :max-length="200" placeholder="请输入申请标题" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">申请内容</a-divider>
        <FormRenderer
          v-if="!loadError"
          v-model="startForm.formData"
          :config="formConfig"
          field-prefix="formData"
        />
      </a-form>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import FormRenderer from './FormRenderer.vue'
import { createDefaultFormConfig, formValueDefaults, parseFormConfig } from './schema'
import type { ApprovalDefinitionResp, ApprovalFormConfig, ApprovalStartReq } from '@/apis/approval'
import { getApprovalDefinition, listApprovalDefinitions, startApproval } from '@/apis/approval'

const emit = defineEmits<{
  'save-success': []
}>()

const { width } = useWindowSize()
let listRequestId = 0
let definitionRequestId = 0
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const definitionsLoading = ref(false)
const loadError = ref('')
const formRef = ref<FormInstance>()
const definitions = ref<ApprovalDefinitionResp[]>([])
const definitionId = ref<string>()
const formConfig = ref<ApprovalFormConfig>(createDefaultFormConfig())
const startForm = reactive({
  definitionId: undefined as string | undefined,
  businessType: '',
  businessKey: '',
  title: '',
  formData: {} as Record<string, unknown>,
})
const definitionOptions = computed(() => definitions.value.map((item) => ({
  label: `${item.name}${item.category ? `（${item.category}）` : ''}`,
  value: item.id,
})))

function reset() {
  listRequestId++
  definitionRequestId++
  formRef.value?.resetFields()
  definitionId.value = undefined
  startForm.definitionId = undefined
  startForm.businessType = ''
  startForm.businessKey = ''
  startForm.title = ''
  startForm.formData = {}
  definitions.value = []
  formConfig.value = createDefaultFormConfig()
  loading.value = false
  saving.value = false
  definitionsLoading.value = false
  loadError.value = ''
}

function closeDrawer() {
  visible.value = false
  reset()
}

async function selectDefinition(value: string | number | undefined) {
  const requestId = ++definitionRequestId
  definitionId.value = value === undefined ? undefined : String(value)
  startForm.definitionId = definitionId.value
  loadError.value = ''
  const selected = definitions.value.find((item) => item.id === definitionId.value)
  if (!selected) {
    formConfig.value = createDefaultFormConfig()
    startForm.formData = {}
    startForm.businessType = ''
    startForm.businessKey = ''
    startForm.title = ''
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await getApprovalDefinition(selected.id)
    if (requestId !== definitionRequestId || !visible.value) return
    formConfig.value = parseFormConfig(data.formConfig)
    startForm.formData = formValueDefaults(formConfig.value)
    startForm.businessType = selected.category || selected.code
    startForm.businessKey = `APP-${Date.now()}`
    startForm.title = `${selected.name}申请`
  } catch (error) {
    if (requestId === definitionRequestId && visible.value) {
      loadError.value = error instanceof Error ? error.message : '审批定义加载失败'
    }
  } finally {
    if (requestId === definitionRequestId) loading.value = false
  }
}

async function onOpen() {
  reset()
  visible.value = true
  const requestId = ++listRequestId
  definitionsLoading.value = true
  try {
    const { data } = await listApprovalDefinitions({ status: 1 })
    if (requestId !== listRequestId || !visible.value) return
    if (!Array.isArray(data)) throw new Error('审批定义列表响应格式异常')
    definitions.value = data
  } catch {
    if (requestId === listRequestId && visible.value) {
      loadError.value = '审批定义列表加载失败'
    }
  } finally {
    if (requestId === listRequestId) definitionsLoading.value = false
  }
  if (requestId !== listRequestId || !visible.value || loadError.value) return
  if (definitions.value.length) await selectDefinition(definitions.value[0].id)
}

async function submit() {
  if (loadError.value || !definitionId.value) return false
  try {
    const invalid = await formRef.value?.validate()
    if (invalid) return false
    const missingField = formConfig.value.fields.find((field) => {
      if (!field.required) return false
      const value = startForm.formData[field.key]
      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
    })
    if (missingField) {
      Message.error(`请填写${missingField.label}`)
      return false
    }
    const formData = Object.fromEntries(Object.entries(startForm.formData).filter(([, value]) => {
      return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)
    }))
    const request: ApprovalStartReq = {
      definitionCode: definitions.value.find((item) => item.id === definitionId.value)?.code ?? '',
      businessKey: startForm.businessKey.trim(),
      businessType: startForm.businessType.trim(),
      title: startForm.title.trim(),
      formData: JSON.stringify(formData),
    }
    saving.value = true
    await startApproval(request)
    Message.success('发起成功')
    emit('save-success')
    return true
  } catch (error) {
    if (error instanceof Error) Message.error(error.message)
    return false
  } finally {
    saving.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.approval-drawer-content {
  display: block;
  width: 100%;
  min-width: 0;
  margin-inline: auto;
}

.approval-start-content {
  max-width: 680px;
}

.start-alert {
  margin-bottom: 16px;
}
</style>
