import type * as T from './type'
import http from '@/utils/http'

export type * from './type'

const DEFINITION_URL = '/approval/definition'
const INSTANCE_URL = '/approval/instance'
const TASK_URL = '/approval/task'

export function pageApprovalDefinitions(query: T.ApprovalDefinitionPageQuery) {
  return http.get<PageRes<T.ApprovalDefinitionResp[]>>(DEFINITION_URL, query)
}

export function listApprovalDefinitions(query: T.ApprovalDefinitionQuery) {
  return http.get<T.ApprovalDefinitionResp[]>(`${DEFINITION_URL}/list`, query)
}

export function getApprovalDefinition(id: string) {
  return http.get<T.ApprovalDefinitionDetailResp>(`${DEFINITION_URL}/${id}`)
}

export function addApprovalDefinition(data: T.ApprovalDefinitionReq) {
  return http.post(`${DEFINITION_URL}`, data)
}

export function updateApprovalDefinition(id: string, data: T.ApprovalDefinitionReq) {
  return http.put(`${DEFINITION_URL}/${id}`, data)
}

export function deleteApprovalDefinition(id: string) {
  return http.del(DEFINITION_URL, { ids: [id] })
}

export function listApprovalInstances(query: T.ApprovalInstanceQuery) {
  return http.get<PageRes<T.ApprovalInstanceResp[]>>(INSTANCE_URL, query)
}

export function getApprovalInstance(id: string) {
  return http.get<T.ApprovalDetailResp>(`${INSTANCE_URL}/${id}`)
}

export function startApproval(data: T.ApprovalStartReq) {
  return http.post<string>(`${INSTANCE_URL}/start`, data)
}

export function cancelApproval(id: string, data: T.ApprovalCancelReq) {
  return http.post(`${INSTANCE_URL}/cancel/${id}`, data)
}

export function listApprovalTasks(query: T.ApprovalTaskQuery) {
  return http.get<PageRes<T.ApprovalTaskResp[]>>(TASK_URL, query)
}

export function approveApprovalTask(id: string, data: T.ApprovalOpinionReq) {
  return http.post(`${TASK_URL}/approve/${id}`, data)
}

export function rejectApprovalTask(id: string, data: T.ApprovalOpinionReq) {
  return http.post(`${TASK_URL}/reject/${id}`, data)
}
