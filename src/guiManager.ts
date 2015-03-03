/// <reference path="events/EventDispatcher.ts"/>
/// <reference path="DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="AtUtil.ts" />

class GuiManager extends events.EventDispatcher {

		private gui;
		private filters;

		private static _instance:GuiManager = null;

		constructor() {
				if (GuiManager._instance) {
						throw new Error("must use the getInstance.");
				}
				super();
				GuiManager._instance = this;
		}

		public static getInstance():GuiManager {
				if (GuiManager._instance === null) {
						GuiManager._instance = new GuiManager();
				}
				return GuiManager._instance;
		}

		public initialize() {
				this.gui = new dat.GUI({autoPlace: true });
				this.getData();
		}

		public getData() {
				//LOAD params
				$.ajax({
						type: "GET",
						dataType: "json",
						url: "data/filter_setting.json",
						success: (data)=> {
								this.setData(data)
						},
				});
		}

		public setData(data) {
				this.filters = data.filters;
				//create UI from params JSON
				var folder;
				$.each(this.filters, (i, filter)=> {
						//create folder
						folder = this.gui.addFolder(filter.displayName);
						//create toogle boolean
						folder.add(filter, 'on').listen().onChange(()=> {
								this.onToggleShaders()
						});
						//add slider for each param
						console.log(filter.params)
						$.each(filter.params, (i, param)=> {
								folder.add(param, 'value', param.min, param.max).step(param.step).listen().name(param.displayName).onChange(()=> {
										this.onParamsChange()
								});
						});
						filter.folder = folder;
				});

				this.onToggleShaders();
				this.onParamsChange();
		}

		public getFilterSetting() {
				return this.filters
		}

		private onParamsChange() {
				this.dispatchEvent(new events.Event("onParamsChange"));
		}

		private onToggleShaders() {
				this.dispatchEvent(new events.Event("onToggleShaders"));
		}

		public randomizeFilters() {

				//clear all filters
				$.each(this.filters, function (i, filter) {
						filter.on = false;
						filter.folder.close();
				});

				//console.log("---------------");
				var at = new ATUtil()
				//turn on 3 filters
				for (var i = 0; i < 2; i++) {
						var r = at.randomInt(0, this.filters.length - 1);
						this.filters[r].on = true;

						//console.log(filters[r].displayName);
						//open enabled folders
						this.filters[r].folder.open();
				}

				//RANDOMIZE ALL PARAMS
				$.each(this.filters, function (i, filter) {

						$.each(filter.params, function (j, param) {
								param.value = at.randomRange(param.min, param.max); //FIXME - use full range?
						});

				});

				this.onToggleShaders();
				this.onParamsChange();

		}
}