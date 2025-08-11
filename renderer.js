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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);


  if (results.multiHandLandmarks) {
    drawLandmarks(results.multiHandLandmarks[0]); // draw first hand
  }

  // prep data for backend
  const handsData = results.multiHandLandmarks?.map((landmarks, i) => ({
    landmarks: formatLandmarks(landmarks),
    handedness: results.multiHandedness[i].classification[0].label,
    gestureHint: getGestureHint(landmarks) // gesture hints
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