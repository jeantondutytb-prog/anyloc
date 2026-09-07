"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import type { Group } from "three";
import {
  GLOBE_CITIES,
  GLOBE_RADIUS,
  latLngToGlobeVector3,
  type GlobeCity,
} from "@/lib/globe-cities";

function CityMarker({ city }: { city: GlobeCity }) {
  const groupRef = useRef<Group>(null);
  const [visible, setVisible] = useState(true);
  const position = useMemo(
    () => latLngToGlobeVector3(city.lat, city.lng, GLOBE_RADIUS * 1.012),
    [city.lat, city.lng]
  );

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    const surface = groupRef.current.position.clone().normalize();
    const toCamera = camera.position
      .clone()
      .sub(groupRef.current.position)
      .normalize();

    setVisible(surface.dot(toCamera) > 0.15);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color="#f472b6" toneMapped={false} />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial
          color="#f472b6"
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>

      {visible ? (
        <Html
          distanceFactor={6.5}
          position={[0.06, 0.04, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
          occlude={false}
        >
          <span className="whitespace-nowrap text-[10px] font-medium tracking-wide text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            {city.name}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function EarthGlobe() {
  const groupRef = useRef<Group>(null);
  const [earthMap] = useTexture(["/textures/earth.jpg"]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, 0]}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={earthMap}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      <mesh scale={1.035}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.08}
          depthWrite={false}
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
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 2, 4]} intensity={1.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} />
      <EarthGlobe />
    </>
  );
}

export function AuthGlobeScene() {
  return (
    <div className="relative h-[360px] w-[360px]">
      <div className="pointer-events-none absolute inset-4 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-8 rounded-full bg-sky-500/10 blur-2xl" />

      <Canvas
        camera={{ position: [0, 0.3, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
