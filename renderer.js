const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const feedback = document.getElementById('feedback');

// init MediaPipe hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

// config hand tracking
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// convert landmarks to serializable format
function formatLandmarks(landmarks) {
  return landmarks.map(lm => ({
    x: lm.x,
    y: lm.y, 
    z: lm.z,
    visibility: lm.visibility
  }));
}

// draw landmarks on canvas (js for visualization)
function drawLandmarks(landmarks) {
  if (!landmarks) return;
  
  // Keep existing landmark drawing code
  ctx.fillStyle = '#FF0000';
  landmarks.forEach(lm => {
    const x = lm.x * canvas.width;
    const y = lm.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// process each frame
const processFrame = async () => {
  if (!video.srcObject) return;
  
  // Draw video frame first
  ctx.save();
  ctx.scale(-1, 1); // Mirror effect
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();
  
  // Then process with MediaPipe
  await hands.send({ image: video });
  requestAnimationFrame(processFrame);
};

// handle mp results
hands.onResults((results) => {
  if (results.multiHandLandmarks) {
    drawLandmarks(results.multiHandLandmarks[0]); // Draw first hand
  }

  // prep data for backend
  const handsData = results.multiHandLandmarks?.map((landmarks, i) => ({
    landmarks: formatLandmarks(landmarks),
    handedness: results.multiHandedness[i].classification[0].label,
    gestureHint: getGestureHint(landmarks) // Optional: Add simple frontend gesture hint
  })) || [];

  // send to backend via IPC
  ipcRenderer.send('process-gestures', {
    hands: handsData,
    timestamp: Date.now(),
    imageSize: {
      width: video.videoWidth,
      height: video.videoHeight
    }
  });

  // js for debug and user exp(UI feedback)
  feedback.textContent = handsData.length 
    ? `Tracking ${handsData.length} hand(s)` 
    : "No hands detected";
});

// init camera
async function initCamera() {
  try {
    // 1. Get stream with more flexible constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    });

    // 2. Explicit video setup
    video.srcObject = stream;
    video.play().catch(e => console.error("Video play failed:", e));

    // 3. Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });

    feedback.textContent = "Ready - show ✌️ or 👍";
    processFrame(); // Start processing
  } catch (err) {
    feedback.textContent = `Camera Error: ${err.name}`;
    console.error("Camera init error:", err);
  }
}

// start the app
initCamera();