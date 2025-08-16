import cv2
import mediapipe as mp
import subprocess #for opening applications
import json
import sys
import time
from landmark_points import *

#setting up cooldown timer
cooldown_time = 3  
last_triggered_time = 0  #initialize last triggered time

# #initializing
# mp_hands = mp.solutions.hands # shortcut to access MediaPipe’s hand tracking module so no need to continuously write mpsolutionshands
# mp_drawing = mp.solutions.drawing_utils 

#making landmark point with x, y, z coordsfrom json
class Landmark:
    def __init__(self, x, y, z, visibility=None): #expects an xyz val and visibility score
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


#Rebuilding the hand with 21 landmark objects
class HandLandmarks:
    def __init__(self, landmarks):
        self.landmark = [Landmark(**lm) for lm in landmarks] #loops over every dictionary in landarks and convert each into a landmark object

#function that takes hand_landmarks object as input (this object contains 21 landmarks on each hand, each point having xyz coordinates)
def is_peace(hand_landmarks, handedness="Right"): 

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
    if handedness == "Right":
        thumb_folded = hand_landmarks.landmark[THUMB_TIP].x > hand_landmarks.landmark[THUMB_MCP].x
    else: #for left hand
        thumb_folded = hand_landmarks.landmark[THUMB_TIP].x < hand_landmarks.landmark[THUMB_MCP].x

    return extended == 2 and ring_folded and pinky_folded and thumb_folded

def is_thumbsup(landmarks, handedness="Right"): #handness parameter not needed here yet, js here for consistency and just in case

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
# cap = cv2.VideoCapture(1) #0= default , 1= continuity 
# if not cap.isOpened():
#     print("Error: Could not open webcam.")



def main():
    global last_triggered_time
    
    try:
        data = json.loads(sys.argv[1])  # get data from CLI argument cuz electron sends arguements
        if "hands" not in data:
            return
            
        current_time = time.time()
        if current_time - last_triggered_time < cooldown_time:
            return
            
        for hand in data["hands"]:
            hand_obj = HandLandmarks(hand["landmarks"])
            handedness = hand.get("handedness", "Right")

            if is_peace(hand_obj, handedness):
                print("PEACE_DETECTED", flush=True)
                subprocess.run(["open", "-a", "Spotify"])
                last_triggered_time = current_time
            elif is_thumbsup(hand_obj, handedness):
                print("THUMBSUP_DETECTED", flush=True)
                subprocess.run(["open", "-a", "Settings"])
                last_triggered_time = current_time
                
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)

if __name__ == "__main__":
    main()

#new main loop for reading json input from frontend
# for line in sys.stdin: #for each line in standard input
#     try:
#         data = json.loads(line)  #Parse incoming json

#         #skip/ignores frame if no hands were detected
#         if "hands" not in data or not data["hands"]:
#             continue

#         current_time = time.time()

#         #loop over all hands
#         for hand_data in data["hands"]: #looping thru each dictionary inside list data[hands]
#             landmarks = hand_data["landmarks"] #accessing landmarks in the hand_data dictionary 
#             handedness = hand_data.get("handedness", "Right")  # optional

#             # Create a dummy object to match your functions' expectations
#             hand_obj = HandLandmarks(landmarks) #creating obj that behaves like medapipe so i dont have to change my isthumbsup & peace logic :)

#             # Check cooldown
#             if current_time - last_triggered_time < cooldown_time:
#                 continue

#             # Run gesture recognition
#             if is_peace(hand_obj):
#                 print("Peace sign detected!", flush=True)
#                 subprocess.run(["open", "-a", "Spotify"])
#                 last_triggered_time = current_time
#             elif is_thumbsup(hand_obj):
#                 print("Thumbs up detected!", flush=True)
#                 subprocess.run(["open", "-a", "Settings"])
#                 last_triggered_time = current_time

#     except json.JSONDecodeError:
#         print("Invalid JSON received.", flush=True) #flush forces message out to terminal immediately
#     except Exception as e:
#         print(f"Error processing gesture: {e}", flush=True) #storing the error as var e


# #with is used with file handling, will close right after execution
# with mp_hands.Hands( #mp.solutions.hands.Hands points at a folder of tools but mp_hands.Hands(...) is a constructor call that calls the class in the module (mp_hands) to create an object
#     max_num_hands=2,
#     min_detection_confidence=0.7, #how confidence model should be in confirming + detecting smth as a hand (0-1 scale)
#     min_tracking_confidence=0.7 
# ) as hands:

#     while cap.isOpened():# cap is your cv2.VideoCapture object, returns true while cam is running
#         success, frame = cap.read() #cap.read()is a function that returns a tuple, success = boolean T||F , frame = actual frame it captures
#         if not success: #if no frame detected (false)
#             break

#         # Read an image, flip it around y-axis for correct handedness output
#         frame = cv2.flip(frame, 1)
#         rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) #openCV in BGR, mediapipie in RGB so need to convert

#         results = hands.process(rgb_frame)

#         if results.multi_hand_landmarks: # if any hands were detected in the frame (if retunrs none, code wont run obvi)
#             for hand_landmarks in results.multi_hand_landmarks: #Loops thru each hand that MediaPipe detected
#                 mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS) #draws the 21 landmarks and lines between them on the webcam frame.
#                 current_time = time.time()
#                 if current_time - last_triggered_time > cooldown_time:
#                     if is_peace(hand_landmarks):
#                         print("Peace sign detected!")
#                         subprocess.run(["open", "-a", "Spotify"])
#                         last_triggered_time = current_time
#                     elif is_thumbsup(hand_landmarks):
#                         print("Thumbs up detected!")
#                         subprocess.run(["open", "-a", "Settings"])
#                         last_triggered_time = current_time
#                     # elif is_openPalm(hand_landmarks):
#                     #     print("Open palm detected!")
#                     #     subprocess.run(["open", "-a", "Discord"])
#                     #     last_triggered_time = current_time
#         cv2.imshow('Hand Tracking', frame) #opens a window called hand tracking

#         if cv2.waitKey(1) & 0xFF == ord('q'): #pressing q exist the loop
#             break

# cap.release() #cam is closed, windows created by opencv closed
# cv2.destroyAllWindows()
