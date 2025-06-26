import cv2
import mediapipe as mp
import subprocess #for opening applications

#initializing
mp_hands = mp.solutions.hands # shortcut to access MediaPipe’s hand tracking module so no need to continuously write mpsolutionshands
mp_drawing = mp.solutions.drawing_utils 

#function that takes hand_landmarks object as input (this object contains 21 landmarks on each hand, each point having xyz coordinates)
def is_peace(hand_landmarks): 
    #tip, dip, pip, msc or smth (top to ridge between fingers)
    tip_ids = [8, 12]  # Index and middle fingers
    pip_ids = [6, 10]

    #check if index and middle finger are extended
    extended = 0
    for tip, pip in zip(tip_ids, pip_ids): #creates tuples where the first element of each input iterable is paired together, then the second elements are paired, and so on
        if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[pip].y: #if a finger's tip y coord < pip then extended++
            extended += 1 

    # Make sure other fingers are down
    ring = hand_landmarks.landmark[16].y > hand_landmarks.landmark[14].y #check if ring finger tip is lower thn dip
    pinky = hand_landmarks.landmark[20].y > hand_landmarks.landmark[18].y #check if pinky tip lower than dip
    for hand_landmarks, hand_handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
        label = hand_handedness.classification[0].label  # 'Left' or 'Right'
        if label == "Right":
            thumb = hand_landmarks.landmark[4].x > hand_landmarks.landmark[2].x
        else: #for left hand
            thumb = hand_landmarks.landmark[4].x < hand_landmarks.landmark[2].x

    return extended == 2 and ring and pinky and thumb #return true if both middle + index extended and if ring and pinky return true

def is_thumbsup(hand_landmarks):
    thumb_tip = hand_landmarks.landmark[4]
    thumb_base = hand_landmarks.landmark[2]
    thumb_extended = thumb_tip.y < thumb_base.y and abs(thumb_tip.x - thumb_base.x) > 0.1

    #doing smth diff here cuz i dont want to redundantly type out the same thing every time but tbf in hindsight typing it out like in line 22 wouldve been faster
    finger_tips = [8, 12, 16, 20]
    fingers_bent = True
    for tip_id in finger_tips:
        pip_id = tip_id - 2
        if hand_landmarks.landmark[tip_id].y > hand_landmarks.landmark[pip_id].y:
            fingers_bent = False
            break  #Exit it any extended fingers are detected

    return thumb_extended and fingers_bent
# Set up webcam and hand tracking
#cap is an object apart of the cv2videocapture class 
cap = cv2.VideoCapture(0) #0= default , 1= continuity 

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
                if is_peace(hand_landmarks):
                    print("Peace sign detected!")
                    subprocess.run(["open", "-a", "Spotify"])
                elif is_thumbsup:
                    print("Thumbs up detected!")
                    subprocess.run(["open", "-a", "Settings"])

        cv2.imshow('Hand Tracking', frame) #opens a window called hand tracking


        if cv2.waitKey(1) & 0xFF == ord('q'): #pressing q exist the loop
            break

cap.release() #cam is closed, windows created by opencv closed
cv2.destroyAllWindows()
