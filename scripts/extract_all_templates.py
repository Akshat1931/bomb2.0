import cv2, numpy as np, json

# 12 symbols list
# 0: OMEGA
# 1: YAT (Tb)
# 2: COPYRIGHT
# 3: PSI (trident)
# 4: STAR_HOLLOW
# 5: STAR_SOLID
# 6: ZHE (spider)
# 7: KOPPA (balloon with tail)
# 8: INV_QUESTION (¿)
# 9: LAMBDA_STROKE (ƛ)
# 10: OT (CQ ligature)
# 11: DOUBLE_CROSS (⩪)

# Let's extract clean patches from the images
img_mod = cv2.imread('C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738700215.png')
# Module has:
# B1: KOPPA
# B2: OMEGA
# B3: DOUBLE_CROSS
# B4: INV_QUESTION

img_ref1 = cv2.imread('C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738276937.png')
# (400x400)
# R0: OMEGA, YAT, YAT, COPYRIGHT, COPYRIGHT
# R1: OMEGA, YAT, LAMBDA_STROKE, OT, COPYRIGHT
# R2: COPYRIGHT, OMEGA, PSI, DOUBLE_CROSS, STAR_SOLID
# R3: OMEGA, LAMBDA_STROKE, COPYRIGHT, COPYRIGHT, YAT
# R4: PSI, COPYRIGHT, STAR_SOLID, PSI, LAMBDA_STROKE

def extract_cell(img, r, c, cell_h=80, cell_w=80, offset_y=0):
    y1, y2 = int(offset_y + r * cell_h), int(offset_y + (r + 1) * cell_h)
    x1, x2 = int(c * cell_w), int((c + 1) * cell_w)
    cell = img[y1:y2, x1:x2]
    gray = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)
    dark = gray < 100
    # border margin
    dark[:3, :] = False; dark[-3:, :] = False
    dark[:, :3] = False; dark[:, -3:] = False
    ys, xs = np.where(dark)
    patch = dark[ys.min():ys.max()+1, xs.min():xs.max()+1]
    bw, bh = patch.shape[1], patch.shape[0]
    scale = min(14.0 / bw, 14.0 / bh)
    nw = max(1, int(round(bw * scale)))
    nh = max(1, int(round(bh * scale)))
    resized = cv2.resize(patch.astype(np.uint8), (nw, nh), interpolation=cv2.INTER_NEAREST)
    ox = (16 - nw) // 2
    oy = (16 - nh) // 2
    canvas = np.zeros((16, 16), dtype=np.uint8)
    canvas[oy:oy+nh, ox:ox+nw] = resized
    
    bm = []
    for y in range(16):
        val = 0
        for x in range(16):
            val = (val << 1) | (1 if canvas[y, x] else 0)
        bm.append(val)
    return bm

templates = {}
# From ref1:
templates['OMEGA'] = extract_cell(img_ref1, 0, 0)
templates['YAT'] = extract_cell(img_ref1, 0, 1)
templates['COPYRIGHT'] = extract_cell(img_ref1, 0, 3)
templates['LAMBDA_STROKE'] = extract_cell(img_ref1, 1, 2)
templates['OT'] = extract_cell(img_ref1, 1, 3)
templates['PSI'] = extract_cell(img_ref1, 2, 2)
templates['DOUBLE_CROSS'] = extract_cell(img_ref1, 2, 3)
templates['STAR_SOLID'] = extract_cell(img_ref1, 2, 4)

# Hollow star from media_1789738280687.png (0, 0)
img_ref2 = cv2.imread('C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738280687.png')
templates['STAR_HOLLOW'] = extract_cell(img_ref2, 0, 0)

# Zhe (spider) from media_1789738288522.png (2, 3)
img_ref3 = cv2.imread('C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738288522.png')
templates['ZHE'] = extract_cell(img_ref3, 2, 3)

# Koppa (balloon) from media_1789738288522.png (1, 3)
templates['KOPPA'] = extract_cell(img_ref3, 1, 3)

# Inv question mark (¿) from media_1789738292301.png (0, 0)
img_ref4 = cv2.imread('C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738292301.png')
templates['INV_QUESTION'] = extract_cell(img_ref4, 0, 0)

print(json.dumps(templates, indent=2))
with open('scripts/symbols_templates.json', 'w') as f:
    json.dump(templates, f, indent=2)
