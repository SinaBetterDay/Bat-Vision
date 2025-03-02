import cv2
import os
import math

def split_image(image_path, output_dir, tile_size=1024, overlap=0.0001):
    """Split an image into overlapping tiles"""
    os.makedirs(output_dir, exist_ok=True)
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"Skipping invalid image: {os.path.basename(image_path)}")
        return 0

    h, w = img.shape[:2]
    overlap_px = int(tile_size * overlap)
    
    # Calculate grid positions
    x_steps = math.ceil((w - overlap_px) / (tile_size - overlap_px))
    y_steps = math.ceil((h - overlap_px) / (tile_size - overlap_px))
    
    count = 0
    for y in range(y_steps):
        for x in range(x_steps):
            x1 = x * (tile_size - overlap_px)
            y1 = y * (tile_size - overlap_px)
            x2 = min(x1 + tile_size, w)
            y2 = min(y1 + tile_size, h)
            
            # Skip small edge fragments
            if (x2 - x1) < tile_size//4 or (y2 - y1) < tile_size//4:
                continue
                
            tile = img[y1:y2, x1:x2]
            cv2.imwrite(f"{output_dir}/{os.path.basename(image_path)[:-4]}_y{y}_x{x}.jpg", tile)
            count += 1
            
    return count

if __name__ == "__main__":
    # Configuration
    INPUT_DIR = "lotimages"
    OUTPUT_ROOT = "split_tiles"
    TILE_SIZE = 512    # Pixels (square tiles)
    OVERLAP = 0.15     # 15% overlap between tiles

    # Process all images in lotimages
    total_tiles = 0
    for img_name in os.listdir(INPUT_DIR):
        if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            input_path = os.path.join(INPUT_DIR, img_name)
            output_dir = os.path.join(OUTPUT_ROOT, os.path.splitext(img_name)[0])
            
            tiles_created = split_image(input_path, output_dir, TILE_SIZE, OVERLAP)
            total_tiles += tiles_created
            print(f"{img_name} → {tiles_created} tiles")

    print(f"\nDone! Created {total_tiles} total tiles in '{OUTPUT_ROOT}'")
