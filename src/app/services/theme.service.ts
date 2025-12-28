import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    themeSignal = signal<string>('light');

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        this.initializeTheme();
    }

    private initializeTheme() {
        if (isPlatformBrowser(this.platformId)) {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else {
                // Check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.setTheme(prefersDark ? 'dark' : 'light');
            }
        }
    }

    setTheme(theme: string) {
        this.themeSignal.set(theme);
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('theme', theme);
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }

    toggleTheme() {
        const newTheme = this.themeSignal() === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    get isDark() {
        return this.themeSignal() === 'dark';
    }
}
