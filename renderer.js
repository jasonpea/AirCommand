const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const feedback = document.getElementById('feedback');

// setuphands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// landmarks for backend
function formatLandmarks(landmarks) {
  return landmarks.map(lm => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility
  }));
}

// draw landmarks
function drawResults(results) {
  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw mirrored video
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  if (!results.multiHandLandmarks) return;

  results.multiHandLandmarks.forEach((landmarks, i) => {
    // draw connections
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      ctx.beginPath();
      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
      ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
      ctx.stroke();
    }

    // draw red circles
    ctx.fillStyle = '#FF0000';
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// restul callback
hands.onResults((results) => {
  drawResults(results);

  const handsData = results.multiHandLandmarks?.map((landmarks, i) => ({
    landmarks: formatLandmarks(landmarks),
    handedness: results.multiHandedness[i].classification[0].label
  })) || [];

  ipcRenderer.send('process-gestures', {
    hands: handsData,
    imageSize: { width: canvas.width, height: canvas.height }
  });

  feedback.textContent = handsData.length
    ? `Tracking ${handsData.length} hand(s)`
    : "No hands detected";
});

// init webcam
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    });

    video.srcObject = stream;
    await video.play();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    runLoop(); // start loop
    feedback.textContent = "Ready - show ✌️ or 👍";
  } catch (err) {
    feedback.textContent = `Camera Error: ${err.message}`;
    console.error(err);
  }
}

// loop frames
const runLoop = async () => {
  await hands.send({ image: video });
  requestAnimationFrame(runLoop);
};

// hardcoded
// const HAND_CONNECTIONS = [
//   [0, 1], [1, 2], [2, 3], [3, 4],
//   [0, 5], [5, 6], [6, 7], [7, 8],
//   [5, 9], [9, 10], [10, 11], [11, 12],
//   [9, 13], [13, 14], [14, 15], [15, 16],
//   [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
// ];

// start
initCamera();
