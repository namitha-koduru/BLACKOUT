// game3d/CameraController.jsx
import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CameraController = ({ targetX, targetZ, activeRepairSession, nearSystem, nearTerminal }) => {
  const { camera, gl } = useThree();

  // Spherical coordinate offsets around player
  const angleRef = useRef({ theta: Math.PI, phi: Math.PI / 6, radius: 6.5 });
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseDown = (e) => {
      // Rotate on left click drag
      if (e.button === 0) {
        isDragging.current = true;
        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      previousMousePosition.current = { x: e.clientX, y: e.clientY };

      angleRef.current.theta += deltaX * 0.005;
      angleRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI / 2.2, angleRef.current.phi - deltaY * 0.005)
      ); // Cap vertical viewing angle to avoid ground clipping
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e) => {
      angleRef.current.radius = Math.max(
        2.5,
        Math.min(15.0, angleRef.current.radius + e.deltaY * 0.005)
      );
    };

    // Attach listeners to canvas element
    const dom = gl.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel);

    return () => {
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
    };
  }, [gl]);

  useFrame((state, delta) => {
    // Determine player focal point
    let lookTarget = new THREE.Vector3(targetX, 0.8, targetZ);
    let cameraTarget = new THREE.Vector3();

    // Cinematic zoom focus when interacting with system consoles
    if (activeRepairSession || nearSystem) {
      const consoleX = (activeRepairSession?.x || nearSystem?.x || targetX);
      const consoleZ = (activeRepairSession?.y || nearSystem?.y || targetZ);
      
      lookTarget.set(consoleX, 0.7, consoleZ);
      cameraTarget.set(
        consoleX - 1.8,
        1.5,
        consoleZ + 1.8
      );
    } else {
      // standard third person follow logic
      const rad = angleRef.current.radius;
      const th = angleRef.current.theta;
      const ph = angleRef.current.phi;

      cameraTarget.set(
        targetX + Math.sin(th) * Math.cos(ph) * rad,
        Math.max(0.5, Math.sin(ph) * rad), // Prevent camera going below floor level
        targetZ + Math.cos(th) * Math.cos(ph) * rad
      );
    }

    // Lerp camera coordinates smoothly to prevent jittering
    camera.position.lerp(cameraTarget, 0.1);
    
    // Look at target points
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const targetDir = lookTarget.clone().sub(camera.position).normalize();
    const lerpedDir = currentLook.lerp(targetDir, 0.1);
    
    camera.lookAt(camera.position.clone().add(lerpedDir));
  });

  return null;
};

export default CameraController;
