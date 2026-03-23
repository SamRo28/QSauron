import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.css']
})
export class CookieConsentComponent implements OnInit {
  public showConsent = false;
  private readonly COOKIE_KEY = 'qsauron_cookie_consent';

  ngOnInit(): void {
    const consentLevel = localStorage.getItem(this.COOKIE_KEY);
    if (!consentLevel) {
      this.showConsent = true;
    }
  }

  public acceptAllCookies(): void {
    localStorage.setItem(this.COOKIE_KEY, 'all');
    this.showConsent = false;
  }

  public acceptEssentialCookies(): void {
    localStorage.setItem(this.COOKIE_KEY, 'essential');
    this.showConsent = false;
  }
}
