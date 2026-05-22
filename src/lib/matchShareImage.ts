// Generates a shareable PNG of an upcoming match (logos + VS + date + arena).

const loadImg = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export interface MatchShareData {
  homeName?: string | null;
  awayName?: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  matchDate: Date;
  location?: string | null;
}

export async function generateMatchShareImage(data: MatchShareData): Promise<Blob> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient (dark mint/gold app vibe)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1410");
  bg.addColorStop(1, "#13241d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle accent bar
  ctx.fillStyle = "rgba(45, 212, 168, 0.12)";
  ctx.fillRect(0, 0, W, 8);

  // Card
  const cardX = 60, cardY = 140, cardW = W - 120, cardH = H - 280;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(45, 212, 168, 0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title
  ctx.fillStyle = "#73ffb8";
  ctx.font = "700 36px Nunito, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PRÓXIMA PARTIDA", W / 2, 90);

  // Logos and names
  const [homeImg, awayImg] = await Promise.all([
    loadImg(data.homeLogoUrl || ""),
    loadImg(data.awayLogoUrl || ""),
  ]);

  const drawTeam = (cx: number, name: string, img: HTMLImageElement | null) => {
    const logoSize = 260;
    const lx = cx - logoSize / 2;
    const ly = 240;
    // Logo bg
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, lx, ly, logoSize, logoSize, 32);
    ctx.fill();
    if (img) {
      const pad = 24;
      ctx.save();
      roundRect(ctx, lx + pad, ly + pad, logoSize - pad * 2, logoSize - pad * 2, 20);
      ctx.clip();
      ctx.drawImage(img, lx + pad, ly + pad, logoSize - pad * 2, logoSize - pad * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = "#2dd4a8";
      ctx.font = "700 90px Nunito, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚽", cx, ly + logoSize / 2);
      ctx.textBaseline = "alphabetic";
    }
    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 44px Nunito, system-ui, sans-serif";
    ctx.textAlign = "center";
    const upper = (name || "???").toUpperCase();
    // Wrap if too long
    const maxW = 420;
    const words = upper.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx, ly + logoSize + 60 + i * 50));
  };

  drawTeam(W * 0.27, data.homeName || "Meu time", homeImg);
  drawTeam(W * 0.73, data.awayName || "Adversário", awayImg);

  // VS
  ctx.fillStyle = "#c9a84c";
  ctx.font = "900 96px Nunito, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VS", W / 2, 400);

  // Date / time
  const date = data.matchDate;
  const dStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const tStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 40px Nunito, system-ui, sans-serif";
  ctx.fillText(dStr, W / 2, 470);
  ctx.font = "600 34px Nunito, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(tStr, W / 2, 515);

  // Location
  if (data.location) {
    ctx.fillStyle = "#73ffb8";
    ctx.font = "700 32px Nunito, system-ui, sans-serif";
    ctx.fillText(`📍 ${data.location}`, W / 2, H - 200);
  }

  // Footer brand
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 28px Nunito, system-ui, sans-serif";
  ctx.fillText("E AÍ JOGADOR", W / 2, H - 70);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/png", 0.95);
  });
}
