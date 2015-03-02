var GuiManager = (function () {
    function GuiManager() {
        if (GuiManager._instance) {
            throw new Error("must use the getInstance.");
        }
        GuiManager._instance = this;
    }
    GuiManager.getInstance = function () {
        if (GuiManager._instance === null) {
            GuiManager._instance = new GuiManager();
        }
        return GuiManager._instance;
    };
    GuiManager._instance = null;
    return GuiManager;
})();
