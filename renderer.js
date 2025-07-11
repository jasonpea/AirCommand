
//DOM elements
const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const feedback = document.getElementById('feedback');

// mediapipe Hands config 
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

// backend settings
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// convert coordinates to Python-compatible format
function formatLandmarks(landmarks) {
  return landmarks.map(lm => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility
  }));
}

// Process each frame
const processFrame = async () => {
  if (!video.srcObject) return;
  
  await hands.send({ image: video });
  requestAnimationFrame(processFrame);
};

//  results (
hands.onResults((results) => {
    console.log('MediaPipe results:', results); //debug
    if (!results.multiHandLandmarks) {
        feedback.textContent = "No hands detected";
        return;
  }

  // conver to python data structure
  const handsData = results.multiHandLandmarks.map((landmarks, i) => ({
    landmarks: formatLandmarks(landmarks),
    handedness: results.multiHandedness[i].classification[0].label
  }));

  // Send to  backend
  ipcRenderer.send('process-gestures', {
    hands: handsData,
    imageSize: {
      width: video.videoWidth,
      height: video.videoHeight
    }
  });

  // Visual feedback
  feedback.textContent = `Tracking ${handsData.length} hand(s)`;
});

// Initialize camera (matches Python settings)
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
      video.style.transform = 'scaleX(-1)'; // Mirror like Python's cv2.flip()
      feedback.textContent = "Ready - show ✌️ or 👍";
      processFrame(); // Start processing
    };
    
  } catch (err) {
    feedback.textContent = `Camera Error: ${err.message}`;
    console.error(err);
  }
}

// Start the app
initCamera();