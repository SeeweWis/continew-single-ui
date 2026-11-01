<template>
  <GiPageLayout>
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%', minWidth: 1050 }"
      :pagination="pagination"
      :disabled-tools="['size']"
      @refresh="search"
    >
      <template #toolbar-left>
        <a-input-search v-model="queryForm.title" placeholder="搜索申请标题" allow-clear @search="search" />
        <a-input v-model="queryForm.businessType" placeholder="业务类型" allow-clear @press-enter="search" />
        <a-select
          v-model="queryForm.status"
          :options="statusOptions"
          placeholder="申请状态"
          allow-clear
          style="width: 140px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          重置
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['approval:instance:start']" type="primary" @click="onStart">
          <template #icon><icon-plus /></template>
          发起申请
        </a-button>
      </template>
      <template #status="{ record }">
        <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
      </template>
      <template #action="{ record }">
        <a-link v-permission="['approval:instance:get']" title="详情" @click="onDetail(record)">详情</a-link>
      </template>
    </GiTable>
    <StartApprovalModal ref="startModalRef" @save-success="search" />
    <DetailDrawer ref="detailDrawerRef" @action-success="search" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import DetailDrawer from '../modules/DetailDrawer.vue'
import StartApprovalModal from '../modules/StartApprovalModal.vue'
import type { ApprovalInstanceQuery, ApprovalInstanceResp, ApprovalStatus } from '@/apis/approval'
import { listApprovalInstances } from '@/apis/approval'
import { useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'ApprovalApplication' })

const queryForm = reactive<Pick<ApprovalInstanceQuery, 'title' | 'businessType' | 'status'>>({})
const statusOptions = [
  { label: '待处理', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已撤销', value: 'CANCELLED' },
]
const {
  tableData: dataList,
  loading,
  pagination,
  search,
} = useTable((page) => listApprovalInstances({ ...queryForm, ...page }), { immediate: true })
const columns: TableInstance['columns'] = [
  { title: '申请标题', dataIndex: 'title', minWidth: 180, ellipsis: true, tooltip: true },
  { title: '定义编码', dataIndex: 'definitionCode', width: 170, ellipsis: true, tooltip: true },
  { title: '业务类型', dataIndex: 'businessType', width: 140, ellipsis: true, tooltip: true },
  { title: '业务单号', dataIndex: 'businessKey', width: 150, ellipsis: true, tooltip: true },
  { title: '当前节点', dataIndex: 'currentNodeName', width: 140, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '发起时间', dataIndex: 'startTime', width: 180 },
  {
    title: '操作',
    slotName: 'action',
    width: 90,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPerm('approval:instance:get'),
  },
]

const startModalRef = ref<InstanceType<typeof StartApprovalModal>>()
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
  queryForm.businessType = undefined
  queryForm.status = undefined
  search()
}

function onStart() {
  startModalRef.value?.onOpen()
}

function onDetail(record: ApprovalInstanceResp) {
  detailDrawerRef.value?.open(record.id)
}
</script>

<style scoped lang="scss"></style>
