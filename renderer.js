//logic for the popup(webcam access blah blah)

// DOM Elements
const video = document.getElementById('webcam');
const feedback = document.getElementById('feedback');

// Initialize MediaPipe hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

// Webcam setup
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    feedback.textContent = "Camera ready! Show gestures";
  } catch (err) {
    feedback.textContent = `Error: ${err.message}`;
  }
}

// Start everything
initCamera();

