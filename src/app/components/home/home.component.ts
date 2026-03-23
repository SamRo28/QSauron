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
    // Session check is now triggered manually via checkSession button
  }

  checkSession() {
    this.authService.getUser().subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
