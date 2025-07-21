import { Component, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { TaskService } from '../../../services/task/task.service';
import { FormsModule } from '@angular/forms'; 
interface Task {
  name: string;
  // ...other properties...
}

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}

@Component({
  selector: 'app-dash',
  templateUrl: './dash.component.html',
  styleUrls: ['./dash.component.scss'],
  imports: [FormsModule]
})
export class DashComponent implements AfterViewInit {
  @ViewChild('graphCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  nodes: Node[] = [];
  selectedNode: Node | null = null;
  isPanning = false;
  lastMouseX = 0;
  lastMouseY = 0;
  offsetX = 0;
  offsetY = 0;
  scale = 1;

  readonly NODE_RADIUS = 30;
  readonly NODE_COLOR = '#4299e1';
  readonly NODE_BORDER_COLOR = '#2b6cb0';
  readonly NODE_TEXT_COLOR = '#ffffff';
  readonly NODE_HIGHLIGHT_COLOR = '#f6ad55';

  constructor(private taskService: TaskService) {}

  ngAfterViewInit() {
    this.resizeCanvas();
    this.attachCanvasEvents();
    this.loadTasks();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.draw();
  }

  loadTasks() {
    this.taskService.getTasks().subscribe((tasks: Task[]) => {
      // Place nodes in a circle for demo, or center if only one
      const centerX = this.canvasRef.nativeElement.width / 2;
      const centerY = this.canvasRef.nativeElement.height / 2;
      const radius = 120;
      this.nodes = tasks.map((task, i) => {
        const angle = (2 * Math.PI * i) / Math.max(tasks.length, 1);
        return {
          id: `task_${i}`,
          x: centerX + (tasks.length > 1 ? radius * Math.cos(angle) : 0),
          y: centerY + (tasks.length > 1 ? radius * Math.sin(angle) : 0),
          label: task.name
        };
      });
      this.draw();
    });
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
        if (dist < this.NODE_RADIUS) {
          this.selectedNode = node;
          this.nodes.splice(i, 1);
          this.nodes.push(node);
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

    canvas.addEventListener('mousemove', (e) => {
      const { x: mouseX, y: mouseY } = getMouse(e);
      if (this.selectedNode) {
        this.selectedNode.x += (mouseX - this.lastMouseX) / this.scale;
        this.selectedNode.y += (mouseY - this.lastMouseY) / this.scale;
      } else if (this.isPanning) {
        this.offsetX += (mouseX - this.lastMouseX);
        this.offsetY += (mouseY - this.lastMouseY);
      }
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
      this.draw();
    });

    canvas.addEventListener('mouseup', () => {
      this.selectedNode = null;
      this.isPanning = false;
      canvas.classList.remove('grabbing');
    });

    canvas.addEventListener('mouseleave', () => {
      this.selectedNode = null;
      this.isPanning = false;
      canvas.classList.remove('grabbing');
    });
  }



  drawNode(ctx: CanvasRenderingContext2D, node: Node, isSelected: boolean) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, this.NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? this.NODE_HIGHLIGHT_COLOR : this.NODE_COLOR;
    ctx.fill();
    ctx.strokeStyle = this.NODE_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    ctx.fillStyle = this.NODE_TEXT_COLOR;
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  }

  draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    this.nodes.forEach(node => {
      this.drawNode(ctx, node, node === this.selectedNode);
    });
    ctx.restore();
  }
}
