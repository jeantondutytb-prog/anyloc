"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { BackSide, Vector3 } from "three";
import {
  GLOBE_CITIES,
  GLOBE_RADIUS,
  latLngToGlobeVector3,
  type GlobeCity,
} from "@/lib/globe-cities";

const _cameraVector = new Vector3();
const _cityVector = new Vector3();
const _normal = new Vector3();

function CityMarker({ city }: { city: GlobeCity }) {
  const groupRef = useRef<Group>(null);
  const [visible, setVisible] = useState(true);
  const position = useMemo(
    () => latLngToGlobeVector3(city.lat, city.lng, GLOBE_RADIUS * 1.008),
    [city.lat, city.lng]
  );

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    groupRef.current.getWorldPosition(_cityVector);
    _normal.copy(_cityVector).normalize();
    _cameraVector.copy(camera.position).sub(_cityVector).normalize();

    const isVisible = _normal.dot(_cameraVector) > 0.2;
    groupRef.current.visible = isVisible;
    setVisible(isVisible);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh renderOrder={2}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color="#fda4af" toneMapped={false} />
      </mesh>
      <mesh renderOrder={2} scale={2.2}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial
          color="#f472b6"
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {visible ? (
        <Html
          distanceFactor={7}
          position={[0.05, 0.035, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
          zIndexRange={[100, 0]}
        >
          <span className="whitespace-nowrap text-[10px] font-medium tracking-wide text-amber-100/95 drop-shadow-[0_0_8px_rgba(251,191,36,0.55),0_1px_4px_rgba(0,0,0,0.9)]">
            {city.name}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function EarthGlobe() {
  const groupRef = useRef<Group>(null);
  const earthRef = useRef<Mesh>(null);
  const [nightMap] = useTexture(["/textures/earth-night.jpg"]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.18, 0, 0]}>
      <mesh ref={earthRef} renderOrder={1}>
        <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
        <meshStandardMaterial
          map={nightMap}
          emissiveMap={nightMap}
          emissive="#ffffff"
          emissiveIntensity={0.85}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh scale={1.04} renderOrder={0}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#1e3a8a"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {GLOBE_CITIES.map((city) => (
        <CityMarker key={city.name} city={city} />
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[6, 2, 4]} intensity={0.35} color="#93c5fd" />
      <pointLight position={[-4, -2, -5]} intensity={0.15} color="#6366f1" />
      <EarthGlobe />
    </>
  );
}

export function AuthGlobeScene() {
  return (
    <div className="relative mx-auto flex h-[min(42vw,380px)] w-[min(42vw,380px)] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-[12%] rounded-full bg-pink-500/8 blur-2xl" />

      <Canvas
        camera={{ position: [0, 0, 4.35], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
