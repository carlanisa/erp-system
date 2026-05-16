import { api } from './api'

export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'

export interface Task {
  id: number
  project_id: number | null
  parent_task_id: number | null
  assigned_to: number | null
  assigned_by: number | null
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  source: 'manual' | 'ai_generated' | 'recurring'
  assignee?: { id: number; name: string }
  project?: { id: number; name: string }
  checklist?: { id: number; label: string; is_done: boolean }[]
}

export interface Project {
  id: number
  code: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: Priority
  start_date: string | null
  end_date: string | null
  owner?: { id: number; name: string }
  tasks_count?: number
  completed_tasks_count?: number
}

export const projectsApi = {
  list:   (params?: any) => api.get('/projects', { params }).then(r => r.data),
  get:    (id: number)   => api.get(`/projects/${id}`).then(r => r.data),
  create: (data: any)    => api.post('/projects', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data).then(r => r.data),
  remove: (id: number)   => api.delete(`/projects/${id}`).then(r => r.data),
}

export const tasksApi = {
  list:   (params?: any) => api.get('/tasks', { params }).then(r => r.data),
  myTasks: (employee_id: number, params?: any) =>
    api.get('/tasks/my', { params: { employee_id, ...(params || {}) } }).then(r => r.data),
  get:    (id: number)   => api.get(`/tasks/${id}`).then(r => r.data),
  create: (data: any)    => api.post('/tasks', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data).then(r => r.data),
  remove: (id: number)   => api.delete(`/tasks/${id}`).then(r => r.data),
  complete: (id: number) => api.post(`/tasks/${id}/complete`).then(r => r.data),
  approve:  (id: number, remarks?: string) => api.post(`/tasks/${id}/approve`, { remarks }).then(r => r.data),
  reject:   (id: number, remarks?: string) => api.post(`/tasks/${id}/reject`, { remarks }).then(r => r.data),
  addChecklist: (id: number, label: string) => api.post(`/tasks/${id}/checklist`, { label }).then(r => r.data),
  toggleChecklist: (id: number, itemId: number) => api.post(`/tasks/${id}/checklist/${itemId}/toggle`).then(r => r.data),
  comment: (id: number, body: string, employee_id?: number) =>
    api.post(`/tasks/${id}/comments`, { body, employee_id }).then(r => r.data),
  uploadAttachment: (id: number, file: File, caption?: string, uploaded_by?: number) => {
    const fd = new FormData()
    fd.append('file', file)
    if (caption) fd.append('caption', caption)
    if (uploaded_by) fd.append('uploaded_by', String(uploaded_by))
    return api.post(`/tasks/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

export const jdApi = {
  list: (params?: any) => api.get('/hrm/job-descriptions', { params }).then(r => r.data),
  get: (id: number) => api.get(`/hrm/job-descriptions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/hrm/job-descriptions', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/hrm/job-descriptions/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/hrm/job-descriptions/${id}`).then(r => r.data),
  generateTasks: (id: number) => api.post(`/hrm/job-descriptions/${id}/generate-tasks`).then(r => r.data),
  assign: (id: number, payload: any) => api.post(`/hrm/job-descriptions/${id}/assign`, payload).then(r => r.data),
}

export const aiChatApi = {
  listConversations: (employee_id: number) =>
    api.get('/ai-chat/conversations', { params: { employee_id } }).then(r => r.data),
  startConversation: (employee_id: number, task_id?: number) =>
    api.post('/ai-chat/conversations', { employee_id, task_id }).then(r => r.data),
  show: (id: number) => api.get(`/ai-chat/conversations/${id}`).then(r => r.data),
  send: (id: number, content: string) =>
    api.post(`/ai-chat/conversations/${id}/message`, { content }).then(r => r.data),
  setLanguage: (employee_id: number, language: string) =>
    api.post('/ai-chat/preferences/language', { employee_id, language }).then(r => r.data),
  employeeReport: (employee_id: number) => api.get(`/ai-chat/reports/employee/${employee_id}`).then(r => r.data),
  taskReport: (task_id: number) => api.get(`/ai-chat/reports/task/${task_id}`).then(r => r.data),
}

export const notificationsApi = {
  list: (employee_id: number, params?: any) =>
    api.get('/notifications', { params: { employee_id, ...(params || {}) } }).then(r => r.data),
  unreadCount: (employee_id: number) =>
    api.get('/notifications/unread-count', { params: { employee_id } }).then(r => r.data),
  markRead: (id: number) => api.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: (employee_id: number) =>
    api.post('/notifications/mark-all-read', { employee_id }).then(r => r.data),
  registerPush: (employee_id: number, push_token: string) =>
    api.post('/notifications/push-token', { employee_id, push_token }).then(r => r.data),
}

export const employeesApi = {
  list: (params?: any) => api.get('/hrm/employees', { params }).then(r => r.data),
}

export const designationsApi = {
  list: (params?: any) => api.get('/hrm/designations', { params }).then(r => r.data),
}
