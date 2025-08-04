import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { 
  AlignDirective, 
  BorderDirective,
  CardBodyComponent, 
  CardComponent, 
  CardHeaderComponent, 
  ColComponent, 
  RowComponent, 
  TableActiveDirective, 
  TableColorDirective, 
  TableDirective,
  SpinnerComponent,
  BadgeComponent,
  ModalComponent,
  ModalHeaderComponent,
  ModalBodyComponent,
  ModalFooterComponent,
  ModalTitleDirective,
  ButtonCloseDirective,
  ButtonDirective,
  FormDirective,
  FormLabelDirective,
  FormControlDirective,
  FormSelectDirective,
  FormTextDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { cilCalendar, cilUser, cilTask, cilCheckCircle, cilClock, cilPencil, cilPeople, cilX, cilMinus, cilShieldAlt, cilNoteAdd, cilSettings, cilAccountLogout, cilUserPlus, cilUserFollow, cilBadge } from '@coreui/icons';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { GroupService } from '../../../services/group/group.service';  // group service for assignment

interface ITaskData {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  startAt?: string;
  dueAt?: string;
  completedAt?: string;
  assignedUserIds?: string[];
  assignedById?: string;
  createdById?: string;
  isValidated?: boolean;
  adminComplete?: boolean;
}

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [
    AlignDirective,
    BorderDirective,
    CardBodyComponent,
    CardComponent,
    CardHeaderComponent,
    ColComponent,
    RowComponent,
    TableActiveDirective,
    TableColorDirective,
    TableDirective,
    SpinnerComponent,
    BadgeComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    ButtonCloseDirective,
    ButtonDirective,
    FormDirective,
    FormLabelDirective,
    FormControlDirective,
    FormSelectDirective,
    FormTextDirective,
    IconDirective,
    ReactiveFormsModule,
    CommonModule,
    ToastModule
  ],
  providers: [MessageService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit {
  tasks: any[] = [];
  taskData: ITaskData[] = [];
  filteredTasks: ITaskData[] = [];
  paginatedTasks: ITaskData[] = [];
  userNames: { [id: string]: string } = {};
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 5;
  totalItems = 0;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 25, 50];
  icons = { 
    cilCalendar, 
    cilUser, 
    cilTask, 
    cilCheckCircle, 
    cilClock, 
    cilPencil, 
    cilPeople, 
    cilX, 
    cilMinus, 
    cilShieldAlt, 
    cilNoteAdd, 
    cilSettings, 
    cilAccountLogout, 
    cilUserPlus,
    cilUserFollow,
    cilBadge
  };
  showCreateModal = false;
  createTaskForm: FormGroup;
  isCreating = false;
  isEditing = false;
  isUpdatingAssignments = false;
  createErrorMessage = '';
  availableUsers: any[] = [];
  availableGroups: any[] = [];  // list of groups for assignment
  showViewModal = false;        // control view details modal
  selectedTask: ITaskData | null = null;
  selectedUsers: string[] = [];
  selectedGroups: string[] = [];
  originalSelectedUsers: string[] = []; // Track original assignments
  originalSelectedGroups: string[] = []; // Track original assignments
  newUsersToAssign: string[] = []; // Track newly selected users
  newGroupsToAssign: string[] = []; // Track newly selected groups

  // New modal control flags
  showEditModal = false;
  showUserModal = false;
  showGroupModal = false;

  constructor(
    private taskService: TaskService, 
    private userService: UserService,
    private groupService: GroupService,  // inject group service
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.createTaskForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      startAt: ['', [this.dateNotPastValidator]],
      dueAt: ['', [this.dateNotPastValidator]]
    }, { validators: [this.dueDateAfterStartDateValidator] });
  }

  // Custom validators
  dateNotPastValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    inputDate.setHours(0, 0, 0, 0);
    
    if (inputDate < today) {
      return { dateNotPast: { message: 'Date cannot be in the past' } };
    }
    
    return null;
  }

  dueDateAfterStartDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const startAt = control.get('startAt');
    const dueAt = control.get('dueAt');
    
    if (!startAt?.value || !dueAt?.value) return null;
    
    const startDate = new Date(startAt.value);
    const dueDate = new Date(dueAt.value);
    
    if (dueDate < startDate) {
      return { dueDateAfterStartDate: { message: 'Due date cannot be before start date' } };
    }
    
    return null;
  };

  ngOnInit(): void {
    this.loadTasks();
    this.loadAvailableUsers();
    this.loadAvailableGroups();  // load groups
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getTasks().subscribe({
      next: (data: any) => {
        this.tasks = Array.isArray(data) ? data : (data?.tasks || []);
        this.taskData = this.tasks.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
          startAt: task.startAt,
          dueAt: task.dueAt,
          completedAt: task.completedAt,
          assignedUserIds: task.assignedUserIds,
          assignedById: task.assignedById,
          createdById: task.createdById,
          isValidated: task.isValidated,
          adminComplete: task.adminComplete
        }));
        this.loadUserNames();
        this.applyFiltersAndPagination();
        this.isLoading = false;
      },
      error: (error) => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load tasks.'});
        this.isLoading = false;
      }
    });
  }

  loadUserNames(): void {
    const userIds = new Set<string>();
    this.tasks.forEach(task => {
      if (task.assignedById) userIds.add(task.assignedById);
      if (task.createdById) userIds.add(task.createdById);
    });
    userIds.forEach(id => {
      if (id && !this.userNames[id]) {
        this.userService.getUserById(id).subscribe(user => {
          this.userNames[id] = user?.username || id;
        });
      }
    });
  }

  loadAvailableUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data: any) => {
        this.availableUsers = Array.isArray(data) ? data : (data?.users || []);
      },
      error: (error) => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load users.'});
      }
    });
  }

  loadAvailableGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: (groups) => this.availableGroups = Array.isArray(groups) ? groups : [],
      error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load groups.'})
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFiltersAndPagination();
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedTask = null;
    this.showCreateModal = true;
    this.createTaskForm.reset({
      name: '',
      description: '',
      startAt: '',
      dueAt: ''
    });
    this.createErrorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.isEditing = false;
    this.selectedTask = null;
    this.createErrorMessage = '';
  }

  /** Open detail view modal and prepare assignment selections */
  viewTask(task: ITaskData): void {
    this.selectedTask = task;
    this.selectedUsers = [...(task.assignedUserIds || [])];
    this.selectedGroups = []; // assume task.assignedGroupIds not stored; user can select
    this.showViewModal = true;
  }

  /** Handle change in assigned users from view modal */
  onViewUserChange(event: any): void {
    const ids = Array.from(event.target.selectedOptions, (o: any) => o.value);
    if (!this.selectedTask) return;
    this.taskService.assignMultipleUsers(this.selectedTask.id!, ids).subscribe({
      next: () => {
        this.selectedUsers = ids;
        this.loadTasks();
      },
      error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update users.'})
    });
  }

  /** Handle change in assigned group from view modal */
  onGroupSelectionChange(event: any): void {
    const newGroups = Array.from(event.target.selectedOptions, (o: any) => o.value);
    if (!this.selectedTask) return;
    // detect added or removed
    const added = newGroups.filter(g => !this.selectedGroups.includes(g));
    const removed = this.selectedGroups.filter(g => !newGroups.includes(g));
    added.forEach(groupId => {
      this.taskService.assignGroup(this.selectedTask!.id!, groupId).subscribe();
    });
    removed.forEach(groupId => {
      this.taskService.unassignGroup(this.selectedTask!.id!, groupId).subscribe();
    });
    this.selectedGroups = newGroups;
    this.loadTasks();
  }

  createTask(): void {
    if (this.createTaskForm.invalid) {
      this.markFormGroupTouched(this.createTaskForm);
      return;
    }

    if (this.isEditing && this.selectedTask) {
      this.updateTask();
      return;
    }

    this.isCreating = true;
    this.createErrorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id;
    const roles = currentUser?.roles?.map((r: string) => r.toLowerCase()) || [];

    const formValue = this.createTaskForm.value;
    const taskData: any = {
      name: formValue.name,
      description: formValue.description,
      startAt: formValue.startAt || null,
      dueAt: formValue.dueAt || null,
      assignedUserIds: [],
      assignedGroupIds: [],
      createdById: userId,
      assignedById: userId
    };

    if (roles.includes('ROLE_ADMIN') || roles.includes('role_admin')) {
      taskData.isValidated = true;
    } else if (roles.length > 0) {
      taskData.isValidated = false;
    }

    this.taskService.createTask(taskData).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadTasks();
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Task created successfully.'});
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.createErrorMessage = error.message || 'Failed to create task. Please try again.';
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to create task.'});
        this.isCreating = false;
      },
      complete: () => {
        this.isCreating = false;
      }
    });
  }

  updateTask(): void {
    if (!this.selectedTask) return;
    
    this.isCreating = true;
    this.createErrorMessage = '';

    const formValue = this.createTaskForm.value;
    const taskData: any = {
      name: formValue.name,
      description: formValue.description,
      startAt: formValue.startAt || null,
      dueAt: formValue.dueAt || null
    };

    this.taskService.updateTask(this.selectedTask.id!, taskData).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadTasks();
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Task updated successfully.'});
      },
      error: (error) => {
        console.error('Error updating task:', error);
        this.createErrorMessage = error.message || 'Failed to update task. Please try again.';
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update task.'});
        this.isCreating = false;
      },
      complete: () => {
        this.isCreating = false;
      }
    });
  }

  /** Edit an existing task */
  editTask(task: ITaskData): void {
    this.isEditing = true;
    this.selectedTask = task;
    this.showCreateModal = true;
    
    // Format dates for datetime-local input
    const startAt = task.startAt ? new Date(task.startAt).toISOString().slice(0, 16) : '';
    const dueAt = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '';
    
    this.createTaskForm.patchValue({
      name: task.name,
      description: task.description,
      startAt: startAt,
      dueAt: dueAt
    });
    this.createErrorMessage = '';
  }

  /** Open assignment modal for users */
  openUserAssign(task: ITaskData): void {
    this.viewTask(task);
  }

  /** Open assignment modal for groups */
  openGroupAssign(task: ITaskData): void {
    this.viewTask(task);
  }

  // New modal control methods
  openViewModal(task: ITaskData): void {
    this.selectedTask = task;
    this.showViewModal = true;
  }
  openEditModal(task: ITaskData): void {
    this.selectedTask = task;
    this.showEditModal = true;
  }
  closeEditModal(): void { this.showEditModal = false; }
  openUserModal(task: ITaskData): void {
    this.selectedTask = task;
    this.selectedUsers = [...(task.assignedUserIds || [])];
    this.originalSelectedUsers = [...(task.assignedUserIds || [])];
    this.showUserModal = true;
  }
  closeUserModal(): void { 
    this.showUserModal = false; 
    this.selectedUsers = [];
    this.originalSelectedUsers = [];
    this.newUsersToAssign = [];
  }
  openGroupModal(task: ITaskData): void {
    this.selectedTask = task;
    this.selectedGroups = [];
    this.originalSelectedGroups = [];
    this.newGroupsToAssign = [];
    this.showGroupModal = true;
  }
  closeGroupModal(): void { 
    this.showGroupModal = false; 
    this.selectedGroups = [];
    this.originalSelectedGroups = [];
    this.newGroupsToAssign = [];
  }

  // Handle user assignment changes in dedicated modal
  onUserAssignmentChange(event: any): void {
    this.selectedUsers = Array.from(event.target.selectedOptions, (option: any) => option.value);
  }

  // Handle group assignment changes in dedicated modal
  onGroupAssignmentChange(event: any): void {
    this.selectedGroups = Array.from(event.target.selectedOptions, (option: any) => option.value);
  }

  // Update user assignments with proper API calls
  updateUserAssignments(): void {
    if (!this.selectedTask) return;
    
    this.isUpdatingAssignments = true;
    
    // Find users to add and remove
    const usersToAdd = this.selectedUsers.filter(id => !this.originalSelectedUsers.includes(id));
    const usersToRemove = this.originalSelectedUsers.filter(id => !this.selectedUsers.includes(id));
    
    // Chain API calls
    const updatePromises: Promise<any>[] = [];
    
    // Add new users
    usersToAdd.forEach(userId => {
      updatePromises.push(
        this.taskService.assignUser(this.selectedTask!.id!, userId).toPromise()
      );
    });
    
    // Remove users
    usersToRemove.forEach(userId => {
      updatePromises.push(
        this.taskService.unassignUser(this.selectedTask!.id!, userId).toPromise()
      );
    });
    
    Promise.all(updatePromises).then(() => {
      this.loadTasks();
      this.closeUserModal();
      this.messageService.add({
        severity: 'success', 
        summary: 'Success', 
        detail: 'User assignments updated successfully.'
      });
    }).catch((error) => {
      console.error('Error updating user assignments:', error);
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to update user assignments.'
      });
    }).finally(() => {
      this.isUpdatingAssignments = false;
    });
  }

  // Update group assignments with proper API calls
  updateGroupAssignments(): void {
    if (!this.selectedTask) return;
    
    this.isUpdatingAssignments = true;
    
    // Find groups to add and remove
    const groupsToAdd = this.selectedGroups.filter(id => !this.originalSelectedGroups.includes(id));
    const groupsToRemove = this.originalSelectedGroups.filter(id => !this.selectedGroups.includes(id));
    
    // Chain API calls
    const updatePromises: Promise<any>[] = [];
    
    // Add new groups
    groupsToAdd.forEach(groupId => {
      updatePromises.push(
        this.taskService.assignGroup(this.selectedTask!.id!, groupId).toPromise()
      );
    });
    
    // Remove groups
    groupsToRemove.forEach(groupId => {
      updatePromises.push(
        this.taskService.unassignGroup(this.selectedTask!.id!, groupId).toPromise()
      );
    });
    
    Promise.all(updatePromises).then(() => {
      this.loadTasks();
      this.closeGroupModal();
      this.messageService.add({
        severity: 'success', 
        summary: 'Success', 
        detail: 'Group assignments updated successfully.'
      });
    }).catch((error) => {
      console.error('Error updating group assignments:', error);
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to update group assignments.'
      });
    }).finally(() => {
      this.isUpdatingAssignments = false;
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  applyFiltersAndPagination(): void {
    this.filteredTasks = this.taskData.filter(task => {
      if (!this.searchTerm) return true;
      const searchFields = [
        task.name?.toLowerCase() || '',
        task.description?.toLowerCase() || '',
        task.status?.toLowerCase() || '',
        this.userNames[task.assignedById || '']?.toLowerCase() || '',
        this.userNames[task.createdById || '']?.toLowerCase() || '',
        task.isValidated ? 'validated yes' : 'not validated no',
        task.adminComplete ? 'complete yes' : 'incomplete no'
      ];
      return searchFields.some(field => field.includes(this.searchTerm));
    });
    this.totalItems = this.filteredTasks.length;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedTasks = this.filteredTasks.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getStatusBadgeColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'success';
      case 'in_progress':
      case 'in progress':
        return 'warning';
      case 'pending':
      case 'waiting':
        return 'info';
      case 'cancelled':
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString();
  }

  // Get assigned users for display in view modal
  getAssignedUsers(task: ITaskData): any[] {
    if (!task.assignedUserIds || task.assignedUserIds.length === 0) {
      return [];
    }
    return this.availableUsers.filter(user => 
      task.assignedUserIds!.includes(user.id)
    );
  }

  // Get assigned groups for display in view modal
  getAssignedGroups(task: ITaskData): any[] {
    // For now, return empty array since we don't have assignedGroupIds in the interface
    // This can be updated when the backend provides group assignment data
    return [];
  }

  // Get users not assigned to the task
  getUnassignedUsers(task: ITaskData): any[] {
    if (!task.assignedUserIds) {
      return this.availableUsers;
    }
    return this.availableUsers.filter(user => 
      !task.assignedUserIds!.includes(user.id)
    );
  }

  // Get groups not assigned to the task
  getUnassignedGroups(task: ITaskData): any[] {
    // For now, return all groups since we don't have assignedGroupIds
    return this.availableGroups;
  }

  // Handle new user selection for assignment
  onNewUserSelection(event: any): void {
    this.newUsersToAssign = Array.from(event.target.selectedOptions, (option: any) => option.value);
  }

  // Handle new group selection for assignment
  onNewGroupSelection(event: any): void {
    this.newGroupsToAssign = Array.from(event.target.selectedOptions, (option: any) => option.value);
  }

  // Check if new users are selected
  hasNewUsersSelected(): boolean {
    return this.newUsersToAssign.length > 0;
  }

  // Check if new groups are selected
  hasNewGroupsSelected(): boolean {
    return this.newGroupsToAssign.length > 0;
  }

  // Unassign a single user
  unassignUser(userId: string): void {
    if (!this.selectedTask) return;
    
    this.isUpdatingAssignments = true;
    
    this.taskService.unassignUser(this.selectedTask.id!, userId).subscribe({
      next: () => {
        // Refresh the selected task from server to get latest data
        this.refreshSelectedTask();
        
        // Update the main tasks list
        this.loadTasks();
        
        this.messageService.add({
          severity: 'success', 
          summary: 'Success', 
          detail: 'User unassigned successfully.'
        });
      },
      error: (error) => {
        console.error('Error unassigning user:', error);
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to unassign user.'
        });
      },
      complete: () => {
        this.isUpdatingAssignments = false;
      }
    });
  }

  // Refresh the selected task from server
  refreshSelectedTask(): void {
    if (!this.selectedTask?.id) return;
    
    this.taskService.getTaskById(this.selectedTask.id).subscribe({
      next: (updatedTask) => {
        this.selectedTask = {
          id: updatedTask.id,
          name: updatedTask.name,
          description: updatedTask.description,
          status: updatedTask.status,
          startAt: updatedTask.startAt,
          dueAt: updatedTask.dueAt,
          completedAt: updatedTask.completedAt,
          assignedUserIds: updatedTask.assignedUserIds,
          assignedById: updatedTask.assignedById,
          createdById: updatedTask.createdById,
          isValidated: updatedTask.isValidated,
          adminComplete: updatedTask.adminComplete
        };
      },
      error: (error) => {
        console.error('Error refreshing task:', error);
      }
    });
  }

  // Unassign a single group
  unassignGroup(groupId: string): void {
    if (!this.selectedTask) return;
    
    this.isUpdatingAssignments = true;
    
    this.taskService.unassignGroup(this.selectedTask.id!, groupId).subscribe({
      next: () => {
        this.loadTasks();
        this.messageService.add({
          severity: 'success', 
          summary: 'Success', 
          detail: 'Group unassigned successfully.'
        });
      },
      error: (error) => {
        console.error('Error unassigning group:', error);
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to unassign group.'
        });
      },
      complete: () => {
        this.isUpdatingAssignments = false;
      }
    });
  }

  // Assign selected users
  assignSelectedUsers(): void {
    if (!this.selectedTask || this.newUsersToAssign.length === 0) return;
    
    this.isUpdatingAssignments = true;
    
    const assignPromises = this.newUsersToAssign.map(userId =>
      this.taskService.assignUser(this.selectedTask!.id!, userId).toPromise()
    );
    
    Promise.all(assignPromises).then(() => {
      // Clear the selection
      this.newUsersToAssign = [];
      
      // Refresh task from server to get the updated assignedUserIds
      this.refreshSelectedTask();
      
      // Update the main tasks list
      this.loadTasks();
      
      this.messageService.add({
        severity: 'success', 
        summary: 'Success', 
        detail: 'Users assigned successfully.'
      });
    }).catch((error) => {
      console.error('Error assigning users:', error);
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to assign users.'
      });
    }).finally(() => {
      this.isUpdatingAssignments = false;
    });
  }

  // Assign selected groups
  assignSelectedGroups(): void {
    if (!this.selectedTask || this.newGroupsToAssign.length === 0) return;
    
    this.isUpdatingAssignments = true;
    
    const assignPromises = this.newGroupsToAssign.map(groupId =>
      this.taskService.assignGroup(this.selectedTask!.id!, groupId).toPromise()
    );
    
    Promise.all(assignPromises).then(() => {
      this.loadTasks();
      this.newGroupsToAssign = [];
      this.messageService.add({
        severity: 'success', 
        summary: 'Success', 
        detail: 'Groups assigned successfully.'
      });
    }).catch((error) => {
      console.error('Error assigning groups:', error);
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to assign groups.'
      });
    }).finally(() => {
      this.isUpdatingAssignments = false;
    });
  }

  // Check if current user has admin role
  isAdmin(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const roles = currentUser?.roles?.map((r: string) => r.toLowerCase()) || [];
    return roles.includes('ROLE_ADMIN'.toLowerCase()) || roles.includes('role_admin');
  }

  // Toggle task validation status (admin only)
  toggleValidation(task: ITaskData): void {
    if (!this.isAdmin() || !task.id) {
      this.messageService.add({
        severity: 'warn', 
        summary: 'Access Denied', 
        detail: 'Only administrators can change validation status.'
      });
      return;
    }

    const newValidationStatus = !task.isValidated;
    
    this.taskService.validateTask(task.id, newValidationStatus).subscribe({
      next: () => {
        task.isValidated = newValidationStatus;
        this.messageService.add({
          severity: 'success', 
          summary: 'Success', 
          detail: `Task ${newValidationStatus ? 'validated' : 'unvalidated'} successfully.`
        });
        this.loadTasks(); // Refresh to get updated data
        
        // Also refresh selected task if view modal is open
        if (this.showViewModal && this.selectedTask?.id === task.id) {
          this.refreshSelectedTask();
        }
      },
      error: (error) => {
        console.error('Error updating validation status:', error);
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update validation status.'
        });
      }
    });
  }

  // Toggle admin complete status (admin only)
  toggleAdminComplete(task: ITaskData): void {
    if (!this.isAdmin() || !task.id) {
      this.messageService.add({
        severity: 'warn', 
        summary: 'Access Denied', 
        detail: 'Only administrators can change admin complete status.'
      });
      return;
    }

    const newAdminCompleteStatus = !task.adminComplete;
    
    this.taskService.adminCompleteTask(task.id, newAdminCompleteStatus).subscribe({
      next: () => {
        task.adminComplete = newAdminCompleteStatus;
        this.messageService.add({
          severity: 'success', 
          summary: 'Success', 
          detail: `Task marked as ${newAdminCompleteStatus ? 'admin complete' : 'not admin complete'}.`
        });
        this.loadTasks(); // Refresh to get updated data
        
        // Also refresh selected task if view modal is open
        if (this.showViewModal && this.selectedTask?.id === task.id) {
          this.refreshSelectedTask();
        }
      },
      error: (error) => {
        console.error('Error updating admin complete status:', error);
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update admin complete status.'
        });
      }
    });
  }
}
