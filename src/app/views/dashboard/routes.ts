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
      },
      {
        path: 'dash',
        loadComponent: () => import('./dash/dash.component').then(m => m.DashComponent),
        data: {
          title: 'dash'
        }
      },
      {
        path: 'logout',
        loadComponent: () => import('./logout/logout.component').then(m => m.LogoutComponent),
        data: {
          title: 'Logout'
        }
      }
    ]
  }
];

