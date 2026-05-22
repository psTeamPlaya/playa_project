import os
import io
import json
import base64
import redis
import numpy as np
from PIL import Image
import onnxruntime as ort
from transformers import AutoTokenizer
import time



# ==========================================
# 1. MODEL INITIALIZATION (Direct paths from disk)
# ==========================================
print("Starting AI Worker: Loading ONNX files directly from disk...", flush=True)

# Direct, hardcoded paths to the files inside the container
visual_model_path = "models/vision_model.onnx"
text_model_path = "models/text_model.onnx"

# The ONNX engine opens them using available providers
providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
visual_session = ort.InferenceSession(visual_model_path, providers=providers)
text_session = ort.InferenceSession(text_model_path, providers=providers)

# Tokenizer also loads locally from the saved directory
tokenizer = AutoTokenizer.from_pretrained("models/tokenizer")

IMAGE_MEAN = np.array([0.48145466, 0.4578275, 0.40821073])
IMAGE_STD = np.array([0.26862954, 0.26130258, 0.27577711])

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

print(f"Connecting to Redis at: {REDIS_HOST}:{REDIS_PORT}", flush=True)
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=False)

print("AI Worker ready. Zero redundant libraries in memory!", flush=True)


# ==========================================
# 2. HELPER FUNCTIONS FOR IMAGE PROCESSING
# ==========================================

def preprocess_image_for_clip(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224), Image.Resampling.BICUBIC)
    img_array = np.array(img).astype(np.float32) / 255.0
    img_array = (img_array - IMAGE_MEAN) / IMAGE_STD
    img_array = np.transpose(img_array, (2, 0, 1))
    img_array = np.expand_dims(img_array, axis=0)
    return img_array.astype(np.float32)

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)


# ==========================================
# 3. MAIN REDIS LISTENING LOOP
# ==========================================
def calculate_embeds(labels):
    text_inputs = tokenizer(labels, padding=True, return_tensors="np")
    text_outputs = text_session.run(None, {
        "input_ids": text_inputs["input_ids"].astype(np.int64)
    })
    text_embeds = text_outputs[0]
    if text_embeds.ndim > 2:
        text_embeds = text_embeds.mean(axis=1)
    return (text_embeds / np.linalg.norm(text_embeds, axis=-1, keepdims=True)).astype(np.float32)



safety_labels = ["appropriate normal photo", "explicit nudity or pornographic content"]
safety_embeds = calculate_embeds(safety_labels)


location_labels = ["beach outside", "computer screen", "indoor room", "street or city"]
location_embeds = calculate_embeds(location_labels)


weather_labels = ["sunny clear weather", "cloudy rainy bad weather", "sunset or sunrise"]
weather_embeds = calculate_embeds(weather_labels)

def calculate_most_probable_label(image_embeds, text_embeds, labels):
        logits = np.dot(image_embeds, text_embeds.T) * 100.0
        probs = softmax(logits)[0]

        best_idx = probs.argmax()
        print(f"[AI Result]: Recognized '{labels[best_idx]}' with {probs[best_idx]*100:.1f}% confidence", flush=True)
        return best_idx, probs

while True:
    try:
        # brpop blocks the thread and waits until an item appears in the queue.
        # This keeps CPU usage at 0% when no photos are being sent.
        queue_name, task_data = redis_client.brpop("beach_photos_queue")
        
        # Decode JSON data
        task = json.loads(task_data.decode("utf-8"))
        
        beach_id = task["beach_id"]
        photo_hash = task["photo_hash"]
        # Decode the image from Base64 format back to bytes

        photo_bytes = redis_client.get(f"photo_storage:{photo_hash}")

        # 3.1. Image Features (ONNX)
        input_image = preprocess_image_for_clip(photo_bytes)
        image_outputs = visual_session.run(None, {"pixel_values": input_image})
        image_embeds = image_outputs[0]
        if image_embeds.ndim > 2:
            image_embeds = image_embeds.mean(axis=1)

        # 3.3. Cosine Similarity
        image_embeds = (image_embeds / np.linalg.norm(image_embeds, axis=-1, keepdims=True)).astype(np.float32)
        
        weather_best_idx, weather_probs = calculate_most_probable_label(image_embeds,weather_embeds, weather_labels)
        location_best_idx, location_probs = calculate_most_probable_label(image_embeds, location_embeds, location_labels)
        safety_best_idx, safety_probs = calculate_most_probable_label(image_embeds, safety_embeds, safety_labels)
        if location_best_idx in [0] and location_probs[location_best_idx] > 0.60 and not (safety_best_idx in [1] and safety_probs[safety_best_idx] > 0.90):

            print("[Success]: Photo verified.", flush=True)
            
            beach_key = f"beach_photos:{beach_id}"
            print(task["timestamp"], flush=True)
            raw_timestamp = task.get("timestamp", int(time.time()))
            photo_base64 = base64.b64encode(photo_bytes).decode("utf-8")
            photo_data = {
                "timestamp": int(raw_timestamp),
                "photo": photo_base64,
                "photo_hash": photo_hash,
                "weather": weather_labels[weather_best_idx],
                "weather_prob": float(weather_probs[weather_best_idx].item())
            }
            print(int(raw_timestamp))
            expire_at = int(time.time()) 
            
            redis_client.zadd(beach_key, {json.dumps(photo_data): expire_at})
            redis_client.expire(beach_key, 10800)
        else:
            print("[Rejected]: Spoofing detected (computer screen/room interior).", flush=True)

    except Exception as e:
        print(f"Error processing task in worker: {e}", flush=True)