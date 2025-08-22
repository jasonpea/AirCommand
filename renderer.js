const { ipcRenderer } = require('electron');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const feedback = document.getElementById('feedback');

// Mediapipe hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// hand connections
const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],         // thumb
    [0,5],[5,6],[6,7],[7,8],         // ifinger
    [0,9],[9,10],[10,11],[11,12],    // mfinger
    [0,13],[13,14],[14,15],[15,16],  // rfinger
    [0,17],[17,18],[18,19],[19,20]   // Ppfinger
];

// draw landmarks on canvas
function drawLandmarks(landmarks) {
    if (!landmarks) return;
    
    // draw connections
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
    });

    // draw points
    ctx.fillStyle = '#FF0000';
    landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// process each frame
async function processFrame() {
    if (!video.srcObject) return;
    
    try {
        await hands.send({ image: video });
        requestAnimationFrame(processFrame);
    } catch (error) {
        console.error('MediaPipe error:', error);
    }
}

// handle MediaPipe results
hands.onResults((results) => {
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiHandLandmarks) {
        // draw landmarks for all hands
        results.multiHandLandmarks.forEach(landmarks => {
            drawLandmarks(landmarks);
        });

        // send data to Python backend
        const handsData = results.multiHandLandmarks.map((landmarks, i) => ({
            landmarks: landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z })),
            handedness: results.multiHandedness[i].classification[0].label
        }));

        // send to Python via Electron IPC
        ipcRenderer.send('process-gestures', {
            hands: handsData,
            imageSize: { width: canvas.width, height: canvas.height }
        });
        
        feedback.textContent = `Tracking ${handsData.length} hand(s)`;
    } else {
        feedback.textContent = "No hands detected";
    }
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
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            feedback.textContent = "Ready - show ✌️ or 👍";
            processFrame();
        };
        
    } catch (error) {
        feedback.textContent = `Camera Error: ${error.message}`;
        console.error('Camera initialization failed:', error);
    }
}

// start the app
initCamera();