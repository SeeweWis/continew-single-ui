<template>
  <GiPageLayout>
    <a-tabs :active-key="activeTab" class="task-tabs" @change="switchTab">
      <a-tab-pane key="pending" title="待处理" />
      <a-tab-pane key="processed" title="已处理" />
    </a-tabs>
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%', minWidth: 950 }"
      :pagination="pagination"
      :disabled-tools="['size']"
      @refresh="search"
    >
      <template #toolbar-left>
        <a-input-search v-model="queryForm.title" placeholder="搜索申请标题" allow-clear @search="search" />
        <a-select
          v-model="queryForm.status"
          :options="statusOptions"
          placeholder="任务状态"
          allow-clear
          style="width: 140px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          重置
        </a-button>
      </template>
      <template #status="{ record }">
        <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
      </template>
      <template #action="{ record }">
        <a-space :size="8">
          <a-link v-permission="['approval:instance:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-button
            v-if="activeTab === 'pending' && record.status === 'PENDING'"
            v-permission="['approval:task:approve', 'approval:task:reject']"
            type="text"
            size="mini"
            title="处理"
            @click="onProcess(record)"
          >
            处理
          </a-button>
        </a-space>
      </template>
    </GiTable>
    <DetailDrawer ref="detailDrawerRef" @action-success="search" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import DetailDrawer from '../modules/DetailDrawer.vue'
import type { ApprovalStatus, ApprovalTaskQuery, ApprovalTaskResp } from '@/apis/approval'
import { listApprovalTasks } from '@/apis/approval'
import { useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'ApprovalTask' })

const activeTab = ref('pending')
const queryForm = reactive<Pick<ApprovalTaskQuery, 'title' | 'status'>>({})
const statusOptions = computed(() => {
  if (activeTab.value === 'pending') return [{ label: '待处理', value: 'PENDING' }]
  return [
    { label: '已通过', value: 'APPROVED' },
    { label: '已拒绝', value: 'REJECTED' },
    { label: '已撤销', value: 'CANCELLED' },
  ]
})
const {
  tableData: dataList,
  loading,
  pagination,
  search,
} = useTable((page) => listApprovalTasks({
  ...queryForm,
  ...page,
  completed: activeTab.value === 'processed',
}), { immediate: true })
const columns: TableInstance['columns'] = [
  { title: '申请标题', dataIndex: 'title', minWidth: 180, ellipsis: true, tooltip: true },
  { title: '审批节点', dataIndex: 'nodeName', width: 150, ellipsis: true, tooltip: true },
  { title: '申请人', dataIndex: 'startUserName', width: 120, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '处理时间', dataIndex: 'completeTime', width: 180 },
  {
    title: '操作',
    slotName: 'action',
    width: 140,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPerm('approval:instance:get'),
  },
]

const detailDrawerRef = ref<InstanceType<typeof DetailDrawer>>()

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

function reset() {
  queryForm.title = undefined
  queryForm.status = undefined
  search()
}

function switchTab(value: string | number) {
  activeTab.value = String(value)
  queryForm.status = undefined
  search()
}

function onDetail(record: ApprovalTaskResp) {
  detailDrawerRef.value?.open(record.instanceId, undefined, false, false)
}

function onProcess(record: ApprovalTaskResp) {
  if (activeTab.value !== 'pending' || record.status !== 'PENDING') return
  detailDrawerRef.value?.open(record.instanceId, record.id, true)
}
</script>

<style scoped lang="scss">
.task-tabs {
  margin-bottom: 8px;
}
</style>
