import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';
import { GroupService, Group as GroupInterface, AddMembersDto } from '../../../services/group/group.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 

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

@Component({
  selector: 'app-dash',
  templateUrl: './dash.component.html',
  styleUrls: ['./dash.component.scss'],
  imports: [FormsModule, CommonModule]
})
export class DashComponent implements AfterViewInit {
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

  // Drag and Drop properties
  isDragging = false;
  draggedNode: Node | null = null;
  dropTargetNode: Node | null = null;

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

  ngAfterViewInit() {
    this.resizeCanvas();
    this.attachCanvasEvents();
    this.loadData();
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
    
    // Update container class for panel state
    if (this.isPanelOpen) {
      container.classList.add('panel-open');
    } else {
      container.classList.remove('panel-open');
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
    // Close panel when Escape key is pressed
    if (event.key === 'Escape' && this.isPanelOpen) {
      this.closePanel();
    }
  }

  async loadData() {
    try {
      console.log('Loading dashboard data...');
      
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

      // Create dummy data if no real data is available
      if (tasks.length === 0 && users.length === 0 && groups.length === 0) {
        console.log('No data found, creating dummy data for demonstration');
        this.createDummyData();
      } else {
        this.createNodes(tasks, users, groups);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      console.log('Creating dummy data due to error');
      this.createDummyData();
    }
  }

  createDummyData() {
    const dummyTasks: Task[] = [
      { id: '1', name: 'Design UI', status: 'In Progress', assignedUserIds: ['user1'] },
      { id: '2', name: 'Backend API', status: 'Pending', assignedUserIds: ['user2'] },
      { id: '3', name: 'Testing', status: 'Completed', assignedUserIds: ['user1', 'user2'] }
    ];

    const dummyUsers: User[] = [
      { id: 'user1', username: 'Alice', email: 'alice@example.com' },
      { id: 'user2', username: 'Bob', email: 'bob@example.com' },
      { id: 'user3', username: 'Charlie', email: 'charlie@example.com' }
    ];

    const dummyGroups: GroupInterface[] = [
      { id: 'group1', name: 'Developers', memberIds: ['user1', 'user2'], managerId: 'user1', description: 'Dev team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'group2', name: 'Designers', memberIds: ['user3'], managerId: 'user3', description: 'Design team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];

    console.log('Creating nodes with dummy data');
    this.createNodes(dummyTasks, dummyUsers, dummyGroups);
  }

  createNodes(tasks: Task[], users: User[], groups: GroupInterface[]) {
    const canvas = this.canvasRef.nativeElement;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('Center point:', centerX, centerY);
    
    this.nodes = [];
    const allItems = [
      ...tasks.map(task => ({ item: task, type: 'task' as const })),
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

      this.nodes.push(node);
    });

    console.log('Total nodes created:', this.nodes.length);
    this.draw();
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
          canvas.style.cursor = potentialDropTarget ? 'copy' : 'grabbing';
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
      canvas.classList.remove('grabbing');
      canvas.style.cursor = 'grab';
      this.draw();
    });
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
      let color = '#10b981'; // Default green
      
      // Different colors based on drag type
      if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'user') {
        color = '#06b6d4'; // Cyan for task-to-user
      } else if (this.draggedNode.type === 'task' && this.dropTargetNode.type === 'group') {
        color = '#9c27b0'; // Purple for task-to-group
      } else if (this.draggedNode.type === 'user' && this.dropTargetNode.type === 'group') {
        color = '#f59e0b'; // Orange for user-to-group
      }
      
      this.drawConnection(ctx, this.draggedNode, this.dropTargetNode, color, 0.8, 'Preview');
    }
  }

  private drawConnection(ctx: CanvasRenderingContext2D, node1: Node, node2: Node, color: string, opacity: number, type: string = '') {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = type === 'Preview' ? 4 : 2;
    
    if (type === 'Preview') {
      ctx.setLineDash([8, 4]); // Animated dashed line for preview
    } else {
      ctx.setLineDash([5, 5]); // Regular dashed line
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
    
    // Draw arrow head for better direction indication
    if (distance > 0) {
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      const angle = Math.atan2(dy, dx);
      
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

  // Task Assignment Handler (existing functionality)
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
    } else if (targetNode.type === 'group') {
      const group = targetNode.data as Group;
      const groupId = group.id;
      
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

  // User to Group Assignment Handler
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
    if (group.memberIds && group.memberIds.includes(userId)) {
      this.showAssignmentFeedback(`${user.username} is already a member of ${group.name}`, false);
      return;
    }

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
        return {
          'Name': group.name,
          'Description': group.description || 'No description',
          'Manager ID': group.managerId || 'No manager assigned',
          'Members Count': group.memberIds?.length || 0,
          'Is Active': group.isActive ? 'Active' : 'Inactive',
          'Created At': group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown',
          'Created By': group.createdById || 'Unknown'
        };
      default:
        return {};
    }
  }
}
