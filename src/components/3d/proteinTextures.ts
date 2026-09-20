import * as THREE from 'three';

/**
 * Creates high-resolution canvas textures for the 3D protein tub label
 * faithfully matching the iconic "Gold Standard 100% Whey" packaging layout:
 * - Upper ~62%: Deep black with diagonal carbon pinstripes, brand emblem, authentic scratch seal,
 *   metallic "GOLD STANDARD", vertical "100%", and huge cream "WHEY".
 * - Lower ~38%: Bold contrasting color banner (crimson red / flavor color) with:
 *   "FOR MUSCLE SUPPORT & RECOVERY", "24G PROTEIN", "5.5G BCAAs", "WHEY PROTEIN ISOLATE PRIMARY SOURCE",
 *   "BANNED SUBSTANCE TESTED" shield, dark flavor pill with hazard stripes, and net weight info.
 * - Side/Back panels with Nutrition Facts, Directions, and Barcode.
 */
export function createProteinLabelTexture(
  flavorName: string,
  accentHex: string,
  servings: number = 74,
  weight: string = '5 LB (2.27 KG)',
  sizeId?: string
): THREE.CanvasTexture {
  const is310g = sizeId === '310g' || weight.includes('310') || weight.includes('10.9');
  const is2lb = sizeId === '2lb' || weight.includes('2 LB') || weight.includes('907');
  
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. BASE BACKGROUND: Upper 62% deep carbon black, Lower 38% rich flavor banner
  const splitY = is310g ? Math.round(canvas.height * 0.65) : Math.round(canvas.height * 0.62); // 665px for 310g, 635px for 2lb/5lb

  // Upper deep dark carbon section
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, canvas.width, splitY);

  // Diagonal Carbon Fiber Pinstripe Weave (/// pattern like in the image)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1.5;
  const stripeGap = 10;
  for (let x = -canvas.height; x < canvas.width + canvas.height; x += stripeGap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + splitY, splitY);
    ctx.stroke();
  }
  ctx.restore();

  // Lower Banner (Rich Crimson Red / Accent theme, matching the image)
  // Double Rich Chocolate in the reference is a deep athletic crimson red (#d91a2a / #b91c1c)
  const bannerColor = (accentHex === '#a3e635' || accentHex.toLowerCase().includes('chocolate'))
    ? '#dc2626' // Iconic Gold Standard Red for Chocolate / flagship
    : accentHex;

  const bannerGrad = ctx.createLinearGradient(0, splitY, 0, canvas.height);
  bannerGrad.addColorStop(0, bannerColor);
  bannerGrad.addColorStop(0.1, bannerColor);
  bannerGrad.addColorStop(1, adjustColorBrightness(bannerColor, -25));
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, splitY, canvas.width, canvas.height - splitY);

  // 2. FRONT FACE (Centered at x = 1024)
  const centerX = canvas.width / 2; // 1024

  // Subtle ambient radial glow behind WHEY title
  const glow = ctx.createRadialGradient(centerX, splitY * 0.55, 20, centerX, splitY * 0.55, 420);
  glow.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(centerX - 500, 50, 1000, splitY - 50);

  // ==========================================
  // TOP ROW: BRAND EMBLEM (LEFT) & AUTHENTICITY BADGE (RIGHT - only on 2lb & 5lb)
  // ==========================================

  // Top Left: Athletic Brand Emblem (matching ON style)
  const logoX = is310g ? centerX - 320 : centerX - 360;
  const logoY = is310g ? 90 : 110;

  // Interlocking "KN" / "ON" style oval emblem
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 68px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('KN', logoX, logoY);

  // Outline double-ring around monogram
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(logoX - 12, logoY - 58, 105, 74, 16);
  ctx.stroke();

  // Subtitle next to logo: KINETIC NUTRITION
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Barlow Condensed", sans-serif';
  ctx.fillText('KINETIC', logoX + 112, logoY - 26);
  ctx.fillText('NUTRITION', logoX + 112, logoY - 2);
  ctx.restore();

  // Top Right: Authenticity Scratch Badge (only on 2lb & 5lb jars as seen in reference)
  if (!is310g) {
    const authX = centerX + 340;
    const authY = 70;
    const authW = 210;
    const authH = 92;

    ctx.save();
    // Gold rounded badge container
    ctx.fillStyle = '#17191d';
    ctx.strokeStyle = '#d4af37'; // metallic gold
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(authX - authW / 2, authY, authW, authH, 18);
    ctx.fill();
    ctx.stroke();

    // Inner top line: "100% AUTHENTIC"
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ 100% AUTHENTIC ★', authX, authY + 24);

    // Scratch bar (silver metallic strip)
    const stripW = 175;
    const stripH = 26;
    const stripGrad = ctx.createLinearGradient(authX - stripW / 2, 0, authX + stripW / 2, 0);
    stripGrad.addColorStop(0, '#9ca3af');
    stripGrad.addColorStop(0.5, '#e5e7eb');
    stripGrad.addColorStop(1, '#9ca3af');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(authX - stripW / 2, authY + 34, stripW, stripH);

    ctx.fillStyle = '#1f2937';
    ctx.font = '900 11px monospace';
    ctx.fillText('SCRATCH TO VERIFY', authX, authY + 51);

    // Micro URL
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px monospace';
    ctx.fillText('www.kinetic-nutrition.com', authX, authY + 76);
    ctx.restore();
  }

  // ==========================================
  // MAIN TYPOGRAPHY FOR 310G vs 2LB / 5LB
  // ==========================================
  if (is310g) {
    // 310G CANISTER SPECIFIC LAYOUT (from user Image 1):
    // "GOLD STANDARD", vertical "100%", "WHEY", "PROTEIN", gold bar "FOR MUSCLE SUPPORT & RECOVERY"
    const goldY = 190;
    ctx.save();
    ctx.fillStyle = '#d8b15d'; // Metallic gold
    ctx.font = '900 52px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText('GOLD STANDARD®', centerX, goldY);
    ctx.restore();

    // Gold framing rules left and right of "GOLD STANDARD"
    ctx.strokeStyle = '#d8b15d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 360, goldY - 16);
    ctx.lineTo(centerX - 220, goldY - 16);
    ctx.moveTo(centerX + 220, goldY - 16);
    ctx.lineTo(centerX + 360, goldY - 16);
    ctx.stroke();

    // Vertical 100% on the left of WHEY PROTEIN
    ctx.save();
    ctx.translate(centerX - 310, 480);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#f5f5f0';
    ctx.font = '900 75px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('100%', 0, 0);
    ctx.restore();

    // Large "WHEY"
    ctx.save();
    ctx.fillStyle = '#f7f6f0';
    ctx.font = '900 170px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '-2px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 14;
    ctx.fillText('WHEY', centerX + 40, 360);

    // Large "PROTEIN" stacked directly under WHEY
    ctx.font = '900 150px "Barlow Condensed", sans-serif';
    ctx.fillText('PROTEIN', centerX + 40, 495);
    ctx.restore();

    // Gold Ribbon / Bar: "FOR MUSCLE SUPPORT & RECOVERY" (Image 1 layout)
    const ribbonY = 560;
    const ribbonW = 760;
    const ribbonH = 46;
    ctx.save();
    ctx.fillStyle = '#c59d43';
    ctx.fillRect(centerX - ribbonW / 2, ribbonY, ribbonW, ribbonH);
    ctx.fillStyle = '#111215';
    ctx.font = '900 24px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('FOR MUSCLE SUPPORT & RECOVERY', centerX, ribbonY + 31);
    ctx.restore();

    // LOWER RED SECTION FOR 310G:
    // Left: 24G PROTEIN PER SERVING
    // Right: Flavor pill "DOUBLE RICH CHOCOLATE ARTIFICIALLY FLAVORED"
    const lowerY = splitY + 40;

    // 24G PROTEIN PER SERVING (Left)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('24G', centerX - 360, lowerY + 70);

    ctx.font = '900 20px "Barlow Condensed", sans-serif';
    ctx.fillText('PROTEIN', centerX - 215, lowerY + 38);
    ctx.fillText('PER', centerX - 215, lowerY + 58);
    ctx.fillText('SERVING', centerX - 215, lowerY + 78);

    // Flavor pill on the right
    const pillX = centerX - 80;
    const pillW = 460;
    const pillH = 76;
    ctx.fillStyle = '#1c1e22';
    ctx.beginPath();
    ctx.roundRect(pillX, lowerY + 12, pillW, pillH, 8);
    ctx.fill();

    // Diagonal hazard stripes on right of pill
    drawHazardStripes(ctx, pillX + pillW - 65, lowerY + 12, 65, pillH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(flavorName.toUpperCase(), pillX + 24, lowerY + 46);

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ARTIFICIALLY FLAVORED', pillX + 24, lowerY + 70);
    ctx.restore();

    // Bottom Sub-Banner for 310G
    const botY = splitY + 245;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText(
      '100% OF THE PROTEIN FROM WHEY  |  PROTEIN POWDER DRINK MIX  |  NET WT 10.9 OZ (310 G)  |  10 SERVINGS',
      centerX,
      botY
    );
    ctx.restore();

  } else {
    // 2LB & 5LB JUG LAYOUT (from user Images 2 & 3):
    // 1. "GOLD STANDARD" in rich metallic gold with brackets
    const goldY = 220;
    ctx.save();
    ctx.fillStyle = '#d8b15d'; // Warm metallic Gold
    ctx.font = '900 58px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText('GOLD STANDARD®', centerX, goldY);
    ctx.restore();

    // Gold framing rules left and right of "GOLD STANDARD"
    ctx.strokeStyle = '#d8b15d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 390, goldY - 18);
    ctx.lineTo(centerX - 240, goldY - 18);
    ctx.moveTo(centerX + 240, goldY - 18);
    ctx.lineTo(centerX + 390, goldY - 18);
    ctx.stroke();

    // 2. VERTICAL "100%" & GIANT "WHEY"
    ctx.save();
    ctx.translate(centerX - 350, 485);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#f5f5f0'; // Cream white
    ctx.font = '900 70px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('100%', 0, 0);
    ctx.restore();

    // GIANT "WHEY"
    ctx.save();
    ctx.fillStyle = '#f7f6f0'; // Clean Creamy White
    ctx.font = '900 235px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '-4px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillText('WHEY', centerX + 45, 480);
    ctx.restore();

    // Subtle 3D inner bevel effect on WHEY
    ctx.save();
    ctx.strokeStyle = '#e2dfd2';
    ctx.lineWidth = 2;
    ctx.font = '900 235px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '-4px';
    ctx.strokeText('WHEY', centerX + 45, 480);
    ctx.restore();

    // Thin separator line right before the colored banner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, splitY - 4, canvas.width, 4);

    // ==========================================
    // LOWER SECTION: RED BANNER WITH METRICS & FLAVOR PILL
    // ==========================================

    // Row 1: Four key benefits callouts (aligned horizontally)
    const calloutsY = splitY + 45;

    // 1. Muscle support
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FOR MUSCLE', centerX - 320, calloutsY);
    ctx.fillText('SUPPORT &', centerX - 320, calloutsY + 22);
    ctx.fillText('RECOVERY', centerX - 320, calloutsY + 44);

    // Vertical divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 230, calloutsY - 10);
    ctx.lineTo(centerX - 230, calloutsY + 55);
    ctx.stroke();

    // 2. 24G PROTEIN
    ctx.font = '900 48px "Barlow Condensed", sans-serif';
    ctx.fillText('24G', centerX - 140, calloutsY + 16);
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PROTEIN', centerX - 140, calloutsY + 36);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('HELPS BUILD AND', centerX - 140, calloutsY + 52);
    ctx.fillText('MAINTAIN MUSCLE', centerX - 140, calloutsY + 64);

    // Vertical divider
    ctx.beginPath();
    ctx.moveTo(centerX - 50, calloutsY - 10);
    ctx.lineTo(centerX - 50, calloutsY + 55);
    ctx.stroke();

    // 3. 5.5G BCAAS
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Barlow Condensed", sans-serif';
    ctx.fillText('5.5G', centerX + 50, calloutsY + 16);
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('BCAAs**', centerX + 50, calloutsY + 36);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('SUPPORTS ENDURANCE', centerX + 50, calloutsY + 52);
    ctx.fillText('AND RECOVERY', centerX + 50, calloutsY + 64);

    // Vertical divider
    ctx.beginPath();
    ctx.moveTo(centerX + 150, calloutsY - 10);
    ctx.lineTo(centerX + 150, calloutsY + 55);
    ctx.stroke();

    // 4. WPI SOURCE & BANNED SUBSTANCE TESTED
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px "Barlow Condensed", sans-serif';
    ctx.fillText('WHEY PROTEIN ISOLATE', centerX + 280, calloutsY);
    ctx.font = '10px monospace';
    ctx.fillText('PRIMARY SOURCE', centerX + 280, calloutsY + 16);

    // Shield Icon & "BANNED SUBSTANCE TESTED"
    ctx.font = 'bold 14px "Barlow Condensed", sans-serif';
    ctx.fillText('🛡️ BANNED SUBSTANCE', centerX + 280, calloutsY + 38);
    ctx.fillText('TESTED', centerX + 280, calloutsY + 56);
    ctx.restore();

    // Row 2: Dark Flavor Pill with Diagonal Safety Stripes
    const pillY = splitY + 140;
    const pillW = 740;
    const pillH = 68;

    ctx.save();
    // Pill background
    ctx.fillStyle = '#1c1e22';
    ctx.beginPath();
    ctx.roundRect(centerX - pillW / 2, pillY, pillW, pillH, 8);
    ctx.fill();

    // Left & right diagonal hazard stripes
    const stripeWidth = 60;
    drawHazardStripes(ctx, centerX - pillW / 2, pillY, stripeWidth, pillH);
    drawHazardStripes(ctx, centerX + pillW / 2 - stripeWidth, pillY, stripeWidth, pillH);

    // Flavor text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText(flavorName.toUpperCase(), centerX - 30, pillY + 44);

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 13px monospace';
    ctx.letterSpacing = '0px';
    ctx.fillText('NATURALLY & ARTIFICIALLY FLAVORED', centerX + 205, pillY + 42);
    ctx.restore();

    // Row 3: Bottom Sub-Banner with net weight and servings
    const botY = splitY + 280;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(
      `100% OF THE PROTEIN FROM WHEY  |  PROTEIN POWDER DRINK MIX  |  NET WT ${weight}  |  ${servings} SERVINGS`,
      centerX,
      botY
    );
    ctx.restore();
  }

  // ==========================================
  // 3. LEFT SIDE PANEL: NUTRITION FACTS (around x = 360)
  // ==========================================
  const leftX = 360;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Nutrition Facts', leftX - 200, 140);

  ctx.fillStyle = '#d1d5db';
  ctx.font = '16px monospace';
  ctx.fillText(`About ${servings} servings per container`, leftX - 200, 175);
  ctx.fillText('Serving size           1 Scoop (30.4g)', leftX - 200, 202);

  // Thick divider
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftX - 200, 215, 400, 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Barlow Condensed", sans-serif';
  ctx.fillText('Amount per serving', leftX - 200, 255);
  ctx.font = '900 52px "Barlow Condensed", sans-serif';
  ctx.fillText('Calories               120', leftX - 200, 310);

  // Medium divider
  ctx.fillRect(leftX - 200, 325, 400, 5);

  const nFacts = [
    ['Total Fat 1.5g', '2%'],
    ['  Saturated Fat 0.5g', '3%'],
    ['Cholesterol 55mg', '18%'],
    ['Sodium 130mg', '6%'],
    ['Total Carbohydrate 3g', '1%'],
    ['  Total Sugars 1g', ''],
    ['Protein 24g', '48%'],
    ['Calcium 130mg', '10%'],
    ['Iron 0.7mg', '4%'],
    ['Potassium 210mg', '4%']
  ];

  nFacts.forEach((nf, idx) => {
    const fy = 360 + idx * 32;
    ctx.fillStyle = nf[0].includes('Protein') ? '#facc15' : '#e5e7eb';
    ctx.font = nf[0].includes('Protein') || nf[0].includes('Total Fat') ? 'bold 18px monospace' : '16px monospace';
    ctx.fillText(nf[0], leftX - 200, fy);
    ctx.textAlign = 'right';
    ctx.fillText(nf[1], leftX + 200, fy);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(leftX - 200, fy + 8);
    ctx.lineTo(leftX + 200, fy + 8);
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================
  // 4. RIGHT SIDE PANEL: QUALITY, BARCODE & USAGE (around x = 1680)
  // ==========================================
  const rightX = 1680;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DIRECTIONS FOR USE', rightX - 200, 140);

  ctx.fillStyle = '#d1d5db';
  ctx.font = '15px monospace';
  const directions = [
    '🥄 SPOON STIRRED:',
    'Add 1 scoop to 6-8 fl oz of water or milk.',
    'Stir for 30 seconds until dissolved.',
    '',
    '🥤 SHAKER CUP:',
    'Pour in liquid, add scoop, shake 25-30s.',
    '',
    '⚡ OPTIMAL TIMING:',
    'First thing in the morning or 30-60 min post workout.'
  ];
  directions.forEach((line, i) => {
    ctx.fillText(line, rightX - 200, 180 + i * 26);
  });

  // Quality Badges
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
  ctx.fillText('CERTIFIED AUTHENTIC QUALITY', rightX - 200, 440);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('✓ INFORMED CHOICE - WE TEST YOU TRUST', rightX - 200, 475);
  ctx.fillText('✓ GLUTEN FREE & NON-GMO TESTED', rightX - 200, 505);

  // High-Res Faux Barcode
  const barY = 560;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rightX - 160, barY, 320, 90);
  ctx.fillStyle = '#000000';
  for (let bx = rightX - 145; bx < rightX + 145; bx += 7) {
    const w = bx % 3 === 0 ? 4 : 2;
    ctx.fillRect(bx, barY + 8, w, 60);
  }
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('7  48927  02866  8', rightX, barY + 82);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Helper to draw hazard diagonal stripes on flavor pills
 */
function drawHazardStripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 4;
  for (let sx = x - height; sx < x + width + height; sx += 12) {
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + height, y + height);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Creates normal/bump map for ribbed cap ridges and matte textured tub body.
 */
export function createTubCapBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Vertical grip ridges matching the real Optimum Nutrition cap
  for (let x = 0; x < 512; x += 10) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 0, 4, 512);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 4, 0, 4, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 1);
  return texture;
}

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
