import { FirebaseService } from './firebaseService';
import { Task } from '../types';

export class TasksService {
  static getUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  static async createTask(
    assigneeId: string,
    relatedPoppoId: string,
    taskType: string,
    title: string,
    description: string,
    dueDate: string,
    auditLog: (actionType: string, before: any, after: any) => Promise<void>
  ): Promise<Task> {
    const newTask: Task = {
      taskId: this.getUUID(),
      assignedToUserId: assigneeId || 'support_staff',
      relatedPoppoId: relatedPoppoId || '',
      taskType: taskType || 'Coaching',
      title: title || 'Coaching Task',
      description: description || '',
      status: 'Assigned',
      dueDate: dueDate || ''
    };

    await FirebaseService.saveTasks([newTask]);
    if (auditLog) {
      await auditLog('CREATE_TASK', null, newTask);
    }

    return newTask;
  }

  static async completeTask(
    task: Task,
    auditLog: (actionType: string, before: any, after: any) => Promise<void>
  ): Promise<Task> {
    const original = { ...task };
    const updated: Task = { ...task, status: 'Completed' };
    
    await FirebaseService.saveTasks([updated]);
    if (auditLog) {
      await auditLog('UPDATE_TASK', original, updated);
    }

    return updated;
  }

  static async deleteTask(
    task: Task,
    auditLog: (actionType: string, before: any, after: any) => Promise<void>
  ): Promise<void> {
    await FirebaseService.deleteTask(task.taskId);
    if (auditLog) {
      await auditLog('DELETE_TASK', task, null);
    }
  }

  static async convertInsightToTask(
    insight: any,
    auditLog: (actionType: string, before: any, after: any) => Promise<void>
  ): Promise<Task> {
    const taskId = this.getUUID();
    const taskItem: Task = {
      taskId,
      assignedToUserId: 'support_staff',
      relatedPoppoId: insight.hostId,
      taskType: insight.ruleType === 'performance_drop' ? 'Coaching' : insight.ruleType === 'profile_gap' ? 'Complete Profile' : 'Tier Review',
      title: `AI Recommendation: ${insight.suggestedAction}`,
      description: `Targeting: ${insight.hostName} (${insight.hostId}). Rule details: ${insight.details}`,
      status: 'Assigned',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
    };

    await FirebaseService.saveTasks([taskItem]);
    if (auditLog) {
      await auditLog('CONVERT_RECOMMENDATION_TO_TASK', insight, taskItem);
    }

    return taskItem;
  }
}
