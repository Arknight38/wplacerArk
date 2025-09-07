/**
 * Canvas utility functions
 */
import { colors } from '../features/color-ordering.js';

export const drawTemplate = (template, canvas) => {
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, template.width, template.height);

    const imageData = new ImageData(template.width, template.height);

    for (let x = 0; x < template.width; x++) {
        for (let y = 0; y < template.height; y++) {
            const color = template.data[x][y];
            if (color === 0) continue;

            const i = (y * template.width + x) * 4;

            if (color === -1) {
                // Sentinel value for special handling
                imageData.data[i] = 158;
                imageData.data[i + 1] = 189;
                imageData.data[i + 2] = 255;
                imageData.data[i + 3] = 255;
                continue;
            }

            const key = Object.keys(colors).find((k) => colors[k].id === color);
            if (!key) {
                // Unknown color id, skip to avoid crash
                continue;
            }

            const [r, g, b] = key.split(',').map(Number);
            imageData.data[i] = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
            imageData.data[i + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

export const processImageFile = (file, callback) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.src = e.target.result;
        image.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const { matrix, ink, uniqueColors } = nearestImageDecoder(imageData, canvas.width, canvas.height);

            const filteredColors = Array.from(uniqueColors).filter(id => id !== 0 && id !== -1);

            const template = {
                width: canvas.width,
                height: canvas.height,
                ink,
                data: matrix,
                uniqueColors: filteredColors
            };

            canvas.remove();
            callback(template);
        };
    };
    reader.readAsDataURL(file);
};

const nearestImageDecoder = (imageData, width, height) => {
    const d = imageData.data;
    const matrix = Array.from({ length: width }, () => Array(height).fill(0));
    const uniqueColors = new Set();
    let ink = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const a = d[i + 3];
            if (a === 255) {
                const r = d[i];
                const g = d[i + 1];
                const b = d[i + 2];
                const rgb = `${r},${g},${b}`;
                
                if (rgb === '158,189,255') {
                    matrix[x][y] = -1;
                } else {
                    const colorObj = colors[rgb] || colors[closestColor(rgb)];
                    if (colorObj) {
                        matrix[x][y] = colorObj.id;
                        uniqueColors.add(colorObj.id);
                    } else {
                        matrix[x][y] = 0; // fallback if not found
                    }
                }
                ink++;
            } else {
                matrix[x][y] = 0;
            }
        }
    }
    return { matrix, ink, uniqueColors };
};

const closestColor = (color) => {
    const [tr, tg, tb] = color.split(',').map(Number);
    return Object.keys(colors).reduce((closestKey, currentKey) => {
        const [cr, cg, cb] = currentKey.split(',').map(Number);
        const [clR, clG, clB] = closestKey.split(',').map(Number);
        const currentDistance = Math.pow(tr - cr, 2) + Math.pow(tg - cg, 2) + Math.pow(tb - cb, 2);
        const closestDistance = Math.pow(tr - clR, 2) + Math.pow(tg - clG, 2) + Math.pow(tb - clB, 2);
        return currentDistance < closestDistance ? currentKey : closestKey;
    });
};

export const fetchCanvas = async (txVal, tyVal, pxVal, pyVal, width, height, previewBorder) => {
    const TILE_SIZE = 1000;
    const radius = Math.max(0, parseInt(previewBorder.value, 10) || 0);

    const startX = txVal * TILE_SIZE + pxVal - radius;
    const startY = tyVal * TILE_SIZE + pyVal - radius;
    const displayWidth = width + radius * 2;
    const displayHeight = height + radius * 2;
    const endX = startX + displayWidth;
    const endY = startY + displayHeight;

    const startTileX = Math.floor(startX / TILE_SIZE);
    const startTileY = Math.floor(startY / TILE_SIZE);
    const endTileX = Math.floor((endX - 1) / TILE_SIZE);
    const endTileY = Math.floor((endY - 1) / TILE_SIZE);

    const previewCanvas = document.getElementById('previewCanvas');
    const templateCanvas = document.getElementById('templateCanvas');
    
    previewCanvas.width = displayWidth;
    previewCanvas.height = displayHeight;
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    for (let txi = startTileX; txi <= endTileX; txi++) {
        for (let tyi = startTileY; tyi <= endTileY; tyi++) {
            try {
                const response = await axios.get('/canvas', { params: { tx: txi, ty: tyi } });
                const img = new Image();
                img.src = response.data.image;
                await img.decode();
                const sx = txi === startTileX ? startX - txi * TILE_SIZE : 0;
                const sy = tyi === startTileY ? startY - tyi * TILE_SIZE : 0;
                const ex = txi === endTileX ? endX - txi * TILE_SIZE : TILE_SIZE;
                const ey = tyi === endTileY ? endY - tyi * TILE_SIZE : TILE_SIZE;
                const sw = ex - sx;
                const sh = ey - sy;
                const dx = txi * TILE_SIZE + sx - startX;
                const dy = tyi * TILE_SIZE + sy - startY;
                ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
            } catch (error) {
                console.error('Failed to fetch canvas tile:', error);
                return;
            }
        }
    }

    const baseImage = ctx.getImageData(0, 0, displayWidth, displayHeight);
    const templateCtx = templateCanvas.getContext('2d');
    const templateImage = templateCtx.getImageData(0, 0, width, height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(templateCanvas, radius, radius);
    ctx.globalAlpha = 1;
    
    const b = baseImage.data;
    const t = templateImage.data;
    for (let i = 0; i < t.length; i += 4) {
        if (t[i + 3] === 0) continue;

        const templateIdx = i / 4;
        const templateX = templateIdx % width;
        const templateY = Math.floor(templateIdx / width);
        const canvasX = templateX + radius;
        const canvasY = templateY + radius;
        const canvasIdx = (canvasY * displayWidth + canvasX) * 4;

        if (b[canvasIdx + 3] === 0) continue;

        ctx.fillStyle = 'rgba(255,0,0,0.8)';
        ctx.fillRect(canvasX, canvasY, 1, 1);
    }
    
    previewCanvas.style.display = 'block';
};
