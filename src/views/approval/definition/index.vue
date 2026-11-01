<template>
  <GiPageLayout>
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
        <a-input-search v-model="queryForm.name" placeholder="搜索定义名称" allow-clear @search="search" />
        <a-input-search v-model="queryForm.category" placeholder="筛选分类" allow-clear @search="search" />
        <a-select
          v-model="queryForm.status"
          :options="statusOptions"
          placeholder="定义状态"
          allow-clear
          style="width: 130px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          重置
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['approval:definition:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          新增定义
        </a-button>
      </template>
      <template #status="{ record }">
        <a-tag :color="record.status === 1 ? 'green' : 'gray'">{{ record.status === 1 ? '启用' : '停用' }}</a-tag>
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['approval:definition:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-popconfirm content="确定删除此审批定义吗？" type="warning" @ok="onDelete(record)">
            <a-link v-permission="['approval:definition:delete']" status="danger" title="删除">删除</a-link>
          </a-popconfirm>
        </a-space>
      </template>
    </GiTable>
    <DefinitionEditModal ref="editorRef" @save-success="search" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import DefinitionEditModal from '../modules/DefinitionEditModal.vue'
import type { ApprovalDefinitionPageQuery, ApprovalDefinitionResp } from '@/apis/approval'
import { deleteApprovalDefinition, pageApprovalDefinitions } from '@/apis/approval'
import { useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'ApprovalDefinition' })

const queryForm = reactive<Pick<ApprovalDefinitionPageQuery, 'name' | 'category' | 'status'>>({})
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]
const {
  tableData: dataList,
  loading,
  pagination,
  search,
  handleDelete,
} = useTable((page) => pageApprovalDefinitions({ ...queryForm, ...page }), { immediate: true })
const columns: TableInstance['columns'] = [
  { title: '定义编码', dataIndex: 'code', width: 180, ellipsis: true, tooltip: true },
  { title: '定义名称', dataIndex: 'name', minWidth: 150, ellipsis: true, tooltip: true },
  { title: '分类', dataIndex: 'category', width: 130, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  {
    title: '操作',
    slotName: 'action',
    width: 130,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['approval:definition:update', 'approval:definition:delete']),
  },
]

const editorRef = ref<InstanceType<typeof DefinitionEditModal>>()

function reset() {
  queryForm.name = undefined
  queryForm.category = undefined
  queryForm.status = undefined
  search()
}

function onAdd() {
  editorRef.value?.onAdd()
}

function onUpdate(record: ApprovalDefinitionResp) {
  editorRef.value?.onUpdate(record.id)
}

function onDelete(record: ApprovalDefinitionResp) {
  return handleDelete(() => deleteApprovalDefinition(record.id), {
    content: `是否确定删除审批定义「${record.name}」？`,
    showModal: false,
  })
}
</script>

<style scoped lang="scss"></style>
