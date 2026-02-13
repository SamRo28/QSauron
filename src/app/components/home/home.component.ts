import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})


export class HomeComponent implements OnInit {
  protected readonly env = environment;
  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authService.getUser().subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        // User not logged in, stay on home page
      }
    });
  }

  checkSession() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
