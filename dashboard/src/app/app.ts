import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  imports: [CommonModule, RouterModule],
  selector: 'app-root',
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
    }
  `]
})
export class App implements OnInit {
  protected title = 'Task Management Dashboard';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check authentication status and redirect accordingly
    if (this.authService.isAuthenticated()) {
      // User is logged in, allow them to continue
      if (this.router.url === '/login') {
        this.router.navigate(['/dashboard']);
      }
    } else {
      // User is not logged in, redirect to login
      if (this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    }
  }
}
