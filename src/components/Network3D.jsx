import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import './Network3D.css'

function AnimatedNetwork() {
  const pointsRef = useRef()

  // Create nodes (points) in 3D space
  const nodes = useMemo(() => {
    const count = 150
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  // Animate the network
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.05
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group>
      <Points ref={pointsRef} positions={nodes} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#3b82f6"
          size={0.15}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  )
}

function Network3D() {
  return (
    <div className="network-3d-container">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />
        <AnimatedNetwork />
      </Canvas>
    </div>
  )
}

export default Network3D

