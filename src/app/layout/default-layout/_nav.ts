import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  // {
  //   name: 'Dashboard',
  //   url: '/dashboard',

  //   iconComponent: { name: 'cil-speedometer' },
  
  // },
  {
       name: 'All Sessions',
      url: '/dashboard/dash',
      iconComponent: { name: 'cil-speedometer' },

  },
  {
      name: 'Task Management',
      url: '/dashboard/task',
      iconComponent: { name: 'cil-task' }

  },

  {
      name: 'Group Management',
      url: '/dashboard/groupe',
      iconComponent: { name: 'cil-people' },
  },

  {
      name: 'User Management',  
      url: '/dashboard/user',
      iconComponent: { name: 'cil-user' },  
      
  },   
  
  {
      name: 'Statistics',
      url: '/dashboard/stat',
      iconComponent: { name: 'cil-chart' },
  },
  

  {
       name: 'Logout',
      url: '/dashboard/logout',
      iconComponent: { name: 'cil-account-logout' },
  },

];
