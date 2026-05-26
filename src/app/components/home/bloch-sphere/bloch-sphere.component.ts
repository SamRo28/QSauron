import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  OnChanges,
  SimpleChanges,
  NgZone
} from '@angular/core';
import * as THREE from 'three';

export type BlochPhase = 'hero' | 'quCo' | 'quTe' | 'quMu' | 'quaCo';

interface OrbitalNode {
  mesh: THREE.Mesh;
  label: string;
  baseAngle: number;
  angle: number;
  speed: number;
  orbitRadius: number;
  phase: BlochPhase;
}

// Colors will be fetched from CSS variables dynamically

@Component({
  selector: 'app-bloch-sphere',
  standalone: true,
  template: `<canvas #blochCanvas class="bloch-canvas"></canvas>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .bloch-canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
      outline: none;
    }
  `]
})
export class BlochSphereComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('blochCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() scrollProgress = 0;
  @Input() activePhase: BlochPhase = 'hero';
  @Input() hoveredNode: string | null = null;
  @Input() sphereOffset = 0;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;
  private clock = new THREE.Clock();

  // Main group
  private sphereGroup!: THREE.Group;

  // Core components
  private blochSphereShell!: THREE.Mesh;
  private axesGroup!: THREE.Group;
  private stateVector!: THREE.Group;
  private currentVectorDir = new THREE.Vector3(0, 1, 0);
  private targetVectorDir = new THREE.Vector3(0, 1, 0);
  private orbitRings!: THREE.Group;
  private orbitalNodes: OrbitalNode[] = [];
  private orbitGroup!: THREE.Group;

  // Quaternion-based orientation (like reference)
  private targetQuat = new THREE.Quaternion();
  private tmpQuat = new THREE.Quaternion();
  private upVec = new THREE.Vector3(0, 1, 0);

  // Bound event handlers
  private onResizeBound: () => void;

  constructor(private ngZone: NgZone) {
    this.onResizeBound = this.onResize.bind(this);
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScene();
      this.createBlochSphere();
      this.createOrbitalNodes();
      this.animate();
    });

    window.addEventListener('resize', this.onResizeBound);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Phase changes are handled in the animation loop
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer?.dispose();
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.parentElement!.getBoundingClientRect();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    // Camera slightly above center (like reference: [0, 0.4, 5])
    this.camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
    this.camera.position.set(0, 0.4, 5);
    this.camera.lookAt(0, 0, 0);

    // Lighting (matches reference setup)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0x00BB7E, 0.6, 30);
    pointLight.position.set(-4, -2, 3);
    this.scene.add(pointLight);
  }

  private getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      neonGreen: style.getPropertyValue('--neon-green').trim() || '#00FF88',
      neonGreenDim: style.getPropertyValue('--neon-green-dim').trim() || '#00BB7E',
      accentTertiary: style.getPropertyValue('--accent-tertiary').trim() || '#34d399',
      emeraldDark: style.getPropertyValue('--accent-secondary').trim() || '#007a52'
    };
  }

  private createBlochSphere(): void {
    const colors = this.getThemeColors();
    const emeraldBright = new THREE.Color(colors.accentTertiary);
    const emeraldDim = new THREE.Color(colors.neonGreenDim);

    this.sphereGroup = new THREE.Group();
    this.scene.add(this.sphereGroup);

    // 1. Semi-transparent Bloch Sphere Shell (glass-like)
    const sphereRadius = 1.1;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: emeraldBright,
      transparent: true,
      opacity: 0.12,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.blochSphereShell = new THREE.Mesh(sphereGeo, sphereMat);
    this.sphereGroup.add(this.blochSphereShell);

    // 2. Coordinate Grid Rings (Equator and two Meridians)
    const ringThickness = 0.005;
    const gridMat = new THREE.MeshBasicMaterial({
      color: emeraldDim,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });

    // Equator Ring (XZ plane)
    const equatorGeo = new THREE.TorusGeometry(sphereRadius, ringThickness, 8, 64);
    const equator = new THREE.Mesh(equatorGeo, gridMat);
    equator.rotation.x = Math.PI / 2;
    this.blochSphereShell.add(equator);

    // Meridian 1 (XY plane)
    const meridian1Geo = new THREE.TorusGeometry(sphereRadius, ringThickness, 8, 64);
    const meridian1 = new THREE.Mesh(meridian1Geo, gridMat);
    this.blochSphereShell.add(meridian1);

    // Meridian 2 (YZ plane)
    const meridian2Geo = new THREE.TorusGeometry(sphereRadius, ringThickness, 8, 64);
    const meridian2 = new THREE.Mesh(meridian2Geo, gridMat);
    meridian2.rotation.y = Math.PI / 2;
    this.blochSphereShell.add(meridian2);

    // 3. Axes Group
    this.axesGroup = new THREE.Group();
    this.sphereGroup.add(this.axesGroup);

    const axisLength = 1.35;
    const axisMat = new THREE.MeshBasicMaterial({
      color: emeraldDim,
      transparent: true,
      opacity: 0.25
    });

    const axisRadius = 0.006;

    const createAxisCylinder = (direction: 'x' | 'y' | 'z') => {
      const geo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength * 2, 8);
      const mesh = new THREE.Mesh(geo, axisMat);
      if (direction === 'x') {
        mesh.rotation.z = Math.PI / 2;
      } else if (direction === 'z') {
        mesh.rotation.x = Math.PI / 2;
      }
      return mesh;
    };

    const xAxis = createAxisCylinder('x');
    const yAxis = createAxisCylinder('y');
    const zAxis = createAxisCylinder('z');

    this.axesGroup.add(xAxis);
    this.axesGroup.add(yAxis);
    this.axesGroup.add(zAxis);

    // Axis pole indicators (small sphere tips at endpoints)
    const poleGeo = new THREE.SphereGeometry(0.02, 16, 16);
    const poleMat = new THREE.MeshBasicMaterial({
      color: emeraldBright,
      transparent: true,
      opacity: 0.5
    });

    const positions = [
      new THREE.Vector3(axisLength, 0, 0),
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(0, axisLength, 0),
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, 0, axisLength),
      new THREE.Vector3(0, 0, -axisLength)
    ];

    positions.forEach(pos => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.copy(pos);
      this.axesGroup.add(pole);
    });

    // 4. State Vector (Qubit Pointer)
    this.stateVector = new THREE.Group();
    this.sphereGroup.add(this.stateVector);

    const pointerLen = sphereRadius * 0.95;
    const shaftRadius = 0.012;
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius * 0.4, shaftRadius, pointerLen, 16);
    shaftGeo.translate(0, pointerLen / 2, 0);

    const pointerMat = new THREE.MeshStandardMaterial({
      color: emeraldBright,
      emissive: emeraldBright,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.95,
      roughness: 0.1,
      metalness: 0.8
    });

    const shaft = new THREE.Mesh(shaftGeo, pointerMat);
    this.stateVector.add(shaft);

    const coneLen = 0.12;
    const coneRadius = 0.035;
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneLen, 16);
    coneGeo.translate(0, pointerLen, 0);
    const cone = new THREE.Mesh(coneGeo, pointerMat);
    this.stateVector.add(cone);

    // Centered pulsing energy core
    const innerCoreGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: emeraldBright,
      transparent: true,
      opacity: 0.6
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    this.sphereGroup.add(innerCore);

    // Subtle outer guide orbit ring
    this.orbitRings = new THREE.Group();
    this.sphereGroup.add(this.orbitRings);

    const orbitRingGeo = new THREE.TorusGeometry(sphereRadius * 1.05, 0.004, 8, 100);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: emeraldBright,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    halo.rotation.x = Math.PI / 4;
    this.orbitRings.add(halo);
  }

  private createOrbitalNodes(): void {
    // Orbit group rotates independently around Y axis
    this.orbitGroup = new THREE.Group();
    this.scene.add(this.orbitGroup);

    const colors = this.getThemeColors();
    const emerald = new THREE.Color(colors.neonGreenDim);

    const nodeConfigs = [
      { label: 'QuCo', svgFile: 'QuCo-icon.svg', color: colors.neonGreen, angle: 0, phase: 'quCo' as BlochPhase },
      { label: 'QuTe', svgFile: 'QuTe-icon.svg', color: colors.neonGreen, angle: Math.PI / 2, phase: 'quTe' as BlochPhase },
      { label: 'QuMu', svgFile: 'QuMu-icon.svg', color: colors.neonGreen, angle: Math.PI, phase: 'quMu' as BlochPhase },
      { label: 'QuaCo', svgFile: 'QuaCo-icon.svg', color: colors.neonGreen, angle: -Math.PI / 2, phase: 'quaCo' as BlochPhase }
    ];

    const orbitRadius = 2.4;

    nodeConfigs.forEach((cfg) => {
      // Icon plane
      const planeGeo = new THREE.PlaneGeometry(0.4, 0.4);
      const planeMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false
      });
      const mesh = new THREE.Mesh(planeGeo, planeMat);

      this.loadSvgIconTexture(cfg.svgFile, cfg.color, planeMat);

      // Glow behind icon (using CircleGeometry to avoid ugly square boxes)
      const glowGeo = new THREE.CircleGeometry(0.35, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthTest: false
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.z = -0.01;
      mesh.add(glow);

      // Position on flat orbit ring (equatorial, like reference)
      const x = Math.cos(cfg.angle) * orbitRadius;
      const z = Math.sin(cfg.angle) * orbitRadius;
      mesh.position.set(x, 0, z);

      this.orbitGroup.add(mesh);

      this.orbitalNodes.push({
        mesh,
        label: cfg.label,
        baseAngle: cfg.angle,
        angle: cfg.angle,
        speed: 0.25,
        orbitRadius,
        phase: cfg.phase
      });
    });

    // Orbit ring (subtle visual guide)
    const ringGeo = new THREE.RingGeometry(orbitRadius - 0.01, orbitRadius + 0.01, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: emerald,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.orbitGroup.add(ring);
  }

  private loadSvgIconTexture(svgFile: string, tintColor: string, material: THREE.MeshBasicMaterial): void {
    // Fetch SVG text to modify colors dynamically for dark mode
    fetch('assets/' + svgFile)
      .then(res => res.text())
      .then(svgText => {
        // Replace black/white/currentColor with our desired neon tint to maintain inner details like text
        const modifiedSvg = svgText
          .replace(/currentColor/g, tintColor)
          .replace(/#10B981/ig, tintColor)
          .replace(/stroke="black"/g, `stroke="${tintColor}"`)
          .replace(/fill="black"/g, `fill="${tintColor}"`)
          .replace(/fill="white"/g, `fill="transparent"`);

        const blob = new Blob([modifiedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          const size = 256; // Higher resolution for sharper text
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;

          ctx.drawImage(img, 0, 0, size, size);

          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          material.map = texture;
          material.needsUpdate = true;

          URL.revokeObjectURL(url);
        };
        img.src = url;
      })
      .catch(err => console.error('Error loading SVG', err));
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    if (!this.sphereGroup) return;

    // ── Qubit State Vector targets per phase ──
    let pulse = 1.0;

    switch (this.activePhase) {
      case 'hero':
        // Precessing/superposition state that wobbles over time
        this.targetVectorDir.set(
          Math.sin(t * 1.5) * 0.7,
          Math.cos(t * 0.8),
          Math.cos(t * 1.5) * 0.7
        ).normalize();
        pulse = 1.0 + Math.sin(t * 4) * 0.04;
        break;
      case 'quCo': // Generate -> points to active logo on the right
        this.targetVectorDir.set(1, 0, 0);
        pulse = 1.15;
        break;
      case 'quTe': // Test -> points to active logo on the right
        this.targetVectorDir.set(1, 0, 0);
        pulse = 1.05;
        break;
      case 'quMu': // Mutate -> points to active logo on the right
        this.targetVectorDir.set(1, 0, 0);
        pulse = 0.95;
        break;
      case 'quaCo': // Anneal -> points to active logo on the right
        this.targetVectorDir.set(1, 0, 0);
        pulse = 1.1;
        break;
    }

    // Lerp state vector direction and apply rotation
    if (this.stateVector) {
      this.currentVectorDir.lerp(this.targetVectorDir, 0.08).normalize();
      const vecQuat = new THREE.Quaternion();
      vecQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.currentVectorDir);
      this.stateVector.setRotationFromQuaternion(vecQuat);
      
      // Pulse scale
      this.stateVector.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.1);
    }

    // Gentle global spin for Bloch sphere shell & coordinate axes to enhance 3D feel
    if (this.blochSphereShell) {
      this.blochSphereShell.rotation.y = t * 0.08;
      this.blochSphereShell.rotation.x = Math.sin(t * 0.05) * 0.05;
    }
    if (this.axesGroup) {
      this.axesGroup.rotation.y = t * 0.08;
      this.axesGroup.rotation.x = Math.sin(t * 0.05) * 0.05;
    }

    // Animate the halo / orbit rings
    if (this.orbitRings) {
      this.orbitRings.children.forEach((ring, i) => {
        ring.rotation.x += delta * (0.05 + i * 0.02);
        ring.rotation.y += delta * (0.08 - i * 0.01);
      });
    }

    // ── Orbital nodes ──
    this.updateOrbitals(t, delta);

    this.renderer.render(this.scene, this.camera);
  };

  private updateOrbitals(_elapsed: number, delta: number): void {
    const isPaused = !!this.hoveredNode;

    // Reset orbitGroup rotation to 0 so billboards remain upright (no roll distortion)
    if (this.orbitGroup) {
      this.orbitGroup.rotation.y = 0;
    }

    const activeNode = this.orbitalNodes.find(n => n.phase === this.activePhase);

    this.orbitalNodes.forEach(node => {
      const isActiveTool = this.activePhase === node.phase;
      
      let targetOpacity = 0.9;
      let targetScale = 1.0;
      let glowOpacity = 0.12;

      // Animate node angle and update its 3D position
      if (this.activePhase === 'hero') {
        if (!isPaused) {
          node.angle += 0.25 * delta;
        }
      } else {
        // Calculate the target angle for the node to slide it to the right position:
        // The active node's target angle is 0 (Right side).
        // Other nodes are positioned relative to it using their baseAngle difference.
        const targetAngle = activeNode ? (node.baseAngle - activeNode.baseAngle) : node.baseAngle;
        
        let diff = targetAngle - node.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        node.angle += diff * 0.08;
      }

      // Update node's local position on the orbit circle
      const x = Math.cos(node.angle) * node.orbitRadius;
      const z = Math.sin(node.angle) * node.orbitRadius;
      node.mesh.position.set(x, 0, z);

      if (this.activePhase !== 'hero') {
        if (isActiveTool) {
          targetOpacity = 1.0;
          targetScale = 1.4;
          glowOpacity = 0.35;
        } else {
          targetOpacity = 0.12; // Dimmed out
          targetScale = 0.7; // Smaller
          glowOpacity = 0.02;
        }
      }

      // Hover overrides
      const isHovered = this.hoveredNode === node.label;
      if (isHovered) {
        targetScale = 1.5;
        targetOpacity = 1.0;
        glowOpacity = 0.4;
      }

      const mat = node.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);

      // Billboard: always face camera correctly (since orbitGroup is at 0, world coordinates = local parent coordinates)
      node.mesh.lookAt(this.camera.position);

      // Apply scale
      node.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      // Glow intensity
      if (node.mesh.children[0]) {
        const glowMat = (node.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, glowOpacity, 0.1);
      }
    });

    // Also fade orbit ring
    if (this.orbitGroup && this.orbitGroup.children.length > 0) {
      const ringChild = this.orbitGroup.children[this.orbitGroup.children.length - 1];
      if (ringChild instanceof THREE.Mesh) {
        const ringMat = ringChild.material as THREE.MeshBasicMaterial;
        const ringTarget = this.activePhase === 'hero' ? 0.15 : 0.04;
        ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, ringTarget, 0.05);
      }
    }
  }

  private onResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas?.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }
}
