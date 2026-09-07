"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { CanvasTexture, Group } from "three";
import { BackSide, Vector3 } from "three";
import { createStylizedEarthTexture } from "@/lib/create-stylized-earth-texture";
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
    () => latLngToGlobeVector3(city.lat, city.lng, GLOBE_RADIUS * 1.006),
    [city.lat, city.lng]
  );

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    groupRef.current.getWorldPosition(_cityVector);
    _normal.copy(_cityVector).normalize();
    _cameraVector.copy(camera.position).sub(_cityVector).normalize();

    const isVisible = _normal.dot(_cameraVector) > 0.15;
    groupRef.current.visible = isVisible;
    setVisible(isVisible);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh visible={visible}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <meshBasicMaterial color="#f9a8d4" toneMapped={false} />
      </mesh>

      {visible ? (
        <Text
          position={[0.07, 0.04, 0]}
          fontSize={0.075}
          color="#f8fafc"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#020617"
          maxWidth={0.8}
        >
          {city.name}
        </Text>
      ) : null}
    </group>
  );
}

function GlobePlaceholder() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshPhongMaterial color="#0a1220" shininess={12} specular="#1e293b" />
    </mesh>
  );
}

function RotatingGlobe({ texture }: { texture: CanvasTexture }) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.14;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.15, -0.4, 0]}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshPhongMaterial
          map={texture}
          shininess={18}
          specular="#334155"
          emissive="#050a12"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh scale={1.025}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#1e3a5f"
          transparent
          opacity={0.08}
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

function EarthScene() {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    let active = true;

    createStylizedEarthTexture()
      .then((loaded) => {
        if (active) setTexture(loaded);
      })
      .catch(() => {
        if (active) setTexture(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!texture) {
    return <GlobePlaceholder />;
  }

  return <RotatingGlobe texture={texture} />;
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-4, 2, 5]} intensity={1.1} color="#cbd5e1" />
      <directionalLight position={[3, -1, -2]} intensity={0.15} color="#64748b" />
      <Suspense fallback={<GlobePlaceholder />}>
        <EarthScene />
      </Suspense>
    </>
  );
}

export function AuthGlobeScene() {
  return (
    <div className="relative h-[400px] w-[400px] shrink-0">
      <div className="pointer-events-none absolute inset-2 rounded-full bg-slate-500/10 blur-3xl" />

      <Canvas
        camera={{ position: [0, 0.15, 4.5], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
        frameloop="always"
        style={{ width: "400px", height: "400px" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
