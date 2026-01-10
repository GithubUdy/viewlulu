import tensorflow as tf

H5_PATH = "xception_faceshape_best.h5"

# 1) 모델 로드
model = tf.keras.models.load_model(H5_PATH)

# 2) (권장) 추론 모드로 빌드 한번 해주기 (경고 줄이고 안정화)
#    Xception 입력이 224x224x3 이라고 했으니 이대로
model(tf.zeros([1, 224, 224, 3], dtype=tf.float32), training=False)

# -------------------------
# A) Float32 TFLite (기본)
# -------------------------
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

with open("faceshape_float32.tflite", "wb") as f:
    f.write(tflite_model)

print("✅ saved: faceshape_float32.tflite")

# -----------------------------------------
# B) Dynamic Range Quantization (추천 1순위)
#    - 용량 많이 줄어듦
#    - 정확도 거의 유지
#    - Android에서 매우 무난
# -----------------------------------------
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_quant = converter.convert()

with open("faceshape_dynamic.tflite", "wb") as f:
    f.write(tflite_quant)

print("✅ saved: faceshape_dynamic.tflite")
