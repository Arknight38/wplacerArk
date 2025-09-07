export class Template {
    constructor({
        id,
        name,
        width,
        height,
        data,
        shareCode,
        coords,
        userIds = [],
        canBuyCharges = false,
        canBuyMaxCharges = false,
        antiGriefMode = false,
        eraseMode = false,
        outlineMode = false,
        skipPaintedPixels = false,
        enableAutostart = false
    }) {
        this.id = id;
        this.name = name;
        this.width = width;
        this.height = height;
        this.data = data;
        this.shareCode = shareCode;
        this.coords = coords;
        this.userIds = userIds;
        this.canBuyCharges = canBuyCharges;
        this.canBuyMaxCharges = canBuyMaxCharges;
        this.antiGriefMode = antiGriefMode;
        this.eraseMode = eraseMode;
        this.outlineMode = outlineMode;
        this.skipPaintedPixels = skipPaintedPixels;
        this.enableAutostart = enableAutostart;
    }

    static fromJSON(data) {
        return new Template({
            id: data.id,
            name: data.name,
            width: data.template?.width,
            height: data.template?.height,
            data: data.template?.data,
            shareCode: data.template?.shareCode,
            coords: data.coords,
            userIds: data.userIds || [],
            canBuyCharges: data.canBuyCharges || false,
            canBuyMaxCharges: data.canBuyMaxCharges || false,
            antiGriefMode: data.antiGriefMode || false,
            eraseMode: data.eraseMode || false,
            outlineMode: data.outlineMode || false,
            skipPaintedPixels: data.skipPaintedPixels || false,
            enableAutostart: data.enableAutostart || false
        });
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            coords: this.coords,
            userIds: this.userIds,
            canBuyCharges: this.canBuyCharges,
            canBuyMaxCharges: this.canBuyMaxCharges,
            antiGriefMode: this.antiGriefMode,
            eraseMode: this.eraseMode,
            outlineMode: this.outlineMode,
            skipPaintedPixels: this.skipPaintedPixels,
            enableAutostart: this.enableAutostart,
            template: {
                width: this.width,
                height: this.height,
                data: this.data,
                shareCode: this.shareCode
            }
        };
    }

    getTotalPixels() {
        if (!this.data) return 0;
        return this.data.flat().filter(pixel => pixel > 0).length;
    }

    getUniqueColors() {
        if (!this.data) return [];
        const uniqueColors = new Set();
        this.data.flat().forEach(pixel => {
            if (pixel > 0) uniqueColors.add(pixel);
        });
        return Array.from(uniqueColors).sort((a, b) => a - b);
    }

    getBoundingBox() {
        if (!this.coords || this.coords.length !== 4) return null;
        const [tx, ty, px, py] = this.coords;
        return {
            startX: tx,
            startY: ty,
            startPx: px,
            startPy: py,
            endX: tx + Math.floor((px + this.width) / 1000),
            endY: ty + Math.floor((py + this.height) / 1000),
            endPx: px + this.width,
            endPy: py + this.height
        };
    }

    validate() {
        const errors = [];
        
        if (!this.id) errors.push('Template ID is required');
        if (!this.name) errors.push('Template name is required');
        if (!this.width || this.width <= 0) errors.push('Valid width is required');
        if (!this.height || this.height <= 0) errors.push('Valid height is required');
        if (!Array.isArray(this.data)) errors.push('Template data must be an array');
        if (!Array.isArray(this.coords) || this.coords.length !== 4) {
            errors.push('Coords must be an array of 4 numbers [tx, ty, px, py]');
        }
        if (!Array.isArray(this.userIds)) errors.push('UserIds must be an array');
        
        // Validate data dimensions
        if (Array.isArray(this.data)) {
            if (this.data.length !== this.width) {
                errors.push(`Data width (${this.data.length}) doesn't match template width (${this.width})`);
            }
            if (this.data[0] && this.data[0].length !== this.height) {
                errors.push(`Data height (${this.data[0].length}) doesn't match template height (${this.height})`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    addUser(userId) {
        if (!this.userIds.includes(userId)) {
            this.userIds.push(userId);
        }
    }

    removeUser(userId) {
        const index = this.userIds.indexOf(userId);
        if (index > -1) {
            this.userIds.splice(index, 1);
        }
    }

    hasUser(userId) {
        return this.userIds.includes(userId);
    }

    isEmpty() {
        return this.userIds.length === 0;
    }

    clone() {
        return new Template({
            id: this.id,
            name: this.name,
            width: this.width,
            height: this.height,
            data: this.data ? this.data.map(row => [...row]) : null,
            shareCode: this.shareCode,
            coords: [...this.coords],
            userIds: [...this.userIds],
            canBuyCharges: this.canBuyCharges,
            canBuyMaxCharges: this.canBuyMaxCharges,
            antiGriefMode: this.antiGriefMode,
            eraseMode: this.eraseMode,
            outlineMode: this.outlineMode,
            skipPaintedPixels: this.skipPaintedPixels,
            enableAutostart: this.enableAutostart
        });
    }
}