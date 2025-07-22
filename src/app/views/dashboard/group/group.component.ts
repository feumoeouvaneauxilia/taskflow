import { Component, OnInit } from '@angular/core';
import { 
  AlignDirective, 
  CardBodyComponent, 
  CardComponent, 
  CardHeaderComponent, 
  ColComponent, 
  RowComponent, 
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
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IconDirective } from '@coreui/icons-angular';
import { cilPeople, cilUser, cilPlus, cilTrash, cilPencil, cilSearch, cilAlignLeft, cilGroup, cilCalendar, cilSettings } from '@coreui/icons';
import { GroupService, Group, CreateGroupDto, UpdateGroupDto, AddMembersDto } from '../../../services/group/group.service';
import { UserService } from '../../../services/user/user.service';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [
    AlignDirective,
    CardBodyComponent,
    CardComponent,
    CardHeaderComponent,
    ColComponent,
    RowComponent,
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
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GroupComponent implements OnInit {
  groups: Group[] = [];
  filteredGroups: Group[] = [];
  paginatedGroups: Group[] = [];
  userNames: { [id: string]: string } = {};
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 25, 50];
  icons = { cilPeople, cilUser, cilPlus, cilTrash, cilPencil, cilSearch, cilAlignLeft , cilCalendar, cilGroup, cilSettings};
  
  showCreateModal = false;
  showEditModal = false;
  showAddMembersModal = false;
  
  createGroupForm: FormGroup;
  editGroupForm: FormGroup;
  addMembersForm: FormGroup;
  
  isCreating = false;
  isUpdating = false;
  isAddingMembers = false;
  errorMessage = '';
  currentGroupId = '';
  availableUsers: any[] = [];
  selectedGroup: Group | null = null;

  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      managerId: ['', Validators.required]
    });

    this.editGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      managerId: ['', Validators.required]
    });

    this.addMembersForm = this.fb.group({
      memberIds: [[]]
    });
  }

  ngOnInit(): void {
    this.loadGroups();
    this.loadAvailableUsers();
  }

  loadGroups(): void {
    this.isLoading = true;
    this.groupService.getAllGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loadUserNames();
        this.applyFiltersAndPagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.isLoading = false;
      }
    });
  }

  loadUserNames(): void {
    const userIds = new Set<string>();
    this.groups.forEach(group => {
      userIds.add(group.managerId);
      group.memberIds?.forEach(id => userIds.add(id));
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
      next: (users) => {
        this.availableUsers = users;
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

  applyFiltersAndPagination(): void {
    this.filteredGroups = this.groups.filter(group => {
      if (!this.searchTerm) return true;
      const searchFields = [
        group.name?.toLowerCase() || '',
        group.description?.toLowerCase() || '',
        this.userNames[group.managerId]?.toLowerCase() || '',
        group.memberIds?.map(id => this.userNames[id]?.toLowerCase() || '').join(' ') || ''
      ];
      return searchFields.some(field => field.includes(this.searchTerm));
    });

    this.totalItems = this.filteredGroups.length;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedGroups = this.filteredGroups.slice(startIndex, startIndex + this.itemsPerPage);
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.createGroupForm.reset({
      name: '',
      description: '',
      managerId: ''
    });
    this.errorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  openEditModal(group: Group): void {
    this.selectedGroup = group;
    this.showEditModal = true;
    this.editGroupForm.patchValue({
      name: group.name,
      description: group.description,
      managerId: group.managerId
    });
    this.errorMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  openAddMembersModal(group: Group): void {
    this.currentGroupId = group.id;
    this.showAddMembersModal = true;
    this.addMembersForm.patchValue({
      memberIds: []
    });
    this.errorMessage = '';
  }

  closeAddMembersModal(): void {
    this.showAddMembersModal = false;
  }

  onMembersSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions, option => option.value);
    this.addMembersForm.patchValue({ memberIds: selectedOptions });
  }

  createGroup(): void {
    if (this.createGroupForm.invalid) {
      this.markFormGroupTouched(this.createGroupForm);
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';
    const formValue = this.createGroupForm.value;

    const createGroupDto: CreateGroupDto = {
      name: formValue.name,
      description: formValue.description,
      managerId: formValue.managerId
    };

    this.groupService.createGroup(createGroupDto).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadGroups();
      },
      error: (error) => {
        console.error('Error creating group:', error);
        this.errorMessage = error.message || 'Failed to create group. Please try again.';
        this.isCreating = false;
      },
      complete: () => {
        this.isCreating = false;
      }
    });
  }

  updateGroup(): void {
    if (!this.selectedGroup || this.editGroupForm.invalid) {
      this.markFormGroupTouched(this.editGroupForm);
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';
    const formValue = this.editGroupForm.value;

    const updateGroupDto: UpdateGroupDto = {
      name: formValue.name,
      description: formValue.description,
      managerId: formValue.managerId
    };

    this.groupService.updateGroup(this.selectedGroup.id, updateGroupDto).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadGroups();
      },
      error: (error) => {
        console.error('Error updating group:', error);
        this.errorMessage = error.message || 'Failed to update group. Please try again.';
        this.isUpdating = false;
      },
      complete: () => {
        this.isUpdating = false;
      }
    });
  }

  addMembers(): void {
    if (!this.currentGroupId || this.addMembersForm.invalid) {
      this.markFormGroupTouched(this.addMembersForm);
      return;
    }

    this.isAddingMembers = true;
    this.errorMessage = '';
    const formValue = this.addMembersForm.value;

    const addMembersDto: AddMembersDto = {
      memberIds: formValue.memberIds
    };

    this.groupService.addGroupMembers(this.currentGroupId, addMembersDto).subscribe({
      next: () => {
        this.closeAddMembersModal();
        this.loadGroups();
      },
      error: (error) => {
        console.error('Error adding members:', error);
        this.errorMessage = error.message || 'Failed to add members. Please try again.';
        this.isAddingMembers = false;
      },
      complete: () => {
        this.isAddingMembers = false;
      }
    });
  }

  removeMember(groupId: string, userId: string): void {
    if (confirm('Are you sure you want to remove this member?')) {
      this.groupService.removeGroupMember(groupId, userId).subscribe({
        next: () => {
          this.loadGroups();
        },
        error: (error) => {
          console.error('Error removing member:', error);
          this.errorMessage = error.message || 'Failed to remove member. Please try again.';
        }
      });
    }
  }

  deleteGroup(id: string): void {
    if (confirm('Are you sure you want to delete this group?')) {
      this.groupService.deleteGroup(id).subscribe({
        next: () => {
          this.loadGroups();
        },
        error: (error) => {
          console.error('Error deleting group:', error);
          this.errorMessage = error.message || 'Failed to delete group. Please try again.';
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getMemberNames(memberIds: string[]): string {
    return memberIds?.map(id => this.userNames[id] || id).join(', ') || 'No members';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
    } catch (e) {
      console.warn('Date formatting error:', e);
      return dateString;
    }
  }
}