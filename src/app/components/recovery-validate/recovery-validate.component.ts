import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recovery-validate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recovery-validate.component.html',
  styleUrls: ['./recovery-validate.component.css']
})
export class RecoveryValidateComponent implements OnInit {
  validateForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  email = '';
  tokenId = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.validateForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    this.email = sessionStorage.getItem('recoveryEmail') || '';
    this.tokenId = sessionStorage.getItem('recoveryTokenId') || '';
    
    console.log('RecoveryValidateComponent init:', { email: this.email, tokenId: this.tokenId });

    if (!this.email || !this.tokenId) {
      console.warn('Missing recovery data, redirecting back to request');
      this.router.navigate(['/recovery/request']);
    }
  }

  get f() { return this.validateForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.validateForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.validateRecoveryCode(this.email, this.tokenId, this.validateForm.value.code)
      .subscribe({
        next: () => {
          this.loading = false;
          // Redirect to reset password step
          this.router.navigate(['/recovery/reset']);
        },
        error: (err) => {
          this.error = 'Invalid code. Please try again.';
          this.loading = false;
        }
      });
  }

  resendCode() {
    // Optionally implement resend logic by navigating back or calling the request endpoint again
    this.router.navigate(['/recovery/request']);
  }
}
