import cv2
import mediapipe as mp

#initializing
mp_hands = mp.solutions.hands # shortcut to access MediaPipe’s hand tracking module so no need to continuously write mpsolutionshands
mp_drawing = mp.solutions.drawing_utils 

# Set up webcam and hand tracking
#cap is an object apart of the cv2videocapture class in python
cap = cv2.VideoCapture(1) #0= default , 1= continuity 

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

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        cv2.imshow('Hand Tracking', frame) #opens a window called hand tracking


        if cv2.waitKey(1) & 0xFF == ord('q'): #pressing q exist the loop
            break

cap.release() #cam is closed, windows created by opencv closed
cv2.destroyAllWindows()
