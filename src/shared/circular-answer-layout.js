// 円環状の回答ボタン配置のうち、CSSのrotate/translateYだけでは表現できない
// (半径が半音差ごとに連続的に変わる、複数のボタンが1つの円に収まらない等の)配置を
// 計算する純粋関数群。DOMには一切触れないため、node:testでそのまま検証できる。
//
// 角度は「真上=0度、時計回り」の方位角(コンパス角)。x,yは0-100のパーセンテージで、
// (50,50)がコンテナ中心、半径50が中心からコンテナ端までにあたる。

function toCartesian(angleDegCompass, radiusFraction) {
  const angleRad = (angleDegCompass * Math.PI) / 180;
  const r = radiusFraction * 50;
  return { x: 50 + r * Math.sin(angleRad), y: 50 - r * Math.cos(angleRad) };
}

// 3点を通る円(外接円)の中心と半径を求める。
function circumcircle(p1, p2, p3) {
  const ax = p1.x, ay = p1.y, bx = p2.x, by = p2.y, cx = p3.x, cy = p3.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const center = { x: ux, y: uy };
  return { center, radius: Math.hypot(ax - ux, ay - uy) };
}

function angleOf(center, p) {
  return Math.atan2(p.y - center.y, p.x - center.x);
}

// angleを、referenceとの差が±180度(πラジアン)以内になるよう2πの整数倍だけずらす。
// 弧を連続した一続きの区間として扱うために使う(360度をまたぐ位置関係を正しく比較するため)。
function unwrapTowards(angle, reference) {
  let a = angle;
  while (a - reference > Math.PI) a -= 2 * Math.PI;
  while (a - reference < -Math.PI) a += 2 * Math.PI;
  return a;
}

function arcPathPoints(startDeg, endDeg, radiusFraction, stepDeg = 2) {
  const points = [];
  const direction = endDeg >= startDeg ? 1 : -1;
  for (let deg = startDeg; direction > 0 ? deg <= endDeg : deg >= endDeg; deg += direction * stepDeg) {
    points.push(toCartesian(deg, radiusFraction));
  }
  points.push(toCartesian(endDeg, radiusFraction));
  return points;
}

// 案A(渦巻配置): 半音差sにおける半径 = baseRadius + s * step、角度 = s * 30度。
// 半音差が1増えるごとに30度回転しつつ、半径もstep分だけ外へ広がる(=渦巻)。
export function computeSpiralPositions(semitones, { baseRadius, step }) {
  const positions = {};
  semitones.forEach((semitone) => {
    positions[semitone] = toCartesian(semitone * 30, baseRadius + semitone * step);
  });
  return positions;
}

export function spiralGuidePathPoints(maxSemitone, { baseRadius, step }, stepDeg = 0.5) {
  const points = [];
  for (let deg = 0; deg <= maxSemitone * 30; deg += stepDeg) {
    const semitoneEquivalent = deg / 30;
    points.push(toCartesian(deg, baseRadius + semitoneEquivalent * step));
  }
  return points;
}

// 案C(二重円環+橋渡し弧): 半音差0〜10は内側リング(角度=半音差*30度、半径innerRadius)。
// 半音差12・13は、対応する音名(ド・ド#)と同じ角度・半径outerRadiusに配置。
// 半音差11(シ)は、ラ#(10)・高いド(12)・高いド#(13)の3点を通る円周上、
// ラ#と高いドの中間角の位置に配置し、ラ#→シ→高いド→高いド#を1本の弧でつなぐ。
export function computeDualRingLayout(semitones, { innerRadius, outerRadius }) {
  const pLaSharp = toCartesian(300, innerRadius); // 半音差10: 角度10*30=300度
  const pHighDo = toCartesian(0, outerRadius); // 半音差12: 対応する音名(ド)と同じ角度0度
  const pHighDoSharp = toCartesian(30, outerRadius); // 半音差13: 対応する音名(ド#)と同じ角度30度
  const { center: bridgeCenter, radius: bridgeRadius } = circumcircle(pLaSharp, pHighDo, pHighDoSharp);
  const angleLaSharp = angleOf(bridgeCenter, pLaSharp);
  const angleHighDo = unwrapTowards(angleOf(bridgeCenter, pHighDo), angleLaSharp);
  const angleHighDoSharp = unwrapTowards(angleOf(bridgeCenter, pHighDoSharp), angleHighDo);
  const angleShi = (angleLaSharp + angleHighDo) / 2;
  const pShi = {
    x: bridgeCenter.x + bridgeRadius * Math.cos(angleShi),
    y: bridgeCenter.y + bridgeRadius * Math.sin(angleShi),
  };

  const positions = {};
  semitones.forEach((semitone) => {
    if (semitone === 11) positions[semitone] = pShi;
    else if (semitone === 12) positions[semitone] = pHighDo;
    else if (semitone === 13) positions[semitone] = pHighDoSharp;
    else positions[semitone] = toCartesian(semitone * 30, innerRadius);
  });

  const bridgeArcPoints = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = angleLaSharp + ((angleHighDoSharp - angleLaSharp) * i) / steps;
    bridgeArcPoints.push({
      x: bridgeCenter.x + bridgeRadius * Math.cos(t),
      y: bridgeCenter.y + bridgeRadius * Math.sin(t),
    });
  }

  return {
    positions,
    // 内側リングは、ド(0度)からラ#(300度)までの区間のみ(シとドの間は消去)。
    innerRingPoints: arcPathPoints(0, 300, innerRadius),
    bridgeArcPoints,
    bridge: { center: bridgeCenter, radius: bridgeRadius, angleLaSharp, angleHighDo, angleHighDoSharp },
  };
}

// dual_ringの内側半径を、外側半径・ボタンの最大サイズ・コンテナの最大サイズから安全に導出する。
// 同じ角度上にある内側・外側のボタン(例: 「ド」と「高いド」)は半径方向に並ぶため、
// ボタンが最大サイズになったときでも重ならないよう、最低限必要な間隔を確保した内側半径を返す。
// これにより、外側半径(通常はコンテナ端=1.0で固定)を動かせば内側半径も連動して決まり、
// 個別に決め打ちした2つの値がずれて重なりを引き起こすことを防ぐ。
export function safeDualRingInnerRadius(outerRadius, { maxButtonSizePx, maxWheelSizePx, marginPx = 6 }) {
  const minGapFraction = (maxButtonSizePx + marginPx) / (maxWheelSizePx / 2);
  return outerRadius - minGapFraction;
}

export function pointsToPathD(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}
