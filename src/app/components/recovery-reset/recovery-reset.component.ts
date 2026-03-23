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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.email = sessionStorage.getItem('recoveryEmail') || '';
    if (!this.email) {
      this.router.navigate(['/recovery/request']);
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  get f() { return this.resetForm.controls; }

  togglePassword() {
    this.showPassword = !this.showPassword;
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
