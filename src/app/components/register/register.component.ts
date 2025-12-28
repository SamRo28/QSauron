import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      pwd: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('pwd');
    const confirmPassword = form.get('confirmPassword');

    // Strict Password Rules
    if (password && password.value) {
      const value = password.value;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumeric = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      const minLength = value.length >= 8;

      if (!hasUpperCase || !hasLowerCase || !hasNumeric || !hasSpecialChar || !minLength) {
        password.setErrors({
          ...password.errors,
          strictPassword: true
        });
      } else {
        // Clear strictPassword error if valid, preserving other errors if any
        if (password.errors) {
          delete password.errors['strictPassword'];
          if (Object.keys(password.errors).length === 0) {
            password.setErrors(null);
          }
        }
      }
    }

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // Convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  // Password validation helpers for UI
  get passwordValue(): string {
    return this.registerForm.get('pwd')?.value || '';
  }

  get hasMinLength() { return this.passwordValue.length >= 8; }
  get hasUpperCase() { return /[A-Z]/.test(this.passwordValue); }
  get hasLowerCase() { return /[a-z]/.test(this.passwordValue); }
  get hasNumeric() { return /[0-9]/.test(this.passwordValue); }
  get hasSpecialChar() { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.passwordValue); }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';

    // Stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, pwd } = this.registerForm.value;

    this.authService.register({ email, pwd })
      .subscribe({
        next: () => {
          this.success = 'User registered successfully. Redirecting to 2FA setup...';
          // Store email for 2FA setup
          sessionStorage.setItem('email', email);
          setTimeout(() => {
            this.router.navigate(['/2fa-qr']);
          }, 2000);
        },
        error: (error: Error) => {
          this.error = error.message;
          this.loading = false;
        }
      });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
