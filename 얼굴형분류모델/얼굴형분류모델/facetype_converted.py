# -*- coding: utf-8 -*-
# ------------------------------------------------------------
# Image classification of Human Face Shapes Using CNN Xception
#  - Training set을 무작위 6:4로 분할하여 학습/검증 진행 (validation_split=0.4)
#  - Testing set은 최종 성능 평가용으로만 사용
#  - 모델: Xception(include_top=False) + GAP + Dense(512→128→Softmax)
#  - Epoch: 20, EarlyStopping/Checkpoint 적용
#  - 지표: 정확도/손실 곡선, 혼동행렬, 분류리포트, 클래스별 개수, 중복 파일 체크
# ------------------------------------------------------------

import os
import random
import numpy as np
import matplotlib.pyplot as plt
from PIL import ImageFile

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator, img_to_array, load_img
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.layers import Dropout
from tensorflow.keras.applications import Xception
from tensorflow.keras.applications.xception import preprocess_input

from sklearn.metrics import confusion_matrix, classification_report

# GUI 없는 환경에서도 저장 가능하도록 (필요 시 주석)
# import matplotlib
# matplotlib.use("Agg")

# ---------------------------
# 0) 안정적 재현성 설정
# ---------------------------
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

# 큰 이미지 로드 시 잘린 이미지도 허용
ImageFile.LOAD_TRUNCATED_IMAGES = True

# ---------------------------
# 1) 경로 설정 (네 기존 경로 유지)
# ---------------------------
train_dir = r"C:\Users\yuji2\FaceShape Dataset\training_set"
test_dir  = r"C:\Users\yuji2\FaceShape Dataset\testing_set"

# ---------------------------
# 2) 클래스 밸런싱 유틸 (네 코드 유지/보완)
#    - Square 클래스 다운샘플링
#    - 각 클래스 3000장 맞춤 증강
# ---------------------------
def reduce_square_images(directory, target_count=3000):
    """Square 클래스 이미지 수를 target_count로 맞추기(과잉분 제거)"""
    if not os.path.isdir(directory):
        print(f"[WARN] 디렉토리 없음: {directory}")
        return
    all_images = [f for f in os.listdir(directory)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    excess = len(all_images) - target_count
    if excess <= 0:
        print(f"✅ Square: {len(all_images)}장 (삭제 불필요)")
        return
    print(f"🗑️ Square: {len(all_images)}장 → {target_count}장으로 맞추기 (삭제 {excess}장)")
    delete_images = random.sample(all_images, excess)
    for fname in delete_images:
        try:
            os.remove(os.path.join(directory, fname))
        except Exception as e:
            print(f"[WARN] 삭제 실패: {fname} ({e})")
    now_cnt = len([f for f in os.listdir(directory)
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    print("✅ 삭제 완료! 현재 이미지 수:", now_cnt)

# 파일 생성형 증강기 (학습 전용 데이터 수 늘리기)
augmentor = ImageDataGenerator(
    rotation_range=20,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest'
)

def augment_images(src_dir, target_count):
    """src_dir 내 이미지 수가 target_count에 미달하면, 파일 생성형 증강으로 채움"""
    if not os.path.isdir(src_dir):
        print(f"[WARN] 디렉토리 없음: {src_dir}")
        return
    imgs = [f for f in os.listdir(src_dir)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    image_count = len(imgs)
    needed = target_count - image_count
    if needed <= 0:
        print(f"✅ {os.path.basename(src_dir)}: {image_count}장 (증강 불필요)")
        return

    print(f"➕ {os.path.basename(src_dir)}: {image_count}→{target_count} (증강 {needed}장 생성)")
    generated = 0
    for img_name in imgs:
        if not img_name.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue
        img_path = os.path.join(src_dir, img_name)
        try:
            img = load_img(img_path)
        except Exception as e:
            print(f"[WARN] 이미지 로드 실패: {img_path} ({e})")
            continue

        x = img_to_array(img)
        x = x.reshape((1,) + x.shape)

        for _ in augmentor.flow(
            x, batch_size=1, save_to_dir=src_dir, save_prefix='aug', save_format='jpg'
        ):
            generated += 1
            if generated >= needed:
                break
        if generated >= needed:
            break
    print(f"✅ {generated}장 생성 완료")

# ---------------------------
# 3) 클래스 밸런싱 실행 (필요 시 주석 처리 가능)
# ---------------------------
reduce_square_images(os.path.join(train_dir, "Square"), target_count=3000)
for cls in ["Heart", "Oblong", "Oval", "Round"]:
    augment_images(os.path.join(train_dir, cls), 3000)

# ---------------------------
# 4) 데이터 로딩
#    - 훈련 세트를 6:4로 무작위 분할 (validation_split=0.4)
#    - 테스트셋은 최종 평가에만 사용
# ---------------------------
target_size = (224, 224)
batch_size = 32

# Xception 전처리(preprocess_input)를 사용
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.15,
    horizontal_flip=True,
    validation_split=0.4   # 40%를 검증으로 사용 → 학습:검증 = 6:4
)
# 검증도 같은 제너레이터로 subset='validation'
val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    validation_split=0.4
)
# 테스트는 전처리만 적용
test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=target_size,
    batch_size=batch_size,
    class_mode='categorical',
    subset='training',      # 60%
    shuffle=True,
    seed=SEED
)

print("class_indices:", train_generator.class_indices)

val_generator = val_datagen.flow_from_directory(
    train_dir,
    target_size=target_size,
    batch_size=batch_size,
    class_mode='categorical',
    subset='validation',    # 40%
    shuffle=False,
    seed=SEED
)
test_generator = test_datagen.flow_from_directory(
    test_dir,
    target_size=target_size,
    batch_size=batch_size,
    class_mode='categorical',
    shuffle=False
)

print("class_indices:", train_generator.class_indices)

# ---------------------------
# 5) 모델 구성: Xception 전이학습 + FC 3층
# ---------------------------
base = Xception(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
base.trainable = False  # 1단계: feature extractor로 동결

inputs = layers.Input(shape=(224, 224, 3))
x = base(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dense(512, activation='relu')(x)
x = Dropout(0.4)(x)
x = layers.Dense(128, activation='relu')(x)
x = Dropout(0.3)(x)
outputs = layers.Dense(train_generator.num_classes, activation='softmax')(x)
model = models.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

early_stop = EarlyStopping(monitor='val_loss', patience=6, restore_best_weights=True)
ckpt = ModelCheckpoint("xception_faceshape_best.h5",
                       monitor="val_accuracy", save_best_only=True, verbose=1)

# ---------------------------
# 6) 학습 (Epoch=20)
# ---------------------------
history = model.fit(
    train_generator,
    epochs=20,
    validation_data=val_generator,
    callbacks=[early_stop, ckpt]
)

# ---------------------------
# 7) 학습 곡선 저장/표시
# ---------------------------
plt.figure(figsize=(12,5))
plt.subplot(1,2,1)
plt.plot(history.history['accuracy']); plt.plot(history.history['val_accuracy'])
plt.title('Training vs Validation Accuracy'); plt.xlabel('Epoch'); plt.ylabel('Accuracy')
plt.legend(['Train','Val']); plt.grid(True)

plt.subplot(1,2,2)
plt.plot(history.history['loss']); plt.plot(history.history['val_loss'])
plt.title('Training vs Validation Loss'); plt.xlabel('Epoch'); plt.ylabel('Loss')
plt.legend(['Train','Val']); plt.grid(True)

plt.tight_layout()
# 파일로도 저장
os.makedirs("runs_plots", exist_ok=True)
plt.savefig(os.path.join("runs_plots", "accuracy_loss_curves.png"),
            dpi=150, bbox_inches="tight")
plt.show()

# ---------------------------
# 8) 테스트 세트 평가 (혼동행렬/리포트)
# ---------------------------
print("\n[Evaluate on TEST set]")
test_loss, test_acc = model.evaluate(test_generator, verbose=0)
print(f"✅ Test accuracy: {test_acc:.4f}")

test_generator.reset()
pred = model.predict(test_generator)
y_pred = pred.argmax(axis=1)
y_true = test_generator.classes
idx_to_class = {v: k for k, v in test_generator.class_indices.items()}
target_names = [idx_to_class[i] for i in range(len(idx_to_class))]

print("\n=== Classification Report (TEST) ===")
report = classification_report(y_true, y_pred, target_names=target_names)
print(report)

cm = confusion_matrix(y_true, y_pred)
print("Confusion Matrix:\n", cm)

# 혼동행렬 시각화 (seaborn 있으면 이미지 저장)
try:
    import seaborn as sns
    plt.figure(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt="d",
                xticklabels=target_names, yticklabels=target_names)
    plt.title("Confusion Matrix (TEST)")
    plt.xlabel("Predicted"); plt.ylabel("True")
    plt.tight_layout()
    plt.savefig(os.path.join("runs_plots", "confusion_matrix_test.png"),
                dpi=150, bbox_inches="tight")
    plt.show()
except Exception as e:
    print("[WARN] seaborn 미설치 또는 시각화 실패:", e)

# 리포트/혼동행렬 저장
os.makedirs("runs_logs", exist_ok=True)
with open(os.path.join("runs_logs", "classification_report_test.txt"),
          "w", encoding="utf-8") as f:
    f.write(report)
np.savetxt(os.path.join("runs_logs", "confusion_matrix_test.csv"),
           cm, fmt="%d", delimiter=",")

# ---------------------------
# 9) 클래스별 이미지 수 (학습 폴더)
# ---------------------------
print("\n📊 학습용 얼굴형별 이미지 수:")
for class_name in sorted(os.listdir(train_dir)):
    class_path = os.path.join(train_dir, class_name)
    if os.path.isdir(class_path):
        count = len([f for f in os.listdir(class_path)
                     if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        print(f"🟢 {class_name}: {count}장")

# ---------------------------
# 10) Train/Test 간 파일명 중복 체크
# ---------------------------
def find_common_images(train_dir, test_dir):
    train_images = set()
    test_images = set()

    for class_folder in os.listdir(train_dir):
        class_path = os.path.join(train_dir, class_folder)
        if not os.path.isdir(class_path):
            continue
        for img in os.listdir(class_path):
            if img.lower().endswith(('.jpg', '.jpeg', '.png')):
                train_images.add(img)

    for class_folder in os.listdir(test_dir):
        class_path = os.path.join(test_dir, class_folder)
        if not os.path.isdir(class_path):
            continue
        for img in os.listdir(class_path):
            if img.lower().endswith(('.jpg', '.jpeg', '.png')):
                test_images.add(img)

    common = train_images & test_images
    print(f"\n🔎 중복된 이미지 파일 수: {len(common)}개")
    if common:
        print("📂 중복 파일 예시 (최대 10개):")
        for i, name in enumerate(sorted(common)):
            print(f"  - {name}")
            if i >= 9:
                break
    else:
        print("✅ 훈련/테스트 데이터셋 간 파일명 중복 없음")

find_common_images(train_dir, test_dir)

# ---------------------------
# 11) 모델 저장
# ---------------------------
model.save("model_face_shape_xception.keras")
print("\n✅ Saved: model_face_shape_xception.keras, xception_faceshape_best.h5, plots/logs in runs_*")
