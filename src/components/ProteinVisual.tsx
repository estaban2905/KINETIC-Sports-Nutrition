import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { buildProteinTubMesh } from './3d/ProteinTubModel';
import { ProductFlavor } from '../types';
import { Sparkles, Zap, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface ProteinVisual3DProps {
  flavor?: ProductFlavor;
  sizeWeight?: string;
  sizeServings?: number;
  sizeId?: string;
  interactive?: boolean;
  className?: string;
  showBadges?: boolean;
}

export const ProteinVisual: React.FC<ProteinVisual3DProps> = ({
  flavor,
  sizeWeight = '5 LB (2.27 KG)',
  sizeServings = 74,
  sizeId = '5lb',
  interactive = true,
  className = '',
  showBadges = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tubGroupRef = useRef<THREE.Group | null>(null);
  const rimLightRef = useRef<THREE.PointLight | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mouse & Drag State for full 3D rotation & inspection
  const targetRotationY = useRef<number>(0);
  const targetRotationX = useRef<number>(0.05);
  const currentRotationY = useRef<number>(0);
  const currentRotationX = useRef<number>(0.05);
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateSpeed = useRef<number>(0.005);
  const idleTimer = useRef<number>(0);

  const accentHex = flavor?.accentHex || '#a3e635';
  const flavorName = flavor?.name || 'Doble Chocolate Suizo';

  // Setup Three.js Canvas Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(37, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 6.1);
    camera.lookAt(0, 0, 0);

    // 3. Renderer with antialiasing and alpha
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // 4. Lighting Setup (Cinematic Sports Studio Rig matching the Gold Standard photography)
    // Soft Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // Key Light (Main bright soft light from top-front-right for rich specular sheen on the dome)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(3.2, 4.2, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill Light (Cool neutral fill from left)
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.1);
    fillLight.position.set(-3.8, 1.8, 3.2);
    scene.add(fillLight);

    // Dynamic Colored Rim Light (Highlights silhouette with flavor neon / red color)
    const rimColor = new THREE.Color(accentHex === '#a3e635' ? '#dc2626' : accentHex);
    const rimLight = new THREE.PointLight(rimColor, 3.8, 8, 1.8);
    rimLight.position.set(-2.5, 2, -1.8);
    rimLightRef.current = rimLight;
    scene.add(rimLight);

    // Top Rim Light for glossy cap chamfer and shoulder curve
    const topRim = new THREE.DirectionalLight(0xffffff, 1.6);
    topRim.position.set(0, 4.8, -1.5);
    scene.add(topRim);

    // Floor Shadow Receiver
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Dark circular pedestal under tub
    const discGeo = new THREE.CylinderGeometry(1.7, 1.95, 0.08, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e12,
      roughness: 0.4,
      metalness: 0.5
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -2.06;
    disc.receiveShadow = true;
    scene.add(disc);

    // Neon glowing base ring
    const baseGlowRingGeo = new THREE.TorusGeometry(1.9, 0.02, 16, 64);
    const baseGlowRingMat = new THREE.MeshStandardMaterial({
      color: rimColor,
      emissive: rimColor,
      emissiveIntensity: 0.8
    });
    const baseGlowRing = new THREE.Mesh(baseGlowRingGeo, baseGlowRingMat);
    baseGlowRing.rotation.x = Math.PI / 2;
    baseGlowRing.position.y = -2.22;
    scene.add(baseGlowRing);

    // 5. Build Initial 3D Tub Mesh
    const tubGroup = buildProteinTubMesh({
      flavorName,
      accentHex,
      servings: sizeServings,
      weight: sizeWeight,
      sizeId
    });
    tubGroupRef.current = tubGroup;
    scene.add(tubGroup);

    // 6. Animation Loop with IntersectionObserver Culling
    let clock = new THREE.Clock();
    let isVisible = true;

    const animate = () => {
      if (!isVisible) {
        animFrameRef.current = null;
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damped rotation towards target
      currentRotationY.current += (targetRotationY.current - currentRotationY.current) * 0.08;
      currentRotationX.current += (targetRotationX.current - currentRotationX.current) * 0.08;

      if (tubGroupRef.current) {
        // Natural gentle idle hovering float on Y
        const hoverOffset = Math.sin(elapsedTime * 1.8) * 0.08;
        tubGroupRef.current.position.y = -0.15 + hoverOffset;

        // Apply rotation
        tubGroupRef.current.rotation.y = currentRotationY.current;
        tubGroupRef.current.rotation.x = currentRotationX.current;

        // Auto slow rotation when user isn't actively interacting
        if (!isDragging.current && interactive) {
          targetRotationY.current += autoRotateSpeed.current;
        }
      }

      renderer.render(scene, camera);
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (!wasVisible && isVisible) {
          clock.start();
          animate();
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    animate();

    // 7. Responsive Resize Observer (debounced in animation frame to prevent ResizeObserver loop limit errors)
    let resizeRaf: number | null = null;
    const handleResize = () => {
      if (resizeRaf !== null) {
        cancelAnimationFrame(resizeRaf);
      }
      resizeRaf = requestAnimationFrame(() => {
        if (!container || !rendererRef.current) return;
        const newWidth = Math.floor(container.clientWidth);
        const newHeight = Math.floor(container.clientHeight);
        if (newWidth === 0 || newHeight === 0) return;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight, false);
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Tub Texture & Lighting when flavor, servings or weight changes
  useEffect(() => {
    if (!sceneRef.current || !tubGroupRef.current) return;

    // Update Rim Light color
    if (rimLightRef.current) {
      rimLightRef.current.color.set(accentHex);
    }

    // Rebuild mesh with new label & accent
    const oldGroup = tubGroupRef.current;
    sceneRef.current.remove(oldGroup);

    const newGroup = buildProteinTubMesh({
      flavorName,
      accentHex,
      servings: sizeServings,
      weight: sizeWeight,
      sizeId
    });

    tubGroupRef.current = newGroup;
    sceneRef.current.add(newGroup);
  }, [flavorName, accentHex, sizeServings, sizeWeight, sizeId]);

  // Pointer / Drag Controls for 360° Interactive Inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    setIsInteracting(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (e.pointerType !== 'touch') {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive) return;
    if (!isDragging.current) {
      // Subtle tilt on hover when not dragging
      const rect = mountRef.current?.getBoundingClientRect();
      if (rect) {
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
        targetRotationX.current = yPct * 0.4;
      }
      return;
    }

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    // If touch and horizontal drag is intentional, lock pointer capture
    if (e.pointerType === 'touch' && Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    targetRotationY.current += deltaX * 0.012;
    targetRotationX.current = Math.max(-0.4, Math.min(0.5, targetRotationX.current + deltaY * 0.008));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setTimeout(() => setIsInteracting(false), 800);
  };

  const resetView = () => {
    targetRotationY.current = 0;
    targetRotationX.current = 0.05;
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        targetRotationX.current = 0.05;
      }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {/* Background Cinematic Aura & Neon Glow behind the 3D model */}
      <div 
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-35 pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle, ${accentHex} 0%, rgba(10,10,10,0) 70%)`,
          transform: isHovered ? 'scale(1.2)' : 'scale(1)'
        }}
      />

      {/* Floating dynamic energy particles around the 3D model */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            y: [-12, 14, -12],
            opacity: [0.3, 0.85, 0.3],
            scale: [1, 1.25, 1]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-4 w-2.5 h-2.5 rounded-full bg-lime-400 blur-[1px] shadow-[0_0_12px_#a3e635]"
        />
        <motion.div
          animate={{
            y: [16, -14, 16],
            opacity: [0.2, 0.75, 0.2],
            scale: [1.2, 0.9, 1.2]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-6 w-3 h-3 rounded-full bg-lime-400 blur-[1px] shadow-[0_0_15px_#a3e635]"
        />
        <motion.div
          animate={{
            y: [-10, 10, -10],
            opacity: [0.4, 0.9, 0.4]
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-white blur-[0.5px]"
        />
      </div>

      {/* Three.js Canvas Container (Touch, Drag & Click Enabled for full 3D inspection) */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-72 sm:w-88 md:w-96 h-[380px] sm:h-[460px] md:h-[500px] cursor-grab active:cursor-grabbing touch-pan-y z-20 flex items-center justify-center"
        title="Arrastra para rotar el envase en 360°"
      />

      {/* 360° Interaction Hint & Reset Button */}
      {interactive && (
        <div className="absolute bottom-1 z-30 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md text-[11px] font-mono text-neutral-300 shadow-xl flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span>{isInteracting ? 'Rotando en 3D' : 'Arrastra para rotar 360°'}</span>
          </div>
          
          <button
            onClick={resetView}
            type="button"
            className="p-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors shadow-xl"
            title="Centrar vista frontal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Highlight Feature Callouts on Hero / Product view */}
      {showBadges && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="hidden lg:flex absolute -left-12 top-1/3 items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md shadow-xl text-xs z-30 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white uppercase text-[11px] font-display">Aislado WPI Primario</div>
              <div className="text-[10px] text-neutral-400">24g Proteína & 5.5g BCAAs</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="hidden lg:flex absolute -right-10 bottom-1/4 items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md shadow-xl text-xs z-30 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white uppercase text-[11px] font-display">Double Rich Chocolate</div>
              <div className="text-[10px] text-neutral-400">Disolución instantánea al 100%</div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
