import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('login');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly authForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();

    if (session) {
      await this.router.navigateByUrl('/dashboard');
    }
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.authForm.markAsUntouched();
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { email, password } = this.authForm.getRawValue();

      if (this.mode() === 'login') {
        await this.authService.signIn(email, password);
        await this.router.navigateByUrl('/dashboard');
        return;
      }

      const result = await this.authService.signUp(email, password);

      if (result.session) {
        await this.router.navigateByUrl('/dashboard');
        return;
      }

      this.setMode('login');
      this.successMessage.set('Cuenta creada. Revisa tu email para confirmar el acceso.');
    } catch (error) {
      this.errorMessage.set(this.getFriendlyError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getFriendlyError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No pudimos completar la autenticacion. Proba nuevamente.';
  }
}
