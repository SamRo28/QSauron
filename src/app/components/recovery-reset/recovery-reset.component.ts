import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recovery-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recovery-reset.component.html',
  styleUrls: ['./recovery-reset.component.css']
})
export class RecoveryResetComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = false;
  email = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.email = sessionStorage.getItem('recoveryEmail') || '';
    if (!this.email) {
      this.router.navigate(['/recovery/request']);
    }
  }

  // Custom validator: strict password rules + match check
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
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
        if (password.errors) {
          delete password.errors['strictPassword'];
          if (Object.keys(password.errors).length === 0) {
            password.setErrors(null);
          }
        }
      }
    }

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { mismatch: true };
    }
    return null;
  }

  get f() { return this.resetForm.controls; }

  // Password validation helpers for UI
  get passwordValue(): string {
    return this.resetForm.get('newPassword')?.value || '';
  }

  get hasMinLength() { return this.passwordValue.length >= 8; }
  get hasUpperCase() { return /[A-Z]/.test(this.passwordValue); }
  get hasLowerCase() { return /[a-z]/.test(this.passwordValue); }
  get hasNumeric() { return /[0-9]/.test(this.passwordValue); }
  get hasSpecialChar() { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.passwordValue); }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;
    const newPassword = this.resetForm.value.newPassword;

    this.authService.resetPassword(this.email, newPassword)
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          // Clear session storage used for recovery
          sessionStorage.removeItem('recoveryEmail');
          sessionStorage.removeItem('recoveryTokenId');

          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        },
        error: (err) => {
          this.error = 'Could not reset password. Your session might have expired.';
          this.loading = false;
        }
      });
  }
}
