<template>
  <a-drawer
    v-model:visible="visible"
    :title="currentId ? '编辑审批定义' : '新增审批定义'"
    :width="width >= 960 ? 960 : '100%'"
    :body-style="{ padding: width >= 768 ? '24px 32px' : '20px 16px', minHeight: 0, overflowY: 'auto' }"
    :mask-closable="false"
    :esc-to-close="false"
    @close="reset"
  >
    <a-spin :loading="loading" class="approval-drawer-content approval-definition-content">
      <a-alert v-if="loadError" type="error" class="drawer-alert">
        {{ loadError }}。为了避免覆盖不支持的配置，本次不能保存该定义。
      </a-alert>
      <a-steps :current="currentStep" type="navigation" :changeable="false" class="definition-steps">
        <a-step title="基本信息" />
        <a-step title="审批节点" />
        <a-step title="申请字段" />
        <a-step title="整体预览" />
      </a-steps>
      <a-form ref="formRef" :model="form" layout="vertical">
        <template v-if="currentStep === 1">
          <a-row :gutter="24">
            <a-col :xs="24" :md="8">
              <a-form-item label="定义编码" field="code" required>
                <a-input v-model="form.code" :max-length="50" placeholder="以英文字母开头" :disabled="!!currentId" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="定义名称" field="name" required>
                <a-input v-model="form.name" :max-length="100" placeholder="请输入定义名称" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="分类" field="category">
                <a-input v-model="form.category" :max-length="50" placeholder="例如：人事、财务" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="描述" field="description">
                <a-textarea v-model="form.description" :max-length="500" :auto-size="{ minRows: 2, maxRows: 4 }" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="状态">
                <a-switch :model-value="form.status === 1" checked-text="启用" unchecked-text="停用" @update:model-value="value => form.status = value ? 1 : 0" />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <template v-else-if="currentStep === 2">
          <div v-for="(node, index) in nodes" :key="node.id" class="flow-node">
            <div class="flow-node__header">
              <strong>第 {{ index + 1 }} 步</strong>
              <a-space>
                <a-button type="text" size="small" :disabled="index === 0" @click="moveNode(index, -1)">上移</a-button>
                <a-button type="text" size="small" :disabled="index === nodes.length - 1" @click="moveNode(index, 1)">下移</a-button>
                <a-button type="text" size="small" status="danger" @click="removeNode(index)">删除</a-button>
              </a-space>
            </div>
            <a-row :gutter="24">
              <a-col :xs="24" :md="8">
                <a-form-item label="节点名称" required>
                  <a-input v-model="node.name" :max-length="100" placeholder="例如：部门负责人审批" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="10">
                <a-form-item label="审批人" required>
                  <a-select
                    v-model="node.approvers"
                    multiple
                    allow-search
                    :options="userOptions"
                    :loading="usersLoading"
                    placeholder="请选择一个或多个用户"
                    :max-tag-count="2"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="6">
                <a-form-item label="多人审批规则">
                  <a-radio-group v-model="node.approveMode" type="button">
                    <a-radio value="OR">任一通过</a-radio>
                    <a-radio value="AND">全部通过</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
            </a-row>
          </div>
          <a-empty v-if="!nodes.length" description="尚未添加审批节点" />
          <a-button type="dashed" long @click="addNode">
            <template #icon><icon-plus /></template>
            添加审批节点
          </a-button>
        </template>

        <template v-else-if="currentStep === 3">
          <FormSchemaEditor v-model="formConfig" />
          <a-alert type="info" class="snapshot-alert">
            修改定义只影响之后发起的申请；已发起的申请继续使用发起时的表单和流程快照。
          </a-alert>
        </template>

        <template v-else>
          <section class="preview-section">
            <h3>基本信息</h3>
            <a-descriptions :column="{ xs: 1, sm: 2 }" bordered>
              <a-descriptions-item label="定义编码">{{ form.code || '—' }}</a-descriptions-item>
              <a-descriptions-item label="定义名称">{{ form.name || '—' }}</a-descriptions-item>
              <a-descriptions-item label="分类">{{ form.category || '—' }}</a-descriptions-item>
              <a-descriptions-item label="状态">{{ form.status === 1 ? '启用' : '停用' }}</a-descriptions-item>
              <a-descriptions-item label="描述" :span="2">{{ form.description || '—' }}</a-descriptions-item>
            </a-descriptions>
          </section>
          <section class="preview-section">
            <h3>审批节点</h3>
            <a-empty v-if="!nodes.length" description="尚未添加审批节点" />
            <div v-for="(node, index) in nodes" :key="node.id" class="preview-item">
              <div class="preview-item__title">
                <strong>{{ index + 1 }}. {{ node.name }}</strong>
                <a-tag>{{ node.approveMode === 'AND' ? '全部通过' : '任一通过' }}</a-tag>
              </div>
              <div class="preview-item__content">
                审批人：{{ node.approvers.map(userLabel).join('、') || '未选择' }}
              </div>
            </div>
          </section>
          <section class="preview-section">
            <h3>申请字段</h3>
            <a-empty v-if="!formConfig.fields.length" description="尚未添加申请字段" />
            <div v-for="field in formConfig.fields" :key="field.id" class="preview-item">
              <div class="preview-item__title">
                <strong>{{ field.label }}</strong>
                <a-tag>{{ fieldTypeLabel(field.type) }}</a-tag>
                <a-tag>{{ field.required ? '必填' : '选填' }}</a-tag>
              </div>
              <div class="preview-item__content">编码：{{ field.key }}</div>
              <div v-if="field.placeholder" class="preview-item__content">提示：{{ field.placeholder }}</div>
              <div v-if="field.validation?.minLength !== undefined || field.validation?.maxLength !== undefined" class="preview-item__content">
                长度：{{ field.validation.minLength ?? '不限' }} 至 {{ field.validation.maxLength ?? '不限' }}
              </div>
              <div v-if="field.validation?.min !== undefined || field.validation?.max !== undefined" class="preview-item__content">
                数值范围：{{ field.validation.min ?? '不限' }} 至 {{ field.validation.max ?? '不限' }}
              </div>
              <div v-if="field.options?.length" class="preview-item__content">
                选项：{{ field.options.map(option => `${option.label}（${option.value}）`).join('、') }}
              </div>
            </div>
          </section>
        </template>
      </a-form>
    </a-spin>
    <template #footer>
      <a-space>
        <a-button :disabled="saving" @click="closeDrawer">取消</a-button>
        <a-button v-if="currentStep > 1" :disabled="saving || loading" @click="previousStep">上一步</a-button>
        <a-button v-if="currentStep < 4" type="primary" :disabled="saving || loading || !!loadError" @click="nextStep">
          下一步
        </a-button>
        <a-button v-else type="primary" :loading="saving" :disabled="loading || !!loadError" @click="save">
          保存
        </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import FormSchemaEditor from './FormSchemaEditor.vue'
import { createDefaultFormConfig, formFieldTypes, parseFlowConfig, parseFormConfig, serializeFlowConfig, serializeFormConfig } from './schema'
import type { ApprovalDefinitionReq, ApprovalFlowNode, ApprovalFormConfig, ApprovalFormFieldType } from '@/apis/approval'
import { addApprovalDefinition, getApprovalDefinition, updateApprovalDefinition } from '@/apis/approval'
import { listAllUser } from '@/apis/system'

const emit = defineEmits<{
  'save-success': []
}>()

const { width } = useWindowSize()
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const usersLoading = ref(false)
const currentStep = ref(1)
const currentId = ref<string>()
const loadError = ref('')
const formRef = ref<FormInstance>()
const form = reactive<ApprovalDefinitionReq>({
  code: '',
  name: '',
  category: '',
  description: '',
  status: 1,
  flowConfig: '',
  formConfig: '',
})
const nodes = ref<ApprovalFlowNode[]>([])
const formConfig = ref<ApprovalFormConfig>(createDefaultFormConfig())
const userOptions = ref<Array<{ label: string, value: string }>>([])

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function reset() {
  formRef.value?.resetFields()
  currentStep.value = 1
  currentId.value = undefined
  loadError.value = ''
  form.code = ''
  form.name = ''
  form.category = ''
  form.description = ''
  form.status = 1
  form.flowConfig = ''
  form.formConfig = ''
  nodes.value = []
  formConfig.value = createDefaultFormConfig()
}

async function loadUsers() {
  if (userOptions.value.length) return
  usersLoading.value = true
  try {
    const { data } = await listAllUser({ status: 1 })
    userOptions.value = data.map((user) => ({
      label: user.nickname?.trim() || user.username,
      value: String(user.id),
    }))
  } catch {
    Message.error('审批人列表加载失败')
  } finally {
    usersLoading.value = false
  }
}

async function onAdd() {
  reset()
  visible.value = true
  await loadUsers()
}

async function onUpdate(id: string) {
  reset()
  currentId.value = id
  visible.value = true
  loading.value = true
  await loadUsers()
  try {
    const { data } = await getApprovalDefinition(id)
    form.code = data.code
    form.name = data.name
    form.category = data.category ?? ''
    form.description = data.description ?? ''
    form.status = data.status
    nodes.value = parseFlowConfig(data.flowConfig)
    formConfig.value = parseFormConfig(data.formConfig)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '审批定义加载失败'
  } finally {
    loading.value = false
  }
}

function validateBasicInfo() {
  if (!/^[A-Z]\w{0,49}$/i.test(form.code.trim())) {
    throw new Error('定义编码须以英文字母开头，且最多 50 个字符')
  }
  if (!form.name.trim() || form.name.length > 100) {
    throw new Error('定义名称不能为空且最多 100 个字符')
  }
  if ((form.category?.length ?? 0) > 50) throw new Error('分类不能超过 50 个字符')
  if ((form.description?.length ?? 0) > 500) throw new Error('描述不能超过 500 个字符')
}

function nextStep() {
  try {
    if (currentStep.value === 1) validateBasicInfo()
    if (currentStep.value === 2) serializeFlowConfig(nodes.value)
    if (currentStep.value === 3) serializeFormConfig(formConfig.value)
    currentStep.value = Math.min(currentStep.value + 1, 4)
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '请检查当前步骤的填写内容')
  }
}

function previousStep() {
  currentStep.value = Math.max(currentStep.value - 1, 1)
}

function closeDrawer() {
  visible.value = false
}

function userLabel(id: string) {
  return userOptions.value.find((user) => user.value === id)?.label ?? id
}

function fieldTypeLabel(type: ApprovalFormFieldType) {
  return formFieldTypes.find((item) => item.value === type)?.label ?? type
}

function addNode() {
  nodes.value.push({
    id: newId('node'),
    name: `审批节点 ${nodes.value.length + 1}`,
    type: 'APPROVAL',
    approverType: 'USER',
    approvers: [],
    approveMode: 'OR',
  })
}

function moveNode(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= nodes.value.length) return
  const reordered = [...nodes.value]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  nodes.value = reordered
}

function removeNode(index: number) {
  nodes.value = nodes.value.filter((_, nodeIndex) => nodeIndex !== index)
}

async function save() {
  if (loadError.value) return false
  try {
    validateBasicInfo()
    const request: ApprovalDefinitionReq = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category?.trim() || undefined,
      description: form.description?.trim() || undefined,
      status: form.status,
      flowConfig: serializeFlowConfig(nodes.value),
      formConfig: serializeFormConfig(formConfig.value),
    }
    saving.value = true
    if (currentId.value) await updateApprovalDefinition(currentId.value, request)
    else await addApprovalDefinition(request)
    Message.success(currentId.value ? '修改成功' : '新增成功')
    emit('save-success')
    visible.value = false
    return true
  } catch (error) {
    if (error instanceof Error) Message.error(error.message)
    return false
  } finally {
    saving.value = false
  }
}

defineExpose({ onAdd, onUpdate })
</script>

<style scoped lang="scss">
.approval-drawer-content {
  display: block;
  width: 100%;
  min-width: 0;
  margin-inline: auto;
}

.approval-definition-content {
  max-width: 880px;
}

.drawer-alert,
.snapshot-alert {
  margin-bottom: 16px;
}

.definition-steps {
  margin-bottom: 24px;
}

.preview-section + .preview-section {
  margin-top: 24px;
}

.preview-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.preview-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-2);
}

.preview-item__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-item__content {
  margin-top: 6px;
  color: var(--color-text-2);
}

.flow-node {
  padding: 12px 0 0;
  border-bottom: 1px solid var(--color-border-2);
}

.flow-node__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
</style>
