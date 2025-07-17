import { Component, OnInit } from '@angular/core';
import { AlignDirective, BorderDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableActiveDirective, TableColorDirective, TableDirective } from '@coreui/angular';
// import { DocsExampleComponent } from '@docs-components/public-api';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';


import { CommonModule } from '@angular/common';

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
    CommonModule
  ],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {
  tasks: any[] = [];
  userNames: { [id: string]: string } = {};

  constructor(private taskService: TaskService, private userService: UserService) {}

  ngOnInit(): void {
    this.taskService.getTasks().subscribe((data: any) => {
      this.tasks = Array.isArray(data) ? data : (data?.tasks || []);
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
    });
  }
}

