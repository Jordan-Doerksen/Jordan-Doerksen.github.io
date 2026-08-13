function circlePath(ctx, center, radius) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
}

export function drawCircles(ctx, viewport, state, metrics, phase, palette) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const glow = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    0,
    viewport.width / 2,
    viewport.height / 2,
    Math.max(viewport.width, viewport.height) * 0.68
  );
  glow.addColorStop(0, palette.stageGlow);
  glow.addColorStop(1, palette.stageBackground);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const [first, second] = metrics.centers;
  const active = phase === "active";
  const approaching = phase === "approaching";

  ctx.save();
  circlePath(ctx, first, metrics.radius);
  ctx.clip();
  circlePath(ctx, second, metrics.radius);
  ctx.fillStyle = active ? palette.lensActive : palette.lens;
  ctx.fill();
  ctx.restore();

  metrics.centers.forEach((center, index) => {
    ctx.save();
    ctx.shadowColor = active || approaching ? palette.active : palette.circle;
    ctx.shadowBlur = active ? 26 : approaching ? 18 : 10;
    ctx.lineWidth = index === state.selectedCircle ? 2.6 : 1.4;
    ctx.strokeStyle = index === state.selectedCircle ? palette.circleSelected : palette.circle;
    ctx.fillStyle = palette.circleFill;
    circlePath(ctx, center, metrics.radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(center.x, center.y, index === state.selectedCircle ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = palette.point;
    ctx.fill();
  });

  if (metrics.intersections.length === 2) {
    const top = [...metrics.intersections].sort((a, b) => a.y - b.y)[0];
    if (active) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(top.x, top.y);
      ctx.lineTo(second.x, second.y);
      ctx.closePath();
      ctx.fillStyle = palette.triangleFill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = palette.active;
      ctx.shadowColor = palette.active;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    for (const point of metrics.intersections) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, active ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? palette.active : palette.intersection;
      ctx.fill();
    }
  }

  if (state.precision) {
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.measure;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(second.x, second.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = palette.measure;
    ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${metrics.distanceInRadii.toFixed(3)} r`,
      (first.x + second.x) / 2,
      (first.y + second.y) / 2 - 10
    );
    ctx.restore();
  }
}
