import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { BlochSphereComponent, BlochPhase } from './bloch-sphere/bloch-sphere.component';

interface ToolSection {
  id: string;
  phase: BlochPhase;
  eyebrow: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, BlochSphereComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  protected readonly env = environment;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('heroSection') heroSection!: ElementRef<HTMLElement>;
  @ViewChild('magneticBtn') magneticBtn!: ElementRef<HTMLElement>;

  // Scroll state
  scrollProgress = 0;
  activePhase: BlochPhase = 'hero';
  sphereOffset = 0;
  headerVisible = true;
  headerCompact = false;
  scrollIndicatorProgress = 0;

  // Hover state
  hoveredNode: string | null = null;

  // Magnetic button
  magneticX = 0;
  magneticY = 0;

  // Parallax
  gridOffsetY = 0;

  // Active section for scroll-spy
  activeSectionIndex = -1;

  sections: ToolSection[] = [
    {
      id: 'quCo',
      phase: 'quCo',
      eyebrow: '01 · GENERATE',
      title: 'QuCo',
      body: 'Generates optimized quantum circuits with provably efficient gate decompositions. Reduce depth, shrink ancillas, and ship code that runs on real hardware.'
    },
    {
      id: 'quTe',
      phase: 'quTe',
      eyebrow: '02 · TEST',
      title: 'QuTe',
      body: 'Synthesizes test cases that exercise basis states and entangled configurations. Catch logic regressions before they collapse into noise.'
    },
    {
      id: 'quMu',
      phase: 'quMu',
      eyebrow: '03 · MUTATE',
      title: 'QuMu',
      body: 'Injects controlled mutations into your circuit — phase flips, gate swaps, decoherence — to measure how robust your test suite really is.'
    },
    {
      id: 'quaCo',
      phase: 'quaCo',
      eyebrow: '04 · ANNEAL',
      title: 'QuaCo',
      body: 'Solves the hard optimization problems with quantum annealing. The system relaxes into its minimum-energy state — and so does your workload.'
    }
  ];

  private lastScrollTop = 0;
  private scrollTimeout: any;
  private resizeObserver?: ResizeObserver;

  constructor(
    private authService: AuthService,
    private router: Router,
    private el: ElementRef
  ) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    // Set up scroll observer
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

    // Header hide/show on scroll direction
    if (scrollTop > this.lastScrollTop && scrollTop > 80) {
      this.headerVisible = false;
    } else {
      this.headerVisible = true;
    }
    this.headerCompact = scrollTop > 50;
    this.lastScrollTop = scrollTop;

    // Parallax grid
    this.gridOffsetY = scrollTop * 0.3;

    // Phase detection based on scroll position (Exact math, no IntersectionObserver bugs)
    const vh = window.innerHeight;

    const cardsEnd = vh * 0.5 + vh * this.sections.length;

    if (scrollTop < vh * 0.5) {
      this.activePhase = 'hero';
      this.activeSectionIndex = -1;
    } else {
      // Calculate which card is most central
      const scrollInCards = scrollTop - vh * 0.5;
      const index = Math.floor(scrollInCards / vh);

      if (index >= 0 && index < this.sections.length) {
        this.activePhase = this.sections[index].phase;
        this.activeSectionIndex = index;
      } else {
        // Scrolled past the cards (at the bottom / final CTA)
        this.activePhase = 'hero';
        this.activeSectionIndex = this.sections.length;
      }
    }

    // Sphere offset: starts at 0 (centered) → 1 (shifted left) → returns to 0 at the bottom
    if (scrollTop < vh * 0.5) {
      this.sphereOffset = 0;
    } else if (scrollTop < vh) {
      this.sphereOffset = (scrollTop - vh * 0.5) / (vh * 0.5);
    } else if (scrollTop < cardsEnd - vh * 0.5) {
      this.sphereOffset = 1;
    } else if (scrollTop < cardsEnd) {
      // Smoothly transition back to 0 as we enter final CTA
      this.sphereOffset = 1 - (scrollTop - (cardsEnd - vh * 0.5)) / (vh * 0.5);
    } else {
      this.sphereOffset = 0;
    }

    // Scroll indicator progress
    this.scrollIndicatorProgress = this.scrollProgress;
  }

  private setupScrollObserver(): void {
    // Replaced by exact math in onWindowScroll to prevent bugs when scrolling up.
  }

  // Magnetic button effect
  onMagneticMove(event: MouseEvent): void {
    const btn = this.magneticBtn?.nativeElement;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = event.clientX - centerX;
    const distY = event.clientY - centerY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    const maxDist = 120;

    if (dist < maxDist) {
      const strength = 1 - dist / maxDist;
      this.magneticX = distX * strength * 0.4;
      this.magneticY = distY * strength * 0.4;
    } else {
      this.magneticX = 0;
      this.magneticY = 0;
    }
  }

  onMagneticLeave(): void {
    this.magneticX = 0;
    this.magneticY = 0;
  }

  onNodeHover(label: string | null): void {
    this.hoveredNode = label;
  }

  checkSession(): void {
    this.authService.getUser().subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  isSectionVisible(index: number): boolean {
    return Math.abs(this.activeSectionIndex - index) <= 1;
  }
}
