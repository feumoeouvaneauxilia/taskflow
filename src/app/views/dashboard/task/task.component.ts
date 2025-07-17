import { Component, OnInit } from '@angular/core';
import { AlignDirective, BorderDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableActiveDirective, TableColorDirective, TableDirective } from '@coreui/angular';
// import { DocsExampleComponent } from '@docs-components/public-api';
import { TaskService } from '../../../services/task/task.service';


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

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.taskService.getTasks().subscribe((data: any) => {
      this.tasks = Array.isArray(data) ? data : (data?.tasks || []);
    });
  }
}

