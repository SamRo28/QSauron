import { Component, OnInit, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SideBarComponent } from '../side-bar/side-bar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SideBarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: string | null = null;
  showUserMenu: boolean = false;

  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  private themeService = inject(ThemeService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showUserMenu && this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
    }
  }

  get isDark() {
    return this.themeService.isDark;
  }

  get logoUrl() {
    return '/assets/logo.svg';
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();

    // Subscribe to authentication state changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout() {
    this.authService.logout();
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
