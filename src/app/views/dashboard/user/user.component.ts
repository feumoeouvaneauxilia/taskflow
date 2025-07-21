import { Component, OnInit } from '@angular/core';
import { AlignDirective, BorderDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableActiveDirective, TableColorDirective, TableDirective } from '@coreui/angular';
import { UserService } from '../../../services/user/user.service';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-user',
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
    CommonModule
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // For custom web components
})
export class UserComponent implements OnInit {
  users: any[] = [];
  selectedUser: any = null;
  rightsForm: any = {};
  showRightsModal = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe((data: any) => {
      this.users = Array.isArray(data) ? data : (data?.users || []);
    });
  }

  toggleUserStatus(userId: string, currentStatus: boolean): void {
    this.userService.updateUserStatus(userId, !currentStatus).subscribe(
      () => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
          user.isActive = !currentStatus;
        }
      },
      (error) => console.error('Error updating user status:', error)
    );
  }

  openRightsModal(user: any): void {
    this.selectedUser = user;
    this.rightsForm = { ...user.rights || {} };
    this.showRightsModal = true;
  }

  // saveUserRights(): void {
  //   if (!this.selectedUser) return;
    
  //   this.userService.updateUserRights(this.selectedUser.id, this.rightsForm).subscribe(
  //     () => {
  //       const user = this.users.find(u => u.id === this.selectedUser.id);
  //       if (user) {
  //         user.rights = { ...this.rightsForm };
  //       }
  //       this.showRightsModal = false;
  //     },
  //     (error) => console.error('Error updating user rights:', error)
  //   );
  // }

  // closeRightsModal(): void {
  //   this.showRightsModal = false;
  // }
}