"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 6.8;
    const group = new THREE.Group();
    scene.add(group);
    const geometry = new THREE.IcosahedronGeometry(1.6, 2);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x57dcb1,
      transparent: true,
      opacity: 0.36,
    });
    const network = new THREE.LineSegments(edges, material);
    group.add(network);
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xa9f4d5,
      size: 0.035,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(geometry, pointsMaterial);
    group.add(points);
    const ringGeometry = new THREE.TorusGeometry(2.1, 0.006, 6, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x76dbb8,
      transparent: true,
      opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = 1.15;
    ring.rotation.y = -0.3;
    group.add(ring);
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(element);
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(element);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden || time - last < 33) return;
      last = time;
      if (!motion.matches) {
        group.rotation.y = time * 0.000075;
        group.rotation.z = Math.sin(time * 0.00012) * 0.12;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      geometry.dispose();
      edges.dispose();
      material.dispose();
      pointsMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className="hero-canvas" aria-hidden="true" />;
}
