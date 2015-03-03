/*
 Airtight Utilities
 v 0.1.0
 */
var ATUtil = (function () {
    function ATUtil() {
    }
    ATUtil.prototype.randomRange = function (min, max) {
        return min + Math.random() * (max - min);
    };
    ATUtil.prototype.randomInt = function (min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    };
    ATUtil.prototype.lerp = function (value, min, max) {
        return min + (max - min) * value;
    };
    ATUtil.prototype.norm = function (value, min, max) {
        return (value - min) / (max - min);
    };
    ATUtil.prototype.map = function (value, min1, max1, min2, max2) {
        return this.lerp(this.norm(value, min1, max1), min2, max2);
    };
    //compile error
    //		public shuffle(o:string) {
    //				for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    //				return o;
    //		}
    ATUtil.prototype.clamp = function (value, min, max) {
        return Math.max(Math.min(value, max), min);
    };
    return ATUtil;
})();
