import { Component, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-fa2-code',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fa2-code.component.html',
  styleUrls: ['./fa2-code.component.css']
})
export class Fa2Code {
  @ViewChildren('digitInput')
  inputs!: QueryList<ElementRef>;

  verificationCode: string = '';

  constructor(private router: Router, private authService: AuthService) { }

  onInput(event: any, current: HTMLInputElement, next: HTMLInputElement | null): void {
    const value = event.target.value;

    // Solo permitir números
    if (!/^\d*$/.test(value)) {
      event.target.value = '';
      return;
    }

    // Si hay valor y hay siguiente input, enfocar el siguiente
    if (value && next) {
      next.focus();
    }

    // Actualizar el código completo
    this.updateVerificationCode();
  }

  onKeyDown(event: KeyboardEvent, prev: HTMLInputElement | null, current: HTMLInputElement): void {
    if (event.key === 'Enter') {
      this.updateVerificationCode();
      this.verifyCode();
      return;
    }

    // Si presiona backspace y el campo actual está vacío, ir al anterior
    if (event.key === 'Backspace' && !current.value && prev) {
      prev.focus();
      event.preventDefault();
    }

    // Si presiona una tecla que no es número, backspace, tab o flechas, prevenir
    if (!/^\d$/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Tab' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Enter') {
      event.preventDefault();
    }
  }

  updateVerificationCode(): void {
    const inputElements = this.inputs.toArray();
    this.verificationCode = inputElements
      .map((input: ElementRef) => input.nativeElement.value)
      .join('');
  }

  verifyCode(): void {
    const email = sessionStorage.getItem('email') || '';

    if (!this.verificationCode || this.verificationCode.trim() === '') {
      alert('Introduce el código de verificación antes de enviar.');
      return;
    }


    this.authService.verify2FACode(email, this.verificationCode).subscribe({
      next: (res: any) => {
        // Backend now returns JSON and sets cookies
        this.authService.setSession(email);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        console.error('Error verificando 2FA:', err);
        alert('Código inválido o error en el servidor. Revisa el código e inténtalo de nuevo.');
      }
    });
  }



  goBack(): void {
    this.router.navigate(['/login']);
  }



}