import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';
import { GroupService, Group as GroupInterface, AddMembersDto } from '../../../services/group/group.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common'; 

interface Task {
  id?: string;
  name: string;
  description?: string;
  startAt?: string;
  dueAt?: string;
  status: string;
  assignedUserIds?: string[];
  assignedGroupIds?: string[];
  assignedById?: string;
  createdById?: string;
  isValidated?: boolean;
  adminComplete?: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  roles?: string[];
  isActive?: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  createdById?: string;
  managerId?: string;
  memberIds?: string[];
  isActive?: boolean;
  members?: User[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'task' | 'user' | 'group';
  data: Task | User | Group;
  radius: number;
  color: string;
  shadowColor: string;
}

// Filter interfaces for type safety
interface TaskStatusFilter {
  all: boolean;
  pending: boolean;
  in_progress: boolean;
  completed: boolean;
  archived: boolean;
  [key: string]: boolean; // Add index signature
}

interface UserStatusFilter {
  all: boolean;
  active: boolean;
  inactive: boolean;
  [key: string]: boolean; // Add index signature
}

interface GroupStatusFilter {
  all: boolean;
  active: boolean;
  inactive: boolean;
  [key: string]: boolean; // Add index signature
}

interface AssignmentStatusFilter {
  all: boolean;
  assigned: boolean;
  unassigned: boolean;
  [key: string]: boolean; // Add index signature
}

interface NodeTypesFilter {
  task: boolean;
  user: boolean;
  group: boolean;
  [key: string]: boolean; // Add index signature
}

@Component({
  selector: 'app-dash',
  templateUrl: './dash.component.html',
  styleUrls: ['./dash.component.scss'],
  imports: [FormsModule, CommonModule, TitleCasePipe]
})
export class DashComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  nodes: Node[] = [];
  selectedNode: Node | null = null;
  hoveredNode: Node | null = null;
  isPanning = false;
  lastMouseX = 0;
  lastMouseY = 0;
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  minScale = 0.3;
  maxScale = 3.0;
  
  // Animation properties
  animationId: number | null = null;
  isAnimating = false;

  // Side panel properties
  isPanelOpen = false;
  isLoadingPanelData = false;
  selectedNodeDetails: Node | null = null;
  panelWidth = 350;

  // Manager names cache for displaying manager names instead of IDs
  managerNames: { [managerId: string]: string } = {};

  // Drag and Drop properties
  isDragging = false;
  draggedNode: Node | null = null;
  dropTargetNode: Node | null = null;
  dragOperation: 'assign' | 'unassign' | null = null;
  dragMessage: string = '';

  // Filtering properties
  isFilterPanelOpen = false;
  filteredNodes: Node[] = [];
  allNodes: Node[] = []; // Store all nodes before filtering
  
  // Filter criteria
  filters = {
    nodeTypes: {
      task: true,
      user: true,
      group: true
    } as NodeTypesFilter,
    taskStatus: {
      all: true,
      pending: false,
      in_progress: false,
      completed: false,
      archived: false
    } as TaskStatusFilter,
    userStatus: {
      all: true,
      active: false,
      inactive: false
    } as UserStatusFilter,
    groupStatus: {
      all: true,
      active: false,
      inactive: false
    } as GroupStatusFilter,
    searchTerm: '',
    dateRange: {
      startDate: '',
      endDate: ''
    },
    assignmentStatus: {
      all: true,
      assigned: false,
      unassigned: false
    } as AssignmentStatusFilter
  };

  // Available filter options for dropdowns
  readonly TASK_STATUSES = ['pending', 'in_progress', 'completed', 'archived'];
  readonly USER_ROLES = ['admin', 'manager', 'user'];

  // Premium color palette with high contrast
  readonly COLORS = {
    task: {
      primary: '#FF5722', // Deep Orange - vibrant and distinct
      shadow: '#D32F2F',
      text: '#FFFFFF'     // White text for better visibility
    },
    user: {
      primary: '#00BCD4', // Cyan - bright and professional
      shadow: '#0097A7',
      text: '#FFFFFF'     // White text for better visibility
    },
    group: {
      primary: '#9C27B0', // Purple - royal and distinctive
      shadow: '#7B1FA2',
      text: '#FFFFFF'     // White text for better visibility
    },
    highlight: '#FFC107', // Amber - bright selection color
    background: '#121212' // Pure dark background
  };

  readonly NODE_SIZES = {
    task: 35,
    user: 30,
    group: 45
  };

  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private groupService: GroupService,
    private cdr: ChangeDetectorRef
  ) {}

  private headerFilterHandler = (event: Event) => {
    this.handleHeaderFilterToggle(event as CustomEvent);
  };

  ngAfterViewInit() {
    this.resizeCanvas();
    this.attachCanvasEvents();
    this.loadData();
    
    // Listen for filter toggle events from header
    window.addEventListener('toggle-filter', this.headerFilterHandler);
  }

  ngOnDestroy() {
    // Clean up event listeners
    window.removeEventListener('toggle-filter', this.headerFilterHandler);
  }

  /**
   * Handle filter toggle events from header
   */
  private handleHeaderFilterToggle(event: CustomEvent): void {
    this.isFilterPanelOpen = event.detail.isOpen;
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    
    console.log('Resizing canvas...');
    console.log('Canvas element:', canvas);
    
    if (!container) {
      console.error('Canvas container not found');
      return;
    }
    
    // Update container class for panel states
    if (this.isPanelOpen) {
      container.classList.add('panel-open');
    } else {
      container.classList.remove('panel-open');
    }
    
    if (this.isFilterPanelOpen) {
      container.classList.add('filter-panel-open');
    } else {
      container.classList.remove('filter-panel-open');
    }
    
    console.log('Canvas offsetWidth:', canvas.offsetWidth, 'offsetHeight:', canvas.offsetHeight);
    console.log('Canvas computed style display:', getComputedStyle(canvas).display);
    console.log('Canvas computed style visibility:', getComputedStyle(canvas).visibility);
    
    // Get device pixel ratio for crisp rendering on high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual size in memory (scaled up for high-DPI)
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    
    // Scale the canvas back down using CSS
    canvas.style.width = canvas.offsetWidth + 'px';
    canvas.style.height = canvas.offsetHeight + 'px';
    
    // Scale the drawing context so everything draws at correct size
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
    console.log('Canvas size set to:', canvas.width, 'x', canvas.height, 'with DPR:', dpr);
    
    this.draw();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Close panels when Escape key is pressed
    if (event.key === 'Escape') {
      if (this.isPanelOpen) {
        this.closePanel();
      } else if (this.isFilterPanelOpen) {
        this.toggleFilterPanel();
      }
    }
    
    // Toggle filter panel with Ctrl+F or Cmd+F (prevent default browser search)
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.toggleFilterPanel();
    }
  }

  async loadData() {
    try {
      console.log('Loading dashboard data...');
      
      // Clear the manager names cache when loading new data
      this.managerNames = {};
      
      // Load all data concurrently with proper error handling
      const results = await Promise.allSettled([
        this.taskService.getTasks().toPromise(),
        this.userService.getUsers().toPromise(),
        this.groupService.getAllGroups().toPromise()
      ]);

      const tasks = results[0].status === 'fulfilled' ? results[0].value || [] : [];
      const users = results[1].status === 'fulfilled' ? results[1].value || [] : [];
      const groups = results[2].status === 'fulfilled' ? results[2].value || [] : [];

      console.log('Loaded data:', { tasks, users, groups });
      console.log('Tasks count:', tasks.length);
      console.log('Users count:', users.length);
      console.log('Groups count:', groups.length);

      // Show empty state if no real data is available
      if (tasks.length === 0 && users.length === 0 && groups.length === 0) {
        console.log('No data found, showing empty state');
        this.nodes = [];
        this.draw();
      } else {
        this.createNodes(tasks, users, groups);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      console.log('Error occurred, showing empty state');
      this.nodes = [];
      this.draw();
    }
  }

  createNodes(tasks: Task[], users: User[], groups: GroupInterface[]) {
    const canvas = this.canvasRef.nativeElement;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('Center point:', centerX, centerY);
    
    // Filter tasks to only include validated ones that are not admin completed
    const validatedTasks = tasks.filter(task => 
      task.isValidated === true && task.adminComplete !== true
    );
    console.log(`Filtered ${tasks.length} tasks to ${validatedTasks.length} validated tasks (excluding admin completed)`);
    
    // Create all nodes first (store in allNodes)
    this.allNodes = [];
    const allItems = [
      ...validatedTasks.map(task => ({ item: task, type: 'task' as const })),
      ...users.map(user => ({ item: user, type: 'user' as const })),
      ...groups.map(group => ({ item: { ...group, members: [] }, type: 'group' as const }))
    ];

    console.log('Total items to create nodes for:', allItems.length);

    // Arrange nodes in a spiral pattern for better distribution
    allItems.forEach(({ item, type }, index) => {
      const angle = (index * 2.4) + (index * 0.5); // Spiral angle
      const radius = 80 + (index * 15); // Increasing radius
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.3;
      const finalRadius = Math.min(radius, maxRadius);

      const node: Node = {
        id: `${type}_${item.id}`,
        x: centerX + finalRadius * Math.cos(angle),
        y: centerY + finalRadius * Math.sin(angle),
        label: type === 'user' ? (item as User).username : item.name,
        type: type,
        data: item,
        radius: this.NODE_SIZES[type],
        color: this.COLORS[type].primary,
        shadowColor: this.COLORS[type].shadow
      };

      console.log(`Created node ${index}:`, {
        id: node.id,
        label: node.label,
        type: node.type,
        position: `(${node.x}, ${node.y})`,
        radius: node.radius,
        color: node.color
      });

      this.allNodes.push(node);
    });

    console.log('Total nodes created:', this.allNodes.length);
    
    // Apply initial filters
    this.applyFilters();
  }

  attachCanvasEvents() {
    const canvas = this.canvasRef.nativeElement;
    const getMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    canvas.addEventListener('mousedown', (e) => {
      const { x: mouseX, y: mouseY } = getMouse(e);
      const worldX = (mouseX - this.offsetX) / this.scale;
      const worldY = (mouseY - this.offsetY) / this.scale;
      this.selectedNode = null;
      
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        const dist = Math.sqrt(Math.pow(worldX - node.x, 2) + Math.pow(worldY - node.y, 2));
        if (dist < node.radius) {
          this.selectedNode = node;
          this.nodes.splice(i, 1);
          this.nodes.push(node);
          
          // Start drag operation for task and user nodes
          if (node.type === 'task' || node.type === 'user') {
            this.draggedNode = node;
            this.isDragging = true;
            canvas.style.cursor = 'grabbing';
          }
          break;
        }
      }
      
      if (!this.selectedNode) {
        this.isPanning = true;
        canvas.classList.add('grabbing');
      }
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
    });

    // Add double-click event to open panel
    canvas.addEventListener('dblclick', (e) => {
      const { x: mouseX, y: mouseY } = getMouse(e);
      const worldX = (mouseX - this.offsetX) / this.scale;
      const worldY = (mouseY - this.offsetY) / this.scale;
      
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        const dist = Math.sqrt(Math.pow(worldX - node.x, 2) + Math.pow(worldY - node.y, 2));
        if (dist < node.radius) {
          this.openPanel(node);
          break;
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.selectedNode = null;
      this.hoveredNode = null;
      this.isPanning = false;
      canvas.classList.remove('grabbing');
      this.draw();
    });

    // Add zoom functionality
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { x: mouseX, y: mouseY } = getMouse(e);
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));
      
      if (newScale !== this.scale) {
        // Zoom towards mouse position
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;
        
        this.scale = newScale;
        this.offsetX = mouseX - worldX * this.scale;
        this.offsetY = mouseY - worldY * this.scale;
        
        this.draw();
      }
    });

    // Add hover detection
    canvas.addEventListener('mousemove', (e) => {
      const { x: mouseX, y: mouseY } = getMouse(e);
      
      if (this.selectedNode && !this.isDragging) {
        this.selectedNode.x += (mouseX - this.lastMouseX) / this.scale;
        this.selectedNode.y += (mouseY - this.lastMouseY) / this.scale;
      } else if (this.isPanning) {
        this.offsetX += (mouseX - this.lastMouseX);
        this.offsetY += (mouseY - this.lastMouseY);
      } else if (this.isDragging && this.draggedNode) {
        // Update dragged node position
        this.draggedNode.x += (mouseX - this.lastMouseX) / this.scale;
        this.draggedNode.y += (mouseY - this.lastMouseY) / this.scale;
        
        // Check for valid drop targets based on drag type
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;
        let potentialDropTarget: Node | null = null;
        
        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const node = this.nodes[i];
          if (node !== this.draggedNode) {
            const dist = Math.sqrt(Math.pow(worldX - node.x, 2) + Math.pow(worldY - node.y, 2));
            if (dist < node.radius + 20) { // Add some tolerance for easier dropping
              // Task can be dropped on user or group
              if (this.draggedNode.type === 'task' && (node.type === 'user' || node.type === 'group')) {
                potentialDropTarget = node;
                break;
              }
              // User can be dropped on group
              else if (this.draggedNode.type === 'user' && node.type === 'group') {
                potentialDropTarget = node;
                break;
              }
            }
          }
        }
        
        if (potentialDropTarget !== this.dropTargetNode) {
          this.dropTargetNode = potentialDropTarget;
          
          // Update drag operation and message
          if (potentialDropTarget) {
            this.updateDragOperation();
            canvas.style.cursor = 'copy';
          } else {
            this.dragOperation = null;
            this.dragMessage = '';
            canvas.style.cursor = 'grabbing';
          }
        }
      } else {
        // Check for hover
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;
        let hoveredNode: Node | null = null;
        
        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const node = this.nodes[i];
          const dist = Math.sqrt(Math.pow(worldX - node.x, 2) + Math.pow(worldY - node.y, 2));
          if (dist < node.radius) {
            hoveredNode = node;
            break;
          }
        }
        
        if (hoveredNode !== this.hoveredNode) {
          this.hoveredNode = hoveredNode;
          canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
          this.draw();
        }
      }
      
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
      this.draw();
    });

    canvas.addEventListener('mouseup', () => {
      // Handle drop operation
      if (this.isDragging && this.draggedNode && this.dropTargetNode) {
        this.handleDragAndDrop(this.draggedNode, this.dropTargetNode);
      }
      
      // Reset drag state
      this.selectedNode = null;
      this.isPanning = false;
      this.isDragging = false;
      this.draggedNode = null;
      this.dropTargetNode = null;
      this.dragOperation = null;
      this.dragMessage = '';
      canvas.classList.remove('grabbing');
      canvas.style.cursor = 'grab';
      this.draw();
    });
  }

  private updateDragOperation() {
    if (!this.draggedNode || !this.dropTargetNode) return;

    // Determine operation and message based on drag type and current state
    if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'user') {
      const task = this.draggedNode.data as Task;
      const userId = this.dropTargetNode.data.id;
      const isAssigned = userId ? (task.assignedUserIds?.includes(userId) || false) : false;
      
      this.dragOperation = isAssigned ? 'unassign' : 'assign';
      this.dragMessage = isAssigned 
        ? `Unassign task "${task.name}" from ${this.dropTargetNode.label}`
        : `Assign task "${task.name}" to ${this.dropTargetNode.label}`;
        
    } else if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'group') {
      const task = this.draggedNode.data as Task;
      const groupId = this.dropTargetNode.data.id;
      const isAssigned = groupId ? (task.assignedGroupIds?.includes(groupId) || false) : false;
      
      this.dragOperation = isAssigned ? 'unassign' : 'assign';
      this.dragMessage = isAssigned 
        ? `Unassign task "${task.name}" from group ${this.dropTargetNode.label}`
        : `Assign task "${task.name}" to group ${this.dropTargetNode.label}`;
        
    } else if (this.draggedNode.type === 'user' && this.dropTargetNode.type === 'group') {
      const group = this.dropTargetNode.data as Group;
      const userId = this.draggedNode.data.id;
      const isMember = userId ? (group.memberIds?.includes(userId) || false) : false;
      
      this.dragOperation = isMember ? 'unassign' : 'assign';
      this.dragMessage = isMember 
        ? `Remove ${this.draggedNode.label} from group ${this.dropTargetNode.label}`
        : `Add ${this.draggedNode.label} to group ${this.dropTargetNode.label}`;
    }
  }



  drawNode(ctx: CanvasRenderingContext2D, node: Node, isSelected: boolean) {
    console.log('Drawing node:', node.label, 'color:', node.color, 'position:', node.x, node.y, 'radius:', node.radius, 'type:', node.type);
    
    const isHovered = node === this.hoveredNode;
    const isDragTarget = node === this.dropTargetNode;
    const isDragged = node === this.draggedNode;
    
    let effectiveRadius = node.radius;
    if (isHovered) effectiveRadius *= 1.1;
    if (isDragTarget) effectiveRadius *= 1.2;
    if (isDragged) effectiveRadius *= 0.9; // Make dragged node slightly smaller
    
    // Save context for shadow
    ctx.save();
    
    // Special styling for drag operations
    if (isDragged) {
      ctx.globalAlpha = 0.8; // Make dragged node semi-transparent
    }
    
    // Add modern shadow effect (equivalent to box-shadow)
    if (!isSelected) {
      ctx.shadowColor = isDragTarget ? 'rgba(16, 185, 129, 0.6)' : 
                      isHovered ? 'rgba(60, 64, 67, 0.4)' : 'rgba(60, 64, 67, 0.3)';
      ctx.shadowBlur = isDragTarget ? 15 : isHovered ? 8 : 2;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = isDragTarget ? 5 : isHovered ? 3 : 1;
    }
    
    // Draw main circle with premium gradient effect
    ctx.beginPath();
    ctx.arc(node.x, node.y, effectiveRadius, 0, Math.PI * 2);
    
    // Create radial gradient for premium 3D effect
    const gradient = ctx.createRadialGradient(
      node.x - effectiveRadius * 0.3, 
      node.y - effectiveRadius * 0.3, 
      0,
      node.x, 
      node.y, 
      effectiveRadius
    );
    
    if (isSelected) {
      gradient.addColorStop(0, this.lightenColor(this.COLORS.highlight, 0.3));
      gradient.addColorStop(1, this.COLORS.highlight);
      ctx.fillStyle = gradient;
    } else if (isDragTarget) {
      // Green glow for valid drop targets
      gradient.addColorStop(0, this.lightenColor('#10b981', 0.4));
      gradient.addColorStop(1, '#10b981');
      ctx.fillStyle = gradient;
    } else if (isHovered) {
      gradient.addColorStop(0, this.lightenColor(node.color, 0.4));
      gradient.addColorStop(1, this.lightenColor(node.color, -0.1));
      ctx.fillStyle = gradient;
    } else {
      gradient.addColorStop(0, this.lightenColor(node.color, 0.3));
      gradient.addColorStop(1, this.lightenColor(node.color, -0.2));
      ctx.fillStyle = gradient;
    }
    
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Remove shadow for border
    
    // Add premium border with glow effect
    ctx.strokeStyle = isDragTarget ? '#10b981' : // Green for drop target
                     isSelected ? '#FFD700' : // Gold for selection
                     isHovered ? this.lightenColor(node.color, 0.5) : 
                     this.lightenColor(node.color, 0.2);
    ctx.lineWidth = isDragTarget ? 4 : isSelected ? 3 : isHovered ? 2.5 : 2;
    
    // Add glow effect for selected/hovered/target nodes
    if (isSelected || isHovered || isDragTarget) {
      ctx.save();
      ctx.shadowColor = isDragTarget ? '#10b981' : isSelected ? '#FFD700' : node.color;
      ctx.shadowBlur = isDragTarget ? 20 : isSelected ? 15 : 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.stroke();
    }
    
    ctx.closePath();
    
    // Restore context
    ctx.restore();
    
    // Add secondary shadow layer for depth
    if (!isSelected && isHovered) {
      ctx.save();
      ctx.shadowColor = 'rgba(60, 64, 67, 0.15)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.restore();
    }
    
    // Premium text styling with crystal clear rendering
    ctx.fillStyle = this.COLORS[node.type].text;
    ctx.font = `500 ${this.getFontSize(node)}px "Poppins", system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Enable high-quality text rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Pixel-perfect text positioning for crisp rendering
    const textX = Math.round(node.x);
    const textY = Math.round(node.y - 1);
    
    // Add subtle stroke for better text visibility and sharpness
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    
    // Handle text overflow with premium styling
    const maxWidth = effectiveRadius * 1.6;
    let text = node.label;
    
    // Truncate text if too long
    while (ctx.measureText(text).width > maxWidth && text.length > 3) {
      text = text.slice(0, -1);
    }
    if (text !== node.label && text.length > 3) {
      text = text.slice(0, -3) + '...';
    }
    
    // Draw text stroke first for sharp contrast
    ctx.strokeText(text, textX, textY);
    
    // Draw the filled text for crisp, clear rendering
    ctx.fillText(text, textX, textY);
    ctx.restore(); // Restore context
    
    // Add type indicator for groups and users
    if (node.type === 'group') {
      this.drawGroupIndicator(ctx, node);
    } else if (node.type === 'user') {
      this.drawUserIndicator(ctx, node);
    }
    
    // Draw tooltip for hovered node
    if (isHovered) {
      this.drawTooltip(ctx, node);
    }
  }

  private lightenColor(color: string, amount: number): string {
    // Simple color lightening function
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private getFontSize(node: Node): number {
    switch (node.type) {
      case 'group': return 11;
      case 'task': return 10;
      case 'user': return 9;
      default: return 10;
    }
  }

  private drawGroupIndicator(ctx: CanvasRenderingContext2D, node: Node) {
    const group = node.data as GroupInterface;
    const memberCount = group.memberIds?.length || 0;
    
    if (memberCount > 0) {
      // Small badge showing member count
      const badgeX = node.x + node.radius - 8;
      const badgeY = node.y - node.radius + 8;
      
      ctx.fillStyle = '#ef4444'; // Red badge
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 9px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(memberCount.toString(), badgeX, badgeY + 1);
    }
  }

  private drawUserIndicator(ctx: CanvasRenderingContext2D, node: Node) {
    // Small user icon indicator
    const iconX = node.x + node.radius - 6;
    const iconY = node.y - node.radius + 6;
    
    ctx.fillStyle = '#10b981'; // Green indicator
    ctx.beginPath();
    ctx.arc(iconX, iconY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, node: Node) {
    const tooltipX = node.x + node.radius + 15;
    const tooltipY = node.y - 20;
    const padding = 8;
    
    // Prepare tooltip text
    let tooltipText = '';
    if (node.type === 'task') {
      const task = node.data as Task;
      tooltipText = `Task: ${task.name}\nStatus: ${task.status}`;
      if (task.assignedUserIds && task.assignedUserIds.length > 0) {
        tooltipText += `\nAssigned: ${task.assignedUserIds.length} users`;
      }
    } else if (node.type === 'user') {
      const user = node.data as User;
      tooltipText = `User: ${user.username}\nEmail: ${user.email}`;
    } else if (node.type === 'group') {
      const group = node.data as GroupInterface;
      tooltipText = `Group: ${group.name}`;
      if (group.memberIds && group.memberIds.length > 0) {
        tooltipText += `\nMembers: ${group.memberIds.length}`;
      }
    }
    
    const lines = tooltipText.split('\n');
    const lineHeight = 16;
    const tooltipWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2;
    const tooltipHeight = lines.length * lineHeight + padding * 2;
    
    // Draw tooltip background with modern styling
    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    this.roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    
    // Draw tooltip border
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    // Draw tooltip text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 12px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
      ctx.fillText(line, tooltipX + padding, tooltipY + padding + index * lineHeight);
    });
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    console.log('Drawing canvas with', this.nodes.length, 'nodes');
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    console.log('Scale:', this.scale, 'Offset:', this.offsetX, this.offsetY);
    
    // Clear canvas with proper dimensions
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Enable anti-aliasing for smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    
    // Draw connections first (behind nodes)
    this.drawConnections(ctx);
    
    // Draw nodes
    this.nodes.forEach((node, index) => {
      console.log(`Drawing node ${index}:`, node.label, 'at', node.x, node.y);
      this.drawNode(ctx, node, node === this.selectedNode);
    });
    
    ctx.restore();
    
    console.log('Finished drawing');
  }

  private drawConnections(ctx: CanvasRenderingContext2D) {
    // Draw connections between tasks and assigned users/groups
    this.nodes.forEach(taskNode => {
      if (taskNode.type === 'task') {
        const task = taskNode.data as Task;
        
        // Draw connections to assigned users
        if (task.assignedUserIds && task.assignedUserIds.length > 0) {
          task.assignedUserIds.forEach(userId => {
            const userNode = this.nodes.find(n => n.type === 'user' && n.data.id === userId);
            if (userNode) {
              this.drawConnection(ctx, taskNode, userNode, '#06b6d4', 0.4, 'User');
            }
          });
        }
        
        // Draw connections to assigned groups
        if (task.assignedGroupIds && task.assignedGroupIds.length > 0) {
          task.assignedGroupIds.forEach(groupId => {
            const groupNode = this.nodes.find(n => n.type === 'group' && n.data.id === groupId);
            if (groupNode) {
              this.drawConnection(ctx, taskNode, groupNode, '#9c27b0', 0.4, 'Group');
            }
          });
        }
      }
    });
    
    // Draw connections between groups and their members
    this.nodes.forEach(groupNode => {
      if (groupNode.type === 'group') {
        const group = groupNode.data as Group;
        
        // Draw connections to group members
        if (group.memberIds && group.memberIds.length > 0) {
          group.memberIds.forEach(userId => {
            const userNode = this.nodes.find(n => n.type === 'user' && n.data.id === userId);
            if (userNode) {
              this.drawConnection(ctx, groupNode, userNode, '#f59e0b', 0.3, 'Member');
            }
          });
        }
      }
    });
    
    // Draw preview connection while dragging
    if (this.isDragging && this.draggedNode && this.dropTargetNode) {
      let color = '#10b981'; // Default green for assignment
      let isUnassigning = false;
      
      // Check if this would be an unassignment operation
      if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'user') {
        const task = this.draggedNode.data as Task;
        const userId = this.dropTargetNode.data.id;
        isUnassigning = userId ? (task.assignedUserIds?.includes(userId) || false) : false;
        color = isUnassigning ? '#ef4444' : '#06b6d4'; // Red for unassign, cyan for assign
      } else if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'group') {
        const task = this.draggedNode.data as Task;
        const groupId = this.dropTargetNode.data.id;
        isUnassigning = groupId ? (task.assignedGroupIds?.includes(groupId) || false) : false;
        color = isUnassigning ? '#ef4444' : '#9c27b0'; // Red for unassign, purple for assign
      } else if (this.draggedNode.type === 'user' && this.dropTargetNode.type === 'group') {
        const group = this.dropTargetNode.data as Group;
        const userId = this.draggedNode.data.id;
        isUnassigning = userId ? (group.memberIds?.includes(userId) || false) : false;
        color = isUnassigning ? '#ef4444' : '#f59e0b'; // Red for remove, orange for add
      }
      
      const previewType = isUnassigning ? 'Unassign' : 'Assign';
      this.drawConnection(ctx, this.draggedNode, this.dropTargetNode, color, 0.8, previewType);
    }
  }

  private drawConnection(ctx: CanvasRenderingContext2D, node1: Node, node2: Node, color: string, opacity: number, type: string = '') {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    
    // Different line styles based on operation type
    if (type === 'Assign' || type === 'Preview') {
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]); // Dashed line for assignment preview
    } else if (type === 'Unassign') {
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 8]); // Different dash pattern for unassignment
    } else {
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Regular dashed line for existing connections
    }
    
    // Calculate connection points (edge to edge, not center to center)
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const startX = node1.x + (dx / distance) * node1.radius;
    const startY = node1.y + (dy / distance) * node1.radius;
    const endX = node2.x - (dx / distance) * node2.radius;
    const endY = node2.y - (dy / distance) * node2.radius;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw different arrow styles based on operation
    if (distance > 0) {
      const arrowLength = type === 'Unassign' ? 15 : 10;
      const arrowAngle = Math.PI / 6;
      const angle = Math.atan2(dy, dx);
      
      if (type === 'Unassign') {
        // Draw an 'X' style marker for unassignment
        ctx.lineWidth = 3;
        ctx.setLineDash([]); // Solid line for the X
        const xSize = 8;
        ctx.beginPath();
        ctx.moveTo(endX - xSize, endY - xSize);
        ctx.lineTo(endX + xSize, endY + xSize);
        ctx.moveTo(endX - xSize, endY + xSize);
        ctx.lineTo(endX + xSize, endY - xSize);
        ctx.stroke();
      } else {
        // Regular arrow head for assignment
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  // Panel management methods
  openPanel(node: Node) {
    this.selectedNodeDetails = node;
    this.isPanelOpen = true;
    this.isLoadingPanelData = true;
    
    // Fetch detailed data based on node type
    this.fetchNodeDetails(node);
    
    // Set loading to false after 2 seconds (giving time for API call)
    setTimeout(() => {
      this.isLoadingPanelData = false;
    }, 2000);
    
    // Resize canvas to accommodate panel
    this.resizeCanvas();
  }

  // Generic Drag and Drop Handler
  handleDragAndDrop(draggedNode: Node, targetNode: Node) {
    if (draggedNode.type === 'task') {
      // Handle task assignment to user or group
      this.handleTaskAssignment(draggedNode, targetNode);
    } else if (draggedNode.type === 'user' && targetNode.type === 'group') {
      // Handle user assignment to group
      this.handleUserToGroupAssignment(draggedNode, targetNode);
    }
  }

  // Task Assignment Handler with toggle functionality (assign/unassign)
  handleTaskAssignment(taskNode: Node, targetNode: Node) {
    const task = taskNode.data as Task;
    const taskId = task.id;
    
    if (!taskId) {
      console.error('Task ID is missing');
      this.showAssignmentFeedback('Error: Task ID is missing', false);
      return;
    }

    if (targetNode.type === 'user') {
      const user = targetNode.data as User;
      const userId = user.id;
      
      // Check if user is already assigned to this task
      const isAlreadyAssigned = task.assignedUserIds && task.assignedUserIds.includes(userId);
      
      if (isAlreadyAssigned) {
        // Unassign the user
        console.log(`Unassigning task "${task.name}" from user "${user.username}"`);
        this.showAssignmentFeedback(`Unassigning task from ${user.username}...`, true);
        
        this.taskService.unassignUser(taskId, userId).subscribe({
          next: (response) => {
            console.log('Task unassigned from user successfully:', response);
            this.showAssignmentFeedback(`✓ Task unassigned from ${user.username}`, true);
            
            // Update the task data to remove the assignment
            if (task.assignedUserIds) {
              task.assignedUserIds = task.assignedUserIds.filter(id => id !== userId);
            }
            
            // Update the node data
            taskNode.data = task;
            
            // Force canvas redraw to update connections
            this.refreshCanvasAfterAssignment();
            
            // If the panel is showing this task, update the panel details
            if (this.selectedNodeDetails && this.selectedNodeDetails.id === taskId) {
              this.selectedNodeDetails.data = task;
            }
          },
          error: (error) => {
            console.error('Error unassigning task from user:', error);
            this.showAssignmentFeedback(`✗ Failed to unassign task from ${user.username}`, false);
          }
        });
      } else {
        // Assign the user
        console.log(`Assigning task "${task.name}" to user "${user.username}"`);
        this.showAssignmentFeedback(`Assigning task to ${user.username}...`, true);
        
        this.taskService.assignUser(taskId, userId).subscribe({
          next: (response) => {
            console.log('Task assigned to user successfully:', response);
            this.showAssignmentFeedback(`✓ Task assigned to ${user.username}`, true);
            
            // Update the task data to include the new assignment
            if (!task.assignedUserIds) {
              task.assignedUserIds = [];
            }
            if (!task.assignedUserIds.includes(userId)) {
              task.assignedUserIds.push(userId);
            }
            
            // Update the node data
            taskNode.data = task;
            
            // Force canvas redraw to show the new connection immediately
            this.refreshCanvasAfterAssignment();
            
            // If the panel is showing this task, update the panel details
            if (this.selectedNodeDetails && this.selectedNodeDetails.id === taskId) {
              this.selectedNodeDetails.data = task;
            }
          },
          error: (error) => {
            console.error('Error assigning task to user:', error);
            this.showAssignmentFeedback(`✗ Failed to assign task to ${user.username}`, false);
          }
        });
      }
    } else if (targetNode.type === 'group') {
      const group = targetNode.data as Group;
      const groupId = group.id;
      
      // Check if group is already assigned to this task
      const isAlreadyAssigned = task.assignedGroupIds && task.assignedGroupIds.includes(groupId);
      
      if (isAlreadyAssigned) {
        // Unassign the group
        console.log(`Unassigning task "${task.name}" from group "${group.name}"`);
        this.showAssignmentFeedback(`Unassigning task from ${group.name}...`, true);
        
        this.taskService.unassignGroup(taskId, groupId).subscribe({
          next: (response) => {
            console.log('Task unassigned from group successfully:', response);
            this.showAssignmentFeedback(`✓ Task unassigned from ${group.name}`, true);
            
            // Update the task data to remove the assignment
            if (task.assignedGroupIds) {
              task.assignedGroupIds = task.assignedGroupIds.filter(id => id !== groupId);
            }
            
            // Update the node data
            taskNode.data = task;
            
            // Force canvas redraw to update connections
            this.refreshCanvasAfterAssignment();
            
            // If the panel is showing this task, update the panel details
            if (this.selectedNodeDetails && this.selectedNodeDetails.id === taskId) {
              this.selectedNodeDetails.data = task;
            }
          },
          error: (error) => {
            console.error('Error unassigning task from group:', error);
            this.showAssignmentFeedback(`✗ Failed to unassign task from ${group.name}`, false);
          }
        });
      } else {
        // Assign the group
        console.log(`Assigning task "${task.name}" to group "${group.name}"`);
        this.showAssignmentFeedback(`Assigning task to ${group.name}...`, true);
        
        this.taskService.assignGroup(taskId, groupId).subscribe({
          next: (response) => {
            console.log('Task assigned to group successfully:', response);
            this.showAssignmentFeedback(`✓ Task assigned to ${group.name}`, true);
            
            // Update the task data to include the new assignment
            if (!task.assignedGroupIds) {
              task.assignedGroupIds = [];
            }
            if (!task.assignedGroupIds.includes(groupId)) {
              task.assignedGroupIds.push(groupId);
            }
            
            // Update the node data
            taskNode.data = task;
            
            // Force canvas redraw to show the new connection immediately
            this.refreshCanvasAfterAssignment();
            
            // If the panel is showing this task, update the panel details
            if (this.selectedNodeDetails && this.selectedNodeDetails.id === taskId) {
              this.selectedNodeDetails.data = task;
            }
          },
          error: (error) => {
            console.error('Error assigning task to group:', error);
            this.showAssignmentFeedback(`✗ Failed to assign task to ${group.name}`, false);
          }
        });
      }
    }
  }

  // Visual feedback for assignment operations
  showAssignmentFeedback(message: string, isSuccess: boolean) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      background: ${isSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
      border: 1px solid ${isSuccess ? '#34d399' : '#f87171'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // User to Group Assignment Handler with toggle functionality (add/remove)
  handleUserToGroupAssignment(userNode: Node, groupNode: Node) {
    const user = userNode.data as User;
    const group = groupNode.data as Group;
    const userId = user.id;
    const groupId = group.id;
    
    if (!userId || !groupId) {
      console.error('User ID or Group ID is missing');
      this.showAssignmentFeedback('Error: Missing user or group ID', false);
      return;
    }

    // Check if user is already a member of the group
    const isAlreadyMember = group.memberIds && group.memberIds.includes(userId);
    
    if (isAlreadyMember) {
      // Remove the user from the group
      console.log(`Removing user "${user.username}" from group "${group.name}"`);
      this.showAssignmentFeedback(`Removing ${user.username} from ${group.name}...`, true);
      
      this.groupService.removeGroupMember(groupId, userId).subscribe({
        next: (updatedGroup) => {
          console.log('User removed from group successfully:', updatedGroup);
          this.showAssignmentFeedback(`✓ ${user.username} removed from ${group.name}`, true);
          
          // Update the group data to remove the member
          if (group.memberIds) {
            group.memberIds = group.memberIds.filter(id => id !== userId);
          }
          
          // Update the node data
          groupNode.data = group;
          
          // Force canvas redraw to update connections
          this.refreshCanvasAfterAssignment();
          
          // If the panel is showing this group, update the panel details
          if (this.selectedNodeDetails && this.selectedNodeDetails.id === groupId) {
            this.selectedNodeDetails.data = group;
          }
        },
        error: (error) => {
          console.error('Error removing user from group:', error);
          this.showAssignmentFeedback(`✗ Failed to remove ${user.username} from ${group.name}`, false);
        }
      });
    } else {
      // Add the user to the group
      console.log(`Adding user "${user.username}" to group "${group.name}"`);
      this.showAssignmentFeedback(`Adding ${user.username} to ${group.name}...`, true);
      
      // Use the addGroupMembers API
      const addMembersDto = { userIds: [userId] };
      
      this.groupService.addGroupMembers(groupId, addMembersDto).subscribe({
        next: (updatedGroup) => {
          console.log('User added to group successfully:', updatedGroup);
          this.showAssignmentFeedback(`✓ ${user.username} added to ${group.name}`, true);
          
          // Update the group data to include the new member
          if (!group.memberIds) {
            group.memberIds = [];
          }
          if (!group.memberIds.includes(userId)) {
            group.memberIds.push(userId);
          }
          
          // Update the node data
          groupNode.data = group;
          
          // Force canvas redraw to show the new connection immediately
          this.refreshCanvasAfterAssignment();
          
          // If the panel is showing this group, update the panel details
          if (this.selectedNodeDetails && this.selectedNodeDetails.id === groupId) {
            this.selectedNodeDetails.data = group;
          }
        },
        error: (error) => {
          console.error('Error adding user to group:', error);
          this.showAssignmentFeedback(`✗ Failed to add ${user.username} to ${group.name}`, false);
        }
      });
    }
  }

  // Method to force immediate canvas refresh after assignments
  private refreshCanvasAfterAssignment(): void {
    // Trigger immediate change detection
    this.cdr.detectChanges();
    
    // Force a complete redraw
    setTimeout(() => {
      this.draw();
      this.cdr.detectChanges();
    }, 50);
    
    // Additional redraw for safety
    setTimeout(() => {
      this.draw();
    }, 200);
  }

  // Create visual connection between nodes
  createConnection(fromNode: Node, toNode: Node) {
    // This method can be used to update the visual connections
    // The connection will be drawn in the drawConnections method
    console.log(`Creating connection from ${fromNode.label} to ${toNode.label}`);
  }

  fetchNodeDetails(node: Node): void {
    try {
      const nodeId = node.data.id;
      if (!nodeId) {
        console.error('Node ID is missing');
        return;
      }

      switch (node.type) {
        case 'group':
          this.groupService.getGroupById(nodeId).subscribe({
            next: (groupData) => {
              if (groupData && this.selectedNodeDetails) {
                this.selectedNodeDetails.data = groupData;
                
                // Fetch manager name if managerId exists
                if (groupData.managerId) {
                  this.fetchManagerName(groupData.managerId);
                }
                
                // Trigger change detection to update the panel
                this.cdr.detectChanges();
              }
            },
            error: (error) => console.error('Error fetching group details:', error)
          });
          break;
        case 'task':
          this.taskService.getTaskById(nodeId).subscribe({
            next: (taskData) => {
              if (taskData && this.selectedNodeDetails) {
                this.selectedNodeDetails.data = taskData;
              }
            },
            error: (error) => console.error('Error fetching task details:', error)
          });
          break;
        case 'user':
          this.userService.getUserById(nodeId).subscribe({
            next: (userData) => {
              if (userData && this.selectedNodeDetails) {
                this.selectedNodeDetails.data = userData;
              }
            },
            error: (error) => console.error('Error fetching user details:', error)
          });
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${node.type} details:`, error);
    }
  }

  closePanel() {
    this.isPanelOpen = false;
    this.selectedNodeDetails = null;
    this.isLoadingPanelData = false;
    
    // Resize canvas back to full width
    this.resizeCanvas();
  }

  getNodeTypeIcon(type: string): string {
    switch (type) {
      case 'task': return '📋';
      case 'user': return '👤';
      case 'group': return '👥';
      default: return '●';
    }
  }

  getNodeStatusColor(node: Node): string {
    if (node.type === 'task') {
      const task = node.data as Task;
      switch (task.status) {
        case 'Completed': return '#4CAF50';
        case 'In Progress': return '#FF9800';
        case 'Pending': return '#F44336';
        default: return '#9E9E9E';
      }
    }
    return this.COLORS[node.type].primary;
  }

  getNodeDetails(node: Node): any {
    switch (node.type) {
      case 'task':
        const task = node.data as Task;
        return {
          'Name': task.name,
          'Description': task.description || 'No description',
          'Status': task.status,
          'Start Date': task.startAt ? new Date(task.startAt).toLocaleDateString() : 'Not set',
          'Due Date': task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'Not set',
          'Assigned Users': task.assignedUserIds?.length || 0,
          'Assigned Groups': task.assignedGroupIds?.length || 0,
          'Is Validated': task.isValidated ? 'Yes' : 'No',
          'Admin Complete': task.adminComplete ? 'Yes' : 'No'
        };
      case 'user':
        const user = node.data as User;
        return {
          'Username': user.username,
          'Email': user.email,
          'Is Active': user.isActive ? 'Active' : 'Inactive',
          'Roles': user.roles ? user.roles.join(', ') : 'No roles assigned'
        };
      case 'group':
        const group = node.data as Group;
        const details = {
          'Name': group.name,
          'Description': group.description || 'No description',
          'Manager': 'Loading...',
          'Members Count': group.memberIds?.length || 0,
          'Is Active': group.isActive ? 'Active' : 'Inactive',
          'Created At': group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown',
          'Created By': group.createdById || 'Unknown'
        };

        // Fetch manager name if managerId exists
        if (group.managerId) {
          this.fetchManagerName(group.managerId);
          details['Manager'] = this.managerNames[group.managerId] || 'Loading...';
        } else {
          details['Manager'] = 'No manager assigned';
        }

        return details;
      default:
        return {};
    }
  }

  /**
   * Fetches and caches manager name by ID
   */
  private fetchManagerName(managerId: string): void {
    // If we already have the manager name cached and it's not a loading state, don't fetch again
    if (this.managerNames[managerId] && this.managerNames[managerId] !== 'Loading...') {
      return;
    }

    // Set loading state
    this.managerNames[managerId] = 'Loading...';

    // Fetch manager details
    this.userService.getUserById(managerId).subscribe({
      next: (userData) => {
        if (userData && userData.username) {
          this.managerNames[managerId] = userData.username;
          console.log(`Manager name fetched: ${userData.username} for ID: ${managerId}`);
        } else {
          this.managerNames[managerId] = 'Unknown Manager';
          console.warn(`Manager data incomplete for ID: ${managerId}`);
        }
        
        // Trigger change detection to update the panel if it's currently showing this group
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching manager details:', error);
        this.managerNames[managerId] = 'Error loading manager';
        this.cdr.detectChanges();
      }
    });
  }

  // ======================== FILTERING METHODS ========================

  /**
   * Toggle filter panel visibility
   */
  toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
    
    // Emit filter state to header
    window.dispatchEvent(new CustomEvent('filter-state-changed', { 
      detail: { 
        isOpen: this.isFilterPanelOpen,
        activeFiltersCount: this.getActiveFiltersCount()
      } 
    }));
    
    // Auto-focus search input when panel opens
    if (this.isFilterPanelOpen) {
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 150);
    }
    
    // Trigger canvas resize to accommodate filter panel
    setTimeout(() => this.resizeCanvas(), 100);
  }

  /**
   * Helper method to safely check if a task status filter is active
   */
  isTaskStatusActive(status: string): boolean {
    return this.filters.taskStatus[status] || false;
  }

  /**
   * Helper method to safely check if a user status filter is active
   */
  isUserStatusActive(status: string): boolean {
    return this.filters.userStatus[status] || false;
  }

  /**
   * Helper method to safely check if a group status filter is active
   */
  isGroupStatusActive(status: string): boolean {
    return this.filters.groupStatus[status] || false;
  }

  /**
   * Helper method to safely check if an assignment status filter is active
   */
  isAssignmentStatusActive(status: string): boolean {
    return this.filters.assignmentStatus[status] || false;
  }

  /**
   * Apply all active filters to the nodes
   */
  applyFilters(): void {
    console.log('Applying filters...');
    
    this.filteredNodes = this.allNodes.filter(node => {
      // Node type filter
      if (!this.filters.nodeTypes[node.type]) {
        return false;
      }

      // Search term filter
      if (this.filters.searchTerm) {
        const searchTerm = this.filters.searchTerm.toLowerCase();
        const nodeLabel = node.label.toLowerCase();
        let searchableText = nodeLabel;

        // Add additional searchable fields based on node type
        if (node.type === 'task') {
          const task = node.data as Task;
          searchableText += ` ${task.description || ''} ${task.status || ''}`.toLowerCase();
        } else if (node.type === 'user') {
          const user = node.data as User;
          searchableText += ` ${user.email || ''} ${user.roles?.join(' ') || ''}`.toLowerCase();
        } else if (node.type === 'group') {
          const group = node.data as Group;
          searchableText += ` ${group.description || ''}`.toLowerCase();
        }

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Task-specific filters
      if (node.type === 'task') {
        const task = node.data as Task;
        
        // Task status filter
        if (!this.filters.taskStatus.all) {
          const statusMatches = Object.keys(this.filters.taskStatus)
            .filter(key => key !== 'all' && this.filters.taskStatus[key as keyof typeof this.filters.taskStatus])
            .includes(task.status);
          
          if (!statusMatches) {
            return false;
          }
        }

        // Assignment status filter
        if (!this.filters.assignmentStatus.all) {
          const isAssigned = (task.assignedUserIds && task.assignedUserIds.length > 0) || 
                           (task.assignedGroupIds && task.assignedGroupIds.length > 0);
          
          if (this.filters.assignmentStatus.assigned && !isAssigned) {
            return false;
          }
          if (this.filters.assignmentStatus.unassigned && isAssigned) {
            return false;
          }
        }

        // Date range filter
        if (this.filters.dateRange.startDate || this.filters.dateRange.endDate) {
          const taskDate = task.dueAt || task.startAt;
          if (taskDate) {
            const taskDateTime = new Date(taskDate).getTime();
            
            if (this.filters.dateRange.startDate) {
              const startTime = new Date(this.filters.dateRange.startDate).getTime();
              if (taskDateTime < startTime) {
                return false;
              }
            }
            
            if (this.filters.dateRange.endDate) {
              const endTime = new Date(this.filters.dateRange.endDate).getTime();
              if (taskDateTime > endTime) {
                return false;
              }
            }
          }
        }
      }

      // User-specific filters
      if (node.type === 'user') {
        const user = node.data as User;
        
        // User status filter
        if (!this.filters.userStatus.all) {
          if (this.filters.userStatus.active && !user.isActive) {
            return false;
          }
          if (this.filters.userStatus.inactive && user.isActive) {
            return false;
          }
        }
      }

      // Group-specific filters
      if (node.type === 'group') {
        const group = node.data as Group;
        
        // Group status filter
        if (!this.filters.groupStatus.all) {
          if (this.filters.groupStatus.active && !group.isActive) {
            return false;
          }
          if (this.filters.groupStatus.inactive && group.isActive) {
            return false;
          }
        }
      }

      return true;
    });

    // Update nodes reference to filtered nodes
    this.nodes = this.filteredNodes;
    
    console.log(`Filtered ${this.allNodes.length} nodes to ${this.filteredNodes.length} nodes`);
    
    // Emit filter count to header
    window.dispatchEvent(new CustomEvent('filter-state-changed', { 
      detail: { 
        isOpen: this.isFilterPanelOpen,
        activeFiltersCount: this.getActiveFiltersCount()
      } 
    }));
    
    // Redraw the canvas with filtered nodes
    this.draw();
  }

  /**
   * Reset all filters to default state
   */
  resetFilters(): void {
    this.filters = {
      nodeTypes: {
        task: true,
        user: true,
        group: true
      } as NodeTypesFilter,
      taskStatus: {
        all: true,
        pending: false,
        in_progress: false,
        completed: false,
        archived: false
      } as TaskStatusFilter,
      userStatus: {
        all: true,
        active: false,
        inactive: false
      } as UserStatusFilter,
      groupStatus: {
        all: true,
        active: false,
        inactive: false
      } as GroupStatusFilter,
      searchTerm: '',
      dateRange: {
        startDate: '',
        endDate: ''
      },
      assignmentStatus: {
        all: true,
        assigned: false,
        unassigned: false
      } as AssignmentStatusFilter
    };

    this.applyFilters();
  }

  /**
   * Handle node type filter changes
   */
  onNodeTypeFilterChange(nodeType: 'task' | 'user' | 'group'): void {
    this.filters.nodeTypes[nodeType] = !this.filters.nodeTypes[nodeType];
    this.applyFilters();
  }

  /**
   * Handle task status filter changes
   */
  onTaskStatusFilterChange(status: string): void {
    if (status === 'all') {
      this.filters.taskStatus.all = !this.filters.taskStatus.all;
      
      // If "all" is selected, deselect others
      if (this.filters.taskStatus.all) {
        Object.keys(this.filters.taskStatus).forEach(key => {
          if (key !== 'all') {
            this.filters.taskStatus[key as keyof typeof this.filters.taskStatus] = false;
          }
        });
      }
    } else {
      this.filters.taskStatus[status as keyof typeof this.filters.taskStatus] = 
        !this.filters.taskStatus[status as keyof typeof this.filters.taskStatus];
      
      // If any specific status is selected, deselect "all"
      if (this.filters.taskStatus[status as keyof typeof this.filters.taskStatus]) {
        this.filters.taskStatus.all = false;
      }
      
      // If no specific status is selected, select "all"
      const anySpecificSelected = Object.keys(this.filters.taskStatus)
        .filter(key => key !== 'all')
        .some(key => this.filters.taskStatus[key as keyof typeof this.filters.taskStatus]);
      
      if (!anySpecificSelected) {
        this.filters.taskStatus.all = true;
      }
    }
    
    this.applyFilters();
  }

  /**
   * Handle user status filter changes
   */
  onUserStatusFilterChange(status: string): void {
    if (status === 'all') {
      this.filters.userStatus.all = !this.filters.userStatus.all;
      if (this.filters.userStatus.all) {
        this.filters.userStatus.active = false;
        this.filters.userStatus.inactive = false;
      }
    } else {
      this.filters.userStatus[status as keyof typeof this.filters.userStatus] = 
        !this.filters.userStatus[status as keyof typeof this.filters.userStatus];
      
      if (this.filters.userStatus[status as keyof typeof this.filters.userStatus]) {
        this.filters.userStatus.all = false;
      }
      
      const anySpecificSelected = this.filters.userStatus.active || this.filters.userStatus.inactive;
      if (!anySpecificSelected) {
        this.filters.userStatus.all = true;
      }
    }
    
    this.applyFilters();
  }

  /**
   * Handle group status filter changes
   */
  onGroupStatusFilterChange(status: string): void {
    if (status === 'all') {
      this.filters.groupStatus.all = !this.filters.groupStatus.all;
      if (this.filters.groupStatus.all) {
        this.filters.groupStatus.active = false;
        this.filters.groupStatus.inactive = false;
      }
    } else {
      this.filters.groupStatus[status as keyof typeof this.filters.groupStatus] = 
        !this.filters.groupStatus[status as keyof typeof this.filters.groupStatus];
      
      if (this.filters.groupStatus[status as keyof typeof this.filters.groupStatus]) {
        this.filters.groupStatus.all = false;
      }
      
      const anySpecificSelected = this.filters.groupStatus.active || this.filters.groupStatus.inactive;
      if (!anySpecificSelected) {
        this.filters.groupStatus.all = true;
      }
    }
    
    this.applyFilters();
  }

  /**
   * Handle assignment status filter changes
   */
  onAssignmentStatusFilterChange(status: string): void {
    if (status === 'all') {
      this.filters.assignmentStatus.all = !this.filters.assignmentStatus.all;
      if (this.filters.assignmentStatus.all) {
        this.filters.assignmentStatus.assigned = false;
        this.filters.assignmentStatus.unassigned = false;
      }
    } else {
      this.filters.assignmentStatus[status as keyof typeof this.filters.assignmentStatus] = 
        !this.filters.assignmentStatus[status as keyof typeof this.filters.assignmentStatus];
      
      if (this.filters.assignmentStatus[status as keyof typeof this.filters.assignmentStatus]) {
        this.filters.assignmentStatus.all = false;
      }
      
      const anySpecificSelected = this.filters.assignmentStatus.assigned || this.filters.assignmentStatus.unassigned;
      if (!anySpecificSelected) {
        this.filters.assignmentStatus.all = true;
      }
    }
    
    this.applyFilters();
  }

  /**
   * Handle search term changes
   */
  onSearchTermChange(): void {
    this.applyFilters();
  }

  /**
   * Clear search term
   */
  clearSearch(): void {
    this.filters.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Handle date range changes
   */
  onDateRangeChange(): void {
    this.applyFilters();
  }

  /**
   * Get count of nodes for a specific type
   */
  getNodeTypeCount(nodeType: 'task' | 'user' | 'group'): number {
    return this.allNodes.filter(node => node.type === nodeType).length;
  }

  /**
   * Get count of filtered nodes for a specific type
   */
  getFilteredNodeTypeCount(nodeType: 'task' | 'user' | 'group'): number {
    return this.filteredNodes.filter(node => node.type === nodeType).length;
  }

  /**
   * Get count of active filters
   */
  getActiveFiltersCount(): number {
    let count = 0;
    
    // Check node types (count as active if any type is disabled)
    const allNodeTypesEnabled = this.filters.nodeTypes.task && 
                               this.filters.nodeTypes.user && 
                               this.filters.nodeTypes.group;
    if (!allNodeTypesEnabled) count++;
    
    // Check search term
    if (this.filters.searchTerm.trim()) count++;
    
    // Check task status filters
    if (!this.filters.taskStatus.all) count++;
    
    // Check user status filters
    if (!this.filters.userStatus.all) count++;
    
    // Check group status filters
    if (!this.filters.groupStatus.all) count++;
    
    // Check assignment status filters
    if (!this.filters.assignmentStatus.all) count++;
    
    // Check date range filters
    if (this.filters.dateRange.startDate || this.filters.dateRange.endDate) count++;
    
    return count;
  }

  // ======================== QUICK FILTER METHODS ========================

  /**
   * Quick filter to show only tasks
   */
  quickFilterTasksOnly(): void {
    this.resetFilters();
    this.filters.nodeTypes.user = false;
    this.filters.nodeTypes.group = false;
    this.applyFilters();
  }

  /**
   * Quick filter to show only users
   */
  quickFilterUsersOnly(): void {
    this.resetFilters();
    this.filters.nodeTypes.task = false;
    this.filters.nodeTypes.group = false;
    this.applyFilters();
  }

  /**
   * Quick filter to show only groups
   */
  quickFilterGroupsOnly(): void {
    this.resetFilters();
    this.filters.nodeTypes.task = false;
    this.filters.nodeTypes.user = false;
    this.applyFilters();
  }

  /**
   * Quick filter to show only unassigned tasks
   */
  quickFilterUnassignedTasks(): void {
    this.resetFilters();
    this.filters.nodeTypes.user = false;
    this.filters.nodeTypes.group = false;
    this.filters.assignmentStatus.all = false;
    this.filters.assignmentStatus.unassigned = true;
    this.applyFilters();
  }
}
