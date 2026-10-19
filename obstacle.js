class Obstacle extends Vehicle {
  // Crée un corps céleste immobile et réserve sa texture jusqu'au premier dessin.
  constructor(x, y, r, type, color) {
    super(x, y);
    this.r = r;
    this.type = type;
    this.color = color;
    this.vel.set(0, 0);
    this.maxSpeed = 0;
    this.mass = r * r;
    this.surfaceTexture = null;
    this.surfaceTextureSize = 0;
  }

  // Dessine la zone d'influence, puis le soleil ou la planète texturée.
  show() {
    push();
    if (Vehicle.debug) {
      noStroke();
      fill(this.type === "soleil" ? color(255, 115, 45, 22) : color(149, 91, 255, 22));
      circle(this.pos.x, this.pos.y, this.r * 3.2);
      noFill();
      stroke(this.type === "soleil" ? color(255, 157, 78, 92) : color(165, 116, 255, 85));
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.r * 2);
    }

    if (this.type === "soleil") this.showSun();
    else this.showPlanet();
    pop();
  }

  // Retourne une palette atmosphérique distincte pour chaque type de corps.
  getSurfacePalette() {
    if (this.type === "soleil") {
      return ["#ff9b21", "#f45a0b", "#c82d08", "#711809", "#310907"];
    }
    if (this.type === "saturne") {
      return ["#ead8ae", "#c6ac7e", "#9b8060", "#74614f", "#d6c294"];
    }

    const match = /^#([0-9a-f]{6})$/i.exec(this.color);
    const hex = match ? match[1] : "416da8";
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    const mix = (channel, target, amount) => Math.round(channel + (target - channel) * amount);
    const toHex = (value) => value.toString(16).padStart(2, "0");
    const tint = (amount) => `#${toHex(mix(red, 222, amount))}${toHex(mix(green, 232, amount))}${toHex(mix(blue, 255, amount))}`;
    const shade = (amount) => `#${toHex(mix(red, 10, amount))}${toHex(mix(green, 14, amount))}${toHex(mix(blue, 32, amount))}`;
    return [tint(0.5), tint(0.18), this.color, shade(0.45), shade(0.82)];
  }

  // Génère une fois une sphère et ses détails sur un canvas local réutilisable.
  createSurfaceTexture() {
    const textureSize = Math.max(96, Math.min(512, Math.ceil(this.r * 4)));
    const texture = document.createElement("canvas");
    texture.width = textureSize;
    texture.height = textureSize;
    const ctx = texture.getContext("2d");
    const center = textureSize / 2;
    const radius = textureSize * 0.47;
    const palette = this.getSurfacePalette();
    let seed = Math.floor(this.r * 103 + this.pos.x * 7 + this.pos.y * 13);
    for (let i = 0; i < this.color.length; i++) seed = (seed * 31 + this.color.charCodeAt(i)) % 2147483647;
    const nextRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    const base = ctx.createRadialGradient(center * 0.57, center * 0.45, radius * 0.03, center, center, radius * 1.2);
    base.addColorStop(0, palette[0]);
    base.addColorStop(0.34, palette[1]);
    base.addColorStop(0.72, palette[2]);
    base.addColorStop(1, palette[3]);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, textureSize, textureSize);

    if (this.type === "saturne") {
      this.drawAtmosphereBands(ctx, center, radius, palette, nextRandom);
    } else if (this.type === "soleil") {
      this.drawSolarGranulation(ctx, center, radius, palette, nextRandom);
    } else {
      this.drawCloudSwirls(ctx, center, radius, palette, nextRandom);
    }

    const terminator = ctx.createRadialGradient(center * 0.54, center * 0.43, radius * 0.06, center * 0.83, center * 0.7, radius * 1.15);
    terminator.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    terminator.addColorStop(0.44, "rgba(255, 255, 255, 0)");
    terminator.addColorStop(0.76, "rgba(3, 7, 20, 0.18)");
    terminator.addColorStop(1, "rgba(0, 2, 12, 0.82)");
    ctx.fillStyle = terminator;
    ctx.fillRect(0, 0, textureSize, textureSize);

    if (this.type !== "soleil") {
      const atmosphere = ctx.createRadialGradient(center * 0.45, center * 0.42, radius * 0.02, center * 0.48, center * 0.5, radius * 0.7);
      atmosphere.addColorStop(0, "rgba(255, 255, 255, 0.17)");
      atmosphere.addColorStop(0.42, "rgba(255, 255, 255, 0.045)");
      atmosphere.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, textureSize, textureSize);
    }
    ctx.restore();

    this.surfaceTexture = texture;
    this.surfaceTextureSize = textureSize;
    return texture;
  }

  // Dessine des bandes atmosphériques incurvées, comme celles d'une géante gazeuse.
  drawAtmosphereBands(ctx, center, radius, palette, nextRandom) {
    const bandCount = 19;
    for (let i = 0; i < bandCount; i++) {
      const y = center - radius + (i + 0.5) * (radius * 2 / bandCount);
      const thickness = radius * (0.035 + nextRandom() * 0.075);
      const curve = (nextRandom() - 0.5) * radius * 0.18;
      const colorIndex = i % (palette.length - 1);
      ctx.beginPath();
      ctx.moveTo(center - radius, y);
      ctx.bezierCurveTo(
        center - radius * 0.36, y + curve,
        center + radius * 0.3, y - curve * 0.65,
        center + radius, y + curve * 0.25,
      );
      ctx.strokeStyle = palette[colorIndex];
      ctx.globalAlpha = 0.12 + nextRandom() * 0.27;
      ctx.lineWidth = thickness;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < 28; i++) {
      const x = center + (nextRandom() * 2 - 1) * radius * 0.82;
      const y = center + (nextRandom() * 2 - 1) * radius * 0.82;
      const width = radius * (0.07 + nextRandom() * 0.24);
      const height = radius * (0.012 + nextRandom() * 0.035);
      ctx.fillStyle = i % 2 ? palette[0] : palette[3];
      ctx.globalAlpha = 0.07 + nextRandom() * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, (nextRandom() - 0.5) * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Ajoute la granulation, les régions actives et les taches sombres du soleil.
  drawSolarGranulation(ctx, center, radius, palette, nextRandom) {
    const solarColors = ["#fff1a0", "#ffd047", "#ff941a", "#ed490b", "#9e2109", "#3e0b07"];
    for (let i = 0; i < 2400; i++) {
      const angle = nextRandom() * Math.PI * 2;
      const distance = Math.sqrt(nextRandom()) * radius * 0.97;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const size = radius * (0.004 + nextRandom() * 0.019);
      const brightness = nextRandom();
      ctx.fillStyle = brightness < 0.08 ? solarColors[0]
        : brightness < 0.35 ? solarColors[1]
          : brightness < 0.7 ? solarColors[2]
            : brightness < 0.9 ? solarColors[3]
              : solarColors[4];
      if (brightness > 0.97) ctx.fillStyle = palette[4];
      ctx.globalAlpha = 0.16 + nextRandom() * 0.38;
      ctx.beginPath();
      ctx.ellipse(x, y, size * (0.65 + nextRandom()), size * (0.28 + nextRandom() * 0.55), angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (let region = 0; region < 5; region++) {
      const angle = nextRandom() * Math.PI * 2;
      const distance = Math.sqrt(nextRandom()) * radius * 0.58;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const glowRadius = radius * (0.09 + nextRandom() * 0.07);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      glow.addColorStop(0, "rgba(255, 243, 145, 0.78)");
      glow.addColorStop(0.24, "rgba(255, 158, 23, 0.55)");
      glow.addColorStop(0.68, "rgba(255, 57, 7, 0.22)");
      glow.addColorStop(1, "rgba(255, 28, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(x, y, glowRadius, glowRadius * 0.58, angle, 0, Math.PI * 2);
      ctx.fill();

      for (let cell = 0; cell < 48; cell++) {
        const cellAngle = nextRandom() * Math.PI * 2;
        const cellDistance = Math.sqrt(nextRandom()) * glowRadius * 0.62;
        const cellSize = radius * (0.006 + nextRandom() * 0.018);
        ctx.fillStyle = cell % 5 === 0 ? solarColors[0] : solarColors[cell % 3];
        ctx.globalAlpha = 0.3 + nextRandom() * 0.45;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(cellAngle) * cellDistance,
          y + Math.sin(cellAngle) * cellDistance * 0.64,
          cellSize,
          cellSize * (0.45 + nextRandom() * 0.6),
          cellAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    for (let spot = 0; spot < 3; spot++) {
      const angle = nextRandom() * Math.PI * 2;
      const distance = Math.sqrt(nextRandom()) * radius * 0.62;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const width = radius * (0.035 + nextRandom() * 0.025);
      const height = width * (0.42 + nextRandom() * 0.35);
      ctx.fillStyle = "rgba(255, 95, 15, 0.58)";
      ctx.beginPath();
      ctx.ellipse(x, y, width * 1.8, height * 1.8, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(35, 7, 5, 0.88)";
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dessine des traînées nuageuses discrètes sur les planètes sans anneaux.
  drawCloudSwirls(ctx, center, radius, palette, nextRandom) {
    for (let i = 0; i < 52; i++) {
      const x = center + (nextRandom() * 2 - 1) * radius * 0.92;
      const y = center + (nextRandom() * 2 - 1) * radius * 0.92;
      const length = radius * (0.08 + nextRandom() * 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, length, radius * (0.008 + nextRandom() * 0.025), (nextRandom() - 0.5) * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.06 + nextRandom() * 0.13;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Dessine le soleil texturé, son halo et sa couronne d'éruptions animées.
  showSun() {
    const ctx = drawingContext;
    const texture = this.surfaceTexture || this.createSurfaceTexture();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const corona = ctx.createRadialGradient(
      this.pos.x,
      this.pos.y,
      this.r * 0.82,
      this.pos.x,
      this.pos.y,
      this.r * 1.9,
    );
    corona.addColorStop(0, "rgba(255, 176, 67, 0.32)");
    corona.addColorStop(0.28, "rgba(255, 94, 27, 0.2)");
    corona.addColorStop(0.68, "rgba(229, 39, 31, 0.055)");
    corona.addColorStop(1, "rgba(255, 34, 24, 0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r * 1.9, 0, TWO_PI);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = this.r * 0.42;
    ctx.shadowColor = "#ff6c32";
    ctx.drawImage(texture, this.pos.x - this.r, this.pos.y - this.r, this.r * 2, this.r * 2);
    ctx.restore();

    this.drawSolarProminences(ctx);
  }

  // Anime une couronne irrégulière et quelques arches de plasma aux bords du disque.
  drawSolarProminences(ctx) {
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 88; i++) {
      const angle = i * TWO_PI / 88;
      const variation = (Math.sin(i * 12.9898) + 1) * 0.5;
      const pulse = (Math.sin(frameCount * 0.035 + i * 1.7) + 1) * 0.5;
      const length = this.r * (0.012 + variation * 0.035 + pulse * 0.018);
      ctx.beginPath();
      ctx.moveTo(
        this.pos.x + cos(angle) * this.r * 0.99,
        this.pos.y + sin(angle) * this.r * 0.99,
      );
      ctx.lineTo(
        this.pos.x + cos(angle) * (this.r + length),
        this.pos.y + sin(angle) * (this.r + length),
      );
      ctx.strokeStyle = `rgba(255, ${Math.round(55 + pulse * 90)}, 12, ${0.22 + variation * 0.4})`;
      ctx.lineWidth = 0.45 + variation * 1.05;
      ctx.stroke();
    }

    for (let i = 0; i < 3; i++) {
      const angle = [-2.65, -0.18, 2.55][i];
      const pulse = 0.82 + (Math.sin(frameCount * 0.045 + i * 2.2) + 1) * 0.18;
      const ux = cos(angle);
      const uy = sin(angle);
      const tx = -uy;
      const ty = ux;
      const baseX = this.pos.x + ux * this.r * 0.96;
      const baseY = this.pos.y + uy * this.r * 0.96;
      const halfWidth = this.r * 0.075;
      const height = this.r * (0.09 + pulse * 0.08);
      ctx.beginPath();
      ctx.moveTo(baseX - tx * halfWidth, baseY - ty * halfWidth);
      ctx.quadraticCurveTo(
        baseX + ux * height + tx * halfWidth * 0.35,
        baseY + uy * height + ty * halfWidth * 0.35,
        baseX + tx * halfWidth,
        baseY + ty * halfWidth,
      );
      ctx.quadraticCurveTo(
        baseX + ux * height * 0.25,
        baseY + uy * height * 0.25,
        baseX - tx * halfWidth,
        baseY - ty * halfWidth,
      );
      ctx.fillStyle = `rgba(255, ${Math.round(68 + pulse * 70)}, 8, 0.62)`;
      ctx.shadowColor = "#ff4b08";
      ctx.shadowBlur = this.r * 0.1;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // Dessine les anneaux à l'arrière et devant Saturne pour créer du relief.
  showPlanet() {
    if (this.type === "saturne") this.drawRings(false);
    const texture = this.surfaceTexture || this.createSurfaceTexture();
    drawingContext.drawImage(texture, this.pos.x - this.r, this.pos.y - this.r, this.r * 2, this.r * 2);

    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r * 0.94, 0, TWO_PI);
    ctx.strokeStyle = "rgba(220, 236, 255, 0.28)";
    ctx.lineWidth = Math.max(0.7, this.r * 0.018);
    ctx.stroke();
    ctx.restore();

    if (this.type === "saturne") this.drawRings(true);
  }

  // Trace une moitié de l'anneau selon qu'elle passe derrière ou devant la planète.
  drawRings(front) {
    const ctx = drawingContext;
    const rotation = -0.3;
    const start = front ? 0 : Math.PI;
    const end = front ? Math.PI : TWO_PI;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(rotation);

    const ringGradient = ctx.createLinearGradient(-this.r * 1.9, 0, this.r * 1.9, 0);
    ringGradient.addColorStop(0, "rgba(106, 84, 62, 0.08)");
    ringGradient.addColorStop(0.18, "rgba(219, 194, 151, 0.72)");
    ringGradient.addColorStop(0.44, "rgba(243, 224, 184, 0.58)");
    ringGradient.addColorStop(0.62, "rgba(115, 96, 78, 0.45)");
    ringGradient.addColorStop(0.82, "rgba(224, 201, 158, 0.7)");
    ringGradient.addColorStop(1, "rgba(95, 78, 62, 0.08)");

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.r * (1.38 + i * 0.12), this.r * (0.43 + i * 0.035), 0, start, end);
      ctx.strokeStyle = i === 2 ? "rgba(72, 58, 48, 0.8)" : ringGradient;
      ctx.lineWidth = i === 2 ? this.r * 0.055 : this.r * (0.038 + (i % 2) * 0.018);
      ctx.stroke();
    }
    ctx.restore();
  }
}
