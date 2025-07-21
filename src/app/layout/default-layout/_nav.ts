import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  // {
  //   name: 'Dashboard',
  //   url: '/dashboard',

  //   iconComponent: { name: 'cil-speedometer' },
  
  // },
  {
       name: 'Dashboard',
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
      iconComponent: { name: 'cil-people' },  
      
  },   
  
  {
      name: 'Statistiques',
      url: '/dashboard/stat',
      iconComponent: { name: 'cil-bar-chart' },
  },
  
//   {
//        name: 'settings',
//       url: '/dashboard/logout',
//       iconComponent: { name: 'cil-settings' },
//   },
  {
       name: 'Logout',
      url: '/dashboard/logout',
      iconComponent: { name: 'cil-account-logout' },
  },

];
