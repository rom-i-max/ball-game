import cv2
import numpy as np
import json

def extract_sprites(image_path, json_path):
    # Загружаем изображение с сохранением альфа-канала (прозрачности)
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None or img.shape[2] != 4:
        print("Ошибка: изображение должно быть в формате PNG с альфа-каналом!")
        return

    h, w = img.shape[:2]
    alpha_channel = img[:, :, 3]

    # Находим контуры на основе альфа-канала (всё, что не прозрачно)
    # Используем небольшой порог, чтобы отсечь полупрозрачные пиксели сглаживания
    _, thresh = cv2.threshold(alpha_channel, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Фильтруем слишком мелкие шумы и собираем рамки (x, y, w, h)
    raw_boxes = [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) > 100]
    
    if not raw_boxes:
        print("Спрайты не найдены.")
        return

    # Шаг 1: Группируем рамки по строкам (используем координату Y с допуском)
    # Находим среднюю высоту спрайта для адаптивного разделения строк
    avg_height = sum([b[3] for b in raw_boxes]) / len(raw_boxes)
    row_tolerance = avg_height / 2  # Допуск для группировки в одну строку

    rows = []
    for box in raw_boxes:
        y_center = box[1] + box[3] / 2
        # Ищем, подходит ли этот спрайт к уже существующей строке
        placed = False
        for row in rows:
            row_y_center = row[0][1] + row[0][3] / 2
            if abs(y_center - row_y_center) < row_tolerance:
                row.append(box)
                placed = True
                break
        if not placed:
            rows.append([box])

    # Сортируем строки сверху вниз
    rows = sorted(rows, key=lambda r: r[0][1])

    # Маппинг анимаций по строкам (сверху вниз)
    animation_names = [
        "roll",         # 1 строка: просто катиться
        "choke",        # 2 строка: задыхается / падает в воду
        "bored",        # 3 строка: скучает
        "look_around",  # 4 строка: осматривается / повороты в стороны
        "scream",       # 5 строка: кричит при падении вниз
        "fear"          # 6 строка: боится
    ]

    output_json = {
        "meta": {
            "image": image_path,
            "width": w,
            "height": h
        },
        "animations": {}
    }

    # Шаг 2: Сортируем спрайты внутри каждой строки слева направо и записываем в JSON
    for i, row in enumerate(rows):
        # Если строк оказалось больше, чем названий анимаций, даем общее имя
        anim_name = animation_names[i] if i < len(animation_names) else f"custom_row_{i+1}"
        
        # Сортировка слева направо (по координате X)
        sorted_row = sorted(row, key=lambda b: b[0])
        
        frames = []
        for frame_idx, (bx, by, bw, bh) in enumerate(sorted_row):
            frames.append({
                "frame": frame_idx,
                "x": bx,
                "y": by,
                "width": bw,
                "height": bh
            })
            
        output_json["animations"][anim_name] = {
            "total_frames": len(frames),
            "frames": frames
        }

    # Сохраняем результат в файл
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=4, ensure_ascii=False)
        
    print(f"Сборка завершена успешно! Данные сохранены в '{json_path}'.")
    print(f"Записано анимаций: {len(output_json['animations'])}")
    for anim, data in output_json["animations"].items():
        print(f"  - {anim}: {data['total_frames']} кадров")

# Запуск (укажите имя вашего файла)
extract_sprites('player.png', 'player.json')
