import subprocess
import sys

# Test webcam access
result = subprocess.run([sys.executable, "gesture_detector.py", '{"hands":[]}'], 
                       capture_output=True, text=True)
print("Return code:", result.returncode)
print("Output:", result.stdout)
print("Errors:", result.stderr)