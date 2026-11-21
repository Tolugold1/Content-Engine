"use client";

import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "./use-reduced-motion";

export type EmblemVariant = "hero" | "background";

/** How each placement behaves: the hero reacts to the pointer and sparkles; the background just turns slowly. */
const VARIANTS: Record<EmblemVariant, { spin: number; pointer: boolean; sparkles: number; dpr: [number, number]; cameraZ: number }> = {
  hero: { spin: 0.65, pointer: true, sparkles: 80, dpr: [1, 1.75], cameraZ: 4.6 },
  background: { spin: 0.28, pointer: false, sparkles: 0, dpr: [1, 1], cameraZ: 4.2 },
};

/** Builds the extruded "G" of the Golden Gist mark. */
function useGoldenG() {
  return useMemo(() => {
    const outer = 1;
    const inner = 0.66;
    const barTop = 0.16;
    const barBottom = -0.14;
    const barLeft = 0.1;
    const open = THREE.MathUtils.degToRad(42);

    const shape = new THREE.Shape();
    shape.moveTo(outer * Math.cos(open), outer * Math.sin(open));
    // Outer edge: from the top-right opening, all the way round to the bar.
    shape.absarc(0, 0, outer, open, Math.PI * 2 + Math.asin(barTop / outer), false);
    shape.lineTo(barLeft, barTop);
    shape.lineTo(barLeft, barBottom);
    const innerX = Math.sqrt(inner * inner - barBottom * barBottom);
    shape.lineTo(innerX, barBottom);
    // Inner edge back to the opening.
    shape.absarc(0, 0, inner, Math.atan2(barBottom, innerX), open, true);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.05,
      bevelSegments: 8,
      curveSegments: 96,
    });
    geometry.center();
    return geometry;
  }, []);
}

function Emblem({ variant, still }: { variant: EmblemVariant; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const geometry = useGoldenG();
  const settings = VARIANTS[variant];

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (!still) {
      // Continuous turn around the vertical axis; the pointer only tilts it.
      g.rotation.y += delta * settings.spin;
      if (ring.current) ring.current.rotation.z += delta * 0.3;
    }
    const tilt = still || !settings.pointer ? 0.08 : -state.pointer.y * 0.25;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tilt, 3, delta);
  });

  return (
    <group ref={group} rotation={[0.08, -0.25, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} envMapIntensity={1.5} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.35, 0.15, 0]}>
        <torusGeometry args={[1.62, 0.028, 24, 220]} />
        <meshStandardMaterial color="#F3D98B" metalness={1} roughness={0.25} envMapIntensity={1.2} />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, -0.4, 0]}>
        <torusGeometry args={[1.95, 0.012, 16, 220]} />
        <meshStandardMaterial color="#8C6B1F" metalness={1} roughness={0.35} />
      </mesh>
    </group>
  );
}

function StaticFallback() {
  return (
    <div className="grid h-full place-items-center">
      <div className="coin h-40 w-40 text-7xl">G</div>
    </div>
  );
}

/** The rotating gold G. One scene, used by the Studio hero and as the background of every other screen. */
export default function EmblemScene({ variant = "hero" }: { variant?: EmblemVariant }) {
  const reduced = usePrefersReducedMotion();
  const settings = VARIANTS[variant];

  return (
    <Canvas
      dpr={settings.dpr}
      camera={{ position: [0, 0, settings.cameraZ], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: variant === "hero" ? "high-performance" : "low-power" }}
      frameloop={reduced ? "demand" : "always"}
      fallback={<StaticFallback />}
      aria-hidden={variant === "background"}
      aria-label={variant === "hero" ? "Golden Gist emblem" : undefined}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#fff3d1" />
      <directionalLight position={[-4, -2, 2]} intensity={0.6} color="#D4AF37" />
      <Float speed={reduced ? 0 : 1.4} rotationIntensity={0} floatIntensity={reduced ? 0 : 0.8}>
        <Emblem variant={variant} still={reduced} />
      </Float>
      {settings.sparkles > 0 && (
        <Sparkles count={settings.sparkles} scale={[7, 4.5, 3]} size={2.4} speed={reduced ? 0 : 0.35} color="#F3D98B" opacity={0.85} />
      )}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 2]} scale={[7, 1.4, 1]} color="#fff4d6" />
        <Lightformer form="rect" intensity={2.2} position={[-4, 0.5, 1]} rotation-y={Math.PI / 2} scale={[4, 1, 1]} color="#ffe7a3" />
        <Lightformer form="rect" intensity={1.6} position={[4, -1, 1]} rotation-y={-Math.PI / 2} scale={[4, 0.6, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={1.4} position={[0, -0.5, -4]} scale={3} color="#D4AF37" />
      </Environment>
    </Canvas>
  );
}
