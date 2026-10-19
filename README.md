# FEED THE BEAT

一款用摄像头和双手游玩的“呼叫与回应”节奏游戏。节拍先数 1-2-3-4，把一段节奏放给你听；下一小节轮到你用手把它复现出来，命中的音符会被底部的 Beat Mouth 吃掉。
前期实现用codex效果不好，后续换到claude继续修改了，claude大人
UIUX assignment week6

## ▶ 直接游玩

**https://albedovo.github.io/RhythmSnake/**

- 推荐用桌面版 Chrome 或 Safari，允许摄像头权限，最好戴耳机。
- 视频只在本地浏览器里处理，不录制、不上传。
- 没有摄像头时，在 INPUT 里切换到 “Trackpad · mouse · touch + keys”，用鼠标和键盘玩。
- 第一次玩建议先点 **Tutorial · 2 min**，每个动作单独教一遍。

## 玩法

每个乐句有两小节：**CALL**（听）和 **ECHO**（你来复现）。音符上的数字就是它所在的拍子，跟着数拍语音打。从 FLOW 档开始，画面左半边的音符用左手打，右半边用右手打。

| 动作 | 摄像头 | 键盘 / 鼠标 |
|---|---|---|
| GRAB ● | 张开手，踩拍握拳 | Z 或点击 |
| REACH ◎ | 踩拍把手移进圈里 | 鼠标移进圈里 |
| SQUEEZE ■ | 握拳，到 OPEN 那一拍张开 | 按住 Z，到 OPEN 那一拍松开 |
| CLAP ◆ | 双手拍一下，位置不限 | 空格 |
| FLIP ▲ | 手掌朝箭头方向横扫 | ← / → |
| SWEEP 〰 | 沿路径移动，每拍经过一个点 | 鼠标沿路径移动 |

键盘模式下，X 是“另一只手”的 GRAB，用于一只手 SQUEEZE 时另一只手还要 GRAB 的段落。

**记分**：Perfect 100 / Good 50 / Miss 0，再乘以 GROOVE 倍率（10 连击 ×2，25 连击 ×3，50 连击 ×4）。评级 S ≥95%、A ≥88%、B ≥75%、C ≥60%。结束时还有能量、且准确率 ≥60% 就算通关。结算页会根据你的平均时机偏差给出延迟校准建议。

**难度**：INTRO → FLOW → GROOVE → SYNC → BOUNCE → OVERDRIVE → POLYRHYTHM，共 7 档。

## 本地运行

```bash
python3 -m http.server 8137
```

然后打开 http://localhost:8137 。摄像头只能在 localhost 或 HTTPS 下使用。

- `?debug`：在每只手旁边显示握合度、伸展比和弯曲角，用来调握拳阈值。
- 在控制台修改 `FTB.HAND`（握拳阈值）可以立即生效；拍手阈值在 `hand-input.mjs` 的 `CLAP` 里。

## 文件

| 文件 | 内容 |
|---|---|
| `game.js` | 主循环、判定、输入、界面 |
| `rhythm-chart.mjs` | 谱面格式、7 档谱面、谱面检查（lint） |
| `rhythm-core.mjs` | 手势类型、难度、判定窗口、手部特征 |
| `scoring.mjs` | 分数、GROOVE、评级、校准建议 |
| `tutorial.mjs` | 新手引导课程 |
| `audio.mjs` | 伴奏、数拍、音效 |
| `rhythm-renderer.mjs` | 画布绘制 |
| `hand-input.mjs` | 手部跟踪、拍手识别 |
| `camera-controller.mjs`, `hand-worker*.js` | 摄像头和 MediaPipe 推理 |
| `DESIGN.md` | 设计说明 |

手部识别使用 [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)（Apache 2.0），文件放在 `vendor/` 下。
