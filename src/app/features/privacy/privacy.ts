import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type PrivacyLanguage = 'es' | 'en';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class PrivacyComponent {
  readonly language = signal<PrivacyLanguage>('es');

  setLanguage(language: PrivacyLanguage): void {
    this.language.set(language);
  }
}
