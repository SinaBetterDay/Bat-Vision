import cv2
from ultralytics import YOLO
import easyocr

class LicensePlateCounter:
    def __init__(self):
        self.vehicle_model = YOLO('yolov8n.pt')
        self.plate_model = YOLO('best.pt')
        
        self.ocr_reader = easyocr.Reader(
            ['en'],
            download_enabled=False,  
            model_storage_directory='~/.EasyOCR/model/',
            detector=True,
            recognizer=True
        )
        
        self.seen_plates = set()
        self.count = 0

    def process_video(self, video_path):
        cap = cv2.VideoCapture(video_path)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            vehicles = self.vehicle_model(frame)[0]
            for box in vehicles.boxes.data.tolist():
                x1, y1, x2, y2, conf, cls_id = box
                if int(cls_id) in [2, 3, 5, 7]:  
                    self.process_roi(frame[int(y1):int(y2), int(x1):int(x2)])
            
            cv2.putText(frame, f"Unique Plates: {self.count}", (20, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow('License Plate Counter', frame)
            
            if cv2.waitKey(1) == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

    def process_roi(self, roi):
        # Detect license plates
        plates = self.plate_model(roi)[0]
        for plate in plates.boxes.data.tolist():
            x1, y1, x2, y2, conf, _ = plate
            if conf > 0.7:  # Confidence threshold
                plate_crop = roi[int(y1):int(y2), int(x1):int(x2)]
                self.ocr_plate(plate_crop)

    def ocr_plate(self, plate_img):
        gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        
        results = self.ocr_reader.readtext(thresh)
        if results:
            plate_text = results[0][1].upper().replace(" ", "")
            if plate_text not in self.seen_plates:
                self.seen_plates.add(plate_text)
                self.count += 1
                print(f"New plate detected: {plate_text} (Total: {self.count})")

if __name__ == "__main__":
    counter = LicensePlateCounter()
    counter.process_video('input_video.mp4')
    print(f"Final count: {counter.count} unique plates")