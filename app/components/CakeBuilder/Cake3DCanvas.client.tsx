// @ts-nocheck
import React, { useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/**
 * SHAPE EXTRACTION LOGIC
 */
const getCakeShape = (type, radius, isSlice = false) => {
  const shape = new THREE.Shape();
  if (isSlice) {
    // Universal slice representation for all cake shapes
    shape.moveTo(0, 0);
    shape.absarc(0, 0, radius, 0, Math.PI / 4, false);
    shape.lineTo(0, 0);
    return shape;
  }
  
  if (type === 'round' || type === 'circle' || type === 'standard') {
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  } else if (type === 'square') {
    const s = radius * 0.9;
    const r = radius * 0.25; 
    shape.moveTo(-s + r, -s);
    shape.lineTo(s - r, -s);
    shape.quadraticCurveTo(s, -s, s, -s + r);
    shape.lineTo(s, s - r);
    shape.quadraticCurveTo(s, s, s - r, s);
    shape.lineTo(-s + r, s);
    shape.quadraticCurveTo(-s, s, -s, s - r);
    shape.lineTo(-s, -s + r);
    shape.quadraticCurveTo(-s, -s, -s + r, -s);
  } else if (type === 'sheet') {
    const w = radius * 1.5;
    const h = radius * 1.0;
    const r = radius * 0.1;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
  } else if (type === 'heart') {
    const s = radius * 0.075;
    shape.moveTo(0, 5*s);
    shape.bezierCurveTo(0, 5*s, -1*s, 0, -5*s, 0);
    shape.bezierCurveTo(-11*s, 0, -11*s, 7*s, -11*s, 7*s);
    shape.bezierCurveTo(-11*s, 11*s, -8*s, 15.4*s, 0, 19*s);
    shape.bezierCurveTo(8*s, 15.4*s, 11*s, 11*s, 11*s, 7*s);
    shape.bezierCurveTo(11*s, 7*s, 11*s, 0, 5*s, 0);
    shape.bezierCurveTo(2*s, 0, 0, 5*s, 0, 5*s);
    const pts = shape.getPoints().map(p => new THREE.Vector2(p.x, -p.y + 11*s));
    return new THREE.Shape(pts);
  }
  return shape;
};

const getPerimeterPoints = (shape, count) => {
  const points2D = shape.getSpacedPoints(count);
  return points2D.map(pt => new THREE.Vector3(pt.x, 0, -pt.y));
};

/**
 * PROCEDURAL DECORATION COMPONENTS
 */

const Sprinkles = ({ shapeConfig, yPos }) => {
  const { shape } = shapeConfig;
  const meshRef = React.useRef();

  const sprinkles = useMemo(() => {
    const temp = [];
    const pts = shape.getSpacedPoints(200); 
    const count = 300;
    
    for (let i = 0; i < count; i++) {
      const edgePt = pts[Math.floor(Math.random() * pts.length)];
      const scale = Math.random() * 0.85; 
      const x = edgePt.x * scale;
      const z = -edgePt.y * scale;
      const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
      temp.push({ 
        position: [x, yPos + 0.04, z], 
        color, 
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: 0.8 + Math.random() * 0.4
      });
    }
    return temp;
  }, [shape, yPos]);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      sprinkles.forEach((props, i) => {
        dummy.position.set(...props.position);
        dummy.rotation.set(...props.rotation);
        dummy.scale.set(props.scale, props.scale, props.scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, props.color);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [sprinkles]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, 300]} castShadow>
      <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
      <meshPhysicalMaterial roughness={0.1} clearcoat={1.0} clearcoatRoughness={0.1} />
    </instancedMesh>
  );
};

const Cherries = ({ shapeConfig, yPos, spacing = 1.0, color = "#660000" }) => {
  const { shape, radius } = shapeConfig;
  const cherryRef = React.useRef();
  const stemRef = React.useRef();

  const points = useMemo(() => {
    const count = Math.floor(radius * Math.PI * 2 / spacing);
    const pts = getPerimeterPoints(shape, count);
    return pts.map(p => p.multiplyScalar(0.85));
  }, [shape, radius, spacing]);

  React.useLayoutEffect(() => {
    if (cherryRef.current && stemRef.current) {
      const dummyCherry = new THREE.Object3D();
      const dummyStem = new THREE.Object3D();
      points.forEach((pt, i) => {
        dummyCherry.position.set(pt.x, 0.15, pt.z);
        dummyCherry.updateMatrix();
        cherryRef.current.setMatrixAt(i, dummyCherry.matrix);

        dummyStem.position.set(pt.x + 0.05, 0.35, pt.z);
        dummyStem.rotation.set(0, 0, Math.PI / 6);
        dummyStem.updateMatrix();
        stemRef.current.setMatrixAt(i, dummyStem.matrix);
      });
      cherryRef.current.instanceMatrix.needsUpdate = true;
      stemRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={cherryRef} args={[null, null, points.length]} castShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.1} clearcoat={1.0} clearcoatRoughness={0.0} />
      </instancedMesh>
      <instancedMesh ref={stemRef} args={[null, null, points.length]} castShadow>
        <cylinderGeometry args={[0.005, 0.005, 0.3, 8]} />
        <meshStandardMaterial color="#2e5a1c" />
      </instancedMesh>
    </group>
  );
};

const PipedBorder = ({ shapeConfig, yPos, color = "#fff", scale = 0.12 }) => {
  const { shape, radius } = shapeConfig;
  const meshRef = React.useRef();

  const points = useMemo(() => {
    const count = Math.floor(radius * 25);
    return getPerimeterPoints(shape, count);
  }, [shape, radius]);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      points.forEach((pt, i) => {
        const nextPt = points[(i + 1) % points.length];
        const angle = Math.atan2(nextPt.z - pt.z, nextPt.x - pt.x);
        dummy.position.set(pt.x, 0, pt.z);
        dummy.rotation.set(0, -angle, Math.PI / 8);
        dummy.scale.set(1, 0.6, 1.2);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={meshRef} args={[null, null, points.length]} castShadow receiveShadow>
        <sphereGeometry args={[scale, 16, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.65} clearcoat={0.1} clearcoatRoughness={0.4} />
      </instancedMesh>
    </group>
  );
};

const Roses = ({ shapeConfig, yPos, spacing = 1.2, color = "#ffb6c1" }) => {
  const { shape, radius } = shapeConfig;
  const meshRef = React.useRef();

  const points = useMemo(() => {
    const count = Math.floor(radius * Math.PI * 2 / spacing);
    return getPerimeterPoints(shape, count).map(p => p.multiplyScalar(0.9));
  }, [shape, radius, spacing]);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      points.forEach((pt, i) => {
        dummy.position.set(pt.x, 0.1, pt.z);
        dummy.rotation.set(Math.PI/2, 0, 0);
        dummy.scale.set(0.4, 0.4, 0.4);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={meshRef} args={[null, null, points.length]} castShadow>
        <torusKnotGeometry args={[0.3, 0.15, 64, 8, 2, 3]} />
        <meshPhysicalMaterial color={color} roughness={0.7} />
      </instancedMesh>
    </group>
  );
};

const Drapes = ({ shapeConfig, yPos, color = "#fff", depth = 0.6, thickness = 0.05 }) => {
  const { shape, radius } = shapeConfig;
  const curve = useMemo(() => {
    const count = 100;
    const numSwoops = Math.max(4, Math.floor(radius * 2));
    const basePoints = getPerimeterPoints(shape, count);
    
    const points = basePoints.map((pt, i) => {
      const theta = (i / count) * Math.PI * 2;
      const px = pt.x * 1.02;
      const pz = pt.z * 1.02;
      // Fixed math so drapes hang DOWN from the anchor point (y=0) to the peak (y=-depth)
      const y = -Math.abs(Math.sin(theta * (numSwoops / 2))) * depth; 
      return new THREE.Vector3(px, y, pz);
    });
    
    return new THREE.CatmullRomCurve3(points, true);
  }, [shape, radius, depth]);
  
  return (
    <mesh position={[0, yPos, 0]} castShadow>
      <tubeGeometry args={[curve, 200, thickness, 12, true]} />
      <meshPhysicalMaterial color={color} roughness={0.65} clearcoat={0.1} />
    </mesh>
  );
};

const Teardrops = ({ shapeConfig, yPos, color = "#ffffff", scale = 0.15 }) => {
  const { shape, radius } = shapeConfig;
  const meshRef = React.useRef();

  const points = useMemo(() => {
    const numSwoops = Math.max(4, Math.floor(radius * 2));
    const pts = getPerimeterPoints(shape, numSwoops);
    return pts.slice(0, -1);
  }, [shape, radius]);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      points.forEach((pt, i) => {
        dummy.position.set(pt.x * 1.02, -0.15, pt.z * 1.02);
        dummy.scale.set(scale, scale * 1.8, scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points, scale]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={meshRef} args={[null, null, points.length]} castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} />
      </instancedMesh>
    </group>
  );
};

const Pearls = ({ shapeConfig, yPos, color = "#ffffff" }) => {
  const { shape, radius } = shapeConfig;
  const meshRef = React.useRef();

  const points = useMemo(() => {
    const numSwoops = Math.max(4, Math.floor(radius * 2));
    const pts = getPerimeterPoints(shape, numSwoops);
    return pts.map(p => p.multiplyScalar(1.05)).slice(0, -1);
  }, [shape, radius]);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      points.forEach((pt, i) => {
        dummy.position.set(pt.x, -0.05, pt.z);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={meshRef} args={[null, null, points.length]} castShadow>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshPhysicalMaterial color={color} metalness={0.9} roughness={0.1} clearcoat={1.0} />
      </instancedMesh>
    </group>
  );
};

const Candles = ({ shapeConfig, yPos, count = 5 }) => {
  const { shape } = shapeConfig;
  const waxRef = React.useRef();
  const flameRef = React.useRef();

  const points = useMemo(() => {
    return getPerimeterPoints(shape, count).map(p => p.multiplyScalar(0.55));
  }, [shape, count]);

  React.useLayoutEffect(() => {
    if (waxRef.current && flameRef.current) {
      const dummyWax = new THREE.Object3D();
      const dummyFlame = new THREE.Object3D();
      points.forEach((pt, i) => {
        dummyWax.position.set(pt.x, 0.6, pt.z);
        dummyWax.updateMatrix();
        waxRef.current.setMatrixAt(i, dummyWax.matrix);
        waxRef.current.setColorAt(i, new THREE.Color().setHSL(Math.random(), 0.8, 0.7));

        dummyFlame.position.set(pt.x, 1.35, pt.z);
        dummyFlame.updateMatrix();
        flameRef.current.setMatrixAt(i, dummyFlame.matrix);
      });
      waxRef.current.instanceMatrix.needsUpdate = true;
      if (waxRef.current.instanceColor) waxRef.current.instanceColor.needsUpdate = true;
      flameRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [points]);

  return (
    <group position={[0, yPos, 0]}>
      <instancedMesh ref={waxRef} args={[null, null, points.length]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 16]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={flameRef} args={[null, null, points.length]}>
        <coneGeometry args={[0.08, 0.3, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </instancedMesh>
    </group>
  );
};

const NumberTopper = ({ text = "20", yPos = 0 }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 160px sans-serif';
    ctx.fillText(text, 128, 128 + 15);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text]);

  return (
    <group position={[0, yPos, 0]}>
      {/* Stick */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      
      {/* Circle Sign */}
      <mesh position={[0, 1.4, 0]} rotation={[Math.PI/2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Text Plane */}
      <mesh position={[0, 1.4, 0.035]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={texture} transparent={true} depthWrite={false} />
      </mesh>
    </group>
  );
};

/**
 * SPONGE TEXTURE GENERATOR
 */
const useSpongeTexture = () => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Fill base
    ctx.fillStyle = '#888888'; // neutral grey for bump map
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise (crumbs)
    for (let i = 0; i < 50000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3;
      const c = Math.random() > 0.5 ? '#ffffff' : '#000000'; // high contrast for bump
      ctx.fillStyle = c;
      ctx.globalAlpha = Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add bigger air bubbles (pores)
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 6;
      ctx.fillStyle = '#000000'; // deep holes
      ctx.globalAlpha = Math.random() * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }, []);
};

/**
 * TEXT COMPONENT (CanvasTexture based to avoid troika bugs)
 */
const CakeText = ({ text, color, radius, font }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl'; // Support Arabic
    
    let fontSize = 70;
    if (text.length > 12) fontSize = 55;
    if (text.length > 20) fontSize = 40;
    
    let fontName = 'Tahoma, Arial, sans-serif';
    if (font === 'Modern') fontName = '"Courier New", Courier, monospace';
    if (font === 'Handwriting') fontName = '"Brush Script MT", "Comic Sans MS", cursive';
    
    ctx.font = `bold ${fontSize}px ${fontName}`;
    
    const words = text.split(' ');
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(' '), 256, 256 - fontSize/2 - 10);
      ctx.fillText(words.slice(mid).join(' '), 256, 256 + fontSize/2 + 10);
    } else {
      ctx.fillText(text, 256, 256);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, color]);

  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
      <planeGeometry args={[radius * 1.8, radius * 1.8]} />
      <meshBasicMaterial map={texture} transparent={true} depthWrite={false} />
    </mesh>
  );
};

const EdibleImage = ({ imageUrl, radius }) => {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);

  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI/2, 0, 0]}>
      <circleGeometry args={[radius * 0.6, 64]} />
      <meshBasicMaterial map={texture} transparent={true} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

/**
 * CAKE STACK COMPONENT
 */
const CakeStack = ({ config }) => {
  const { tiers = [], toppingStyle = 'basic', customText = '', shapeType = 'circle', scale = 1.0 } = config;
  
  const spongeBumpMap = useSpongeTexture();

  const TIER_HEIGHT = shapeType === 'standard' ? 1.8 : 1.2;
  const BASE_RADIUS = 3.5;
  
  const renderTiers = useMemo(() => {
    let currentY = 0;
    return tiers.map((tier, index) => {
      // Sheet cakes don't shrink drastically per tier, others do
      const tierShrink = shapeType === 'sheet' ? 0.3 : 0.6;
      const radius = BASE_RADIUS - (index * tierShrink);
      
      const shape = getCakeShape(shapeType, radius, config.isCutaway);
      
      const extrudeSettings = {
        depth: TIER_HEIGHT,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05
      };
      
      const yPos = currentY;
      currentY += TIER_HEIGHT;
      
      return { ...tier, radius, shape, extrudeSettings, yPos };
    });
  }, [JSON.stringify(tiers), shapeType, TIER_HEIGHT, config.isCutaway]);

  const topTier = renderTiers[renderTiers.length - 1];
  const topSurfaceY = topTier ? topTier.yPos + TIER_HEIGHT : 0;

  return (
    <group 
      scale={[scale, scale, scale]} 
      rotation={config.isCutaway ? [0, Math.PI / 8, 0] : [0, 0, 0]} 
      position={config.isCutaway ? [-0.5, -0.5, 0.5] : [0, 0, 0]}
    >
      {renderTiers.map((tier, index) => {
        let baseColor = tier.color || '#f5ebd9';

        if (config.isCutaway) {
          // Render a layered slice (Sponge -> Frosting -> Sponge -> Frosting)
          const SPONGE_HEIGHT = TIER_HEIGHT * 0.4;
          const FROSTING_HEIGHT = TIER_HEIGHT * 0.2;
          const layerConfigs = [
             { isSponge: true, depth: SPONGE_HEIGHT, y: tier.yPos },
             { isSponge: false, depth: FROSTING_HEIGHT, y: tier.yPos + SPONGE_HEIGHT },
             { isSponge: true, depth: SPONGE_HEIGHT, y: tier.yPos + SPONGE_HEIGHT + FROSTING_HEIGHT },
             { isSponge: false, depth: FROSTING_HEIGHT, y: tier.yPos + SPONGE_HEIGHT * 2 + FROSTING_HEIGHT },
          ];

          return (
            <group key={index}>
               {layerConfigs.map((lc, i) => {
                 const layerColor = lc.isSponge ? (config.flavorColor || '#f5deb3') : baseColor;
                 const roughness = lc.isSponge ? 0.9 : 0.65;
                 const clearcoat = lc.isSponge ? 0 : 0.1;
                 const bumpMap = lc.isSponge ? spongeBumpMap : null;
                 const bumpScale = lc.isSponge ? 0.04 : 0;
                 
                 return (
                   <mesh key={i} castShadow receiveShadow position={[0, lc.y, 0]} rotation={[-Math.PI/2, 0, 0]}>
                     <extrudeGeometry args={[tier.shape, { ...tier.extrudeSettings, depth: lc.depth, bevelSize: 0.02, bevelThickness: 0.02 }]} />
                     <meshPhysicalMaterial attach="material-0" color={layerColor} roughness={roughness} clearcoat={clearcoat} bumpMap={bumpMap} bumpScale={bumpScale} />
                     <meshPhysicalMaterial attach="material-1" color={layerColor} roughness={roughness} clearcoat={clearcoat} bumpMap={bumpMap} bumpScale={bumpScale} />
                   </mesh>
                 );
               })}
            </group>
          );
        }

        return (
          <group key={index} position={[0, tier.yPos, 0]}>
            <mesh castShadow receiveShadow rotation={[-Math.PI/2, 0, 0]}>
              <extrudeGeometry args={[tier.shape, tier.extrudeSettings]} />
              {/* Material 0: Top and Bottom (Always Frosting) */}
              <meshPhysicalMaterial attach="material-0" color={baseColor} roughness={0.65} clearcoat={0.1} />
              {/* Material 1: Sides (Sponge Flavor if cutaway, otherwise Frosting) */}
              <meshPhysicalMaterial 
                attach="material-1" 
                color={baseColor} 
                roughness={0.65} 
                clearcoat={0.1} 
              />
            </mesh>
            
            <PipedBorder shapeConfig={tier} yPos={0} color={baseColor} scale={0.12} />
            
            {toppingStyle === 'retro-cherries' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" scale={0.15} />
                {index === renderTiers.length - 1 && (
                  <Cherries shapeConfig={tier} yPos={TIER_HEIGHT} spacing={1.5} />
                )}
              </>
            )}

            {toppingStyle === 'birthday-candles' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color={baseColor} scale={0.12} />
                <Sprinkles shapeConfig={tier} yPos={TIER_HEIGHT} />
                {index === renderTiers.length - 1 && (
                  <>
                    <Candles shapeConfig={tier} yPos={TIER_HEIGHT} count={7} />
                    {!customText && (
                      <group position={[0, TIER_HEIGHT, 0]}>
                        <CakeText text="Happy Birthday" color={config.textColor || '#4a2511'} radius={tier.radius} font={config.textFont || 'Dancing Script'} />
                      </group>
                    )}
                  </>
                )}
              </>
            )}

            {toppingStyle === 'purple-star' && (
              <>
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#4a0082" depth={0.5} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#4a0082" scale={0.14} />
              </>
            )}

            {toppingStyle === 'rose-fields' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#e6ffe6" scale={0.1} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} />
                {index === renderTiers.length - 1 && (
                  <Roses shapeConfig={tier} yPos={TIER_HEIGHT} spacing={1.2} color="#ffb6c1" />
                )}
              </>
            )}

            {toppingStyle === 'lemon-retro' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffd700" scale={0.16} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffd700" depth={0.3} />
                {index === renderTiers.length - 1 && (
                  <Pearls shapeConfig={{...tier, radius: tier.radius - 0.4}} yPos={TIER_HEIGHT} />
                )}
              </>
            )}

            {toppingStyle === 'cherry-choco' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#fff" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#fff" depth={0.2} />
                {index === renderTiers.length - 1 && (
                  <>
                    <PipedBorder shapeConfig={{...tier, radius: tier.radius - 0.3}} yPos={TIER_HEIGHT} color="#3E2723" scale={0.16} />
                    <Cherries shapeConfig={{...tier, radius: tier.radius - 0.3}} yPos={TIER_HEIGHT} spacing={1.2} />
                  </>
                )}
              </>
            )}
            
            {toppingStyle === 'rip-20s' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.3} />
                {index === renderTiers.length - 1 && (
                  <Cherries shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} spacing={1.4} color="#111111" />
                )}
              </>
            )}

            {toppingStyle === 'cancer-glow' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffb6c1" scale={0.12} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT * 0.75} color="#87ceeb" scale={0.08} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT * 0.5} color="#ffd700" scale={0.08} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT * 0.25} color="#ffb6c1" scale={0.08} />
                {index === renderTiers.length - 1 && (
                  <Pearls shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} />
                )}
              </>
            )}

            {toppingStyle === 'spider-retro' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#39ff14" scale={0.12} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#1a1a1a" scale={0.10} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#1a1a1a" depth={0.4} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} color="#a32c81" />
              </>
            )}

            {toppingStyle === 'witches-dont-age' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#8b0000" scale={0.14} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#8b0000" scale={0.1} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#8b0000" depth={0.5} />
              </>
            )}
            {toppingStyle === 'queen-of-hearts' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#dc143c" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.4} />
                {index === renderTiers.length - 1 && (
                  <Cherries shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#dc143c" />
                )}
              </>
            )}
            {toppingStyle === 'whos-33' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#9370db" scale={0.14} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#ffffff" scale={0.08} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#1a1a1a" depth={0.4} />
                <Pearls shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#9370db" />
              </>
            )}
            {toppingStyle === 'snoopys-day' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#1e90ff" scale={0.12} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius - 0.15}} yPos={TIER_HEIGHT} color="#dc143c" scale={0.10} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.3} />
              </>
            )}
            {toppingStyle === 'sweet-cherry' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#dc143c" scale={0.12} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.75} color="#1e90ff" scale={0.08} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#dc143c" scale={0.08} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.25} color="#1e90ff" scale={0.08} />
                {index === renderTiers.length - 1 && (
                  <Cherries shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} />
                )}
              </>
            )}
            {toppingStyle === 'aries-queen' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ff69b4" scale={0.14} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#ff8c00" scale={0.12} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ff69b4" depth={0.3} />
                <Pearls shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#ffffff" />
              </>
            )}
            {toppingStyle === 'retro-skies' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#87ceeb" scale={0.12} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#87ceeb" depth={0.4} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} />
              </>
            )}
            {toppingStyle === 'gemini-vibes' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffb6c1" scale={0.12} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.5} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#ffb6c1" scale={0.08} />
              </>
            )}
            {toppingStyle === 'leo-season' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" scale={0.14} />
                <PipedBorder shapeConfig={{...tier, radius: tier.radius - 0.15}} yPos={TIER_HEIGHT} color="#dc143c" scale={0.10} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffd700" depth={0.3} />
              </>
            )}
            {toppingStyle === '20s-retro' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.6} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} color="#a32c81" />
                {index === renderTiers.length - 1 && (
                  <NumberTopper text="20" yPos={TIER_HEIGHT} />
                )}
              </>
            )}
            {toppingStyle === 'pisces-vibes' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#98fb98" scale={0.12} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#ffffff" scale={0.08} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#98fb98" depth={0.4} />
              </>
            )}
            {toppingStyle === 'scorpio-vibes' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#4169e1" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#4169e1" depth={0.5} />
                <Pearls shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" />
              </>
            )}
            {toppingStyle === 'libra-vibes' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ff8c00" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ff8c00" depth={0.4} />
                <Pearls shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#ffffff" />
              </>
            )}
            {toppingStyle === 'capricorn' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#2e8b57" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#2e8b57" depth={0.3} />
                {index === renderTiers.length - 1 && (
                  <Roses shapeConfig={tier} yPos={TIER_HEIGHT} spacing={1.5} color="#ffb6c1" />
                )}
              </>
            )}
            {toppingStyle === 'taurus' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#dc143c" scale={0.14} />
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT * 0.5} color="#dc143c" scale={0.10} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.4} />
              </>
            )}
            
            {/* FINAL 4 STYLES */}
            {toppingStyle === 'glitter-charm' && (
              <>
                {/* Thick top border */}
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#8b0000" scale={0.14} />
                {/* Inner border on top tier */}
                {index === renderTiers.length - 1 && (
                  <PipedBorder shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#8b0000" scale={0.1} />
                )}
                
                {/* Main heavy drape */}
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#8b0000" depth={0.4} thickness={0.06} />
                {/* Thin stringwork layers below */}
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT - 0.05} color="#8b0000" depth={0.5} thickness={0.02} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT - 0.1} color="#8b0000" depth={0.6} thickness={0.015} />
                
                {/* Teardrops at the anchor points! */}
                <Teardrops shapeConfig={tier} yPos={TIER_HEIGHT} color="#8b0000" scale={0.12} />
              </>
            )}
            {toppingStyle === 'healing' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffb6c1" scale={0.16} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffb6c1" depth={0.3} />
                <Pearls shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT - 0.3} color="#ffb6c1" />
              </>
            )}
            {toppingStyle === 'retro-ribbons' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#dc143c" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#dc143c" depth={0.5} />
                <Pearls shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT - 0.5} color="#dc143c" />
              </>
            )}
            {toppingStyle === 'sweet-retro' && (
              <>
                <PipedBorder shapeConfig={tier} yPos={TIER_HEIGHT} color="#9370db" scale={0.14} />
                <Drapes shapeConfig={tier} yPos={TIER_HEIGHT} color="#ffffff" depth={0.4} />
                <Pearls shapeConfig={{...tier, radius: tier.radius + 0.05}} yPos={TIER_HEIGHT - 0.2} color="#dc143c" />
                {index === renderTiers.length - 1 && (
                  <Cherries shapeConfig={{...tier, radius: tier.radius - 0.2}} yPos={TIER_HEIGHT} color="#dc143c" />
                )}
              </>
            )}
          </group>
        );
      })}

      {!config.isCutaway && topTier && toppingStyle === 'sprinkles' && (
        <Sprinkles shapeConfig={topTier} yPos={topSurfaceY} />
      )}

      {!config.isCutaway && topTier && config.uploadedImage && (
        <group position={[0, topSurfaceY, 0]}>
          <EdibleImage imageUrl={config.uploadedImage} radius={topTier.radius} />
        </group>
      )}

      {!config.isCutaway && topTier && customText && (
        <group position={[0, topSurfaceY, 0]}>
          <CakeText 
            text={customText} 
            color={config.textColor || '#4a2511'}
            font={config.textFont || 'Classic'}
            radius={topTier.radius}
          />
        </group>
      )}
    </group>
  );
};

function CameraRig({ tierCount, isMini }) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (isMini) return;
    // Calculate optimal framing based on cake height
    const targetFov = tierCount === 3 ? 46 : tierCount === 2 ? 42 : 38;
    const targetY = tierCount === 3 ? 12 : tierCount === 2 ? 10.5 : 9.5;
    
    // Smooth cinematic zoom and pan
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
    camera.updateProjectionMatrix();
  });
  return null;
}

export default function Cake3DCanvas({ config, isMini = false }) {
  const tierCount = config?.tiers?.length || 1;
  const targetY = tierCount === 3 ? 2.0 : tierCount === 2 ? 1.3 : 0.6;

  return (
    <div className="cake-canvas-container" style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: isMini ? 'none' : 'auto' }}>
      <Canvas id="cake-3d-canvas" gl={{ preserveDrawingBuffer: true, antialias: true }} frameloop={isMini ? "demand" : "always"} shadows={isMini ? false : { type: THREE.PCFShadowMap }} dpr={isMini ? 1 : [1, 1.5]} camera={{ position: isMini ? [0, 12, 16] : [0, 9.5, 14.5], fov: isMini ? 65 : 38 }} style={{ touchAction: 'pan-y' }}>
        <React.Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow={!isMini} shadow-mapSize={isMini ? 256 : 1024} shadow-bias={-0.0001} />
          {!isMini && <spotLight position={[-10, 10, -10]} intensity={0.5} />}
          <Environment resolution={isMini ? 64 : 256}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
              <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 0.1, 1]} />
              <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[5, 1, -1]} scale={[20, 0.1, 1]} />
              <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 10, 1]} />
            </group>
          </Environment>
          <group rotation={isMini ? [0.4, -Math.PI / 6, 0] : [0, 0, 0]} position={isMini ? [0, -3, 0] : [0, 0, 0]}>
            <CakeStack config={config} />
          </group>
          {!isMini && <ContactShadows position={[0, -0.01, 0]} opacity={0.7} scale={20} blur={1.5} far={10} resolution={256} color="#000000" />}
          <CameraRig tierCount={tierCount} isMini={isMini} />
        </React.Suspense>
        {!isMini && <OrbitControls target={[0, targetY, 0]} enableZoom={false} enablePan={false} enableDamping={true} dampingFactor={0.05} maxPolarAngle={Math.PI / 2 - 0.05} minPolarAngle={0} minDistance={6} maxDistance={25} />}
      </Canvas>
    </div>
  );
}
