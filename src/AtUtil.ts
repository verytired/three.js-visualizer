/*
 Airtight Utilities
 v 0.1.0
 */

class ATUtil {

    constructor() {
    }

    public randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    public randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }


    public lerp(value, min, max) {
        return min + (max - min) * value;
    }


    public norm(value, min, max) {
        return (value - min) / (max - min);
    }

    public map(value, min1, max1, min2, max2) {
        return this.lerp(this.norm(value, min1, max1), min2, max2);
    }

//compile error
//		public shuffle(o:string) {
//				for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
//				return o;
//		}

    public clamp(value, min, max) {
        return Math.max(Math.min(value, max), min);
    }
}