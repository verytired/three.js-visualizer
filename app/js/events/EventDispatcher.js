var events;
(function (events) {
    var EventDispatcher = (function () {
        function EventDispatcher() {
            this.listeners = {};
        }
        EventDispatcher.prototype.dispatchEvent = function (event) {
            var e;
            var type;
            if (event instanceof Event) {
                type = event.type;
                e = event;
            }
            else {
                type = event;
                e = new Event(type);
            }
            if (this.listeners[type] != null) {
                e.currentTarget = this;
                for (var i = 0; i < this.listeners[type].length; i++) {
                    var listener = this.listeners[type][i];
                    try {
                        listener.handler(e);
                    }
                    catch (error) {
                        if (window.console) {
                            console.error(error.stack);
                        }
                    }
                }
            }
        };
        EventDispatcher.prototype.addEventListener = function (type, callback, priolity) {
            if (priolity === void 0) { priolity = 0; }
            if (this.listeners[type] == null) {
                this.listeners[type] = [];
            }
            this.listeners[type].push(new EventListener(type, callback, priolity));
            this.listeners[type].sort(function (listener1, listener2) {
                return listener2.priolity - listener1.priolity;
            });
        };
        EventDispatcher.prototype.removeEventListener = function (type, callback) {
            if (this.hasEventListener(type, callback)) {
                for (var i = 0; i < this.listeners[type].length; i++) {
                    var listener = this.listeners[type][i];
                    if (listener.equalCurrentListener(type, callback)) {
                        listener.handler = null;
                        this.listeners[type].splice(i, 1);
                        return;
                    }
                }
            }
        };
        EventDispatcher.prototype.clearEventListener = function () {
            this.listeners = {};
        };
        EventDispatcher.prototype.containEventListener = function (type) {
            if (this.listeners[type] == null)
                return false;
            return this.listeners[type].length > 0;
        };
        EventDispatcher.prototype.hasEventListener = function (type, callback) {
            if (this.listeners[type] == null)
                return false;
            for (var i = 0; i < this.listeners[type].length; i++) {
                var listener = this.listeners[type][i];
                if (listener.equalCurrentListener(type, callback)) {
                    return true;
                }
            }
            return false;
        };
        return EventDispatcher;
    }());
    events.EventDispatcher = EventDispatcher;
    var EventListener = (function () {
        function EventListener(type, handler, priolity) {
            if (type === void 0) { type = null; }
            if (handler === void 0) { handler = null; }
            if (priolity === void 0) { priolity = 0; }
            this.type = type;
            this.handler = handler;
            this.priolity = priolity;
        }
        EventListener.prototype.equalCurrentListener = function (type, handler) {
            if (this.type == type && this.handler == handler) {
                return true;
            }
            return false;
        };
        return EventListener;
    }());
    var Event = (function () {
        function Event(type, value) {
            if (type === void 0) { type = null; }
            if (value === void 0) { value = null; }
            this.type = type;
            this.value = value;
        }
        Event.COMPLETE = "complete";
        Event.CHANGE_PROPERTY = "changeProperty";
        return Event;
    }());
    events.Event = Event;
})(events || (events = {}));
