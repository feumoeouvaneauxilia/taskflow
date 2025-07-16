import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent),
    data: {
      title: $localize`Dashboard`
    },
    children: [
      {
        path: 'task',
        loadComponent: () => import('./task/task.component').then(m => m.TaskComponent),
        data: {
          title: 'Task'
        }
      },
      {
        path: 'user',
        loadComponent: () => import('./user/user.component').then(m => m.UserComponent),
      
        data: {
          title: 'User'
        }
      },
      {
        path: 'stat',
        loadComponent: () => import('./stat/stat.component').then(m => m.StatComponent),
        data: {
          title: 'Stat'
        }
      }
    ]
  }
];

