import cv2
import mediapipe as mp
import subprocess #for opening applications
from landmark_points import *
import time
import numpy as np
import sys
import json

print("Python script started!")  #debug
data = json.loads(sys.argv[1])
print(f"Received {len(data['hands'])} hands")   #debug

#initializing
mp_hands = mp.solutions.hands # shortcut to access MediaPipe’s hand tracking module so no need to continuously write mpsolutionshands
mp_drawing = mp.solutions.drawing_utils 

#function that takes hand_landmarks object as input (this object contains 21 landmarks on each hand, each point having xyz coordinates)
def is_peace(hand_landmarks): 

    #check if index and middle finger are extended (idk why i made a counter for this idk why i had to be diff)
    extended = 0
    if hand_landmarks.landmark[INDEX_TIP].y < hand_landmarks.landmark[INDEX_PIP].y:
        extended += 1
    if hand_landmarks.landmark[MIDDLE_TIP].y < hand_landmarks.landmark[MIDDLE_PIP].y:
        extended += 1

    #Make sure other fingers are down
    ring_folded = hand_landmarks.landmark[RING_TIP].y > hand_landmarks.landmark[RING_PIP].y
    pinky_folded = hand_landmarks.landmark[PINKY_TIP].y > hand_landmarks.landmark[PINKY_PIP].y

    #thumb differs based on hand
    for hand_landmarks, hand_handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
        label = hand_handedness.classification[0].label  # 'Left' or 'Right'
        if label == "Right":
            thumb_folded = hand_landmarks.landmark[THUMB_TIP].x > hand_landmarks.landmark[THUMB_MCP].x
        else: #for left hand
            thumb_folded = hand_landmarks.landmark[THUMB_TIP].x < hand_landmarks.landmark[THUMB_MCP].x

    return extended == 2 and ring_folded and pinky_folded and thumb_folded
def is_thumbsup(landmarks):
    # Rule 1: Thumb tip is above the thumb IP (i.e., extended upwards in y-axis if hand is upright)
    thumb_ext = landmarks.landmark[THUMB_TIP].y < landmarks.landmark[THUMB_IP].y < landmarks.landmark[THUMB_MCP].y

    # Rule 2: All other finger tips are below their MCP (i.e., folded)
    index_folded = landmarks.landmark[INDEX_TIP].y > landmarks.landmark[INDEX_MCP].y
    middle_folded = landmarks.landmark[MIDDLE_TIP].y > landmarks.landmark[MIDDLE_MCP].y
    ring_folded = landmarks.landmark[RING_TIP].y > landmarks.landmark[RING_MCP].y
    pinky_folded = landmarks.landmark[PINKY_TIP].y > landmarks.landmark[PINKY_MCP].y

    if thumb_ext and index_folded and middle_folded and ring_folded and pinky_folded:
        return True
    return False


# Set up webcam and hand tracking
#cap is an object apart of the cv2videocapture class 
cap = cv2.VideoCapture(1) #0= default , 1= continuity 
if not cap.isOpened():
    print("Error: Could not open webcam.")

#setting up cooldown timer
cooldown_time = 3  
last_triggered_time = 0  #initialize last triggered time


#with is used with file handling, will close right after execution
with mp_hands.Hands( #mp.solutions.hands.Hands points at a folder of tools but mp_hands.Hands(...) is a constructor call that calls the class in the module (mp_hands) to create an object
    max_num_hands=2,
    min_detection_confidence=0.7, #how confidence model should be in confirming + detecting smth as a hand (0-1 scale)
    min_tracking_confidence=0.7 
) as hands:

    while cap.isOpened():# cap is your cv2.VideoCapture object, returns true while cam is running
        success, frame = cap.read() #cap.read()is a function that returns a tuple, success = boolean T||F , frame = actual frame it captures
        if not success: #if no frame detected (false)
            break

        # Read an image, flip it around y-axis for correct handedness output
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) #openCV in BGR, mediapipie in RGB so need to convert

        results = hands.process(rgb_frame)

        if results.multi_hand_landmarks: # if any hands were detected in the frame (if retunrs none, code wont run obvi)
            for hand_landmarks in results.multi_hand_landmarks: #Loops thru each hand that MediaPipe detected
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS) #draws the 21 landmarks and lines between them on the webcam frame.
                current_time = time.time()
                if current_time - last_triggered_time > cooldown_time:
                    if is_peace(hand_landmarks):
                        print("Peace sign detected!")
                        subprocess.run(["open", "-a", "Spotify"])
                        last_triggered_time = current_time
                    elif is_thumbsup(hand_landmarks):
                        print("Thumbs up detected!")
                        subprocess.run(["open", "-a", "Settings"])
                        last_triggered_time = current_time
                    # elif is_openPalm(hand_landmarks):
                    #     print("Open palm detected!")
                    #     subprocess.run(["open", "-a", "Discord"])
                    #     last_triggered_time = current_time
        cv2.imshow('Hand Tracking', frame) #opens a window called hand tracking

        if cv2.waitKey(1) & 0xFF == ord('q'): #pressing q exist the loop
            break

cap.release() #cam is closed, windows created by opencv closed
cv2.destroyAllWindows()
