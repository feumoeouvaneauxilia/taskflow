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
        path: 'groupe',
        loadComponent: () => import('./group/group.component').then(m => m.GroupComponent),
        data: {
          title: 'Groupe'
        }
      },
      {
        path: 'logout',
        loadComponent: () => import('./logout/logout.component').then(m => m.LogoutComponent),
        data: {
          title: 'Logout'
        }
      },
      {
        path: 'task-history/:taskId',
        loadComponent: () => import('./task-history/task-history.component').then(m => m.TaskHistoryComponent),
        data: {
          title: 'Task History'
        }
      },
      {
        path: 'session',
        loadComponent: () => import('./session/Session.component').then(m => m.SessionComponent),
        data: {
          title: 'Session'
        }
      }
    ]
  }
];

