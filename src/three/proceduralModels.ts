import * as THREE from 'three';
import {
  BiomeMonsterPalette,
  CharacterAppearance,
  RARITY_CONFIG,
  WeaponRarity,
  WeaponTypeId,
} from '../types/game';

export type DestructibleKind =
  | 'crate'
  | 'barrel'
  | 'car'
  | 'tree'
  | 'house'
  | 'cart'
  | 'street_sign'
  | 'hydrant'
  | 'streetlight'
  | 'windmill'
  | 'fountain'
  | 'snowman'
  | 'cactus'
  | 'crystal_cluster'
  | 'bus_stop'
  | 'phone_booth'
  | 'statue';

// Shared procedural contact shadow texture
let sharedShadowTex: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedShadowTex) return sharedShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedShadowTex = tex;
  return tex;
}

export function createContactShadowDisc(radius: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  return mesh;
}

export interface HeroRigRefs {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponSocket: THREE.Group;
  tailPivot?: THREE.Group;
}

// Streamlined, smooth, high-segment character rig with support for Cat, Fox, Wolf, Bunny, Bear & Demon ears, muzzles, and tails
export function createHeroRig(appearance: CharacterAppearance): HeroRigRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  root.add(createContactShadowDisc(1.0));

  const p = appearance.proportions;
  const c = appearance.colors;
  const earsType = appearance.accessories.ears || 'none';
  const tailType = appearance.accessories.tail || 'none';
  const muzzleType = appearance.accessories.muzzle || 'none';

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: c.skin || '#F1C27D',
    roughness: 0.46,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.38,
  });
  const shirtMat = new THREE.MeshPhysicalMaterial({
    color: c.shirt || '#06B6D4',
    roughness: 0.4,
    metalness: 0.08,
    clearcoat: 0.28,
    sheen: 0.35,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: c.pants || '#1E293B',
    roughness: 0.62,
    metalness: 0.06,
  });
  const shoeMat = new THREE.MeshPhysicalMaterial({
    color: c.shoes || '#F43F5E',
    roughness: 0.28,
    metalness: 0.2,
    clearcoat: 0.6,
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: c.hair || '#EC4899',
    roughness: 0.36,
    metalness: 0.12,
    clearcoat: 0.32,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: c.accent || '#FACC15',
    roughness: 0.2,
    metalness: 0.55,
    clearcoat: 0.75,
  });
  const innerEarMat = new THREE.MeshPhysicalMaterial({
    color:
      earsType === 'fox_ears'
        ? '#FEF3C7'
        : earsType === 'cat_ears' || earsType === 'bunny_ears'
        ? '#F472B6'
        : c.accent || '#FACC15',
    roughness: 0.45,
    metalness: 0.05,
  });
  const creamFurMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFBEB',
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.15,
  });
  const darkMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.22,
    metalness: 0.85,
    clearcoat: 0.5,
  });
  const soleWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
  });

  const legRadius = 0.115 * p.limbThickness;
  const legLength = 0.36;
  const legTotalH = 0.62;
  const torsoRadius = 0.28 * p.torsoWidth;
  const torsoLength = 0.36;
  const torsoH = 0.76;

  // Smooth Capsule Legs + Streamlined Rounded Sneakers
  const legGeo = new THREE.CapsuleGeometry(legRadius, legLength, 8, 16);
  legGeo.translate(0, -legTotalH * 0.48, 0);

  const buildSneaker = () => {
    const shoeGroup = new THREE.Group();
    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(legRadius * 1.08, 0.14, 8, 14),
      shoeMat
    );
    upper.rotation.x = Math.PI / 2;
    upper.position.set(0, -legTotalH + 0.11, 0.05);
    upper.castShadow = true;

    const sole = new THREE.Mesh(
      new THREE.CylinderGeometry(legRadius * 1.15, legRadius * 1.2, 0.05, 16),
      soleWhiteMat
    );
    sole.scale.set(1, 1, 1.45);
    sole.position.set(0, -legTotalH + 0.03, 0.05);
    shoeGroup.add(upper, sole);
    return shoeGroup;
  };

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-torsoRadius * 0.55, legTotalH, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh, buildSneaker());
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(torsoRadius * 0.55, legTotalH, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh, buildSneaker());
  bodyGroup.add(rightLeg);

  // Streamlined Capsule Torso + Rounded Collar + Belt Torus
  const torsoGeo = new THREE.CapsuleGeometry(torsoRadius, torsoLength, 12, 24);
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.scale.set(1.12, 1.0, 0.78);
  torsoMesh.position.set(0, legTotalH + torsoH * 0.48, 0);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  // Collar ring
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(torsoRadius * 0.62, 0.045, 10, 24),
    accentMat
  );
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, legTotalH + torsoH * 0.88, 0);
  bodyGroup.add(collarRing);

  // Smooth Belt
  const beltTorus = new THREE.Mesh(
    new THREE.CylinderGeometry(
      torsoRadius * 1.06,
      torsoRadius * 1.04,
      0.1,
      24
    ),
    darkMetalMat
  );
  beltTorus.scale.set(1.06, 1, 0.78);
  beltTorus.position.set(0, legTotalH + 0.12, 0);
  bodyGroup.add(beltTorus);

  const buckle = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.06, 6, 12),
    accentMat
  );
  buckle.rotation.z = Math.PI / 2;
  buckle.position.set(0, legTotalH + 0.12, torsoRadius * 0.84);
  bodyGroup.add(buckle);

  // Smooth Rounded Arms + Spherical Shoulder Pads & Hands
  const armR = 0.095 * p.limbThickness;
  const armLen = 0.36;
  const armGeo = new THREE.CapsuleGeometry(armR, armLen, 8, 16);
  armGeo.translate(0, -0.26, 0);

  const handGeo = new THREE.SphereGeometry(armR * 1.22, 14, 14);

  const leftArm = new THREE.Group();
  leftArm.position.set(
    -(torsoRadius * 1.12 + armR * 0.8),
    legTotalH + torsoH * 0.78,
    0
  );
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
  leftArmMesh.castShadow = true;
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(0, -0.52, 0);
  leftArm.add(leftArmMesh, leftHand);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(
    torsoRadius * 1.12 + armR * 0.8,
    legTotalH + torsoH * 0.78,
    0
  );
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
  rightArmMesh.castShadow = true;
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(0, -0.52, 0);
  rightArm.add(rightArmMesh, rightHand);

  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0, -0.52, 0.12);
  rightArm.add(weaponSocket);
  bodyGroup.add(rightArm);

  // Streamlined Spherical/Capsule Head Group
  const headGroup = new THREE.Group();
  const headY = legTotalH + torsoH * 0.92;
  headGroup.position.set(0, headY, 0);
  const headR = 0.29 * p.headScale;

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 24, 20),
    skinMat
  );
  headMesh.scale.set(1.04, 1.04, 0.98);
  headMesh.position.set(0, headR * 0.95, 0);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Standard side ears only if no animal top-ears are selected
  if (earsType === 'none' || earsType === 'demon_horns') {
    const earGeo = new THREE.SphereGeometry(headR * 0.22, 10, 10);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-headR * 0.95, headR * 0.95, 0);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(headR * 0.95, headR * 0.95, 0);
    headGroup.add(leftEar, rightEar);
  }

  // ==================== ANIMAL EARS & HORNS ====================
  if (earsType === 'cat_ears' || earsType === 'fox_ears' || earsType === 'wolf_ears') {
    const isFox = earsType === 'fox_ears';
    const isWolf = earsType === 'wolf_ears';
    const earH = isFox ? headR * 1.18 : isWolf ? headR * 0.96 : headR * 0.86;
    const earW = isFox ? headR * 0.46 : headR * 0.42;

    const buildPointedEar = (side: number) => {
      const earGroup = new THREE.Group();
      const outerCone = new THREE.Mesh(
        new THREE.ConeGeometry(earW, earH, 14),
        isFox ? skinMat : hairMat
      );
      outerCone.scale.set(1.0, 1.0, 0.58);
      outerCone.position.y = earH * 0.42;
      outerCone.castShadow = true;

      const innerCone = new THREE.Mesh(
        new THREE.ConeGeometry(earW * 0.62, earH * 0.74, 12),
        innerEarMat
      );
      innerCone.scale.set(1.0, 1.0, 0.35);
      innerCone.position.set(0, earH * 0.38, earW * 0.18);

      earGroup.add(outerCone, innerCone);

      // Fox black/dark ear tips & cheek fluff
      if (isFox) {
        const tipCone = new THREE.Mesh(
          new THREE.ConeGeometry(earW * 0.42, earH * 0.36, 12),
          darkMetalMat
        );
        tipCone.scale.set(1.0, 1.0, 0.6);
        tipCone.position.y = earH * 0.75;
        earGroup.add(tipCone);
      }

      earGroup.position.set(side * headR * 0.62, headR * 1.66, 0.02);
      earGroup.rotation.z = -side * (isFox ? 0.32 : 0.25);
      earGroup.rotation.x = 0.12;
      return earGroup;
    };

    headGroup.add(buildPointedEar(-1), buildPointedEar(1));

    // Extra side cheek fur tufts for Fox and Cat!
    if (isFox || earsType === 'cat_ears') {
      for (const side of [-1, 1]) {
        const tuft = new THREE.Mesh(
          new THREE.ConeGeometry(headR * 0.24, headR * 0.52, 10),
          isFox ? creamFurMat : skinMat
        );
        tuft.scale.set(1, 1, 0.5);
        tuft.position.set(side * headR * 0.98, headR * 0.78, headR * 0.18);
        tuft.rotation.z = -side * 1.15;
        headGroup.add(tuft);
      }
    }
  } else if (earsType === 'bunny_ears') {
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      const outer = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.22, headR * 0.95, 10, 16),
        skinMat
      );
      outer.scale.set(1.0, 1.0, 0.52);
      outer.position.y = headR * 0.6;
      outer.castShadow = true;

      const inner = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.13, headR * 0.72, 8, 12),
        innerEarMat
      );
      inner.scale.set(1.0, 1.0, 0.35);
      inner.position.set(0, headR * 0.58, headR * 0.08);

      earGroup.add(outer, inner);
      earGroup.position.set(side * headR * 0.42, headR * 1.72, 0);
      earGroup.rotation.z = -side * 0.16;
      earGroup.rotation.x = -0.08;
      headGroup.add(earGroup);
    }
  } else if (earsType === 'bear_ears') {
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      const outer = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.36, 16, 16),
        skinMat
      );
      outer.scale.set(1.0, 1.0, 0.55);
      const inner = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.21, 12, 12),
        innerEarMat
      );
      inner.scale.set(1.0, 1.0, 0.4);
      inner.position.z = headR * 0.12;
      earGroup.add(outer, inner);
      earGroup.position.set(side * headR * 0.76, headR * 1.72, 0);
      headGroup.add(earGroup);
    }
  } else if (earsType === 'elephant_ears') {
    // Huge floppy rounded elephant ears on both sides of the head!
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      const bigFlap = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.92, 18, 16),
        skinMat
      );
      bigFlap.scale.set(0.95, 1.22, 0.25);
      bigFlap.castShadow = true;

      const innerFlap = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.68, 14, 14),
        new THREE.MeshPhysicalMaterial({
          color: '#FDA4AF',
          roughness: 0.5,
        })
      );
      innerFlap.scale.set(0.9, 1.15, 0.18);
      innerFlap.position.z = headR * 0.14;

      earGroup.add(bigFlap, innerFlap);
      earGroup.position.set(side * headR * 1.32, headR * 0.95, -headR * 0.12);
      earGroup.rotation.y = -side * 0.35;
      earGroup.rotation.z = -side * 0.12;
      headGroup.add(earGroup);
    }
  } else if (earsType === 'croc_ridge') {
    // Scaly Crocodile dorsal head crests & fierce reptilian brow ridges
    for (let s = 0; s < 3; s++) {
      const scute = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.22, headR * 0.45, 6),
        hairMat
      );
      scute.position.set(0, headR * (1.92 - s * 0.14), headR * (0.15 - s * 0.35));
      scute.rotation.x = -0.25 * s;
      headGroup.add(scute);
    }
    for (const side of [-1, 1]) {
      const browCrest = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.12, headR * 0.32, 8, 10),
        hairMat
      );
      browCrest.position.set(side * headR * 0.36, headR * 1.32, headR * 0.72);
      browCrest.rotation.z = Math.PI * 0.4;
      headGroup.add(browCrest);
    }
  } else if (earsType === 'lion_mane') {
    // Lush golden/fiery Lion Mane surrounding the head + rounded lion ears
    const maneCount = 12;
    for (let m = 0; m < maneCount; m++) {
      const angle = (m / maneCount) * Math.PI * 2;
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.44, 12, 12),
        hairMat
      );
      puff.position.set(
        Math.cos(angle) * headR * 0.96,
        headR * 0.98 + Math.sin(angle) * headR * 0.92,
        -headR * 0.18
      );
      puff.castShadow = true;
      headGroup.add(puff);
    }
    for (const side of [-1, 1]) {
      const lionEar = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.32, 12, 12),
        skinMat
      );
      lionEar.scale.set(1, 1, 0.5);
      lionEar.position.set(side * headR * 0.78, headR * 1.76, 0.08);
      headGroup.add(lionEar);
    }
  } else if (earsType === 'frog_eyes') {
    // Big bulging Frog Eyes perched on top of the head!
    const frogEyeWhite = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const frogPupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    for (const side of [-1, 1]) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.44, 16, 16),
        skinMat
      );
      dome.position.set(side * headR * 0.52, headR * 1.76, headR * 0.22);

      const eyeball = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.34, 14, 14),
        frogEyeWhite
      );
      eyeball.position.set(side * headR * 0.52, headR * 1.8, headR * 0.44);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.18, 12, 12),
        frogPupilMat
      );
      pupil.position.set(side * headR * 0.52, headR * 1.82, headR * 0.72);
      headGroup.add(dome, eyeball, pupil);
    }
  } else if (earsType === 'shark_fin') {
    // Tall swept-back dorsal Shark Fin on top of the head!
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(headR * 0.42, headR * 1.25, 12),
      skinMat
    );
    fin.scale.set(0.32, 1.0, 1.15);
    fin.position.set(0, headR * 2.15, -headR * 0.08);
    fin.rotation.x = -0.28;
    fin.castShadow = true;
    headGroup.add(fin);
  } else if (earsType === 'deer_antlers') {
    // Branched golden Deer Antlers + side deer ears
    for (const side of [-1, 1]) {
      const antlerGroup = new THREE.Group();
      const mainBeam = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.08, headR * 0.85, 8, 12),
        accentMat
      );
      mainBeam.position.set(side * headR * 0.22, headR * 0.45, 0);
      mainBeam.rotation.z = -side * 0.38;

      const tine1 = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.06, headR * 0.42, 6, 10),
        accentMat
      );
      tine1.position.set(side * headR * 0.12, headR * 0.45, headR * 0.15);
      tine1.rotation.x = 0.5;

      const tine2 = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.06, headR * 0.38, 6, 10),
        accentMat
      );
      tine2.position.set(side * headR * 0.42, headR * 0.72, 0);
      tine2.rotation.z = -side * 0.85;

      const deerEar = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.14, headR * 0.36, 8, 10),
        skinMat
      );
      deerEar.position.set(side * headR * 0.32, headR * 0.05, 0);
      deerEar.rotation.z = -side * 1.1;

      antlerGroup.add(mainBeam, tine1, tine2, deerEar);
      antlerGroup.position.set(side * headR * 0.42, headR * 1.65, 0);
      headGroup.add(antlerGroup);
    }
  } else if (earsType === 'demon_horns') {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.22, headR * 0.95, 12),
        accentMat
      );
      horn.position.set(side * headR * 0.58, headR * 1.92, 0.06);
      horn.rotation.z = -side * 0.38;
      horn.rotation.x = -0.22;
      headGroup.add(horn);
    }
  }

  // ==================== ANIMAL MUZZLES, TRUNKS, SNOUTS & WHISKERS ====================
  if (muzzleType !== 'none') {
    const isFoxMuzzle = muzzleType === 'fox_muzzle';
    const isWolfMuzzle = muzzleType === 'wolf_muzzle';
    const isCatMuzzle = muzzleType === 'cat_muzzle';

    if (muzzleType === 'elephant_trunk') {
      // Sculpted Curved 3D Elephant Trunk + Ivory Tusks!
      const trunkSeg1 = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.24, headR * 0.45, 10, 14),
        skinMat
      );
      trunkSeg1.rotation.x = Math.PI * 0.32;
      trunkSeg1.position.set(0, headR * 0.72, headR * 0.98);
      trunkSeg1.castShadow = true;

      const trunkSeg2 = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.19, headR * 0.46, 10, 14),
        skinMat
      );
      trunkSeg2.rotation.x = Math.PI * 0.12;
      trunkSeg2.position.set(0, headR * 0.42, headR * 1.32);
      trunkSeg2.castShadow = true;

      const trunkTip = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.16, headR * 0.28, 10, 14),
        skinMat
      );
      trunkTip.rotation.x = Math.PI * 0.55;
      trunkTip.position.set(0, headR * 0.32, headR * 1.56);

      headGroup.add(trunkSeg1, trunkSeg2, trunkTip);

      // Pair of White Ivory Tusks
      for (const side of [-1, 1]) {
        const tusk = new THREE.Mesh(
          new THREE.ConeGeometry(headR * 0.1, headR * 0.56, 12),
          creamFurMat
        );
        tusk.rotation.x = Math.PI * 0.62;
        tusk.rotation.z = -side * 0.22;
        tusk.position.set(side * headR * 0.34, headR * 0.62, headR * 1.05);
        headGroup.add(tusk);
      }
    } else if (muzzleType === 'croc_snout') {
      // Long Toothed Crocodile Jaw!
      const upperJaw = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.36, headR * 0.78, 10, 16),
        skinMat
      );
      upperJaw.rotation.x = Math.PI / 2;
      upperJaw.scale.set(1.15, 1.0, 0.58);
      upperJaw.position.set(0, headR * 0.78, headR * 1.12);
      upperJaw.castShadow = true;

      const lowerJaw = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.32, headR * 0.72, 10, 14),
        creamFurMat
      );
      lowerJaw.rotation.x = Math.PI / 2;
      lowerJaw.scale.set(1.08, 1.0, 0.42);
      lowerJaw.position.set(0, headR * 0.56, headR * 1.08);

      headGroup.add(upperJaw, lowerJaw);

      // Nostrils at tip of crocodile snout
      for (const side of [-1, 1]) {
        const nostril = new THREE.Mesh(
          new THREE.SphereGeometry(headR * 0.09, 10, 10),
          hairMat
        );
        nostril.position.set(side * headR * 0.16, headR * 0.92, headR * 1.56);
        headGroup.add(nostril);

        // Row of white crocodile teeth along both sides
        for (let t = 0; t < 3; t++) {
          const tooth = new THREE.Mesh(
            new THREE.ConeGeometry(headR * 0.052, headR * 0.15, 6),
            soleWhiteMat
          );
          tooth.rotation.x = Math.PI;
          tooth.position.set(
            side * headR * 0.32,
            headR * 0.65,
            headR * (0.95 + t * 0.24)
          );
          headGroup.add(tooth);
        }
      }
    } else if (muzzleType === 'frog_muzzle') {
      // Wide cheerful Frog Cheeks
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(
          new THREE.SphereGeometry(headR * 0.24, 12, 12),
          accentMat
        );
        cheek.position.set(side * headR * 0.68, headR * 0.78, headR * 0.72);
        headGroup.add(cheek);
      }
    } else if (muzzleType === 'shark_muzzle') {
      // Shark Snout + Row of White Teeth
      const snout = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.52, headR * 0.65, 14),
        skinMat
      );
      snout.rotation.x = Math.PI / 2;
      snout.scale.set(1.15, 1.0, 0.68);
      snout.position.set(0, headR * 0.84, headR * 0.98);
      headGroup.add(snout);
      for (let t = -2; t <= 2; t++) {
        const tooth = new THREE.Mesh(
          new THREE.ConeGeometry(headR * 0.045, headR * 0.14, 6),
          soleWhiteMat
        );
        tooth.rotation.x = Math.PI;
        tooth.position.set(t * headR * 0.14, headR * 0.68, headR * 0.96);
        headGroup.add(tooth);
      }
    } else if (muzzleType === 'deer_muzzle') {
      const snout = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.42, 14, 14),
        creamFurMat
      );
      snout.scale.set(1.15, 0.82, 0.88);
      snout.position.set(0, headR * 0.74, headR * 0.86);
      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.15, 12, 12),
        accentMat
      );
      nose.position.set(0, headR * 0.85, headR * 1.18);
      headGroup.add(snout, nose);
    } else if (isFoxMuzzle || isWolfMuzzle) {
      // Tapered 3D Fox / Wolf Snout
      const snoutUpper = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.46, headR * 0.68, 16),
        skinMat
      );
      snoutUpper.rotation.x = Math.PI / 2;
      snoutUpper.scale.set(1.05, 1.0, 0.78);
      snoutUpper.position.set(0, headR * 0.78, headR * 0.96);
      headGroup.add(snoutUpper);

      const snoutUnder = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.38, headR * 0.58, 14),
        isFoxMuzzle ? creamFurMat : hairMat
      );
      snoutUnder.rotation.x = Math.PI / 2;
      snoutUnder.scale.set(0.98, 1.0, 0.65);
      snoutUnder.position.set(0, headR * 0.7, headR * 0.94);
      headGroup.add(snoutUnder);

      const noseTip = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.13, 12, 12),
        darkMetalMat
      );
      noseTip.position.set(0, headR * 0.82, headR * 1.3);
      headGroup.add(noseTip);

      if (isWolfMuzzle) {
        for (const side of [-1, 1]) {
          const fang = new THREE.Mesh(
            new THREE.ConeGeometry(headR * 0.055, headR * 0.16, 8),
            soleWhiteMat
          );
          fang.position.set(side * headR * 0.16, headR * 0.66, headR * 1.08);
          headGroup.add(fang);
        }
      }
    } else {
      // Cute Twin-Puff Cat / Bunny / Lion Muzzle
      for (const side of [-1, 1]) {
        const cheekPuff = new THREE.Mesh(
          new THREE.SphereGeometry(
            headR * (muzzleType === 'lion_muzzle' ? 0.28 : 0.24),
            14,
            14
          ),
          creamFurMat
        );
        cheekPuff.scale.set(1.15, 0.85, 0.75);
        cheekPuff.position.set(side * headR * 0.17, headR * 0.74, headR * 0.88);
        headGroup.add(cheekPuff);
      }

      const cuteNose = new THREE.Mesh(
        new THREE.ConeGeometry(headR * 0.13, headR * 0.13, 3),
        muzzleType === 'lion_muzzle' ? darkMetalMat : innerEarMat
      );
      cuteNose.rotation.x = Math.PI / 2;
      cuteNose.rotation.z = Math.PI;
      cuteNose.position.set(0, headR * 0.84, headR * 1.05);
      headGroup.add(cuteNose);
    }

    // 3D Whiskers for Cat, Fox, Bunny, and Lion
    if (
      isCatMuzzle ||
      isFoxMuzzle ||
      muzzleType === 'bunny_muzzle' ||
      muzzleType === 'lion_muzzle'
    ) {
      const whiskerGeo = new THREE.CylinderGeometry(0.008, 0.004, headR * 0.72, 6);
      whiskerGeo.rotateZ(Math.PI / 2);
      for (const side of [-1, 1]) {
        for (let w = -1; w <= 1; w++) {
          const whisker = new THREE.Mesh(whiskerGeo, soleWhiteMat);
          whisker.position.set(
            side * headR * 0.56,
            headR * (0.76 + w * 0.07),
            headR * 0.92
          );
          whisker.rotation.z = side * w * 0.16;
          whisker.rotation.y = -side * 0.25;
          headGroup.add(whisker);
        }
      }
    }
  }

  // Expressive glossy eyes with white pupils
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.05,
    clearcoat: 1.0,
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeGeo = new THREE.SphereGeometry(headR * 0.15, 12, 12);
  const pupilGeo = new THREE.SphereGeometry(headR * 0.06, 8, 8);

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-headR * 0.34, headR * 1.04, headR * 0.86);
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-headR * 0.31, headR * 1.08, headR * 0.98);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(headR * 0.34, headR * 1.04, headR * 0.86);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(headR * 0.37, headR * 1.08, headR * 0.98);
  headGroup.add(leftEye, leftPupil, rightEye, rightPupil);

  // Eyewear (curved & streamlined)
  const ew = appearance.accessories.eyewear;
  if (ew === 'visor') {
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: c.accent || '#FACC15',
      emissive: c.accent || '#FACC15',
      emissiveIntensity: 0.75,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
    });
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(
        headR * 1.06,
        headR * 1.06,
        headR * 0.38,
        20,
        1,
        true,
        -Math.PI * 0.38,
        Math.PI * 0.76
      ),
      visorMat
    );
    visor.position.set(0, headR * 1.04, 0.02);
    headGroup.add(visor);
  } else if (ew === 'sunglasses' || ew === 'goggles') {
    const lensMat = ew === 'goggles' ? accentMat : darkMetalMat;
    const lensGeo = new THREE.CylinderGeometry(
      headR * 0.28,
      headR * 0.28,
      0.08,
      16
    );
    lensGeo.rotateX(Math.PI / 2);
    const lLens = new THREE.Mesh(lensGeo, lensMat);
    lLens.position.set(-headR * 0.36, headR * 1.04, headR * 0.92);
    const rLens = new THREE.Mesh(lensGeo, lensMat);
    rLens.position.set(headR * 0.36, headR * 1.04, headR * 0.92);
    const bridge = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.025, headR * 0.4, 6, 8),
      darkMetalMat
    );
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, headR * 1.06, headR * 0.94);
    headGroup.add(lLens, rLens, bridge);
  } else if (ew === 'eyepatch') {
    const patch = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.24, 12, 12),
      darkMetalMat
    );
    patch.scale.set(1, 1, 0.4);
    patch.position.set(headR * 0.34, headR * 1.04, headR * 0.93);
    headGroup.add(patch);
  }

  // Facial Hair / Mask
  const fh = appearance.accessories.facialHair;
  if (fh === 'beard' && muzzleType === 'none') {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.82, 16, 14),
      hairMat
    );
    beard.scale.set(1.05, 0.75, 0.85);
    beard.position.set(0, headR * 0.52, headR * 0.35);
    headGroup.add(beard);
  } else if (fh === 'mustache' && muzzleType === 'none') {
    const stacheL = new THREE.Mesh(
      new THREE.CapsuleGeometry(headR * 0.11, headR * 0.32, 8, 12),
      hairMat
    );
    stacheL.rotation.z = Math.PI * 0.42;
    stacheL.position.set(-headR * 0.22, headR * 0.72, headR * 0.92);
    const stacheR = stacheL.clone();
    stacheR.rotation.z = -Math.PI * 0.42;
    stacheR.position.x = headR * 0.22;
    headGroup.add(stacheL, stacheR);
  } else if (fh === 'mask') {
    const mask = new THREE.Mesh(
      new THREE.CylinderGeometry(
        headR * 1.02,
        headR * 0.92,
        headR * 0.65,
        20
      ),
      darkMetalMat
    );
    mask.position.set(0, headR * 0.62, 0.04);
    headGroup.add(mask);
  }

  // Streamlined Headgear
  const hg = appearance.accessories.headgear;
  if (hg === 'mohawk') {
    for (let i = 0; i < 5; i++) {
      const fin = new THREE.Mesh(
        new THREE.CapsuleGeometry(headR * 0.13, headR * 0.48, 8, 12),
        hairMat
      );
      fin.position.set(
        0,
        headR * 1.85 - i * 0.04,
        headR * 0.35 - i * (headR * 0.24)
      );
      fin.rotation.x = -0.28 * i;
      headGroup.add(fin);
    }
  } else if (hg === 'chef_hat') {
    const whiteMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.45,
      clearcoat: 0.2,
    });
    const baseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 0.92, headR * 0.88, 0.26, 20),
      whiteMat
    );
    baseRim.position.set(0, headR * 1.75, 0);
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.12, 20, 16),
      whiteMat
    );
    puff.scale.set(1, 0.85, 1);
    puff.position.set(0, headR * 2.25, 0);
    headGroup.add(baseRim, puff);
  } else if (hg === 'cap') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(
        headR * 1.04,
        20,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55
      ),
      hairMat
    );
    dome.position.set(0, headR * 1.02, 0);
    const bill = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 0.9, headR * 0.9, 0.05, 16),
      accentMat
    );
    bill.scale.set(0.95, 1, 0.65);
    bill.position.set(0, headR * 1.42, headR * 0.72);
    headGroup.add(dome, bill);
  } else if (hg === 'helmet') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(
        headR * 1.14,
        24,
        18,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.68
      ),
      accentMat
    );
    helm.position.set(0, headR * 1.0, 0);
    headGroup.add(helm);
  } else if (hg === 'crown') {
    const crownBase = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 0.85, headR * 0.75, 0.28, 16),
      accentMat
    );
    crownBase.position.set(0, headR * 1.85, 0);
    headGroup.add(crownBase);
  } else if (hg === 'cowboy_hat') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 1.65, headR * 1.65, 0.06, 24),
      hairMat
    );
    brim.scale.set(1.0, 1, 0.85);
    brim.position.set(0, headR * 1.62, 0);
    const top = new THREE.Mesh(
      new THREE.CapsuleGeometry(headR * 0.72, 0.22, 10, 18),
      hairMat
    );
    top.position.set(0, headR * 1.9, 0);
    headGroup.add(brim, top);
  } else if (hg === 'hood') {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.18, 20, 18),
      shirtMat
    );
    hood.position.set(0, headR * 1.0, -0.05);
    headGroup.add(hood);
  } else {
    // Stylized hair tuft/dome (leaves space for animal ears)
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(
        headR * 1.03,
        20,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.45
      ),
      earsType === 'fox_ears' || earsType === 'cat_ears' ? skinMat : hairMat
    );
    hairTop.position.set(0, headR * 1.02, -0.02);
    headGroup.add(hairTop);
  }

  bodyGroup.add(headGroup);

  // ==================== ANIMATED 3D ANIMAL TAILS ====================
  let tailPivot: THREE.Group | undefined;
  if (tailType !== 'none') {
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, legTotalH + 0.18, -(torsoRadius * 0.75));
    bodyGroup.add(tailPivot);

    if (tailType === 'fox_tail') {
      // Lush, super-fluffy dual-tone Kitsune Fox Tail!
      const baseFluff = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.42, 12, 18),
        skinMat
      );
      baseFluff.rotation.x = -Math.PI * 0.34;
      baseFluff.position.set(0, 0.14, -0.26);
      baseFluff.castShadow = true;

      const midFluff = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 16),
        skinMat
      );
      midFluff.scale.set(0.92, 1.05, 1.35);
      midFluff.position.set(0, 0.28, -0.52);
      midFluff.castShadow = true;

      const whiteTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.23, 0.56, 16),
        creamFurMat
      );
      whiteTip.rotation.x = -Math.PI * 0.62;
      whiteTip.position.set(0, 0.42, -0.86);
      whiteTip.castShadow = true;

      tailPivot.add(baseFluff, midFluff, whiteTip);
    } else if (tailType === 'cat_tail') {
      // Graceful curved feline tail
      const seg1 = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.068, 0.42, 10, 14),
        skinMat
      );
      seg1.rotation.x = -Math.PI * 0.35;
      seg1.position.set(0, 0.12, -0.22);
      seg1.castShadow = true;

      const seg2 = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.062, 0.44, 10, 14),
        skinMat
      );
      seg2.rotation.x = -Math.PI * 0.12;
      seg2.position.set(0, 0.42, -0.44);
      seg2.castShadow = true;

      const tipBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        accentMat
      );
      tipBall.position.set(0, 0.66, -0.5);

      tailPivot.add(seg1, seg2, tipBall);
    } else if (tailType === 'wolf_tail') {
      const wolfBase = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14, 0.52, 10, 16),
        skinMat
      );
      wolfBase.rotation.x = -Math.PI * 0.4;
      wolfBase.position.set(0, 0.1, -0.32);
      wolfBase.castShadow = true;

      const wolfTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.42, 14),
        hairMat
      );
      wolfTip.rotation.x = -Math.PI * 0.66;
      wolfTip.position.set(0, 0.24, -0.68);
      tailPivot.add(wolfBase, wolfTip);
    } else if (tailType === 'bunny_tail') {
      const pom = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 16, 16),
        creamFurMat
      );
      pom.position.set(0, 0.08, -0.16);
      pom.castShadow = true;
      tailPivot.add(pom);
    } else if (tailType === 'elephant_tail') {
      const rope = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.42, 8, 12),
        skinMat
      );
      rope.rotation.x = -Math.PI * 0.25;
      rope.position.set(0, -0.05, -0.22);
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 10),
        hairMat
      );
      tuft.rotation.x = Math.PI * 0.75;
      tuft.position.set(0, -0.18, -0.38);
      tailPivot.add(rope, tuft);
    } else if (tailType === 'croc_tail') {
      // Heavy muscular Crocodile Tail with dorsal spikes!
      const crocBase = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.98, 14),
        skinMat
      );
      crocBase.rotation.x = -Math.PI * 0.55;
      crocBase.scale.set(0.85, 1.0, 1.0);
      crocBase.position.set(0, 0.04, -0.46);
      crocBase.castShadow = true;
      tailPivot.add(crocBase);

      for (let s = 0; s < 3; s++) {
        const dorsalSpike = new THREE.Mesh(
          new THREE.ConeGeometry(0.065, 0.18, 6),
          hairMat
        );
        dorsalSpike.position.set(0, 0.16 - s * 0.03, -(0.22 + s * 0.24));
        tailPivot.add(dorsalSpike);
      }
    } else if (tailType === 'lion_tail') {
      const lionShaft = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.055, 0.56, 8, 14),
        skinMat
      );
      lionShaft.rotation.x = -Math.PI * 0.34;
      lionShaft.position.set(0, 0.14, -0.28);
      const lionTuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        hairMat
      );
      lionTuft.scale.set(0.9, 0.9, 1.35);
      lionTuft.position.set(0, 0.32, -0.58);
      tailPivot.add(lionShaft, lionTuft);
    } else if (tailType === 'shark_tail') {
      const tailStem = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.58, 12),
        skinMat
      );
      tailStem.rotation.x = -Math.PI * 0.52;
      tailStem.position.set(0, 0.08, -0.28);
      const upperFluke = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.48, 10),
        skinMat
      );
      upperFluke.scale.set(0.35, 1, 1);
      upperFluke.rotation.x = -0.35;
      upperFluke.position.set(0, 0.28, -0.56);
      const lowerFluke = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.36, 10),
        skinMat
      );
      lowerFluke.scale.set(0.35, 1, 1);
      lowerFluke.rotation.x = -2.6;
      lowerFluke.position.set(0, -0.08, -0.54);
      tailPivot.add(tailStem, upperFluke, lowerFluke);
    } else if (tailType === 'devil_tail') {
      const whip = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.042, 0.68, 8, 14),
        accentMat
      );
      whip.rotation.x = -Math.PI * 0.32;
      whip.position.set(0, 0.2, -0.32);
      const spade = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.24, 4),
        accentMat
      );
      spade.rotation.x = -Math.PI * 0.65;
      spade.position.set(0, 0.45, -0.62);
      tailPivot.add(whip, spade);
    }
  }

  // Streamlined Back Item
  const bi = appearance.accessories.backItem;
  if (bi === 'backpack') {
    const pack = new THREE.Mesh(
      new THREE.CapsuleGeometry(torsoRadius * 0.62, 0.22, 10, 16),
      accentMat
    );
    pack.scale.set(1.1, 1.0, 0.65);
    pack.position.set(0, legTotalH + torsoH * 0.52, -(torsoRadius * 0.82));
    pack.castShadow = true;
    bodyGroup.add(pack);
  } else if (bi === 'cape') {
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(
        torsoRadius * 0.7,
        torsoRadius * 1.35,
        torsoH * 1.25,
        16,
        1,
        true,
        -Math.PI * 0.35,
        Math.PI * 0.7
      ),
      accentMat
    );
    cape.position.set(0, legTotalH + torsoH * 0.32, -torsoRadius * 0.3);
    cape.rotation.x = 0.22;
    bodyGroup.add(cape);
  } else if (bi === 'jetpack') {
    const thrusterGeo = new THREE.CapsuleGeometry(0.11, 0.38, 10, 16);
    const leftThruster = new THREE.Mesh(thrusterGeo, darkMetalMat);
    leftThruster.position.set(
      -0.16,
      legTotalH + torsoH * 0.55,
      -(torsoRadius * 0.88)
    );
    const rightThruster = leftThruster.clone();
    rightThruster.position.x = 0.16;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 14),
      accentMat
    );
    core.position.set(0, legTotalH + torsoH * 0.58, -(torsoRadius * 0.85));
    bodyGroup.add(leftThruster, rightThruster, core);
  } else if (bi === 'guitar_case' || bi === 'katana_sheath') {
    const caseMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        bi === 'katana_sheath' ? 0.065 : 0.16,
        0.88,
        10,
        16
      ),
      darkMetalMat
    );
    caseMesh.position.set(0, legTotalH + torsoH * 0.58, -(torsoRadius * 0.86));
    caseMesh.rotation.z = 0.48;
    bodyGroup.add(caseMesh);
  }

  bodyGroup.scale.set(1, p.heightScale, 1);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponSocket,
    tailPivot,
  };
}

export function createWeaponMesh(
  type: WeaponTypeId,
  rarity: WeaponRarity = 'common'
): THREE.Group {
  const group = new THREE.Group();
  const rarityHex = RARITY_CONFIG[rarity].hex;

  const metalMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.9,
    clearcoat: 0.6,
  });
  const darkIronMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.85,
    clearcoat: 0.4,
  });
  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0xb45309,
    roughness: 0.55,
    metalness: 0.05,
    clearcoat: 0.3,
  });
  const rarityGlowMat = new THREE.MeshPhysicalMaterial({
    color: rarityHex,
    emissive: rarityHex,
    emissiveIntensity: rarity === 'common' ? 0.2 : 0.7,
    roughness: 0.2,
    metalness: 0.75,
    clearcoat: 0.8,
  });

  if (type === 'frying_pan') {
    const handle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 0.55, 8, 12),
      darkIronMat
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, 0.32);
    const panBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.3, 0.09, 24),
      darkIronMat
    );
    panBase.position.set(0, 0, 0.86);
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.035, 10, 24),
      rarityGlowMat
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(0, 0.05, 0.86);
    group.add(handle, panBase, innerRing);
  } else if (type === 'baseball_bat') {
    const bat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.038, 1.32, 16),
      woodMat
    );
    bat.rotation.x = Math.PI / 2;
    bat.position.set(0, 0, 0.64);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), woodMat);
    cap.position.set(0, 0, 1.3);
    const grip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.32, 8, 12),
      rarityGlowMat
    );
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0, 0.16);
    group.add(bat, cap, grip);

    for (let i = 0; i < 4; i++) {
      const nail = new THREE.Mesh(
        new THREE.ConeGeometry(0.024, 0.26, 8),
        metalMat
      );
      nail.position.set(
        i % 2 === 0 ? 0.12 : -0.12,
        i < 2 ? 0.08 : -0.08,
        0.95 + i * 0.06
      );
      nail.rotation.z = i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(nail);
    }
  } else if (type === 'road_sign') {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.65, 12),
      metalMat
    );
    pole.rotation.x = Math.PI / 2;
    pole.position.set(0, 0, 0.78);
    const signMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.3,
      clearcoat: 0.6,
    });
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.055, 8),
      signMat
    );
    plate.position.set(0, 0, 1.45);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.03, 8, 8),
      rarityGlowMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0, 1.45);
    group.add(pole, plate, rim);
  } else if (type === 'electric_guitar') {
    const neck = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 1.05, 8, 12),
      woodMat
    );
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0, 0.55);
    const bodyLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.09, 16),
      rarityGlowMat
    );
    bodyLeft.scale.set(1.15, 1, 1.3);
    bodyLeft.position.set(0, 0, 1.08);
    const pickup = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.18, 8, 12),
      metalMat
    );
    pickup.rotation.z = Math.PI / 2;
    pickup.position.set(0, 0.05, 1.04);
    group.add(neck, bodyLeft, pickup);
  } else if (type === 'sledgehammer') {
    const shaft = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 1.38, 8, 12),
      woodMat
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, 0.68);
    const headBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.68, 16),
      darkIronMat
    );
    headBlock.rotation.z = Math.PI / 2;
    headBlock.position.set(0, 0, 1.32);
    const capBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.185, 0.03, 10, 20),
      rarityGlowMat
    );
    capBand.rotation.y = Math.PI / 2;
    capBand.position.set(0, 0, 1.32);
    group.add(shaft, headBlock, capBand);
  } else if (type === 'shopping_cart') {
    const basket = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.35, 8, 16),
      metalMat
    );
    basket.rotation.x = Math.PI / 2;
    basket.position.set(0, 0.15, 0.75);
    const bar = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.56, 8, 12),
      rarityGlowMat
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.32, 0.25);
    group.add(basket, bar);
  } else if (type === 'chainsaw') {
    const motor = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.17, 0.22, 10, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xeab308,
        roughness: 0.35,
        metalness: 0.35,
        clearcoat: 0.5,
      })
    );
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0, 0, 0.32);
    const blade = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.85, 8, 16),
      metalMat
    );
    blade.scale.set(0.35, 1, 1);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0, 0.92);
    const chainTrim = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.88, 8, 16),
      rarityGlowMat
    );
    chainTrim.scale.set(0.25, 1, 1);
    chainTrim.rotation.x = Math.PI / 2;
    chainTrim.position.set(0, 0, 0.92);
    group.add(motor, blade, chainTrim);
  } else {
    // traffic_cone
    const coneMat = new THREE.MeshPhysicalMaterial({
      color: 0xf97316,
      roughness: 0.35,
      clearcoat: 0.4,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.07, 16),
      darkIronMat
    );
    base.rotation.x = Math.PI / 2;
    base.position.set(0, 0, 0.3);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.8, 20),
      coneMat
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0, 0.68);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.15, 0.18, 20),
      rarityGlowMat
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 0, 0.68);
    group.add(base, cone, stripe);
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
    }
  });

  return group;
}

export interface ZombieRigRefs {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  materialsToFlash: THREE.MeshStandardMaterial[];
  bossAura?: THREE.Mesh;
}

// High-Detail Realistic 3D Monster & Boss Rigs (8 Distinct Sculpted Variants, Biome-Color Harmonized)
export function createZombieRig(
  variant:
    | 'walker'
    | 'runner'
    | 'brute'
    | 'spitter'
    | 'bomber'
    | 'necromancer'
    | 'mini_skeleton'
    | 'boss',
  bossIndex = 0,
  biomePalette?: BiomeMonsterPalette,
  isGrandBoss = false
): ZombieRigRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const scale =
    variant === 'boss'
      ? isGrandBoss
        ? 2.82
        : 2.35
      : variant === 'brute'
      ? 1.48
      : variant === 'necromancer'
      ? 1.28
      : variant === 'bomber'
      ? 1.15
      : variant === 'spitter'
      ? 1.1
      : variant === 'runner'
      ? 0.98
      : variant === 'mini_skeleton'
      ? 0.8
      : 1.06;

  root.add(createContactShadowDisc(0.92 * scale));

  const shiftColor = (hex: number, hShift: number, sAdd: number, lAdd: number) => {
    const c = new THREE.Color(hex);
    c.offsetHSL(hShift, sAdd, lAdd);
    return c.getHex();
  };

  const baseSkin = biomePalette ? biomePalette.skin : 0xc084fc;
  const baseCoat = biomePalette ? biomePalette.coat : 0x991b1b;
  const baseAccent = biomePalette ? biomePalette.accent : 0xfacc15;

  const skinColor =
    variant === 'boss'
      ? shiftColor(baseSkin, (bossIndex % 3) * 0.08 - 0.04, 0.15, 0.06)
      : variant === 'spitter'
      ? shiftColor(baseSkin, 0.12, 0.15, 0.08)
      : variant === 'bomber'
      ? shiftColor(baseAccent, -0.04, 0.2, 0.02)
      : variant === 'necromancer'
      ? shiftColor(baseSkin, -0.14, 0.1, 0.1)
      : variant === 'mini_skeleton'
      ? 0xf8fafc
      : variant === 'brute'
      ? shiftColor(baseSkin, -0.05, 0.08, -0.06)
      : variant === 'runner'
      ? shiftColor(baseSkin, 0.07, 0.18, 0.05)
      : baseSkin;

  const coatColor =
    variant === 'boss'
      ? shiftColor(baseCoat, 0, 0.15, -0.05)
      : variant === 'spitter'
      ? shiftColor(baseCoat, 0.1, 0.1, 0.04)
      : variant === 'bomber'
      ? shiftColor(baseCoat, -0.06, 0.2, 0.05)
      : variant === 'necromancer'
      ? shiftColor(baseCoat, -0.12, 0.15, -0.04)
      : variant === 'mini_skeleton'
      ? baseCoat
      : variant === 'brute'
      ? shiftColor(baseCoat, 0.05, 0.12, -0.04)
      : variant === 'runner'
      ? shiftColor(baseCoat, -0.04, 0.15, 0.04)
      : baseCoat;

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinColor,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });
  const coatMat = new THREE.MeshPhysicalMaterial({
    color: coatColor,
    roughness: 0.42,
    metalness: 0.28,
    clearcoat: 0.38,
  });
  const armorMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.22,
    metalness: 0.88,
    clearcoat: 0.7,
  });
  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.25,
  });
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xfef3c7,
    roughness: 0.3,
    metalness: 0.08,
    clearcoat: 0.3,
  });
  const eyeColorHex =
    variant === 'boss'
      ? 0xfacc15
      : variant === 'spitter' || variant === 'bomber'
      ? baseAccent
      : variant === 'necromancer' || variant === 'mini_skeleton'
      ? 0x22d3ee
      : baseAccent;

  const eyeGlowMat = new THREE.MeshBasicMaterial({
    color: eyeColorHex,
  });
  const pupilMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
  });

  const materialsToFlash: THREE.MeshStandardMaterial[] = [skinMat, coatMat];

  // ==================== ARTICULATED LEGS WITH KNEE GUARDS & HEAVY COMBAT BOOTS ====================
  const buildDetailedLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.165, 0.58, 0);

    // Muscular Thigh
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.18, 8, 12),
      variant === 'mini_skeleton' ? boneMat : darkLeatherMat
    );
    thigh.position.set(0, -0.14, 0);
    thigh.castShadow = true;

    // Armored Knee Pad
    const kneePad = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 10, 10),
      armorMetalMat
    );
    kneePad.scale.set(0.95, 0.9, 1.15);
    kneePad.position.set(0, -0.27, 0.04);

    // Lower Shin Greave
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.08, 0.24, 10),
      variant === 'mini_skeleton' ? boneMat : coatMat
    );
    shin.position.set(0, -0.39, 0);
    shin.castShadow = true;

    // Heavy Combat Boot + Steel Toe Cap + Sole
    const bootUpper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.14, 8, 12),
      armorMetalMat
    );
    bootUpper.rotation.x = Math.PI / 2;
    bootUpper.position.set(0, -0.5, 0.06);
    bootUpper.castShadow = true;

    const bootSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.34),
      darkLeatherMat
    );
    bootSole.position.set(0, -0.56, 0.06);

    legGroup.add(thigh, kneePad, shin, bootUpper, bootSole);
    return legGroup;
  };

  const leftLeg = buildDetailedLeg(-1);
  const rightLeg = buildDetailedLeg(1);

  // ==================== SCULPTED PELVIS, TORSO, PECS, RIBCAGE & SPINE ====================
  const torsoR = variant === 'brute' || variant === 'boss' ? 0.38 : 0.275;

  // Armored Waist Belt & Buckle
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoR * 0.94, torsoR * 0.82, 0.22, 14),
    darkLeatherMat
  );
  pelvis.position.set(0, 0.68, 0);
  bodyGroup.add(pelvis);

  const beltBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.08),
    armorMetalMat
  );
  beltBuckle.position.set(0, 0.69, torsoR * 0.88);
  bodyGroup.add(beltBuckle);

  // Sculpted Upper Torso
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(torsoR, 0.38, 12, 20),
    coatMat
  );
  torso.scale.set(1.16, 1, 0.86);
  torso.position.set(0, 0.98, 0);
  torso.rotation.x = variant === 'necromancer' ? 0 : 0.14;
  torso.castShadow = true;

  // Muscular Pectoral Plates / Cuirass
  if (variant !== 'mini_skeleton') {
    for (const side of [-1, 1]) {
      const pec = new THREE.Mesh(
        new THREE.SphereGeometry(torsoR * 0.56, 12, 10),
        skinMat
      );
      pec.scale.set(1.1, 0.82, 0.55);
      pec.position.set(side * (torsoR * 0.44), 1.12, torsoR * 0.58);
      bodyGroup.add(pec);
    }
  }

  // Dorsal Spine Vertebrae Ridge along the back
  for (let s = 0; s < 4; s++) {
    const vertebra = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.14, 6),
      boneMat
    );
    vertebra.rotation.x = -Math.PI * 0.42;
    vertebra.position.set(0, 0.82 + s * 0.13, -torsoR * 0.82);
    bodyGroup.add(vertebra);
  }

  // Exposed ribcage or glowing core on chest
  if (
    variant === 'mini_skeleton' ||
    variant === 'walker' ||
    variant === 'necromancer'
  ) {
    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(torsoR * 0.8, 0.028, 8, 16, Math.PI),
        boneMat
      );
      rib.rotation.x = Math.PI / 2;
      rib.position.set(0, 0.82 + r * 0.12, 0.07);
      bodyGroup.add(rib);
    }
  } else {
    // Armored Mutagenic Core Housing on Chest
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(torsoR * 0.36, 0.04, 8, 16),
      armorMetalMat
    );
    coreRing.position.set(0, 1.0, torsoR * 0.78);
    const chestCore = new THREE.Mesh(
      new THREE.SphereGeometry(torsoR * 0.34, 14, 14),
      eyeGlowMat
    );
    chestCore.scale.set(1.0, 1.0, 0.5);
    chestCore.position.set(0, 1.0, torsoR * 0.76);
    bodyGroup.add(coreRing, chestCore);
  }

  // ==================== SCULPTED MONSTER HEAD WITH JAW, FANGS, CHEEKBONES & EARS ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0.09);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 18),
    variant === 'mini_skeleton' ? boneMat : skinMat
  );
  cranium.scale.set(0.98, 1.06, 1.04);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Sculpted Cheekbones & Snout Bridge
  const snoutBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 0.18),
    variant === 'mini_skeleton' ? boneMat : skinMat
  );
  snoutBridge.position.set(0, -0.02, 0.2);
  headGroup.add(snoutBridge);

  // Pointed Mutant Ears on sides of head
  if (variant !== 'mini_skeleton') {
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.22, 6),
        skinMat
      );
      ear.rotation.z = -side * 1.15;
      ear.rotation.y = -side * 0.3;
      ear.position.set(side * 0.28, 0.04, -0.02);
      headGroup.add(ear);
    }
  }

  // Hinged Lower Jaw + 4 Sharp Fangs
  const jaw = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.155, 0.13, 8, 12),
    variant === 'mini_skeleton' ? boneMat : skinMat
  );
  jaw.rotation.z = Math.PI / 2;
  jaw.position.set(0, -0.16, 0.11);
  headGroup.add(jaw);

  for (const side of [-1, 1]) {
    // Lower Tusk Fang (pointing up)
    const lowerFang = new THREE.Mesh(
      new THREE.ConeGeometry(0.032, 0.12, 8),
      boneMat
    );
    lowerFang.position.set(side * 0.095, -0.08, 0.25);
    headGroup.add(lowerFang);

    // Upper Canine Fang (pointing down)
    const upperFang = new THREE.Mesh(
      new THREE.ConeGeometry(0.026, 0.1, 8),
      boneMat
    );
    upperFang.rotation.x = Math.PI;
    upperFang.position.set(side * 0.06, -0.09, 0.26);
    headGroup.add(upperFang);
  }

  // Fierce Armored Brow Ridge
  const brow = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.046, 0.26, 8, 12),
    coatMat
  );
  brow.rotation.z = Math.PI / 2;
  brow.position.set(0, 0.095, 0.235);
  headGroup.add(brow);

  // Glowing Eyes + Slitted Predator Pupils
  const eyeGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const pupilGeo = new THREE.BoxGeometry(0.02, 0.075, 0.03);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeGlowMat);
    eye.position.set(side * 0.098, 0.03, 0.23);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.098, 0.03, 0.28);
    headGroup.add(eye, pupil);
  }

  // ==================== ARTICULATED ARMS WITH PAULDRONS, BRACERS & 3 CLAWS ====================
  const buildClawedArm = (side: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * (torsoR * 1.08 + 0.09), 1.2, 0.04);

    // Layered Shoulder Pauldron + Rim
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 12, 12),
      coatMat
    );
    pauldron.scale.set(1.15, 0.8, 1.15);
    pauldron.position.set(0, 0.05, 0);

    const pauldronSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.14, 6),
      armorMetalMat
    );
    pauldronSpike.rotation.z = -side * 0.6;
    pauldronSpike.position.set(side * 0.08, 0.14, 0);

    // Upper & Forearm Muscular Segment
    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.095, 0.22, 8, 12),
      variant === 'mini_skeleton' ? boneMat : skinMat
    );
    upperArm.rotation.x = Math.PI / 2;
    upperArm.position.set(0, 0, 0.14);
    upperArm.castShadow = true;

    // Armored Forearm Bracer / Gauntlet
    const bracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.088, 0.22, 10),
      armorMetalMat
    );
    bracer.rotation.x = Math.PI / 2;
    bracer.position.set(0, 0, 0.34);
    bracer.castShadow = true;

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.102, 10, 10),
      variant === 'mini_skeleton' ? boneMat : skinMat
    );
    hand.position.set(0, 0, 0.49);

    // 3 Curved Bone Claws per hand
    for (const cOffset of [-0.05, 0, 0.05]) {
      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.15, 6),
        boneMat
      );
      claw.rotation.x = Math.PI * 0.62;
      claw.position.set(cOffset, -0.02, 0.59);
      armGroup.add(claw);
    }

    armGroup.add(pauldron, pauldronSpike, upperArm, bracer, hand);
    return armGroup;
  };

  const leftArm = buildClawedArm(-1);
  const rightArm = buildClawedArm(1);

  // ==================== VARIANT-SPECIFIC HIGH-DETAIL SCULPTING ====================
  if (variant === 'walker') {
    // Battle-scarred Iron Collar & Shoulder Spikes
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(torsoR * 0.82, 0.045, 8, 16),
      armorMetalMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.32, 0.04);
    bodyGroup.add(collar);
  } else if (variant === 'runner') {
    // 4 Swept Predator Dorsal Fins + Raptor Head Crest
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.38 - i * 0.04, 8),
        eyeGlowMat
      );
      fin.rotation.x = -0.65;
      fin.position.set(0, 1.4 - i * 0.18, -0.22 - i * 0.03);
      bodyGroup.add(fin);
    }
    const headCrest = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.34, 8),
      eyeGlowMat
    );
    headCrest.rotation.x = -0.5;
    headCrest.position.set(0, 0.24, -0.08);
    headGroup.add(headCrest);
  } else if (variant === 'brute') {
    // Multi-layered Juggernaut Spiked Pauldrons & Iron Jaw Guard
    for (const side of [-1, 1]) {
      const shoulderPlate = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 12),
        armorMetalMat
      );
      shoulderPlate.scale.set(1.2, 0.75, 1.1);
      shoulderPlate.position.set(side * (torsoR * 1.12), 1.32, 0);

      const shoulderSpike = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.42, 8),
        boneMat
      );
      shoulderSpike.position.set(side * (torsoR * 1.24), 1.54, 0);
      shoulderSpike.rotation.z = -side * 0.48;
      bodyGroup.add(shoulderPlate, shoulderSpike);
    }
    const ironJaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.16, 0.28),
      armorMetalMat
    );
    ironJaw.position.set(0, -0.14, 0.14);
    headGroup.add(ironJaw);
  } else if (variant === 'spitter') {
    const sacMat = new THREE.MeshPhysicalMaterial({
      color: 0xd946ef,
      emissive: 0xa21caf,
      emissiveIntensity: 0.75,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const acidMat = new THREE.MeshPhysicalMaterial({
      color: 0xa3e635,
      emissive: 0x65a30d,
      emissiveIntensity: 0.9,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    // Pressurized Bio-Acid Dorsal Tanks + Venom Crest
    for (const side of [-0.22, 0.22]) {
      const dorsalSac = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 14, 14),
        sacMat
      );
      dorsalSac.position.set(side, 1.38, -0.16);
      const cheekSac = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 12),
        acidMat
      );
      cheekSac.position.set(side * 0.9, 1.44, 0.2);
      bodyGroup.add(dorsalSac, cheekSac);
    }
    const throatSac = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 14),
      acidMat
    );
    throatSac.position.set(0, 1.32, 0.25);
    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.46, 10),
      sacMat
    );
    crest.rotation.x = -0.3;
    crest.position.set(0, 1.9, -0.04);
    bodyGroup.add(throatSac, crest);
  } else if (variant === 'bomber') {
    const bombMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      emissive: 0xf97316,
      emissiveIntensity: 0.9,
      roughness: 0.16,
      clearcoat: 0.85,
    });
    // Twin Pressurized Nitroglycerin Tanks with Metal Straps + Plunger Detonator Helmet
    for (const side of [-0.17, 0.17]) {
      const tank = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.155, 0.38, 10, 16),
        bombMat
      );
      tank.position.set(side, 1.14, -0.28);
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.025, 8, 16),
        armorMetalMat
      );
      strap.rotation.x = Math.PI / 2;
      strap.position.set(side, 1.18, -0.28);
      bodyGroup.add(tank, strap);
    }
    const antennaPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8),
      armorMetalMat
    );
    antennaPole.position.set(0, 1.82, 0.06);
    const fuseSpark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15, 0),
      bombMat
    );
    fuseSpark.position.set(0, 1.98, 0.06);
    bodyGroup.add(antennaPole, fuseSpark);
  } else if (variant === 'necromancer') {
    const crownMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.12,
    });
    // High Arcane Mantle Collar + Crown
    const mantle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.28, 0.28, 12, 1, true, 0, Math.PI * 1.3),
      coatMat
    );
    mantle.rotation.y = Math.PI * 0.85;
    mantle.position.set(0, 1.48, -0.04);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.2, 0.32, 6),
      crownMat
    );
    crown.position.set(0, 1.88, 0.06);

    // Ornate Necromancer Staff with Crescent Frame, Skull & Soul Crystal
    const staffShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 1.7, 8),
      armorMetalMat
    );
    staffShaft.position.set(0, 0, 0.46);
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.032, 8, 16, Math.PI * 1.45),
      boneMat
    );
    crescent.position.set(0, 0.84, 0.46);
    const staffOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15, 0),
      crownMat
    );
    staffOrb.position.set(0, 0.84, 0.46);
    rightArm.add(staffShaft, crescent, staffOrb);
    bodyGroup.add(mantle, crown);
  } else if (variant === 'mini_skeleton') {
    // Curved Bone Scimitar in Right Hand + Round Buckler Shield on Left Arm
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.68, 8),
      boneMat
    );
    blade.rotation.x = Math.PI * 0.35;
    blade.position.set(0, 0.18, 0.62);
    rightArm.add(blade);

    const buckler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12),
      armorMetalMat
    );
    buckler.rotation.z = Math.PI / 2;
    buckler.position.set(-0.12, 0, 0.38);
    leftArm.add(buckler);
  }

  let bossAura: THREE.Mesh | undefined;
  if (variant === 'boss') {
    const spikeMat = new THREE.MeshPhysicalMaterial({
      color: isGrandBoss ? 0xfde047 : 0xf59e0b,
      emissive: isGrandBoss ? 0xe11d48 : 0xd97706,
      emissiveIntensity: isGrandBoss ? 0.8 : 0.6,
      roughness: 0.14,
      metalness: 0.92,
      clearcoat: 0.95,
    });
    // Multi-tiered Spiked Warlord Pauldrons & Curved Demon Horns
    for (const side of [-1, 1]) {
      const pauldronBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 14, 12),
        armorMetalMat
      );
      pauldronBase.scale.set(1.25, 0.78, 1.15);
      pauldronBase.position.set(side * (torsoR * 1.08), 1.36, 0);

      const pauldronSpike = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.58, 12),
        spikeMat
      );
      pauldronSpike.position.set(side * (torsoR * 1.15), 1.62, 0);
      pauldronSpike.rotation.z = -side * 0.42;

      const bossHorn = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.52, 10),
        spikeMat
      );
      bossHorn.position.set(side * 0.21, 0.3, 0.04);
      bossHorn.rotation.z = -side * 0.48;
      headGroup.add(bossHorn);
      bodyGroup.add(pauldronBase, pauldronSpike);
    }

    // Grand-Boss Imperial Golden Crown on Stage 10 / 20 / 30
    if (isGrandBoss) {
      const crownRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.2, 0.28, 8),
        spikeMat
      );
      crownRing.position.set(0, 0.34, 0.02);
      headGroup.add(crownRing);

      const rubyMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const crownGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        rubyMat
      );
      crownGem.position.set(0, 0.52, 0.14);
      headGroup.add(crownGem);
    }

    // Colossal Double-Bladed Runic Executioner War-Axe in Boss Right Hand
    const axeShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 1.65, 10),
      armorMetalMat
    );
    axeShaft.position.set(0, 0.14, 0.52);
    const axeBlade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.09, 6),
      spikeMat
    );
    axeBlade.rotation.z = Math.PI / 2;
    axeBlade.position.set(0, 0.68, 0.58);
    const axePommel = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      spikeMat
    );
    axePommel.position.set(0, -0.68, 0.52);
    rightArm.add(axeShaft, axeBlade, axePommel);

    const auraGeo = new THREE.TorusGeometry(
      isGrandBoss ? 1.15 : 0.92,
      isGrandBoss ? 0.085 : 0.065,
      10,
      32
    );
    auraGeo.rotateX(Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: isGrandBoss ? 0xf43f5e : 0xfacc15,
      transparent: true,
      opacity: 0.88,
    });
    bossAura = new THREE.Mesh(auraGeo, auraMat);
    bossAura.position.y = 0.08;
    root.add(bossAura);

    if (isGrandBoss) {
      const innerAuraGeo = new THREE.TorusGeometry(0.84, 0.055, 10, 32);
      innerAuraGeo.rotateX(Math.PI / 2);
      const innerAura = new THREE.Mesh(
        innerAuraGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          transparent: true,
          opacity: 0.9,
        })
      );
      bossAura.add(innerAura);
    }
  }

  bodyGroup.add(leftLeg, rightLeg, torso, headGroup, leftArm, rightArm);
  bodyGroup.scale.setScalar(scale);

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    materialsToFlash,
    bossAura,
  };
}

// High-Detail Realistic Destructible World Decorations (17 Richly Sculpted Props)
export function createDestructibleMesh(
  kind: DestructibleKind,
  foliageColorHex = 0x22c55e,
  secondaryFoliageHex = 0xf43f5e,
  houseWallHex = 0xfef3c7,
  houseRoofHex = 0xe11d48
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'crate') {
    group.add(createContactShadowDisc(0.82));
    const woodMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      roughness: 0.58,
      clearcoat: 0.25,
    });
    const plankMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
      clearcoat: 0.3,
    });
    const ironMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      roughness: 0.28,
      metalness: 0.85,
    });

    // Main Wooden Box Core
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 1.02, 1.06),
      woodMat
    );
    core.position.y = 0.51;
    core.castShadow = true;
    core.receiveShadow = true;

    // Outer Framing & Corner Iron Brackets
    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 0.12, 1.14),
      plankMat
    );
    frameTop.position.y = 0.96;
    const frameBot = frameTop.clone();
    frameBot.position.y = 0.08;

    // Diagonal Cross Braces on Sides
    const brace1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.1, 1.12),
      ironMat
    );
    brace1.position.y = 0.52;

    group.add(core, frameTop, frameBot, brace1);
  } else if (kind === 'barrel') {
    group.add(createContactShadowDisc(0.7));
    const redMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.18,
      metalness: 0.6,
      clearcoat: 0.88,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const steelMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.88,
    });

    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 1.16, 20),
      redMat
    );
    cyl.position.y = 0.58;
    cyl.castShadow = true;
    cyl.receiveShadow = true;

    // 3 Ribbed Steel Hoops + Glowing Hazard Band + Top Valve Bung
    const bandMid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.455, 0.455, 0.26, 20),
      hazardMat
    );
    bandMid.position.y = 0.58;

    for (const ry of [0.12, 0.58, 1.04]) {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.445, 0.035, 8, 24),
        steelMat
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = ry;
      group.add(hoop);
    }

    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10),
      steelMat
    );
    valve.position.set(0.18, 1.18, 0.1);

    group.add(cyl, bandMid, valve);
  } else if (kind === 'car') {
    group.add(createContactShadowDisc(2.35));
    const carPalette = [0x06b6d4, 0xe11d48, 0xf59e0b, 0x8b5cf6, 0x10b981, 0x3b82f6];
    const chosenCarColor =
      carPalette[Math.floor(Math.random() * carPalette.length)];
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: chosenCarColor,
      roughness: 0.14,
      metalness: 0.68,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.06,
      metalness: 0.9,
      clearcoat: 1.0,
    });
    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
    });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    // Lower Sculpted Body Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.66, 3.75),
      paintMat
    );
    chassis.position.y = 0.56;
    chassis.castShadow = true;
    chassis.receiveShadow = true;

    // Hood & Trunk Bevel Contour
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.14, 3.55),
      paintMat
    );
    hood.position.y = 0.92;
    hood.castShadow = true;

    // Passenger Cabin & Tinted Windows Block
    const cabinGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.58, 0.56, 1.95),
      glassMat
    );
    cabinGlass.position.set(0, 1.22, -0.18);
    cabinGlass.castShadow = true;

    const cabinRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.1, 1.78),
      paintMat
    );
    cabinRoof.position.set(0, 1.52, -0.18);

    // Front Chrome Grille & Front/Rear Bumpers
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.96, 0.22, 0.24),
      chromeMat
    );
    frontBumper.position.set(0, 0.36, 1.88);
    const rearBumper = frontBumper.clone();
    rearBumper.position.z = -1.88;

    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.26, 0.08),
      chromeMat
    );
    grille.position.set(0, 0.62, 1.89);

    // 4 Wheels with Chrome Alloy Rims
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const wheelOffsets = [
      [-0.96, 0.38, 1.18],
      [0.96, 0.38, 1.18],
      [-0.96, 0.38, -1.18],
      [0.96, 0.38, -1.18],
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, wy, wz);
      const r = new THREE.Mesh(rimGeo, chromeMat);
      r.position.set(wx, wy, wz);
      group.add(w, r);
    });

    // Headlights & Taillights
    const hlGeo = new THREE.SphereGeometry(0.14, 10, 10);
    for (const sx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(hlGeo, headlightMat);
      hl.position.set(sx, 0.68, 1.86);
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.16, 0.08),
        taillightMat
      );
      tl.position.set(sx, 0.68, -1.88);
      group.add(hl, tl);
    }

    group.add(
      chassis,
      hood,
      cabinGlass,
      cabinRoof,
      frontBumper,
      rearBumper,
      grille
    );
  } else if (kind === 'tree') {
    group.add(createContactShadowDisc(1.55));
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.82,
    });
    const useSecondary = Math.random() < 0.38;
    const crownMat = new THREE.MeshPhysicalMaterial({
      color: useSecondary ? secondaryFoliageHex : foliageColorHex,
      roughness: 0.42,
      clearcoat: 0.28,
    });
    const accentCrownMat = new THREE.MeshPhysicalMaterial({
      color: useSecondary ? foliageColorHex : secondaryFoliageHex,
      roughness: 0.38,
      clearcoat: 0.32,
    });

    // Tapered Organic Trunk + Root Flare + Branch Forks
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.46, 1.85, 12),
      trunkMat
    );
    trunk.position.y = 0.92;
    trunk.castShadow = true;

    const branchL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, 0.9, 8),
      trunkMat
    );
    branchL.position.set(-0.35, 1.75, 0.15);
    branchL.rotation.z = 0.65;

    const branchR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.85, 8),
      trunkMat
    );
    branchR.position.set(0.36, 1.68, -0.12);
    branchR.rotation.z = -0.6;

    // Rich 5-Cluster Layered Foliage Canopy
    const puffs: [number, number, number, number, THREE.Material][] = [
      [0, 2.45, 0, 1.25, crownMat],
      [0.32, 3.35, -0.12, 0.95, accentCrownMat],
      [-0.62, 2.65, 0.32, 0.88, crownMat],
      [0.58, 2.55, 0.28, 0.84, crownMat],
      [-0.22, 3.05, -0.45, 0.8, accentCrownMat],
    ];
    for (const [px, py, pz, pr, pMat] of puffs) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(pr, 2), pMat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      puff.receiveShadow = true;
      group.add(puff);
    }

    group.add(trunk, branchL, branchR);
  } else if (kind === 'house') {
    group.add(createContactShadowDisc(3.0));
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.75,
    });
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: houseWallHex,
      roughness: 0.52,
      clearcoat: 0.18,
    });
    const roofMat = new THREE.MeshPhysicalMaterial({
      color: houseRoofHex,
      roughness: 0.35,
      clearcoat: 0.45,
    });
    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.72,
    });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Stone Foundation Plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(3.35, 0.36, 3.35),
      foundationMat
    );
    plinth.position.y = 0.18;
    plinth.receiveShadow = true;

    // Main Cottage Walls
    const baseWalls = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 2.25, 3.1),
      wallMat
    );
    baseWalls.position.y = 1.3;
    baseWalls.castShadow = true;
    baseWalls.receiveShadow = true;

    // Pitched Roof with Overhang + Brick Chimney
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.78, 1.68, 4),
      roofMat
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.22;
    roof.castShadow = true;

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 1.25, 0.46),
      roofMat
    );
    chimney.position.set(0.85, 3.35, -0.65);
    chimney.castShadow = true;

    // Front Porch Step, Wooden Door + Overhang Awning
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 0.55),
      foundationMat
    );
    step.position.set(0, 0.11, 1.72);

    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 1.32, 0.12),
      timberMat
    );
    doorFrame.position.set(0, 0.82, 1.56);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.14, 0.48),
      roofMat
    );
    awning.position.set(0, 1.56, 1.72);

    // Framed Glowing Windows on Front & Sides
    const buildFramedWindow = (wx: number, wy: number, wz: number, rotY = 0) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);
      wGroup.rotation.y = rotY;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.68, 0.1),
        timberMat
      );
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.54, 0.12),
        windowMat
      );
      wGroup.add(frame, pane);
      return wGroup;
    };

    group.add(
      plinth,
      baseWalls,
      roof,
      chimney,
      step,
      doorFrame,
      awning,
      buildFramedWindow(-0.88, 1.45, 1.56),
      buildFramedWindow(0.88, 1.45, 1.56),
      buildFramedWindow(-1.56, 1.45, 0, Math.PI / 2),
      buildFramedWindow(1.56, 1.45, 0, Math.PI / 2)
    );
  } else if (kind === 'cart') {
    group.add(createContactShadowDisc(1.55));
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.72,
    });
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: secondaryFoliageHex,
      roughness: 0.32,
      clearcoat: 0.4,
    });
    const stripeMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef3c7,
      roughness: 0.35,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
    });

    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.56, 2.05),
      woodMat
    );
    bed.position.y = 0.68;
    bed.castShadow = true;

    // 4 Corner Support Posts
    for (const [px, pz] of [
      [-0.68, -0.88],
      [0.68, -0.88],
      [-0.68, 0.88],
      [0.68, 0.88],
    ]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 1.05, 8),
        woodMat
      );
      post.position.set(px, 1.35, pz);
      group.add(post);
    }

    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.92,
        0.92,
        2.15,
        16,
        1,
        false,
        0,
        Math.PI
      ),
      canopyMat
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.y = 1.65;
    canopy.castShadow = true;

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.12, 2.2),
      stripeMat
    );
    canopyTrim.position.y = 1.68;

    const wheelGeo = new THREE.TorusGeometry(0.4, 0.075, 8, 18);
    wheelGeo.rotateY(Math.PI / 2);
    const wL = new THREE.Mesh(wheelGeo, wheelMat);
    wL.position.set(-0.82, 0.44, 0);
    const wR = wL.clone();
    wR.position.x = 0.82;

    group.add(bed, canopy, canopyTrim, wL, wR);
  } else if (kind === 'street_sign') {
    group.add(createContactShadowDisc(0.58));
    const poleMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.88,
    });
    const signMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.38,
      roughness: 0.22,
    });
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.22, 10),
      borderMat
    );
    base.position.y = 0.11;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.075, 2.45, 12),
      poleMat
    );
    pole.position.y = 1.22;
    pole.castShadow = true;

    const board = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.08, 6),
      signMat
    );
    board.rotation.x = Math.PI / 2;
    board.position.set(0, 2.28, 0);
    board.castShadow = true;

    const innerRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.09, 6),
      borderMat
    );
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.set(0, 2.28, 0);

    group.add(base, pole, board, innerRim);
  } else if (kind === 'hydrant') {
    group.add(createContactShadowDisc(0.6));
    const redMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.2,
      metalness: 0.5,
      clearcoat: 0.88,
    });
    const capMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.2,
    });

    const baseFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 0.16, 12),
      capMat
    );
    baseFlange.position.y = 0.08;

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.48, 10, 16),
      redMat
    );
    body.position.y = 0.48;
    body.castShadow = true;

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.68, 12),
      capMat
    );
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.y = 0.54;

    const topNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 0.16, 6),
      capMat
    );
    topNut.position.y = 0.92;

    group.add(baseFlange, body, nozzle, topNut);
  } else if (kind === 'windmill') {
    group.add(createContactShadowDisc(2.4));
    const towerMat = new THREE.MeshPhysicalMaterial({
      color: houseWallHex,
      roughness: 0.48,
      clearcoat: 0.22,
    });
    const roofMat = new THREE.MeshPhysicalMaterial({
      color: houseRoofHex,
      roughness: 0.32,
      clearcoat: 0.45,
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.45,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
    });

    const stoneBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.65, 0.65, 12),
      woodMat
    );
    stoneBase.position.y = 0.32;

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 1.46, 3.15, 12),
      towerMat
    );
    tower.position.y = 1.58;
    tower.castShadow = true;

    const dome = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 1.18, 12),
      roofMat
    );
    dome.position.y = 3.65;
    dome.castShadow = true;

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      roofMat
    );
    hub.position.set(0, 2.78, 1.08);

    const sails = new THREE.Group();
    sails.position.set(0, 2.78, 1.15);
    for (let b = 0; b < 4; b++) {
      const angle = (b * Math.PI) / 2 + Math.PI / 4;
      const spar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.95, 0.08),
        woodMat
      );
      spar.position.set(Math.cos(angle) * 0.92, Math.sin(angle) * 0.92, 0);
      spar.rotation.z = angle - Math.PI / 2;

      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 1.75, 0.04),
        bladeMat
      );
      sail.position.set(
        Math.cos(angle) * 0.98,
        Math.sin(angle) * 0.98,
        0.03
      );
      sail.rotation.z = angle - Math.PI / 2;
      sails.add(spar, sail);
    }

    group.add(stoneBase, tower, dome, hub, sails);
  } else if (kind === 'fountain') {
    group.add(createContactShadowDisc(2.2));
    const stoneMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.38,
      metalness: 0.15,
      clearcoat: 0.35,
    });
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.42,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.72, 1.52, 0.56, 24),
      stoneMat
    );
    basin.position.y = 0.28;
    basin.castShadow = true;

    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(1.54, 1.54, 0.44, 24),
      waterMat
    );
    waterPool.position.y = 0.4;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.4, 1.5, 16),
      stoneMat
    );
    pillar.position.y = 0.98;

    const upperBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.35, 0.32, 20),
      stoneMat
    );
    upperBowl.position.y = 1.48;
    upperBowl.castShadow = true;

    const topJet = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 14, 14),
      waterMat
    );
    topJet.scale.set(0.85, 1.45, 0.85);
    topJet.position.set(0, 1.98, 0);

    group.add(basin, waterPool, pillar, upperBowl, topJet);
  } else if (kind === 'snowman') {
    group.add(createContactShadowDisc(1.25));
    const snowMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.32,
      clearcoat: 0.3,
    });
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
    });
    const scarfMat = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,
      roughness: 0.4,
    });
    const carrotMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.35,
    });

    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.76, 16, 14), snowMat);
    bot.position.y = 0.65;
    bot.castShadow = true;

    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), snowMat);
    mid.position.y = 1.62;
    mid.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 12), snowMat);
    head.position.y = 2.36;

    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.08, 8, 16),
      scarfMat
    );
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 2.04;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.42, 10),
      carrotMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 2.36, 0.5);

    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16),
      hatMat
    );
    hatBrim.position.y = 2.66;

    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.46, 14),
      hatMat
    );
    hat.position.y = 2.88;

    group.add(bot, mid, head, scarf, nose, hatBrim, hat);
  } else if (kind === 'cactus') {
    group.add(createContactShadowDisc(1.15));
    const cactusMat = new THREE.MeshPhysicalMaterial({
      color: 0x16a34a,
      roughness: 0.42,
      clearcoat: 0.28,
    });
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const mainStem = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 2.0, 10, 16),
      cactusMat
    );
    mainStem.position.y = 1.28;
    mainStem.castShadow = true;

    const leftBranch = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.82, 8, 12),
      cactusMat
    );
    leftBranch.position.set(-0.56, 1.58, 0);
    leftBranch.rotation.z = 0.32;

    const rightBranch = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.72, 8, 12),
      cactusMat
    );
    rightBranch.position.set(0.54, 1.28, 0);
    rightBranch.rotation.z = -0.32;

    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      flowerMat
    );
    flower.position.set(0, 2.56, 0);

    group.add(mainStem, leftBranch, rightBranch, flower);
  } else if (kind === 'crystal_cluster') {
    group.add(createContactShadowDisc(1.3));
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: secondaryFoliageHex,
      emissive: secondaryFoliageHex,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.35,
      clearcoat: 1.0,
    });

    const shards: [number, number, number, number, number, number][] = [
      [0, 1.2, 0, 0.46, 2.45, 0],
      [-0.44, 0.82, 0.22, 0.34, 1.72, 0.34],
      [0.44, 0.76, -0.18, 0.32, 1.58, -0.36],
      [0.18, 0.65, 0.38, 0.26, 1.25, -0.22],
      [-0.25, 0.6, -0.36, 0.25, 1.18, 0.28],
    ];
    for (const [sx, sy, sz, sr, sh, rotZ] of shards) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(sr, sh, 6),
        crystalMat
      );
      shard.position.set(sx, sy, sz);
      shard.rotation.z = rotZ;
      shard.castShadow = true;
      group.add(shard);
    }
  } else if (kind === 'bus_stop') {
    group.add(createContactShadowDisc(1.85));
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.22,
      metalness: 0.85,
    });
    const roofMat = new THREE.MeshPhysicalMaterial({
      color: houseRoofHex,
      roughness: 0.28,
      clearcoat: 0.65,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.58,
      roughness: 0.08,
    });

    const backGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.95, 0.1),
      glassMat
    );
    backGlass.position.set(0, 1.05, -0.46);

    for (const px of [-1.12, 1.12]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 2.08, 10),
        frameMat
      );
      pillar.position.set(px, 1.04, -0.46);
      group.add(pillar);
    }

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.2, 1.4),
      roofMat
    );
    roof.position.set(0, 2.1, 0);
    roof.castShadow = true;

    const bench = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 1.55, 8, 12),
      frameMat
    );
    bench.rotation.z = Math.PI / 2;
    bench.position.set(0, 0.54, -0.15);

    group.add(backGlass, roof, bench);
  } else if (kind === 'phone_booth') {
    group.add(createContactShadowDisc(1.0));
    const redBoothMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.22,
      clearcoat: 0.85,
    });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 2.2, 0.95),
      redBoothMat
    );
    body.position.y = 1.1;
    body.castShadow = true;

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 14, 12),
      redBoothMat
    );
    dome.scale.set(1, 0.45, 1);
    dome.position.y = 2.22;

    const windowBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.99, 0.82, 0.74),
      winMat
    );
    windowBand.position.y = 1.38;

    group.add(body, dome, windowBand);
  } else if (kind === 'statue') {
    group.add(createContactShadowDisc(1.3));
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.55,
    });
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.16,
      metalness: 0.88,
      clearcoat: 0.92,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.86, 0.98, 8),
      pedestalMat
    );
    base.position.y = 0.49;
    base.castShadow = true;

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.29, 0.68, 10, 14),
      goldMat
    );
    torso.position.y = 1.5;
    torso.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 14),
      goldMat
    );
    head.position.y = 2.22;

    // Heroic Golden Wings & Raised Sword on Statue
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.85, 6),
        goldMat
      );
      wing.position.set(side * 0.42, 1.78, -0.12);
      wing.rotation.z = -side * 0.55;
      group.add(wing);
    }

    group.add(base, torso, head);
  } else {
    group.add(createContactShadowDisc(0.68));
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.14, 3.65, 12),
      poleMat
    );
    pole.position.y = 1.82;
    pole.castShadow = true;

    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.95, 8, 12),
      poleMat
    );
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 3.58, 0.44);

    const hood = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.18, 12),
      poleMat
    );
    hood.position.set(0, 3.54, 0.84);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 12, 12),
      bulbMat
    );
    bulb.position.set(0, 3.42, 0.84);

    group.add(pole, arm, hood, bulb);
  }

  return group;
}

/**
 * Builds the 3D perimeter boundary walls, corner towers, and glowing barrier rails
 * for the bounded square arena of each level.
 */
export function createArenaBorderGroup(
  halfSize: number,
  wallColorHex: number,
  roofColorHex: number,
  accentColorHex: number
): THREE.Group {
  const group = new THREE.Group();

  const pillarMat = new THREE.MeshPhysicalMaterial({
    color: wallColorHex,
    roughness: 0.4,
    metalness: 0.2,
    clearcoat: 0.3,
  });
  const capMat = new THREE.MeshPhysicalMaterial({
    color: roofColorHex,
    roughness: 0.3,
    metalness: 0.35,
    clearcoat: 0.5,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: accentColorHex,
    emissive: accentColorHex,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const lowWallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.3,
  });

  const fullLen = halfSize * 2;

  // 4 Perimeter Low Stone/Metal Walls + Glowing Energy Rails
  const wallSides = [
    { x: 0, z: -halfSize, rotY: 0 },
    { x: 0, z: halfSize, rotY: 0 },
    { x: -halfSize, z: 0, rotY: Math.PI / 2 },
    { x: halfSize, z: 0, rotY: Math.PI / 2 },
  ];

  for (const side of wallSides) {
    const sideGroup = new THREE.Group();
    sideGroup.position.set(side.x, 0, side.z);
    sideGroup.rotation.y = side.rotY;

    const baseCurb = new THREE.Mesh(
      new THREE.BoxGeometry(fullLen, 0.75, 0.9),
      lowWallMat
    );
    baseCurb.position.y = 0.375;
    baseCurb.castShadow = true;
    baseCurb.receiveShadow = true;

    const upperRail = new THREE.Mesh(
      new THREE.BoxGeometry(fullLen, 0.18, 0.28),
      railMat
    );
    upperRail.position.y = 1.45;

    const midRail = new THREE.Mesh(
      new THREE.BoxGeometry(fullLen, 0.14, 0.24),
      capMat
    );
    midRail.position.y = 1.02;

    sideGroup.add(baseCurb, upperRail, midRail);

    // Posts along each wall every 8.5m
    const step = 8.5;
    for (let p = -halfSize + step; p <= halfSize - step + 0.1; p += step) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.38, 2.1, 8),
        pillarMat
      );
      post.position.set(p, 1.05, 0);
      post.castShadow = true;

      const postCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.48, 0.55, 8),
        capMat
      );
      postCap.position.set(p, 2.32, 0);

      sideGroup.add(post, postCap);
    }

    group.add(sideGroup);
  }

  // 4 Grand Corner Towers
  const corners = [
    [-halfSize, -halfSize],
    [halfSize, -halfSize],
    [-halfSize, halfSize],
    [halfSize, halfSize],
  ];
  for (const [cx, cz] of corners) {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 3.4, 8),
      pillarMat
    );
    tower.position.set(cx, 1.7, cz);
    tower.castShadow = true;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 1.25, 8),
      capMat
    );
    roof.position.set(cx, 3.95, cz);
    roof.castShadow = true;

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      railMat
    );
    orb.position.set(cx, 4.7, cz);

    group.add(tower, roof, orb);
  }

  return group;
}

