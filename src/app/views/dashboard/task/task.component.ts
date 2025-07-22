import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { cilCalendar, cilUser, cilTask, cilCheckCircle, cilClock } from '@coreui/icons';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommonModule } from '@angular/common';

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
    CommonModule
  ],
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
  itemsPerPage = 10;
  totalItems = 0;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 25, 50];
  icons = { cilCalendar, cilUser, cilTask, cilCheckCircle, cilClock };
  showCreateModal = false;
  createTaskForm: FormGroup;
  isCreating = false;
  createErrorMessage = '';
  availableUsers: any[] = [];

  constructor(
    private taskService: TaskService, 
    private userService: UserService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.createTaskForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      startAt: [''],
      dueAt: [''],
      assignedUserIds: [[]]
    });
  }

  ngOnInit(): void {
    this.loadTasks();
    this.loadAvailableUsers();
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
        console.error('Error loading tasks:', error);
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
        console.error('Error loading users:', error);
      }
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
    this.showCreateModal = true;
    this.createTaskForm.reset({
      name: '',
      description: '',
      startAt: '',
      dueAt: '',
      assignedUserIds: []
    });
    this.createErrorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createErrorMessage = '';
  }

  onUserSelectionChange(event: any): void {
    const selectedOptions = Array.from(event.target.selectedOptions, (option: any) => option.value);
    this.createTaskForm.patchValue({ assignedUserIds: selectedOptions });
  }

  createTask(): void {
    if (this.createTaskForm.invalid) {
      this.markFormGroupTouched(this.createTaskForm);
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
      assignedUserIds: formValue.assignedUserIds || [],
      assignedGroupIds: [],
      createdById: userId,
      assignedById: userId
    };

    if (roles.includes('admin') || roles.includes('role_admin')) {
      taskData.isValidated = true;
    } else if (roles.length > 0) {
      taskData.isValidated = false;
    }

    this.taskService.createTask(taskData).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.createErrorMessage = error.message || 'Failed to create task. Please try again.';
        this.isCreating = false;
      },
      complete: () => {
        this.isCreating = false;
      }
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
}
