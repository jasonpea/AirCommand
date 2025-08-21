const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const feedback = document.getElementById('feedback');

// Debug flags
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log('[DEBUG]', ...args);
}

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
  
  ctx.save();
  ctx.scale(-1, 1); // apply mirror only for landmarks
  ctx.translate(-canvas.width, 0); // adjust for mirror transform
  
  ctx.fillStyle = '#FF0000';
  landmarks.forEach(lm => {
    const x = lm.x * canvas.width;
    const y = lm.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });
  
  ctx.restore();
}

// drawing
function drawVideoFrame() {
  if (!video.srcObject) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  requestAnimationFrame(drawVideoFrame);
}

// processFrame to only handle MediaPipe
const processFrame = async () => {
  if (!video.srcObject) return;
  
  // process with MediaPipe (using current canvas content)
  await hands.send({ image: canvas }); // send canvas instead of video
  
  // now draw the mirrored display
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();
};

// handle mp results
hands.onResults((results) => {
  // 1. clear canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 2. draw the mirrored video feed
  ctx.save();
  ctx.scale(-1, 1); // Mirror effect
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  drawLandmarks(results.multiHandLandmarks[0]); 

  // 3. draw landmarks if hands are detected 
  if (results.multiHandLandmarks) {
    // draw all hands
    results.multiHandLandmarks.forEach(landmarks => {
      // draw connections first 
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 3;
      mp.HAND_CONNECTIONS.forEach(connection => {
        const [startIdx, endIdx] = connection;
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      });

      // draw landmarks (in red)
      ctx.fillStyle = '#FF0000';
      landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width, 
          landmark.y * canvas.height, 
          5, 0, 2 * Math.PI
        );
        ctx.fill();
      });
    });

    // Send data to backend 
    const handsData = results.multiHandLandmarks.map((landmarks, i) => ({
      landmarks: formatLandmarks(landmarks),
      handedness: results.multiHandedness[i].classification[0].label
    }));

    // Draw landmarks (add this after ctx.restore())
  ctx.fillStyle = '#FF0000'; // Red dots
  results.multiHandLandmarks[0].forEach(landmark => {
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI); // 5px radius circles
    ctx.fill();
  });
    
    ipcRenderer.send('process-gestures', {
      hands: handsData,
      imageSize: { width: canvas.width, height: canvas.height }
    });
  }

  // Update UI feedback
  feedback.textContent = results.multiHandLandmarks?.length 
    ? `Tracking ${results.multiHandLandmarks.length} hand(s)` 
    : "No hands detected";
});

// init camera
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

   
    drawVideoFrame(); // continous video background
    setInterval(processFrame, 100); // process at 10fps
    
    feedback.textContent = "Ready - show ✌️ or 👍";
  } catch (err) {
    feedback.textContent = `Camera Error: ${err.name}`;
    console.error("Camera init error:", err);
  }
}
// start the app
initCamera();