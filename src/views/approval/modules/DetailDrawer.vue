<template>
  <a-drawer
    v-model:visible="visible"
    title="审批详情"
    :width="width >= 860 ? 860 : '100%'"
    :body-style="{ padding: width >= 768 ? '24px 32px' : '20px 16px', minHeight: 0, overflowY: 'auto' }"
    :footer="false"
    unmount-on-close
    class="approval-detail-drawer"
    @close="reset"
  >
    <a-spin :loading="loading" class="approval-drawer-content approval-detail-content">
      <a-alert v-if="error" type="error" class="detail-alert">{{ error }}</a-alert>
      <template v-if="detail">
        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered>
          <a-descriptions-item label="申请标题">{{ detail.instance.title }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.instance.status)">{{ statusLabel(detail.instance.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="申请人">{{ userName(detail.instance.startUser) }}</a-descriptions-item>
          <a-descriptions-item label="审批定义">{{ detail.instance.definitionCode }}</a-descriptions-item>
          <a-descriptions-item label="业务类型">{{ detail.instance.businessType }}</a-descriptions-item>
          <a-descriptions-item label="业务单号">{{ detail.instance.businessKey }}</a-descriptions-item>
          <a-descriptions-item label="发起时间">{{ detail.instance.startTime }}</a-descriptions-item>
          <a-descriptions-item label="结束时间">{{ detail.instance.endTime || '—' }}</a-descriptions-item>
        </a-descriptions>

        <template v-if="snapshotConfig">
          <a-divider orientation="left">申请内容</a-divider>
          <a-alert type="info" class="snapshot-note">以下内容按申请发起时保存的表单快照展示。</a-alert>
          <a-form :model="snapshotData" layout="vertical" class="snapshot-form">
            <FormRenderer :config="snapshotConfig" :model-value="snapshotData" readonly />
          </a-form>
        </template>
        <a-empty v-else description="该申请没有可用的表单快照" />

        <a-divider orientation="left">审批节点</a-divider>
        <a-table
          row-key="id"
          :data="detail.tasks"
          :columns="taskColumns"
          :pagination="false"
          :scroll="{ x: '100%' }"
          size="small"
        >
          <template #assignee="{ record }">{{ userName(record.assignee) }}</template>
          <template #taskStatus="{ record }">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template #opinion="{ record }">{{ record.opinion || '—' }}</template>
        </a-table>

        <a-divider orientation="left">处理记录</a-divider>
        <a-empty v-if="!detail.history.length" description="暂无处理记录" />
        <div v-else class="approval-history">
          <div v-for="item in detail.history" :key="item.id" class="approval-history__item">
            <span class="approval-history__dot" />
            <div class="approval-history__body">
              <div class="approval-history__title">
                <strong>{{ userName(item.operator) }}</strong>
                <span>{{ actionLabel(item.action) }}</span>
                <span v-if="item.nodeName">· {{ item.nodeName }}</span>
                <time>{{ item.createTime }}</time>
              </div>
              <div v-if="item.opinion" class="approval-history__opinion">{{ item.opinion }}</div>
            </div>
          </div>
        </div>

        <a-divider v-if="canCancel || canProcess" />
        <div v-if="canCancel" class="detail-actions">
          <a-button v-permission="['approval:instance:cancel']" status="danger" @click="cancelVisible = true">撤销申请</a-button>
        </div>
        <div v-if="canProcess" class="task-action">
          <a-form :model="actionForm" layout="vertical">
            <a-form-item label="审批意见">
              <a-textarea v-model="actionForm.opinion" :max-length="500" :auto-size="{ minRows: 3, maxRows: 6 }" placeholder="填写处理意见（选填）" />
            </a-form-item>
          </a-form>
          <a-space>
            <a-button v-permission="['approval:task:approve']" type="primary" :loading="actionLoading" @click="handleTaskAction('approve')">通过</a-button>
            <a-button v-permission="['approval:task:reject']" status="danger" :loading="actionLoading" @click="handleTaskAction('reject')">拒绝</a-button>
          </a-space>
        </div>
      </template>
    </a-spin>
  </a-drawer>

  <a-drawer
    v-model:visible="cancelVisible"
    title="撤销申请"
    :width="width >= 480 ? 480 : '100%'"
    :body-style="{ padding: width >= 768 ? '20px 24px' : '16px', minHeight: 0, overflowY: 'auto' }"
    :mask-closable="false"
    :ok-loading="actionLoading"
    @before-ok="handleCancel"
  >
    <a-form :model="cancelForm" layout="vertical">
      <a-form-item label="撤销原因">
        <a-textarea v-model="cancelForm.reason" :max-length="500" :auto-size="{ minRows: 3, maxRows: 6 }" placeholder="填写撤销原因（选填）" />
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import FormRenderer from './FormRenderer.vue'
import { parseFormConfig, parseFormData } from './schema'
import type { ApprovalDetailResp, ApprovalHistoryResp, ApprovalStatus } from '@/apis/approval'
import { approveApprovalTask, cancelApproval, getApprovalInstance, rejectApprovalTask } from '@/apis/approval'

const emit = defineEmits<{
  'action-success': []
}>()

const { width } = useWindowSize()
const visible = ref(false)
const loading = ref(false)
const actionLoading = ref(false)
const cancelVisible = ref(false)
const error = ref('')
const detail = ref<ApprovalDetailResp>()
const snapshotConfig = ref<ReturnType<typeof parseFormConfig>>()
const snapshotData = ref<Record<string, unknown>>({})
const activeTaskId = ref<string>()
const activeTaskCanProcess = ref(false)
const activeCanCancel = ref(true)
const actionForm = reactive({ opinion: '' })
const cancelForm = reactive({ reason: '' })

const taskColumns: TableInstance['columns'] = [
  { title: '节点', dataIndex: 'nodeName', minWidth: 110 },
  { title: '审批人', dataIndex: 'assignee', slotName: 'assignee', minWidth: 120 },
  { title: '状态', dataIndex: 'status', slotName: 'taskStatus', width: 100 },
  { title: '处理意见', dataIndex: 'opinion', slotName: 'opinion', minWidth: 140 },
  { title: '开始时间', dataIndex: 'createTime', width: 180 },
  { title: '完成时间', dataIndex: 'completeTime', width: 180 },
]

const canCancel = computed(() => {
  const status = detail.value?.instance.status
  return activeCanCancel.value && !activeTaskId.value && status === 'PENDING'
})
const canProcess = computed(() => activeTaskCanProcess.value && !!activeTaskId.value)

function statusLabel(status: ApprovalStatus) {
  const labels: Record<ApprovalStatus, string> = {
    PENDING: '待处理',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已撤销',
  }
  return labels[status]
}

function statusColor(status: ApprovalStatus) {
  const colors: Record<ApprovalStatus, string> = {
    PENDING: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray',
  }
  return colors[status]
}

function userName(id: string) {
  return detail.value?.userNames[id] || id
}

function actionLabel(action: ApprovalHistoryResp['action']) {
  const labels: Record<ApprovalHistoryResp['action'], string> = {
    START: '发起申请',
    APPROVE: '通过审批',
    REJECT: '拒绝审批',
    CANCEL: '撤销申请',
  }
  return labels[action]
}

function reset() {
  detail.value = undefined
  snapshotConfig.value = undefined
  snapshotData.value = {}
  activeTaskId.value = undefined
  activeTaskCanProcess.value = false
  activeCanCancel.value = true
  actionForm.opinion = ''
  cancelForm.reason = ''
  error.value = ''
}

async function open(instanceId: string, taskId?: string, canProcessTask = false, canCancelRequest = true) {
  reset()
  activeTaskId.value = taskId
  activeTaskCanProcess.value = canProcessTask
  activeCanCancel.value = canCancelRequest
  visible.value = true
  loading.value = true
  try {
    const { data } = await getApprovalInstance(instanceId)
    detail.value = data
    if (data.instance.formConfig) {
      snapshotConfig.value = parseFormConfig(data.instance.formConfig)
      snapshotData.value = parseFormData(data.instance.formData)
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '审批详情加载失败'
  } finally {
    loading.value = false
  }
}

async function handleCancel() {
  if (!detail.value) return false
  try {
    actionLoading.value = true
    await cancelApproval(detail.value.instance.id, { reason: cancelForm.reason.trim() || undefined })
    Message.success('撤销成功')
    cancelVisible.value = false
    visible.value = false
    emit('action-success')
    return true
  } catch (caught) {
    if (caught instanceof Error) Message.error(caught.message)
    return false
  } finally {
    actionLoading.value = false
  }
}

async function handleTaskAction(action: 'approve' | 'reject') {
  if (!activeTaskId.value) return
  try {
    actionLoading.value = true
    const request = { opinion: actionForm.opinion.trim() || undefined }
    if (action === 'approve') await approveApprovalTask(activeTaskId.value, request)
    else await rejectApprovalTask(activeTaskId.value, request)
    Message.success(action === 'approve' ? '审批已通过' : '审批已拒绝')
    visible.value = false
    emit('action-success')
  } catch (caught) {
    if (caught instanceof Error) Message.error(caught.message)
  } finally {
    actionLoading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.approval-drawer-content {
  display: block;
  width: 100%;
  min-width: 0;
  margin-inline: auto;
}

.approval-detail-content {
  max-width: 920px;
}

.detail-alert,
.snapshot-note {
  margin-bottom: 16px;
}

.snapshot-form {
  max-width: 720px;
}

.approval-history {
  margin-left: 5px;
  border-left: 1px solid var(--color-border-2);
}

.approval-history__item {
  position: relative;
  padding: 0 0 18px 20px;
}

.approval-history__dot {
  position: absolute;
  top: 5px;
  left: -5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--primary-6);
}

.approval-history__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}

.approval-history__title time {
  margin-left: auto;
  color: var(--color-text-3);
  font-size: 12px;
}

.approval-history__opinion {
  margin-top: 6px;
  color: var(--color-text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
}

.task-action {
  padding: 16px 0;
  border-top: 1px solid var(--color-border-2);
}
</style>
