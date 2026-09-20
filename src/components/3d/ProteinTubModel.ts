import * as THREE from 'three';
import { createProteinLabelTexture, createTubCapBumpTexture } from './proteinTextures';

export interface ProteinModel3DOptions {
  flavorName: string;
  accentHex: string;
  servings?: number;
  weight?: string;
  sizeId?: string;
}

/**
 * Builds a realistic 3D supplement tub modeled after the iconic Optimum Nutrition
 * Gold Standard products across all 3 sizes:
 * - 310g: Slender, tall cylinder canister with almost flush screw cap and minimal step shoulder
 * - 2 LB: Medium supplement jug with rounded dome shoulder and 29 servings format
 * - 5 LB: Large, wide, massive heavy-duty jug with expansive dome shoulder and 74 servings
 */
export function buildProteinTubMesh(options: ProteinModel3DOptions): THREE.Group {
  const group = new THREE.Group();

  const {
    flavorName,
    accentHex,
    servings = 74,
    weight = '5 LB (2.27 KG)',
    sizeId
  } = options;

  const is310g = sizeId === '310g' || weight.includes('310') || weight.includes('10.9');
  const is2lb = sizeId === '2lb' || weight.includes('2 LB') || weight.includes('907');

  // Tub Master Dimensions computed dynamically per size
  let bodyRadius: number;
  let labelHeight: number;
  let shoulderHeight: number;
  let neckRadius: number;
  let neckHeight: number;
  let capRadius: number;
  let capHeight: number;
  let baseFilletHeight: number;
  let bottomRecessRadius: number;

  if (is310g) {
    // 310g Canister: Slender straight cylinder profile, cap is almost flush with body
    bodyRadius = 1.04;
    labelHeight = 2.15;
    shoulderHeight = 0.10;
    neckRadius = 0.98;
    neckHeight = 0.08;
    capRadius = 1.02;
    capHeight = 0.44;
    baseFilletHeight = 0.22;
    bottomRecessRadius = 0.96;
  } else if (is2lb) {
    // 2 LB Jug: Medium classic jug
    bodyRadius = 1.28;
    labelHeight = 1.95;
    shoulderHeight = 0.54;
    neckRadius = 0.84;
    neckHeight = 0.16;
    capRadius = 0.92;
    capHeight = 0.42;
    baseFilletHeight = 0.36;
    bottomRecessRadius = 1.06;
  } else {
    // 5 LB Jug: Massive, wide, squat jug
    bodyRadius = 1.55;
    labelHeight = 2.05;
    shoulderHeight = 0.72;
    neckRadius = 0.94;
    neckHeight = 0.20;
    capRadius = 1.04;
    capHeight = 0.46;
    baseFilletHeight = 0.48;
    bottomRecessRadius = 1.24;
  }

  // Material: Glossy Black Injection-Molded Plastic (for shoulder, neck, base)
  const blackPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x15171a,
    roughness: 0.22,
    metalness: 0.12,
  });

  // 1. MIDDLE CYLINDRICAL LABEL SECTION
  const labelGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, labelHeight, 64, 1, true);
  const labelTexture = createProteinLabelTexture(flavorName, accentHex, servings, weight, sizeId);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture,
    roughness: 0.32,
    metalness: 0.08,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.castShadow = true;
  labelMesh.receiveShadow = true;
  labelMesh.position.y = 0;
  // Rotate so front face is directly aligned forward (-Z)
  labelMesh.rotation.y = -Math.PI / 2;
  group.add(labelMesh);

  // 2. SMOOTH ROUNDED DOME SHOULDER (Lathe Geometry for continuous organic curvature)
  const shoulderPoints: THREE.Vector2[] = [];
  const shoulderSegments = 24;
  const yLabelTop = labelHeight / 2;

  for (let i = 0; i <= shoulderSegments; i++) {
    const t = i / shoulderSegments; // 0 at body, 1 at neck
    // Smooth cosine S-curve for the shoulder dome
    const rad = bodyRadius - (bodyRadius - neckRadius) * Math.pow(Math.sin(t * (Math.PI / 2)), 1.3);
    const y = yLabelTop + t * shoulderHeight;
    shoulderPoints.push(new THREE.Vector2(rad, y));
  }

  const shoulderGeo = new THREE.LatheGeometry(shoulderPoints, 64);
  const shoulderMesh = new THREE.Mesh(shoulderGeo, blackPlasticMat);
  shoulderMesh.castShadow = true;
  group.add(shoulderMesh);

  // 3. THREADED NECK
  const yNeckBottom = yLabelTop + shoulderHeight;
  const neckGeo = new THREE.CylinderGeometry(neckRadius, neckRadius, neckHeight, 64);
  const neckMesh = new THREE.Mesh(neckGeo, blackPlasticMat);
  neckMesh.position.y = yNeckBottom + neckHeight / 2;
  group.add(neckMesh);

  // 4. WIDE RIBBED SCREW CAP
  const yCapBottom = yNeckBottom + neckHeight - 0.04;
  const capBumpTexture = createTubCapBumpTexture();

  const capMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.3,
    metalness: 0.15,
    bumpMap: capBumpTexture,
    bumpScale: 0.07,
  });

  // Main cap cylinder
  const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 64, 1, false);
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = yCapBottom + capHeight / 2;
  capMesh.castShadow = true;
  group.add(capMesh);

  // Cap Top Chamfer & Embossed Disc
  const capTopGeo = new THREE.CylinderGeometry(capRadius - 0.04, capRadius, 0.06, 64);
  const capTopMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.22,
    metalness: 0.2
  });
  const capTopMesh = new THREE.Mesh(capTopGeo, capTopMat);
  capTopMesh.position.y = yCapBottom + capHeight + 0.02;
  group.add(capTopMesh);

  // Cap top raised circular ridge (typical of ON tubs)
  const capRidgeGeo = new THREE.TorusGeometry(capRadius * 0.75, 0.02, 16, 64);
  const capRidgeMat = new THREE.MeshStandardMaterial({
    color: 0x22262c,
    roughness: 0.25,
    metalness: 0.2
  });
  const capRidgeMesh = new THREE.Mesh(capRidgeGeo, capRidgeMat);
  capRidgeMesh.rotation.x = Math.PI / 2;
  capRidgeMesh.position.y = yCapBottom + capHeight + 0.05;
  group.add(capRidgeMesh);

  // Shrink band security seal ring under cap
  const sealRingGeo = new THREE.TorusGeometry(neckRadius + 0.015, 0.018, 16, 64);
  const sealRingMat = new THREE.MeshStandardMaterial({
    color: 0x20242a,
    roughness: 0.2,
    metalness: 0.4
  });
  const sealRing = new THREE.Mesh(sealRingGeo, sealRingMat);
  sealRing.rotation.x = Math.PI / 2;
  sealRing.position.y = yCapBottom - 0.01;
  group.add(sealRing);

  // 5. SMOOTH ROUNDED BASE FILLET (Curves inward from body down to bottom rim)
  const basePoints: THREE.Vector2[] = [];
  const baseSegments = 20;
  const yLabelBottom = -labelHeight / 2;

  for (let i = 0; i <= baseSegments; i++) {
    const t = i / baseSegments; // 0 at label bottom, 1 at floor
    // Smooth convex fillet
    const rad = bodyRadius - (bodyRadius - bottomRecessRadius) * (1 - Math.cos(t * (Math.PI / 2)));
    const y = yLabelBottom - t * baseFilletHeight;
    basePoints.push(new THREE.Vector2(rad, y));
  }
  // Bottom flat seal
  basePoints.push(new THREE.Vector2(0, yLabelBottom - baseFilletHeight));

  const baseGeo = new THREE.LatheGeometry(basePoints, 64);
  const baseMesh = new THREE.Mesh(baseGeo, blackPlasticMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Center the whole tub vertically around the origin
  group.position.y = -0.15;

  return group;
}
