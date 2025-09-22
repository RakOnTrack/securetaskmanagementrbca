import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskStatus, UpdateTaskRequest } from '../../services/task.service';

@Component({
  selector: 'app-simple-task-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
      <!-- To Do Column -->
      <div class="bg-gray-50 rounded-lg p-4 flex flex-col min-h-96">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="text-sm font-medium text-gray-900">📋 To Do</h3>
          <span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
            {{ todoTasks.length }}
          </span>
        </div>
        
        <div
          class="min-h-32 drop-zone"
          (dragover)="allowDrop($event)"
          (drop)="onDrop($event, 'todo')"
          [class.drag-over]="isDragOver && dropTarget === 'todo'"
        >
          <div
            *ngFor="let task of todoTasks"
            [draggable]="canEdit"
            (dragstart)="onDragStart($event, task)"
            (dragend)="onDragEnd($event)"
            class="task-card bg-white p-3 rounded-md shadow-sm mb-3 transition-all"
            [class.cursor-move]="canEdit"
            [class.hover:shadow-md]="canEdit"
            [class.dragging]="draggedTaskId === task.id"
          >
            <div class="flex items-start justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-900 flex-1">{{ task.title }}</h4>
              <div class="flex items-center space-x-1 ml-2">
                <span class="text-lg">{{ getCategoryIcon(task.category) }}</span>
                <span 
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  [class]="getPriorityColor(task.priority)"
                >
                  {{ getPriorityLabel(task.priority) }}
                </span>
              </div>
            </div>
            
            <p *ngIf="task.description" class="text-xs text-gray-500 mb-2 line-clamp-2">
              {{ task.description }}
            </p>
            
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span *ngIf="task.assignee">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
              <span *ngIf="task.dueDate" [class]="task.isOverdue ? 'text-red-500 font-medium' : ''">
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
            
            <div class="mt-2 flex items-center justify-between">
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {{ task.organization.name }}
              </span>
              <div class="flex space-x-1" *ngIf="canEdit || canDelete">
                <button
                  *ngIf="canEdit"
                  (click)="editTask.emit(task)"
                  class="text-xs text-gray-500 hover:text-gray-700 p-1"
                  title="Edit task"
                >
                  ✏️
                </button>
                <button
                  *ngIf="canDelete"
                  (click)="deleteTask.emit(task.id)"
                  class="text-xs text-red-500 hover:text-red-700 p-1"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="todoTasks.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Drop tasks here for "To Do"
          </div>
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="bg-blue-50 rounded-lg p-4 flex flex-col min-h-96">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="text-sm font-medium text-gray-900">🔵 In Progress</h3>
          <span class="bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full">
            {{ inProgressTasks.length }}
          </span>
        </div>
        
        <div
          class="min-h-32 drop-zone"
          (dragover)="allowDrop($event)"
          (drop)="onDrop($event, 'in_progress')"
          [class.drag-over]="isDragOver && dropTarget === 'in_progress'"
        >
          <div
            *ngFor="let task of inProgressTasks"
            [draggable]="canEdit"
            (dragstart)="onDragStart($event, task)"
            (dragend)="onDragEnd($event)"
            class="task-card bg-white p-3 rounded-md shadow-sm mb-3 transition-all border-l-4 border-blue-400"
            [class.cursor-move]="canEdit"
            [class.hover:shadow-md]="canEdit"
            [class.dragging]="draggedTaskId === task.id"
          >
            <div class="flex items-start justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-900 flex-1">{{ task.title }}</h4>
              <div class="flex items-center space-x-1 ml-2">
                <span class="text-lg">{{ getCategoryIcon(task.category) }}</span>
                <span 
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  [class]="getPriorityColor(task.priority)"
                >
                  {{ getPriorityLabel(task.priority) }}
                </span>
              </div>
            </div>
            
            <p *ngIf="task.description" class="text-xs text-gray-500 mb-2 line-clamp-2">
              {{ task.description }}
            </p>
            
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span *ngIf="task.assignee">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
              <span *ngIf="task.dueDate" [class]="task.isOverdue ? 'text-red-500 font-medium' : ''">
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
            
            <div class="mt-2 flex items-center justify-between">
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {{ task.organization.name }}
              </span>
              <div class="flex space-x-1" *ngIf="canEdit || canDelete">
                <button
                  *ngIf="canEdit"
                  (click)="editTask.emit(task)"
                  class="text-xs text-gray-500 hover:text-gray-700 p-1"
                  title="Edit task"
                >
                  ✏️
                </button>
                <button
                  *ngIf="canDelete"
                  (click)="deleteTask.emit(task.id)"
                  class="text-xs text-red-500 hover:text-red-700 p-1"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="inProgressTasks.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Drop tasks here for "In Progress"
          </div>
        </div>
      </div>

      <!-- Done Column -->
      <div class="bg-green-50 rounded-lg p-4 flex flex-col min-h-96">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="text-sm font-medium text-gray-900">✅ Done</h3>
          <span class="bg-green-200 text-green-700 text-xs px-2 py-1 rounded-full">
            {{ doneTasks.length }}
          </span>
        </div>
        
        <div
          class="min-h-32 drop-zone"
          (dragover)="allowDrop($event)"
          (drop)="onDrop($event, 'done')"
          [class.drag-over]="isDragOver && dropTarget === 'done'"
        >
          <div
            *ngFor="let task of doneTasks"
            [draggable]="canEdit"
            (dragstart)="onDragStart($event, task)"
            (dragend)="onDragEnd($event)"
            class="task-card bg-white p-3 rounded-md shadow-sm mb-3 transition-all border-l-4 border-green-400 opacity-75"
            [class.cursor-move]="canEdit"
            [class.hover:shadow-md]="canEdit"
            [class.dragging]="draggedTaskId === task.id"
          >
            <div class="flex items-start justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-900 flex-1 line-through">{{ task.title }}</h4>
              <div class="flex items-center space-x-1 ml-2">
                <span class="text-lg">{{ getCategoryIcon(task.category) }}</span>
                <span class="text-green-600 text-sm">✅</span>
              </div>
            </div>
            
            <p *ngIf="task.description" class="text-xs text-gray-500 mb-2 line-clamp-2">
              {{ task.description }}
            </p>
            
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span *ngIf="task.assignee">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
              <span *ngIf="task.completedAt">
                Completed: {{ formatDate(task.completedAt) }}
              </span>
            </div>
            
            <div class="mt-2 flex items-center justify-between">
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {{ task.organization.name }}
              </span>
              <div class="flex space-x-1" *ngIf="canEdit || canDelete">
                <button
                  *ngIf="canEdit"
                  (click)="editTask.emit(task)"
                  class="text-xs text-gray-500 hover:text-gray-700 p-1"
                  title="Edit task"
                >
                  ✏️
                </button>
                <button
                  *ngIf="canDelete"
                  (click)="deleteTask.emit(task.id)"
                  class="text-xs text-red-500 hover:text-red-700 p-1"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="doneTasks.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Drop tasks here for "Done"
          </div>
        </div>
      </div>

      <!-- Cancelled Column -->
      <div class="bg-red-50 rounded-lg p-4 flex flex-col min-h-96">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="text-sm font-medium text-gray-900">❌ Cancelled</h3>
          <span class="bg-red-200 text-red-700 text-xs px-2 py-1 rounded-full">
            {{ cancelledTasks.length }}
          </span>
        </div>
        
        <div
          class="min-h-32 drop-zone"
          (dragover)="allowDrop($event)"
          (drop)="onDrop($event, 'cancelled')"
          [class.drag-over]="isDragOver && dropTarget === 'cancelled'"
        >
          <div
            *ngFor="let task of cancelledTasks"
            [draggable]="canEdit"
            (dragstart)="onDragStart($event, task)"
            (dragend)="onDragEnd($event)"
            class="task-card bg-white p-3 rounded-md shadow-sm mb-3 transition-all border-l-4 border-red-400 opacity-75"
            [class.cursor-move]="canEdit"
            [class.hover:shadow-md]="canEdit"
            [class.dragging]="draggedTaskId === task.id"
          >
            <div class="flex items-start justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-900 flex-1 line-through">{{ task.title }}</h4>
              <div class="flex items-center space-x-1 ml-2">
                <span class="text-lg">{{ getCategoryIcon(task.category) }}</span>
                <span class="text-red-600 text-sm">❌</span>
              </div>
            </div>
            
            <p *ngIf="task.description" class="text-xs text-gray-500 mb-2 line-clamp-2">
              {{ task.description }}
            </p>
            
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span *ngIf="task.assignee">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
              <span *ngIf="task.dueDate">
                Due: {{ formatDate(task.dueDate) }}
              </span>
            </div>
            
            <div class="mt-2 flex items-center justify-between">
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {{ task.organization.name }}
              </span>
              <div class="flex space-x-1" *ngIf="canEdit || canDelete">
                <button
                  *ngIf="canEdit"
                  (click)="editTask.emit(task)"
                  class="text-xs text-gray-500 hover:text-gray-700 p-1"
                  title="Edit task"
                >
                  ✏️
                </button>
                <button
                  *ngIf="canDelete"
                  (click)="deleteTask.emit(task.id)"
                  class="text-xs text-red-500 hover:text-red-700 p-1"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="cancelledTasks.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Drop tasks here for "Cancelled"
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-card {
      transition: all 0.2s ease;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .task-card.dragging {
      opacity: 0.5;
      transform: rotate(3deg) scale(0.95);
    }

    .drop-zone {
      transition: all 0.2s ease;
      border: 2px dashed transparent;
      padding: 8px;
      border-radius: 8px;
      min-height: 400px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .drop-zone.drag-over {
      background-color: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class SimpleTaskBoardComponent implements OnChanges {
  @Input() tasks: Task[] = [];
  @Input() canEdit = false;
  @Input() canDelete = false;
  
  @Output() taskUpdated = new EventEmitter<{ id: string, updates: UpdateTaskRequest }>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();

  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  doneTasks: Task[] = [];
  cancelledTasks: Task[] = [];

  draggedTaskId: string | null = null;
  isDragOver = false;
  dropTarget: string | null = null;

  ngOnChanges() {
    this.organizeTasks();
  }

  private organizeTasks() {
    this.todoTasks = this.tasks.filter(task => task.status === TaskStatus.TODO);
    this.inProgressTasks = this.tasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
    this.doneTasks = this.tasks.filter(task => task.status === TaskStatus.DONE);
    this.cancelledTasks = this.tasks.filter(task => task.status === TaskStatus.CANCELLED);
  }

  onDragStart(event: DragEvent, task: Task) {
    this.draggedTaskId = task.id;
    event.dataTransfer!.setData('text/plain', task.id);
    event.dataTransfer!.effectAllowed = 'move';
    
    console.log(`Started dragging: ${task.title} (${task.status})`);
  }

  onDragEnd(event: DragEvent) {
    this.draggedTaskId = null;
    this.isDragOver = false;
    this.dropTarget = null;
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
    
    // Determine which drop zone this is
    const dropZone = event.currentTarget as HTMLElement;
    const statusAttr = dropZone.getAttribute('data-status') || 
                      dropZone.closest('[data-status]')?.getAttribute('data-status');
    
    if (statusAttr) {
      this.dropTarget = statusAttr;
    }
  }

  onDrop(event: DragEvent, newStatusString: string) {
    event.preventDefault();
    this.isDragOver = false;
    this.dropTarget = null;

    const taskId = event.dataTransfer!.getData('text/plain');
    if (!taskId) return;

    // Convert string to TaskStatus enum
    const statusMap: { [key: string]: TaskStatus } = {
      'todo': TaskStatus.TODO,
      'in_progress': TaskStatus.IN_PROGRESS,
      'done': TaskStatus.DONE,
      'cancelled': TaskStatus.CANCELLED
    };

    const newStatus = statusMap[newStatusString];
    if (!newStatus) {
      console.error('Invalid status:', newStatusString);
      return;
    }

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // Calculate drop position within the column
    const dropZone = event.currentTarget as HTMLElement;
    const mouseY = event.clientY;
    const taskCards = Array.from(dropZone.querySelectorAll('.task-card:not(.dragging)'));
    
    let insertIndex = taskCards.length; // Default to end
    
    for (let i = 0; i < taskCards.length; i++) {
      const cardRect = taskCards[i].getBoundingClientRect();
      if (mouseY < cardRect.top + cardRect.height / 2) {
        insertIndex = i;
        break;
      }
    }

    console.log(`Dropping task "${task.title}" to ${newStatus} at position ${insertIndex}`);

    // Update the task status and reorder
    const oldStatus = task.status;
    task.status = newStatus;
    
    // Get the target column tasks
    const targetTasks = this.getTasksByStatus(newStatus);
    
    // If it's a different status, we need to reorder all tasks in that column
    if (oldStatus !== newStatus) {
      // Remove from old column
      const oldTasks = this.getTasksByStatus(oldStatus);
      const oldIndex = oldTasks.findIndex(t => t.id === taskId);
      if (oldIndex !== -1) {
        oldTasks.splice(oldIndex, 1);
        // Update order for remaining tasks in old column
        oldTasks.forEach((t, index) => t.order = index);
      }
      
      // Insert into new column at the calculated position
      targetTasks.splice(insertIndex, 0, task);
    } else {
      // Same column reordering
      const currentIndex = targetTasks.findIndex(t => t.id === taskId);
      if (currentIndex !== -1 && currentIndex !== insertIndex) {
        // Remove from current position
        targetTasks.splice(currentIndex, 1);
        // Insert at new position
        const adjustedIndex = insertIndex > currentIndex ? insertIndex - 1 : insertIndex;
        targetTasks.splice(adjustedIndex, 0, task);
      }
    }
    
    // Update order for all tasks in the target column
    targetTasks.forEach((t, index) => t.order = index);
    
    // Reorganize UI immediately
    this.organizeTasks();
    
    // Emit update to parent for backend save
    this.taskUpdated.emit({
      id: taskId,
      updates: { 
        status: newStatus,
        order: task.order
      }
    });
    
    // If we moved tasks around, we might need to update other task orders too
    if (oldStatus !== newStatus || insertIndex !== targetTasks.findIndex(t => t.id === taskId)) {
      this.reorderColumn(newStatus);
      if (oldStatus !== newStatus) {
        this.reorderColumn(oldStatus);
      }
    }

    this.draggedTaskId = null;
  }

  private getTasksByStatus(status: TaskStatus): Task[] {
    switch (status) {
      case TaskStatus.TODO: return this.todoTasks;
      case TaskStatus.IN_PROGRESS: return this.inProgressTasks;
      case TaskStatus.DONE: return this.doneTasks;
      case TaskStatus.CANCELLED: return this.cancelledTasks;
      default: return [];
    }
  }

  private reorderColumn(status: TaskStatus) {
    const tasks = this.getTasksByStatus(status);
    const taskIds = tasks.map(t => t.id);
    
    // Emit reorder event for this column
    if (taskIds.length > 0) {
      // For now, we'll just emit individual updates
      // In a more sophisticated implementation, you'd batch these
      tasks.forEach((task, index) => {
        if (task.order !== index) {
          this.taskUpdated.emit({
            id: task.id,
            updates: { order: index }
          });
        }
      });
    }
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      work: '💼',
      personal: '👤',
      project: '📋',
      meeting: '🤝',
      other: '📝'
    };
    return icons[category] || '📝';
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      low: 'Low',
      medium: 'Med',
      high: 'High',
      critical: 'Critical'
    };
    return labels[priority] || priority;
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  }
}
