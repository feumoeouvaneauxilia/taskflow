import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  isActive = false;
  isLoading = false;
  errorMessage = '';

  // Password visibility toggles
  loginPasswordVisible = false;
  registerPasswordVisible = false;

  // Form Groups
  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { email, password } = this.loginForm.value;
    
    this.authService.login({ email, password }).subscribe({
      next: (response: { accessToken: string; refreshToken: string; }) => {
        this.authService.saveToken(response.accessToken); // This will now also save username
        // Refresh notifications after successful login
        this.notificationService.refreshNotifications();
        this.router.navigate(['/dashboard/dash']);
      },
      error: (err: string) => {
        this.errorMessage = err || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      },
      complete: () => this.isLoading = false
    });
  }

  onRegister() {
    if (this.registerForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { username, email, password } = this.registerForm.value;
    
    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.isActive = false;
        this.loginForm.patchValue({ email, password });
        this.errorMessage = 'Registration successful! Please login.';
      },
      error: (err: string) => {
        this.errorMessage = err || 'Registration failed. Please try again.';
        this.isLoading = false;
      },
      complete: () => this.isLoading = false
    });
  }

  onLoginClick() {
    this.isActive = false;
    this.errorMessage = '';
  }

  onRegisterClick() {
    this.isActive = true;
    this.errorMessage = '';
  }
}