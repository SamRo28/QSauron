import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recovery-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recovery-request.component.html',
  styleUrls: ['./recovery-request.component.css']
})
export class RecoveryRequestComponent {
  recoveryForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.recoveryForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.recoveryForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.recoveryForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.requestRecovery(this.recoveryForm.value.email)
      .subscribe({
        next: (response: string) => {
          console.log('Recovery request raw response:', response);
          this.loading = false;
          
          let tokenId = '';
          try {
            // Try to parse as JSON if it's an object string
            const parsed = JSON.parse(response);
            tokenId = parsed.tokenId || (typeof parsed === 'string' ? parsed : '');
          } catch (e) {
            // If not JSON, assume it's the raw UUID string
            tokenId = response;
          }

          if (tokenId) {
            this.success = true;
            // Store tokenId and email for the next step
            sessionStorage.setItem('recoveryEmail', this.recoveryForm.value.email);
            sessionStorage.setItem('recoveryTokenId', tokenId);
            
            console.log('Stored in sessionStorage:', {
              email: sessionStorage.getItem('recoveryEmail'),
              tokenId: sessionStorage.getItem('recoveryTokenId')
            });

            // Redirect to validation step after a short delay
            setTimeout(() => {
              console.log('Navigating to /recovery/validate');
              this.router.navigate(['/recovery/validate']);
            }, 1000);
          } else {
            console.error('No tokenId found in response');
            this.error = 'Server error: No recovery token received.';
          }
        },
        error: (err) => {
          console.error('Recovery request error:', err);
          this.error = 'Could not initiate recovery. Please check your email.';
          this.loading = false;
        }
      });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
