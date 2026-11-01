export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type ApprovalMode = 'AND' | 'OR'
export type ApprovalFormFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'AMOUNT' | 'DATE' | 'DATERANGE' | 'SELECT' | 'RADIO'

export interface ApprovalFormOption {
  label: string
  value: string
}

export interface ApprovalFormValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
}

export interface ApprovalFormField {
  id: string
  key: string
  label: string
  type: ApprovalFormFieldType
  required: boolean
  placeholder?: string
  defaultValue?: unknown
  validation?: ApprovalFormValidation
  options?: ApprovalFormOption[]
}

export interface ApprovalFormConfig {
  version: 1
  fields: ApprovalFormField[]
}

export interface ApprovalFlowNode {
  id: string
  name: string
  type: 'APPROVAL'
  approverType: 'USER'
  approvers: string[]
  approveMode: ApprovalMode
}

export interface ApprovalDefinitionResp {
  id: string
  code: string
  name: string
  category?: string
  description?: string
  status: 0 | 1
  createTime: string
}

export interface ApprovalDefinitionDetailResp extends ApprovalDefinitionResp {
  flowConfig: string
  formConfig?: string
}

export interface ApprovalDefinitionReq {
  code: string
  name: string
  category?: string
  description?: string
  status: 0 | 1
  flowConfig: string
  formConfig?: string
}

export interface ApprovalDefinitionQuery {
  name?: string
  category?: string
  status?: 0 | 1
}

export interface ApprovalDefinitionPageQuery extends ApprovalDefinitionQuery, PageQuery {}

export interface ApprovalInstanceResp {
  id: string
  definitionCode: string
  businessKey: string
  startUser: string
  currentNodeId?: string
  endTime?: string
  title: string
  businessType: string
  currentNodeName?: string
  status: ApprovalStatus
  startUserName: string
  startTime: string
}

export interface ApprovalInstanceQuery extends PageQuery {
  title?: string
  businessType?: string
  status?: ApprovalStatus
}

export interface ApprovalStartReq {
  definitionCode: string
  businessKey: string
  businessType: string
  title: string
  formData: string
}

export interface ApprovalCancelReq {
  reason?: string
}

export interface ApprovalTaskResp {
  id: string
  assignee: string
  startUser: string
  instanceId: string
  title: string
  nodeName: string
  status: ApprovalStatus
  startUserName: string
  createTime: string
  completeTime?: string
}

export interface ApprovalTaskQuery extends PageQuery {
  title?: string
  status?: ApprovalStatus
  completed: boolean
}

export interface ApprovalOpinionReq {
  opinion?: string
}

export interface ApprovalInstanceDetail {
  id: string
  definitionCode: string
  businessKey: string
  businessType: string
  title: string
  currentNodeId?: string
  status: ApprovalStatus
  result?: string
  formData?: string
  formConfig?: string
  startUser: string
  startTime: string
  endTime?: string
}

export interface ApprovalTaskDetail {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  assignee: string
  status: ApprovalStatus
  opinion?: string
  completeTime?: string
  createTime: string
}

export interface ApprovalHistoryResp {
  id: string
  instanceId: string
  taskId?: string
  nodeId?: string
  nodeName?: string
  operator: string
  action: 'START' | 'APPROVE' | 'REJECT' | 'CANCEL'
  opinion?: string
  createTime: string
}

export interface ApprovalDetailResp {
  instance: ApprovalInstanceDetail
  tasks: ApprovalTaskDetail[]
  history: ApprovalHistoryResp[]
  userNames: Record<string, string>
}
