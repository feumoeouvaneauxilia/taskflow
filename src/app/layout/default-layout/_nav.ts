import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  // {
  //   name: 'Dashboard',
  //   url: '/dashboard',

  //   iconComponent: { name: 'cil-speedometer' },
  
  // },
  {
       name: 'Session',
      url: '/dashboard/dash',
      iconComponent: { name: 'cil-speedometer' },

  },
  {
      name: 'Task Management',
      url: '/dashboard/task',
      iconComponent: { name: 'cil-task' }

  },
  {
      name: 'User Management',  
      url: '/dashboard/user',
      iconComponent: { name: 'cil-user' },  
      
  },   
  
  {
      name: 'Statistiques',
      url: '/dashboard/stat',
      iconComponent: { name: 'cil-chart' },
  },
  {
      name: 'Group Management',
      url: '/dashboard/groups',
      iconComponent: { name: 'cil-people' },
  },

  {
       name: 'Logout',
      url: '/dashboard/logout',
      iconComponent: { name: 'cil-account-logout' },
  },

];
