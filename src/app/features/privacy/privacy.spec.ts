import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyComponent } from './privacy';

describe('PrivacyComponent', () => {
  let fixture: ComponentFixture<PrivacyComponent>;
  let component: PrivacyComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
  });

  it('should show the Spanish policy by default', () => {
    fixture.detectChanges();

    expect(component.language()).toBe('es');
    expect(fixture.nativeElement.textContent).toContain('Política de privacidad');
  });

  it('should switch the policy language to English', () => {
    component.setLanguage('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Privacy Policy');
    expect(fixture.nativeElement.textContent).toContain('Back to sign in');
  });
});
