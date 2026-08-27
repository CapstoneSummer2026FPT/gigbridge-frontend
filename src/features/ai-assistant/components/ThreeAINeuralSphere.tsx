import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type SphereActivityMode = 'idle' | 'typing' | 'burst' | 'thinking' | 'send';

interface Props {
  activityMode?: SphereActivityMode;
  activityTrigger?: number; // Incremented on every click / keypress to trigger instantaneous shockwaves
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ThreeAINeuralSphere({
  activityMode = 'idle',
  activityTrigger = 0,
  className = '',
  size = 'md',
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(activityMode);
  const triggerRef = useRef(activityTrigger);
  const shockwavePulseRef = useRef(0);

  useEffect(() => {
    modeRef.current = activityMode;
  }, [activityMode]);

  useEffect(() => {
    if (activityTrigger !== triggerRef.current) {
      triggerRef.current = activityTrigger;
      shockwavePulseRef.current = 1.0; // Trigger instant energy shockwave
    }
  }, [activityTrigger]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || (size === 'sm' ? 44 : size === 'lg' ? 220 : 150);
    const height = mount.clientHeight || (size === 'sm' ? 44 : size === 'lg' ? 220 : 150);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = size === 'sm' ? 4.2 : 4.4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Geometry: 3D Holographic Sphere with Multi-layered particles
    const particleCount = size === 'sm' ? 120 : 320;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorBrand = new THREE.Color('#494be7');
    const colorMint = new THREE.Color('#AFDBFF');
    const colorPurple = new THREE.Color('#8b5cf6');
    const colorCyan = new THREE.Color('#06b6d4');

    const radius = size === 'sm' ? 1.25 : 1.45;

    for (let i = 0; i < particleCount; i++) {
      // Golden Spiral distribution on sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      // Color spectrum alternating between Brand, Mint, Purple, Cyan
      const mixedColor = i % 4 === 0 ? colorBrand : i % 4 === 1 ? colorMint : i % 4 === 2 ? colorPurple : colorCyan;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Material
    const pointsMaterial = new THREE.PointsMaterial({
      size: size === 'sm' ? 0.09 : 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, pointsMaterial);
    scene.add(particles);

    // Inner Wireframe Core
    const coreGeo = new THREE.IcosahedronGeometry(size === 'sm' ? 0.65 : 0.85, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x494be7,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Outer Shockwave Rings
    const ringGeo1 = new THREE.TorusGeometry(size === 'sm' ? 1.4 : 1.65, 0.015, 16, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xAFDBFF, transparent: true, opacity: 0.45 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(size === 'sm' ? 1.55 : 1.85, 0.012, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x494be7, transparent: true, opacity: 0.35 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // Dynamic Shockwave Energy Pulse Mesh
    const shockwaveGeo = new THREE.RingGeometry(0.2, 0.28, 32);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xAFDBFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    scene.add(shockwaveMesh);

    // Interactive mouse tracking
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const clientX = e.clientX - (rect.left + rect.width / 2);
      const clientY = e.clientY - (rect.top + rect.height / 2);
      targetRotY = (clientX / 200) * 0.7;
      targetRotX = (clientY / 200) * 0.7;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      const currentMode = modeRef.current;
      const speedMultiplier =
        currentMode === 'thinking' ? 3.2 :
        currentMode === 'typing' ? 2.2 :
        currentMode === 'burst' || currentMode === 'send' ? 2.8 : 1.0;

      // Smooth rotation with mouse tracking
      particles.rotation.y += 0.009 * speedMultiplier + (targetRotY - particles.rotation.y) * 0.04;
      particles.rotation.x += (targetRotX - particles.rotation.x) * 0.04;
      particles.rotation.z += 0.004 * speedMultiplier;

      coreMesh.rotation.y -= 0.015 * speedMultiplier;
      coreMesh.rotation.x += 0.008 * speedMultiplier;

      ring1.rotation.z += 0.018 * speedMultiplier;
      ring2.rotation.x += 0.012 * speedMultiplier;

      // Handle shockwave decay
      if (shockwavePulseRef.current > 0.01) {
        shockwavePulseRef.current *= 0.92;
        const progress = 1 - shockwavePulseRef.current;
        shockwaveMesh.scale.set(1 + progress * 8, 1 + progress * 8, 1);
        shockwaveMat.opacity = shockwavePulseRef.current * 0.8;
      } else {
        shockwaveMat.opacity = 0;
      }

      // Dynamic vertex deformation / activity wave ripples
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const waveIntensity =
        currentMode === 'thinking' ? 0.26 :
        currentMode === 'typing' ? 0.16 :
        shockwavePulseRef.current > 0.1 ? 0.22 : 0.08;

      for (let i = 0; i < particleCount; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];

        const wave = Math.sin(elapsedTime * 3.0 * speedMultiplier + ox * 3.5 + oy * 2.5) * waveIntensity;
        const pulseBoost = shockwavePulseRef.current * (Math.sin(i * 1.5 + elapsedTime * 10) * 0.15);
        const scale = 1 + wave + pulseBoost;

        posArray[i * 3] = ox * scale;
        posArray[i * 3 + 1] = oy * scale;
        posArray[i * 3 + 2] = oz * scale;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const newW = mount.clientWidth;
      const newH = mount.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });

    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pointsMaterial.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      renderer.dispose();
    };
  }, [size]);

  return <div ref={mountRef} className={`w-full h-full flex items-center justify-center pointer-events-none ${className}`} />;
}
