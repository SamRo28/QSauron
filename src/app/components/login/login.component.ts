import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      pwd: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  ngOnInit() {
    // We'll let HomeComponent or manual navigation handle this to avoid interference during login process
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    console.log('Attempting login for:', this.loginForm.value.email);

    this.authService.login(this.loginForm.value)
      .subscribe({
        next: (response: any) => {
          console.log('Login successful response:', response);
          
          // The backend might return:
          // 1. A plain string "2fa"
          // 2. An object { status: "2fa" }
          // 3. An object { token: "...", refreshToken: "..." }
          
          const is2FA = response === '2fa' || 
                        response?.status === '2fa' || 
                        response?.message === '2fa' ||
                        (typeof response === 'object' && Object.keys(response).length === 0); // fallback for empty obj if used for 2fa
          
          if (is2FA) {
            console.log('2FA required, redirecting...');
            sessionStorage.setItem('email', this.loginForm.value.email);
            this.router.navigate(['/2fa-code']);
          } else {
            console.log('Login success, setting session...');
            this.authService.setSession(this.loginForm.value.email);
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.error = 'Incorrect username or password';
          this.loading = false;
        }
      });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToRecovery() {
    this.router.navigate(['/recovery/request']);
  }
}
