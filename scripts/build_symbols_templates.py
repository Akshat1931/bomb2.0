import cv2, numpy as np, os

# Let's inspect the 4-button module image
mod_path = 'C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738700215.png'
mod_img = cv2.imread(mod_path)
print('Module image shape:', mod_img.shape)

# Let's test connected components on reference images
ref_paths = [
    'C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738344733.png',
    'C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738388906.png',
    'C:/Users/Lenovo/.gemini/antigravity-ide/brain/b4df58b4-a3b7-4d1f-b870-ba986236efe9/.user_uploaded/media_1789738318329.png',
]

for p in ref_paths:
    img = cv2.imread(p)
    print(p.split('/')[-1], 'shape:', img.shape)
