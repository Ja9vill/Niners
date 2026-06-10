import React, { useState } from 'react';
import { Host, Task } from '../types';
import { ListTodo, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { SingleDatePicker } from './InteractiveDatePicker';
import { TasksService } from '../lib/TasksService';

interface TasksDeskProps {
  hosts: Host[];
  tasks: Task[];
  auditLogAction: (actionType: string, beforeValue: any, afterValue: any) => Promise<void>;
  onTasksUpdated: (action: 'create' | 'update' | 'delete', task: Task) => void;
}

export const TasksDesk: React.FC<TasksDeskProps> = ({
  hosts,
  tasks,
  auditLogAction,
  onTasksUpdated
}) => {
  const [taskDueDate, setTaskDueDate] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assigneeId = String(formData.get('assignedTo') || 'support_staff');
    const relatedPoppoId = String(formData.get('relatedPoppo') || '');
    const taskType = String(formData.get('type') || 'Coaching');
    const title = String(formData.get('title') || 'Coaching Task');
    const description = String(formData.get('description') || '');
    const dueDate = taskDueDate;

    if (!dueDate) {
      showError("Due date is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTask = await TasksService.createTask(
        assigneeId,
        relatedPoppoId,
        taskType,
        title,
        description,
        dueDate,
        auditLogAction
      );
      showSuccess('Task delegated successfully.');
      e.currentTarget.reset();
      setTaskDueDate('');
      onTasksUpdated('create', newTask);
    } catch (err: any) {
      showError(err.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      const updatedTask = await TasksService.completeTask(task, auditLogAction);
      showSuccess('Task marked as completed.');
      onTasksUpdated('update', updatedTask);
    } catch (err: any) {
      showError(err.message || "Failed to complete task");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm("Hard delete this task assignment?")) return;
    try {
      await TasksService.deleteTask(task, auditLogAction);
      showSuccess('Task removed.');
      onTasksUpdated('delete', task);
    } catch (err: any) {
      showError(err.message || "Failed to delete task");
    }
  };

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-bold text-center">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
            <ListTodo size={20} className="text-indigo-400" />
            Tasks Coordination Desk
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Delegate instruction tasks to agency staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Task Form */}
        <div className="tech-card h-fit space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/5 pb-2">Delegate New Task</h4>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="task-assignee" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Assignee Role</label>
              <select id="task-assignee" name="assignedTo" className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8]" title="Select assignee role">
                <option value="support_staff" className="bg-[#1A1A28] text-[#F0EFE8]">Support Staff (Assistant)</option>
                <option value="Manager" className="bg-[#1A1A28] text-[#F0EFE8]">Manager</option>
                <option value="Admin" className="bg-[#1A1A28] text-[#F0EFE8]">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-related-poppo" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Related Talent</label>
              <select id="task-related-poppo" name="relatedPoppo" className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8]" title="Select related talent">
                <option value="" className="bg-[#1A1A28] text-[#F0EFE8]">-- No Related Host --</option>
                {hosts.map(h => (
                  <option key={h.id} value={h.id} className="bg-[#1A1A28] text-[#F0EFE8]">{h.nickname || h.name} ({h.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-type" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Type</label>
              <input id="task-type" name="type" type="text" placeholder="e.g. Coaching" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter task type" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-title" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Title</label>
              <input id="task-title" name="title" type="text" placeholder="Complete Profile Info" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter task title" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-description" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Description</label>
              <textarea id="task-description" name="description" placeholder="Specify missing fields or guidelines..." className="w-full glass-input text-xs text-[#F0EFE8] h-20 resize-none" required title="Enter task description" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-due-date" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Due Date</label>
              <SingleDatePicker
                id="task-due-date"
                name="dueDate"
                value={taskDueDate}
                onChange={(val) => setTaskDueDate(val)}
                required
                title="Select task due date"
              />
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#0D0D14] transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50">
              {isSubmitting ? 'Delegating...' : 'Delegate Task'}
            </button>
          </form>
        </div>

        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/40">Active Assignments</h4>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl text-[#A09E9A]/30 italic text-xs">
                No delegated tasks found.
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.taskId} className="tech-card !p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.01]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                        task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      )}>
                        {task.status}
                      </span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">{task.taskType}</span>
                    </div>
                    <h5 className="font-black text-[#F0EFE8] text-sm">{task.title}</h5>
                    <p className="text-xs text-[#A09E9A]/60 leading-relaxed font-medium">{task.description}</p>
                    <div className="text-[9px] text-[#A09E9A]/40 font-bold flex gap-4 pt-1">
                      <span>Assignee: {task.assignedToUserId}</span>
                      <span>Related Poppo ID: {task.relatedPoppoId}</span>
                      <span>Due: {task.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {task.status !== 'Completed' && (
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#0D0D14] rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-[#0D0D14] rounded-lg transition-all cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
