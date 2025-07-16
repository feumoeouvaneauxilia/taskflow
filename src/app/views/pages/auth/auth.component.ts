import { Component } from '@angular/core';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  // This boolean will control which panel is active
  isActive = false;

  // Method to set state for the registration form
  onRegisterClick() {
    this.isActive = true;
  }

  // Method to set state for the login form
  onLoginClick() {
    this.isActive = false;
  }
}