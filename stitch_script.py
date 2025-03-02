import cv2
import numpy as np
import os
import re

def stitch_images(input_root, output_dir, tile_size=512, overlap=0.15):
    """
    Stitch processed tiles from Output_split_tiles/[image_name]/ back into full images
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Process each original image's tile folder
    for image_folder in os.listdir(input_root):
        tile_dir = os.path.join(input_root, image_folder)
        if not os.path.isdir(tile_dir):
            continue
            
        print(f"🔄 Processing {image_folder}...")
        tile_files = [f for f in os.listdir(tile_dir) 
                     if f.endswith(('.jpg', '.png', '.jpeg'))]
        
        # Parse grid positions from filenames
        positions = []
        for f in tile_files:
            match = re.search(r'_y(\d+)_x(\d+)\.', f)
            if match:
                y = int(match.group(1))
                x = int(match.group(2))
                positions.append((y, x, os.path.join(tile_dir, f)))
        
        if not positions:
            print(f"⚠️ No valid tiles found in {image_folder}")
            continue
            
        # Calculate original image dimensions
        max_y = max(p[0] for p in positions)
        max_x = max(p[1] for p in positions)
        overlap_px = int(tile_size * overlap)
        
        # Calculate canvas size
        canvas_width = max_x * (tile_size - overlap_px) + tile_size
        canvas_height = max_y * (tile_size - overlap_px) + tile_size
        
        # Create blending canvas
        canvas = np.zeros((canvas_height, canvas_width, 3), dtype=np.float32)
        weight = np.zeros((canvas_height, canvas_width), dtype=np.float32)
        
        # Create blending window
        blend_window = np.ones((tile_size, tile_size), dtype=np.float32)
        edge = int(tile_size * overlap)
        blend_window[:edge, :] *= np.linspace(0, 1, edge)[:, None]
        blend_window[-edge:, :] *= np.linspace(1, 0, edge)[:, None]
        blend_window[:, :edge] *= np.linspace(0, 1, edge)[None, :]
        blend_window[:, -edge:] *= np.linspace(1, 0, edge)[None, :]
        
        # Assemble tiles with blending
        for y, x, tile_path in positions:
            tile = cv2.imread(tile_path).astype(np.float32) / 255.0
            if tile is None:
                print(f"⚠️ Could not read tile: {tile_path}")
                continue
            
            # Resize tile if necessary
            if tile.shape[0] != tile_size or tile.shape[1] != tile_size:
                tile = cv2.resize(tile, (tile_size, tile_size))
                
            y_pos = y * (tile_size - overlap_px)
            x_pos = x * (tile_size - overlap_px)
            
            # Apply blending
            canvas[y_pos:y_pos+tile_size, x_pos:x_pos+tile_size] += tile * blend_window[..., None]
            weight[y_pos:y_pos+tile_size, x_pos:x_pos+tile_size] += blend_window
        
        # Normalize and save
        canvas /= np.maximum(weight[..., None], 1e-7)
        canvas = np.clip(canvas * 255, 0, 255).astype(np.uint8)
        
        output_path = os.path.join(output_dir, f"reconstructed_{image_folder}.jpg")
        cv2.imwrite(output_path, canvas)
        print(f"✅ Saved reconstruction: {output_path}")

if __name__ == "__main__":
    # Configuration (MUST match splitting parameters)
    INPUT_ROOT = "Output_split_tiles"  # Parent folder of individual image folders
    OUTPUT_DIR = "Reconstructed_Images"
    TILE_SIZE = 512       # Must match splitting script
    OVERLAP = 0.15        # Must match splitting script
    
    stitch_images(
        input_root=INPUT_ROOT,
        output_dir=OUTPUT_DIR,
        tile_size=TILE_SIZE,
        overlap=OVERLAP
    )