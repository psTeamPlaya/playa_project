import io
import json
import base64
import redis
import numpy as np
from PIL import Image
import onnxruntime as ort
from transformers import AutoTokenizer

# ==========================================
# 1. INICJALIZACJA MODELI (Czyste ścieżki z dysku)
# ==========================================
print("Uruchamianie Workera AI: Ładowanie plików ONNX prosto z dysku...")

# Podajesz bezpośrednie, sztywne ścieżki do plików w kontenerze
visual_model_path = "models/vision_model.onnx"
text_model_path = "models/text_model.onnx"

# Silnik ONNX po prostu je otwiera
visual_session = ort.InferenceSession(visual_model_path, providers=['CPUExecutionProvider'])
text_session = ort.InferenceSession(text_model_path, providers=['CPUExecutionProvider'])

# Tokenizer też ładuje się lokalnie z zapisanego folderu
tokenizer = AutoTokenizer.from_pretrained("models/tokenizer")

IMAGE_MEAN = np.array([0.48145466, 0.4578275, 0.40821073])
IMAGE_STD = np.array([0.26862954, 0.26130258, 0.27577711])

redis_client = redis.Redis(host="localhost", port=6379, db=0)

print("Worker AI gotowy. Zero zbędnych bibliotek w pamięci!")

# ==========================================
# DALSZA CZĘŚĆ PĘTLI WHILE TRUE POZOSTAJE BEZ ZMIAN...
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
# 3. GŁÓWNA PĘTLA NASŁUCHUJĄCA REDISA
# ==========================================
while True:
    try:
        # brpop blokuje wątek i czeka aż w kolejce pojawi się element. 
        # Dzięki temu skrypt zużywa 0% procesora, kiedy nikt nie wysyła zdjęć.
        queue_name, task_data = redis_client.brpop("beach_photos_queue")
        
        # Dekodowanie JSON-a
        task = json.loads(task_data.decode("utf-8"))
        
        user_lat = task["user_lat"]
        user_lon = task["user_lon"]
        beach_lat = task["beach_lat"]
        beach_lon = task["beach_lon"]
        
        # Dekodowanie obrazu z formatu Base64 z powrotem do bajtów
        photo_bytes = base64.b64decode(task["photo_base64"])


        # 2. Image Features (ONNX)
        input_image = preprocess_image_for_clip(photo_bytes)
        image_outputs = visual_session.run(None, {"pixel_values": input_image})
        image_embeds = image_outputs[0]
        if image_embeds.ndim > 2:
            image_embeds = image_embeds.mean(axis=1)

        # 3. Text Features (ONNX)
        labels = [
            "beautiful beach",
            "beach with bad weather",
            "computer screen or monitor",  
            "room indoors"                  
        ]
        
        text_inputs = tokenizer(labels, padding=True, return_tensors="np")
        text_outputs = text_session.run(None, {
            "input_ids": text_inputs["input_ids"].astype(np.int64)
        })
        text_embeds = text_outputs[0]
        if text_embeds.ndim > 2:
            text_embeds = text_embeds.mean(axis=1)

        # 4. Kosinusowe podobieństwo
        image_embeds = (image_embeds / np.linalg.norm(image_embeds, axis=-1, keepdims=True)).astype(np.float32)
        text_embeds = (text_embeds / np.linalg.norm(text_embeds, axis=-1, keepdims=True)).astype(np.float32)

        logits = np.dot(image_embeds, text_embeds.T) * 100.0
        probs = softmax(logits)[0]

        best_idx = probs.argmax()
        print(f"[AI Wynik]: Rozpoznano '{labels[best_idx]}' z pewnością {probs[best_idx]*100:.1f}%")

        if best_idx in [0, 1] and probs[best_idx] > 0.60:
            print("[Sukces]: Zdjęcie pomyślnie zweryfikowało obecność na plaży.")
            # TUTAJ: Wykonaj kod zapisu do swojej bazy danych SQL/NoSQL, żeby zmienić status fotki
        else:
            print("[Odrzucono]: Wykryto oszustwo (ekran komputera/wnętrze pokoju).")

    except Exception as e:
        print(f"Błąd przetwarzania zadania w workerze: {e}")