import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSpiralPositions,
  computeDualRingLayout,
  safeDualRingInnerRadius,
  pointsToPathD,
} from "../src/shared/circular-answer-layout.js";

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test("computeSpiralPositions: 半音差0はbaseRadiusの真上(角度0度)", () => {
  const positions = computeSpiralPositions([0], { baseRadius: 0.6, step: 0.03 });
  assert.ok(Math.abs(positions[0].x - 50) < 1e-9);
  assert.ok(Math.abs(positions[0].y - (50 - 0.6 * 50)) < 1e-9);
});

test("computeSpiralPositions: 半音差が増えるほど中心からの距離が単調に増える", () => {
  const semitones = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const positions = computeSpiralPositions(semitones, { baseRadius: 0.6, step: 0.03 });
  const center = { x: 50, y: 50 };
  const distances = semitones.map((s) => distance(center, positions[s]));
  for (let i = 1; i < distances.length; i++) {
    assert.ok(distances[i] > distances[i - 1], `半音差${i}の距離は半音差${i - 1}より大きいはず`);
  }
});

test("computeSpiralPositions: 半音差12(角度360度=0度)は半音差0と同じ角度上(x座標が中心と一致)", () => {
  const positions = computeSpiralPositions([0, 12], { baseRadius: 0.6, step: 0.03 });
  assert.ok(Math.abs(positions[0].x - positions[12].x) < 1e-9, "同じ音名は同じ角度(x座標)に並ぶはず");
});

test("computeDualRingLayout: 半音差0〜10は角度=半音差*30度・半径innerRadiusの円上", () => {
  const { positions } = computeDualRingLayout([0, 1, 2, 5, 10], { innerRadius: 0.42, outerRadius: 0.7 });
  const center = { x: 50, y: 50 };
  [0, 1, 2, 5, 10].forEach((semitone) => {
    assert.ok(Math.abs(distance(center, positions[semitone]) - 0.42 * 50) < 1e-9);
  });
});

function compassAngleDeg(center, p) {
  // atan2は数学的な角度(右方向=0、反時計回り)を返すため、
  // 「真上=0度、時計回り」のコンパス角に変換する(toCartesianの逆変換)。
  const deg = (Math.atan2(p.x - center.x, -(p.y - center.y)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

test("computeDualRingLayout: 高いド(12)・高いド#(13)は、対応する音名と同じ角度・半径outerRadius", () => {
  const { positions } = computeDualRingLayout([0, 1, 12, 13], { innerRadius: 0.42, outerRadius: 0.7 });
  const center = { x: 50, y: 50 };
  assert.ok(Math.abs(compassAngleDeg(center, positions[12]) - compassAngleDeg(center, positions[0])) < 1e-9, "高いドはドと同じ角度のはず");
  assert.ok(Math.abs(compassAngleDeg(center, positions[13]) - compassAngleDeg(center, positions[1])) < 1e-9, "高いド#はド#と同じ角度のはず");
  assert.ok(Math.abs(distance(center, positions[12]) - 0.7 * 50) < 1e-9);
  assert.ok(Math.abs(distance(center, positions[13]) - 0.7 * 50) < 1e-9);
});

test("computeDualRingLayout: シ(11)・ラ#(10)・高いド(12)・高いド#(13)は同一円周上にある", () => {
  const semitones = [10, 11, 12, 13];
  const { positions } = computeDualRingLayout(semitones, { innerRadius: 0.42, outerRadius: 0.7 });
  // 3点(ラ#・高いド・高いド#)から外接円を求め、シもその円周上にあることを確認する。
  const p10 = positions[10], p12 = positions[12], p13 = positions[13];
  const ax = p10.x, ay = p10.y, bx = p12.x, by = p12.y, cx = p13.x, cy = p13.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const center = { x: ux, y: uy };
  const radius = distance(center, p10);
  assert.ok(Math.abs(distance(center, positions[11]) - radius) < 1e-6, "シは3点を通る円の円周上にあるはず");
});

test("computeDualRingLayout: シは、ラ#と高いドの間(内接する側)に位置する", () => {
  const { positions } = computeDualRingLayout([10, 11, 12, 13], { innerRadius: 0.42, outerRadius: 0.7 });
  const distShiToLaSharp = distance(positions[11], positions[10]);
  const distShiToHighDo = distance(positions[11], positions[12]);
  const distLaSharpToHighDo = distance(positions[10], positions[12]);
  // シが「ラ#-高いド」を結ぶ弧の内側(中間)にあるなら、三角不等式がほぼ等号に近くなる
  // (一直線に近い)ことはないはずだが、少なくともどちら片方の距離より大きくならない。
  assert.ok(distShiToLaSharp < distLaSharpToHighDo);
  assert.ok(distShiToHighDo < distLaSharpToHighDo);
});

test("computeDualRingLayout: 内側リングの弧はド(0度)からラ#(300度)までの区間のみ(12・13が両方ある場合)", () => {
  const { innerRingPoints } = computeDualRingLayout([0, 12, 13], { innerRadius: 0.42, outerRadius: 0.7 });
  const first = innerRingPoints[0];
  const last = innerRingPoints[innerRingPoints.length - 1];
  // 0度(真上)の点: x=50, y=50-radius
  assert.ok(Math.abs(first.x - 50) < 1e-6);
  assert.ok(Math.abs(first.y - (50 - 0.42 * 50)) < 1e-6);
  // 300度の点: x = 50 + r*sin(300deg), y = 50 - r*cos(300deg)
  const r = 0.42 * 50;
  const expectedLastX = 50 + r * Math.sin((300 * Math.PI) / 180);
  const expectedLastY = 50 - r * Math.cos((300 * Math.PI) / 180);
  assert.ok(Math.abs(last.x - expectedLastX) < 1e-6);
  assert.ok(Math.abs(last.y - expectedLastY) < 1e-6);
});

test("computeDualRingLayout: 半音差12・13が無い場合(完全版など)は、橋渡しをせず単純な単一リングになる", () => {
  const semitones = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 完全版の回答ボタン相当(12個)
  const { positions, bridgeArcPoints, bridge } = computeDualRingLayout(semitones, { innerRadius: 0.42, outerRadius: 0.7 });
  const center = { x: 50, y: 50 };
  semitones.forEach((semitone) => {
    assert.ok(Math.abs(distance(center, positions[semitone]) - 0.42 * 50) < 1e-9, `半音差${semitone}はinnerRadius上にあるはず`);
    assert.ok(Math.abs(compassAngleDeg(center, positions[semitone]) - (semitone * 30)) < 1e-6);
  });
  assert.deepEqual(bridgeArcPoints, []);
  assert.equal(bridge, null);
});

test("computeDualRingLayout: 半音差12・13が無い場合、内側リングの弧は0度〜360度の全周になる", () => {
  const { innerRingPoints } = computeDualRingLayout([0, 1, 2], { innerRadius: 0.42, outerRadius: 0.7 });
  const first = innerRingPoints[0];
  const last = innerRingPoints[innerRingPoints.length - 1];
  assert.ok(Math.abs(first.x - 50) < 1e-6);
  assert.ok(Math.abs(first.y - (50 - 0.42 * 50)) < 1e-6);
  // 360度は0度と同じ位置(全周が閉じている)
  assert.ok(Math.abs(last.x - first.x) < 1e-6);
  assert.ok(Math.abs(last.y - first.y) < 1e-6);
});

test("computeDualRingLayout: 半音差12だけ・13だけしか無い場合も橋渡しはしない(両方揃って初めて橋渡しする)", () => {
  const onlyTwelve = computeDualRingLayout([0, 12], { innerRadius: 0.42, outerRadius: 0.7 });
  assert.equal(onlyTwelve.bridge, null);
  const onlyThirteen = computeDualRingLayout([0, 13], { innerRadius: 0.42, outerRadius: 0.7 });
  assert.equal(onlyThirteen.bridge, null);
});

test("safeDualRingInnerRadius: 最大ボタンサイズ・最大コンテナサイズから、重ならない内側半径を導出する", () => {
  // outerRadius=1.0、最大ボタン76px、最大コンテナ430px、余白6pxの場合、
  // 必要な最小間隔(フラクション)は(76+6)/(430/2)=0.381...なので、内側半径は約0.619。
  const innerRadius = safeDualRingInnerRadius(1.0, { maxButtonSizePx: 76, maxWheelSizePx: 430, marginPx: 6 });
  assert.ok(Math.abs(innerRadius - (1.0 - 82 / 215)) < 1e-9);
});

test("safeDualRingInnerRadius: 実際にこの値で内側・外側のペア(同じ角度)が重ならないことを確認する", () => {
  const outerRadius = 1.0;
  const maxButtonSizePx = 76;
  const maxWheelSizePx = 430;
  const innerRadius = safeDualRingInnerRadius(outerRadius, { maxButtonSizePx, maxWheelSizePx });
  const { positions } = computeDualRingLayout([0, 12, 13], { innerRadius, outerRadius });
  const gapFraction = outerRadius - innerRadius; // ド(0)と高いド(12)は同じ角度なので、半径の差がそのまま間隔になる
  const gapPx = gapFraction * (maxWheelSizePx / 2);
  assert.ok(gapPx >= maxButtonSizePx, `間隔${gapPx}pxはボタンサイズ${maxButtonSizePx}px以上のはず`);
});

test("pointsToPathD: 座標配列をSVGのd属性文字列(M...L...)に変換する", () => {
  const d = pointsToPathD([{ x: 1, y: 2 }, { x: 3.456, y: 7.891 }]);
  assert.equal(d, "M1.00,2.00 L3.46,7.89");
});
