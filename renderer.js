const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!landmarks) return;
  
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
  
  // Submit frame to MediaPipe
  await hands.send({ image: video });
  requestAnimationFrame(processFrame);
};

// handle mp results
hands.onResults((results) => {
  // Optional: Draw landmarks on frontend canvas
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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 1280,
        height: 720,
        facingMode: 'user'
      }
    });
    
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      // mirror video feed
      video.style.transform = 'scaleX(-1)';
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      feedback.textContent = "Ready - show ✌️ or 👍";
      processFrame(); // start processing loop
    };
    
  } catch (err) {
    feedback.textContent = `Camera Error: ${err.message}`;
    console.error(err);
  }
}

// start the app
initCamera();