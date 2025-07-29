import { Component, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { 
  AlignDirective, 
  BorderDirective, 
  CardBodyComponent, 
  CardComponent, 
  CardHeaderComponent, 
  ColComponent, 
  RowComponent,
  TemplateIdDirective,
  TooltipDirective,
  BadgeComponent,
  TableDirective,
  FormCheckComponent,
  SpinnerComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { cilUser, cilEnvelopeOpen, cilBadge, cilToggleOn, cilToggleOff } from '@coreui/icons';
import { UserService } from '../../../services/user/user.service';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface IUserData {
  id?: string;
  username?: string;
  email?: string;
  roles?: string[];
  isActive?: boolean;
}

@Component({
  selector: 'app-user',
  standalone: true,
  providers: [MessageService],
  imports: [
    AlignDirective,
    BorderDirective,
    CardBodyComponent,
    CardComponent,
    CardHeaderComponent,
    ColComponent,
    RowComponent,
    TemplateIdDirective,
    NgTemplateOutlet,
    TooltipDirective,
    IconDirective,
    BadgeComponent,
    TableDirective,
    FormCheckComponent,
    SpinnerComponent,
    ToastModule, 
    CommonModule,
    
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UserComponent implements OnInit {
  users: any[] = [];
  userData: IUserData[] = [];
  filteredUsers: IUserData[] = [];
  paginatedUsers: IUserData[] = [];
  
  // Loading state
  isLoading = true;
  
  // Pagination and search properties
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 25, 50];
  
  icons = { cilUser, cilEnvelopeOpen, cilBadge, cilToggleOn, cilToggleOff };

  constructor(private userService: UserService , private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (data: any) => {
        this.users = Array.isArray(data) ? data : (data?.users || []);
        this.userData = this.users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          isActive: user.isActive
        }));
        this.applyFiltersAndPagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.currentPage = 1; // Reset to first page when searching
    this.applyFiltersAndPagination();
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = parseInt(event.target.value);
    this.currentPage = 1; // Reset to first page when changing items per page
    this.applyFiltersAndPagination();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFiltersAndPagination();
  }

  applyFiltersAndPagination(): void {
    // Apply search filter
    this.filteredUsers = this.userData.filter(user => {
      if (!this.searchTerm) return true;
      
      const searchFields = [
        user.username?.toLowerCase() || '',
        user.email?.toLowerCase() || '',
        user.roles?.join(' ').toLowerCase() || '',
        user.isActive ? 'active' : 'inactive'
      ];
      
      return searchFields.some(field => field.includes(this.searchTerm));
    });

    this.totalItems = this.filteredUsers.length;

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
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

  // 
  confirmationVisible = false;
confirmationMessage = '';

// toggleUserStatus(userId: string, isActive: boolean): void {
//   const action$ = isActive
//     ? this.userService.deactivateUser(userId)
//     : this.userService.reactivateUser(userId);

//   action$.subscribe({
//     next: () => {
//       this.confirmationMessage = isActive
//         ? 'The user has been Inactivated.'
//         : 'The user has been Reactivated.';
//       this.confirmationVisible = true;

//       this.loadUsers(); // Refresh user list
//       setTimeout(() => this.confirmationVisible = false, 2500); // Auto-hide modal
//     },
//     error: (error) => console.error('Status change failed:', error)
//   });
// }
toggleUserStatus(userId: string, isActive: boolean): void {
  const action$ = isActive
    ? this.userService.deactivateUser(userId)
    : this.userService.reactivateUser(userId);

  action$.subscribe({
    next: () => {
      const statusLabel = isActive ? 'Inactivated' : 'Reactivated';

      this.messageService.add({
        severity: isActive ? 'warn' : 'success',
        summary: 'User Updated',
        detail: `The user has been ${statusLabel}.`,
        life: 3000
      });

      this.loadUsers();
    },
    error: (error) => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Status change failed.',
        life: 3000
      });

      console.error('Status change failed:', error);
    }
  });
}

  getRoleBadgeColor(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'role_admin':
        return 'danger';
      case 'manager':
      case 'role_manager':
        return 'warning';
      case 'user':
      case 'role_user':
        return 'primary';
      default:
        return 'secondary';
    }
  }

  formatRoleName(role: string): string {
    return role.replace('ROLE_', '').toLowerCase().charAt(0).toUpperCase() + 
           role.replace('ROLE_', '').toLowerCase().slice(1);
  }
}