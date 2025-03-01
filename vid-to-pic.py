import cv2 # need to install OpenCV $brew uninstall opencv
import os

# Config
INPUT_FOLDER = "input" # Folder containing video file
OUTPUT_FOLDER = "captured_frames" # Folder to save captured frames
VIDEO_FILE = "input_video.mp4"  # Replace with your filename
INTERVAL_SECONDS = 30 # Capture interval

# Path setup
input_path = os.path.join(INPUT_FOLDER, VIDEO_FILE)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Open video file
cap = cv2.VideoCapture(input_path)
if not cap.isOpened():
    print(f"Error: Could not open video file {input_path}")
    exit()

# Get video properties
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
interval_frames = int(fps * INTERVAL_SECONDS)

print(f"Processing: {VIDEO_FILE}")
print(f"FPS: {fps:.1f} | Duration: {total_frames/fps:.1f}s | Capture interval: {INTERVAL_SECONDS}s")

frame_count = 0
save_count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Capture frame every 30 seconds of video time
    if frame_count % interval_frames == 0:
        timestamp = int(frame_count / fps)
        filename = f"frame_{timestamp:04d}s.jpg"
        cv2.imwrite(os.path.join(OUTPUT_FOLDER, filename), frame)
        print(f"Saved: {filename}")
        save_count += 1

    # Display progress (press Q to quit early)
    cv2.imshow('Video Processing - PRESS Q TO QUIT', frame)
    if cv2.waitKey(1) == ord('q'):
        break

    frame_count += 1

# Cleanup
cap.release()
cv2.destroyAllWindows()
print(f"\nFinished: Processed {frame_count} frames | Saved {save_count} images")