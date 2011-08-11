////////////////////////////////////
//
// MooGrid
//
// MIT-style license. Copyright 2011 Matt V. Murphy
//
////////////////////////////////////
var MooGrid = new Class({
	Implements : Options, 
	Binds : ["parseData_Xml", "parseData_Json", "alignColumns", "syncScrolls", "simulateMouseScroll", "initResizeGrid", "initResizeColumn", 
		"sortColumn", "selectRange", "clearTextSelections"], 
	
	options : {
		noCache : true, 
		allowGridResize : false, 
		allowColumnResize : false, 
		allowClientSideSorting : false, 
		allowSelections : false, 
		allowMultipleSelections : false, 
		supportMultipleGridsInView : false, 
		fixedCols : 0, 
		scrollLeftTo : 0, 
		srcType : "", 
		xml_remote : "", 
		xml_local : "", 
		json_remote : "", 
		json_local : {}, 
		selectedBgColor : "#fef7dc", 
		fixedSelectedBgColor : "#f4eccd", 
		colBGColors : [], 
		colSortTypes : [], // "string", "number", "date", "custom", "none"
		customSortCleaner : null
	}, 
	
	Css : {
		idRulePrefix : "", 
		sheet : null, 
		rules : {}
	}, 
	
	columns : 0, 
	lastSortedColumn : -1, 
	rawData : [], 
	selectedIndexes : [], 
	cellData : { head : [], body : [], foot : [] }, 
	cache : {}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	initialize : function(element, options) {
		this.element = document.id(element);
		this.setOptions(options);
		this.generateSkeleton();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateSkeleton : function() {
		this.parentDimensions = this.element.getSize();
		this.docFrag = document.createDocumentFragment();
		this.base = new Element("DIV", { "class" : "mgBase" });
		this.docFrag.appendChild(this.base);
		
		this.head = new Element("DIV", { "class" : "mgHead" }).inject(this.base);
		this.headFixed = new Element("DIV", { "class" : "mgHeadFixed" }).inject(this.head);
		this.headStatic = new Element("DIV", { "class" : "mgHeadStatic" }).inject(this.head);
		
		this.foot = new Element("DIV", { "class" : "mgFoot" }).inject(this.base);
		this.footFixed = new Element("DIV", { "class" : "mgFootFixed" }).inject(this.foot);
		this.footStatic = new Element("DIV", { "class" : "mgFootStatic" }).inject(this.foot);
		
		this.body = new Element("DIV", { "class" : "mgBody" }).inject(this.base);
		this.bodyFixed = new Element("DIV", { "class" : "mgBodyFixed" }).inject(this.body);
		this.bodyFixed2 = new Element("DIV", { "class" : "mgBodyFixed2" }).inject(this.bodyFixed);
		this.bodyStatic = new Element("DIV", { "class" : "mgBodyStatic" }).inject(this.body);
		
		if (this.options.fixedCols > 0 && !Browser.ie) { // Simulate some degree of scrolling over non-scrollable content
			this.bodyFixed.addEvent("mousewheel", this.simulateMouseScroll);
		}
		
		if (this.options.allowGridResize) {
			this.baseResize = new Element("DIV", {
				"class" : "mgBaseResize", 
				"events" : { "mousedown" : this.initResizeGrid }
			}).inject(this.base);
		}
		
		if (this.options.allowColumnResize) {
			this.head.addEvent("mousedown:relay(.mgRS)", this.initResizeColumn);
		}
		
		if (this.options.allowClientSideSorting) {
			this.head.addEvent("mousedown:relay(.mgHR)", this.sortColumn);
		}
		
		if (this.options.allowSelections || this.options.allowMultipleSelections) {
			this.options.allowSelections = true;
			this.body.addEvent("mousedown:relay(.mgBR)", this.selectRange);
		}
		
		switch (this.options.srcType) {
			case "xml_remote":
				new Request({
					url : this.options.xml_remote, onComplete : this.parseData_Xml, noCache : this.options.noCache
				}).get();
				break;
			case "xml_local":
				var xml = null;
				if (Browser.ie) {
					xml = new ActiveXObject("Microsoft.XMLDOM");
					xml.async = false;
					xml.loadXML(this.options.xml_local);
				} else {
					xml = new DOMParser().parseFromString(this.options.xml_local, "text/xml");
				}
				this.parseData_Xml(this.options.xml_local, xml);
				break;
			case "json_remote":
				new Request.JSON({
					url : this.options.json_remote, onComplete : this.parseData_Json, noCache : this.options.noCache, secure : false
				}).get();
				break;
			case "json_local":
				this.parseData_Json(this.options.json_local, "");
				break;
			default:
				this.parseData();
				break;
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData_Xml : function(responseText, responseXML) {
		var grid = (!!responseXML) ? responseXML.getElementsByTagName("grid")[0] : null;
		
		if (!!grid) {
			this.convertData_Xml({
				"Head" : grid.getElementsByTagName("head")[0], 
				"Body" : grid.getElementsByTagName("body")[0], 
				"Foot" : grid.getElementsByTagName("foot")[0]
			});
		}
		
		this.parseData();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertData_Xml : function(Data) {
		var base = Data.Head || Data.Body || Data.Foot || null, 
		    allowColumnResize = this.options.allowColumnResize, 
		    rows, 
		    cols;
		
		if (!base) {
			return;
		}
		
		this.columns = cols = base.getElementsByTagName("row")[0].getElementsByTagName("cell").length;
		while (cols) {
			this.cellData.head[--cols] = [];
			this.cellData.body[cols] = [];
			this.cellData.foot[cols] = [];
		}
		cols = this.columns;
		
		if (!!Data.Head) {
			rows = Data.Head.getElementsByTagName("row");
			this.convertDataItem_Xml(this.cellData.head, rows, "<DIV class='mgC mgHR mgR", this.columns, allowColumnResize, false);
		} else {
			this.Css.rules[".mgHead"] = { display : "none" };
		}
		if (!!Data.Body) {
			rows = Data.Body.getElementsByTagName("row");
			this.convertDataItem_Xml(this.cellData.body, rows, "<DIV class='mgC mgBR mgR", this.columns, false, true);
		} else {
			this.Css.rules[".mgBodyFixed"] = { display : "none" };
		}
		if (!!Data.Foot) {
			rows = Data.Foot.getElementsByTagName("row");
			this.convertDataItem_Xml(this.cellData.foot, rows, "<DIV class='mgC mgFR mgR", this.columns, false, false);
		} else {
			this.Css.rules[".mgFoot"] = { display : "none" };
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertDataItem_Xml : function(arr, rows, rowClass, columns, allowColResize, updateRawData) {
		var cellText = (Browser.Engine.trident) ? "text" : "textContent", 
		    row_index = rows.length, 
		    fullDiv, 
		    cellValue, 
		    cells, 
		    rawDataRow, 
		    col_index;
		
		while (row_index) {
			fullDiv = rowClass + (--row_index) + "'>";
			cells = rows[row_index].getElementsByTagName("cell");
			col_index = columns;
			
			if (updateRawData) {
				this.rawData[row_index] = rawDataRow = [];
			}
			while (col_index) {
				cellValue = cells[--col_index][cellText];
				arr[col_index][row_index] = fullDiv + (cellValue || "&nbsp;");
				if (updateRawData) {
					rawDataRow[col_index] = cellValue;
				}
			}
			
			if (allowColResize) {
				col_index = columns;
				while (col_index) {
					arr[--col_index][row_index] = ("<SPAN class='mgRS mgRS" + col_index + "'>&nbsp;</SPAN>") + arr[col_index][row_index];
				}
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData_Json : function(responseJSON, responseText) {
		if (typeOf(responseJSON) === "object") {
			this.rawData = responseJSON.Body || [];
			this.convertData_Json(responseJSON);
		}
		
		this.parseData();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertData_Json : function(Data) {
		var base = Data.Head || Data.Body || Data.Foot || null, 
		    allowColumnResize = this.options.allowColumnResize, 
		    cols;
		
		if (!base) {
			return;
		}
		
		this.columns = cols = base[0].length;
		while (cols) {
			this.cellData.head[--cols] = [];
			this.cellData.body[cols] = [];
			this.cellData.foot[cols] = [];
		}
		cols = this.columns;
		
		if (!!Data.Head) {
			this.convertDataItem_Json(this.cellData.head, Data.Head, "<DIV class='mgC mgHR mgR", this.columns, allowColumnResize);
		} else {
			this.Css.rules[".mgHead"] = { display : "none" };
		}
		if (!!Data.Body) {
			this.convertDataItem_Json(this.cellData.body, Data.Body, "<DIV class='mgC mgBR mgR", this.columns, false);
		} else {
			this.Css.rules[".mgBodyFixed"] = { display : "none" };
		}
		if (!!Data.Foot) {
			this.convertDataItem_Json(this.cellData.foot, Data.Foot, "<DIV class='mgC mgFR mgR", this.columns, false);
		} else {
			this.Css.rules[".mgFoot"] = { display : "none" };
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertDataItem_Json : function(arr, rows, rowClass, columns, allowColResize) {
		var row_index = rows.length, 
		    fullDiv, 
		    tempRow, 
		    col_index;
		
		while (row_index) {
			fullDiv = rowClass + (--row_index) + "'>";
			tempRow = rows[row_index];
			col_index = columns;
			
			while (col_index) {
				arr[--col_index][row_index] = fullDiv + (tempRow[col_index] || "&nbsp;");
			}
			
			if (allowColResize) {
				col_index = columns;
				while (col_index) {
					arr[--col_index][row_index] = ("<SPAN class='mgRS mgRS" + col_index + "'>&nbsp;</SPAN>") + arr[col_index][row_index];
				}
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData : function() {
		this.generateGrid();
		
		this.lastScrollLeft = 0;
		this.lastScrollTop = 0;
		this.body.addEvent("scroll", this.syncScrolls);
		
		if (!!$(this.element.id + "SS")) {
			this.Css.sheet = $(this.element.id + "SS").dispose();
		} else {
			this.Css.sheet = new Element("STYLE", { "id" : this.element.id + "SS", "type" : "text/css" });
		}
		
		this.element.appendChild(this.docFrag);
		if (this.options.scrollLeftTo > 0) {
			this.body.scrollLeft = this.options.scrollLeftTo;
		}
		
		if (!Browser.ie7 && !Browser.ie8) {
			this.alignColumns(false);
		} else {
			window.setTimeout(this.alignColumns.pass(false), 25);
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGrid : function() {
		this.hasHead = (this.cellData.head.length > 0 && this.cellData.head[0].length > 0);
		this.hasBody = (this.cellData.body.length > 0 && this.cellData.body[0].length > 0);
		this.hasFoot = (this.cellData.foot.length > 0 && this.cellData.foot[0].length > 0);
		this.hasFixedCols = (this.options.fixedCols > 0);
		
		this.generateGridHead();
		this.generateGridBody();
		this.generateGridFoot();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGridHead : function() {
		var hHTML;
		
		if (this.hasHead) {
			hHTML = this.generateGridItem(this.cellData.head);
			this.headStatic.innerHTML = hHTML.fullHTML;
			if (this.hasFixedCols) {
				this.headFixed.innerHTML = hHTML.fixedHTML;
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGridBody : function() {
		var bHTML;
		
		if (this.hasBody) {
			bHTML = this.generateGridItem(this.cellData.body);
			this.bodyStatic.innerHTML = bHTML.fullHTML;
			if (this.hasFixedCols) {
				this.bodyFixed2.innerHTML = bHTML.fixedHTML;
			}
		} else {
			this.bodyStatic.innerHTML = "<DIV class='mgEmptySetMsg'>No results returned.</DIV>";
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGridFoot : function() {
		var fHTML;
		
		if (this.hasFoot) {
			fHTML = this.generateGridItem(this.cellData.foot);
			this.footStatic.innerHTML = fHTML.fullHTML;
			if (this.hasFixedCols) {
				this.footFixed.innerHTML = fHTML.fixedHTML;
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGridItem : function(cols) {
		var fixedCols = this.options.fixedCols, 
		    col_index = cols.length, 
		    replaceRgx = /@/, 
		    fHtml = [], 
		    sHtml = [];
		
		while (col_index) {
			col_index--;
			if (col_index < fixedCols) {
				fHtml[col_index] = ("<DIV class='mgCl mgCl" + col_index + " mgFCl'>@</DIV></DIV>").replace(replaceRgx, cols[col_index].join("</DIV>"));
				sHtml[col_index] = "<DIV class='mgCl mgCl" + col_index + " mgFCl'></DIV>";
			} else {
				sHtml[col_index] = ("<DIV class='mgCl mgCl" + col_index + "'>@</DIV></DIV>").replace(replaceRgx, cols[col_index].join("</DIV>"));
			}
		}
		
		return { fixedHTML : fHtml.join(""),  fullHTML : sHtml.join("") };
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	alignColumns : function(reAlign) {
		if (this.columns === 0) return;
		
		var fixedCols = this.options.fixedCols, 
		    allowColumnResize = this.options.allowColumnResize, 
		    colBGColors = this.options.colBGColors, 
		    colBGColorsLength = colBGColors.length, 
		    rules = this.Css.rules, 
		    headHeight, 
		    footHeight;
		
		this.columnWidths = [];
		this.colIndex = 0;
		this.colNodes = { head : this.headStatic.children, body : this.bodyStatic.children, foot : this.footStatic.children };
		this.fixedColNodes = (fixedCols > 0) ? { head : this.headFixed.children, body : this.bodyFixed2.children, foot : this.footFixed.children } : null;
		
		if (reAlign === true) {
			for (var i=0; i<this.columns; i++) {
				delete rules[".mgCl" + i].width;
			}
			this.setRules();
		} else {
			headHeight = (this.hasHead) ? this.head.offsetHeight : 0;
			footHeight = (this.hasFoot) ? this.foot.offsetHeight : 0;
			this.scrollBarSize = this.body.offsetWidth - this.body.clientWidth;
			
			rules[".mgC"] = { visibility : "visible" };
			rules[".mgCl"] = { "background-color" : "#fff" };
			rules[".mgBodyStatic"] = { padding : headHeight + "px 0px " + footHeight + "px 0px" };
			if (this.hasHead) {
				rules[".mgHead"] = { right : this.scrollBarSize + "px" };
			}
			if (this.hasFoot) {
				rules[".mgFoot"] = { bottom : this.scrollBarSize + "px", right : this.scrollBarSize + "px" };
			}
			if (this.hasFixedCols) {
				rules[(!Browser.ie7) ? ".mgBodyFixed" : ".mgBodyFixed2"] =  { top : headHeight + "px", bottom : this.scrollBarSize + "px" };
			}
			if (allowColumnResize) {
				rules[".mgRS"] = { display : "block", position : "relative" };
				rules[".mgResizeDragger"] = { bottom : this.scrollBarSize + "px" };
			}
		}
		
		while (true) {
			var nodes = (this.colIndex < fixedCols) ? this.fixedColNodes : this.colNodes, 
			    targets = [nodes.head[this.colIndex], nodes.body[this.colIndex], nodes.foot[this.colIndex]], 
			    width = Math.max(
			    	(!!targets[0]) ? targets[0].offsetWidth : 0, 
			    	(!!targets[1]) ? targets[1].offsetWidth : 0, 
			    	(!!targets[2]) ? targets[2].offsetWidth : 0
			    );
			
			this.columnWidths[this.colIndex] = width;
			rules[".mgCl" + this.colIndex] = { width : width + "px" };
			if (colBGColorsLength > this.colIndex && colBGColors[this.colIndex] !== "#ffffff") {
				rules[".mgCl" + this.colIndex]["background-color"] = colBGColors[this.colIndex];
			}
			if (allowColumnResize) {
				rules[".mgRS" + this.colIndex] = { "margin-left" : (width - 2) + "px" };
			}
			
			this.colIndex++;
			if (this.colIndex === this.columns) {
				break;
			}
		}
		
		this.colNodes = null;
		this.fixedColNodes = null;
		this.setRules();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	syncScrolls : function() {
		if (this.hasHead || this.hasFoot) {
			var sL = this.body.scrollLeft;
			if (sL !== this.lastScrollLeft) {
				if (this.hasHead) {
					this.headStatic.setStyle("margin-left", -1 * sL);
				}
				if (this.hasFoot) {
					this.footStatic.setStyle("margin-left", -1 * sL);
				}
				this.lastScrollLeft = sL;
			}
		}
		if (this.hasFixedCols) {
			var sT = this.body.scrollTop;
			if (sT !== this.lastScrollTop) {
				this.bodyFixed2.setStyle("margin-top", -1 * this.body.scrollTop);
				this.lastScrollTop = sT;
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	simulateMouseScroll : function(event) {
		this.body.scrollTop -= (event.wheel * 100);
		this.syncScrolls();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setRules : function() {
		var idRulePrefix = "", 
		    sheet = this.Css.sheet, 
		    rules = this.Css.rules, 
		    cssText = [], 
		    cssElText = [], 
		    i = 0, 
		    j = 0;
		
		if (this.options.supportMultipleGridsInView) {
			idRulePrefix = (this.Css.idRulePrefix !== "") ? this.Css.idRulePrefix : "#" + this.element.id + " ";
		}
		
		for (var rule in rules) {
			j = 0;
			cssElText = [];
			for (var prop in rules[rule]) {
				cssElText[j++] = prop + ":" + rules[rule][prop] + ";";
			}
			if (j > 0) {
				cssText[i++] = idRulePrefix + rule + "{" + ((j === 1) ? cssElText[0] : cssElText.join("")) + "}";
			}
		}
		
		if (!$(sheet.id + "SS")) {
			sheet.inject(document.head);
		}
		
		if (Browser.ie) {
			sheet.styleSheet.cssText = cssText.join(" ");
		} else {
			sheet.set("text", cssText.join(" "));
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	initResizeGrid : function(event) {
		this.ResizeInfo = {
			origX : event.page.x, 
			origY : event.page.y, 
			origWidth : this.parentDimensions.x, 
			origHeight : this.parentDimensions.y, 
			boundMouseMove : this.resizeGrid.bind(this), 
			boundMouseUp : this.endResizeGrid.bind(this)
		};
		
		document.addEvents({
			"mousemove" : this.ResizeInfo.boundMouseMove, 
			"mouseup" : this.ResizeInfo.boundMouseUp
		});
		
		event.stop();
		return false;
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	resizeGrid : function(event) {
		var xDif = event.page.x - this.ResizeInfo.origX, 
		    yDif = event.page.y - this.ResizeInfo.origY, 
		    newWidth = (xDif >= 0) ? this.ResizeInfo.origWidth + xDif : this.ResizeInfo.origWidth - (-1 * xDif), 
		    newHeight = (yDif >= 0) ? this.ResizeInfo.origHeight + yDif : this.ResizeInfo.origHeight - (-1 * yDif);
		
		newWidth = (newWidth < 50) ? 50 : newWidth;
		newHeight = (newHeight < 25) ? 25 : newHeight;
		
		this.element.setStyles({ "width" : newWidth, "height" : newHeight });
		this.parentDimensions = { x : newWidth, y : newHeight };
		this.syncScrolls();
		this.clearTextSelections();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	endResizeGrid : function(event) {
		document.removeEvents({
			"mousemove" : this.ResizeInfo.boundMouseMove, 
			"mouseup" : this.ResizeInfo.boundMouseUp
		});
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	initResizeColumn : function(event) {
		var target = $(event.target), 
		    col = target.get("class").replace(/mgRS/g, "").toInt();
		
		this.ResizeInfo = {
			resizer : target, 
			lPos : target.offsetLeft, 
			cIndex : col, 
			origWidth : this.columnWidths[col], 
			origX : event.client.x, 
			lastLeft : -1, 
			newWidth : this.columnWidths[col], 
			boundMouseMove : this.resizeColumn.bind(this), 
			boundMouseUp : this.endResizeColumn.bind(this)
		};
		
		this.ResizeInfo.dragger = new Element("DIV", {
			"class" : "mgResizeDragger", 
			"styles" : { "left" : this.ResizeInfo.lPos }
		}).inject(this.base, "top");
		
		document.addEvents({
			"mousemove" : this.ResizeInfo.boundMouseMove, 
			"mouseup" : this.ResizeInfo.boundMouseUp
		});
		
		event.stop();
		return false;
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	resizeColumn : function(event) {
		var widthChange = event.client.x - this.ResizeInfo.origX, 
		    newWidth = (widthChange >= 0) ? this.ResizeInfo.origWidth + widthChange : this.ResizeInfo.origWidth - (-1 * widthChange), 
		    newWidth = (newWidth < 15) ? 15 : newWidth, 
		    newLeft = (widthChange >= 0) ? this.ResizeInfo.lPos + widthChange : this.ResizeInfo.lPos - (-1 * widthChange);
		
		this.ResizeInfo.newWidth = newWidth;
		if (this.ResizeInfo.lastLeft !== newLeft && newWidth > 15) {
			this.ResizeInfo.dragger.setStyle("left", newLeft);
			this.ResizeInfo.lastLeft = newLeft;
		}
		
		this.clearTextSelections();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	endResizeColumn : function(event) {
		document.removeEvents({
			"mousemove" : this.ResizeInfo.boundMouseMove, 
			"mouseup" : this.ResizeInfo.boundMouseUp
		});
		
		this.ResizeInfo.dragger.dispose();
		this.Css.rules[".mgCl" + this.ResizeInfo.cIndex]["width"] = this.ResizeInfo.newWidth + "px";
		this.Css.rules[".mgRS" + this.ResizeInfo.cIndex]["margin-left"] = (this.ResizeInfo.newWidth - 2) + "px";
		this.setRules();
		this.syncScrolls();
		this.columnWidths[this.ResizeInfo.cIndex] = this.ResizeInfo.newWidth;
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	sortColumn : function(event, clicked) {
		var cI = /mgCl(\d+)/.exec(clicked.getParent(".mgCl").get("class"))[1].toInt(), 
		    cSortType = this.options.colSortTypes[cI] || "string", 
		    cSortType = (cI === this.lastSortedColumn) ? "reverse" : cSortType, 
		    Store = { hasSelections : (this.options.allowSelections && this.selectedIndexes.length > 0) }, 
		    rawData = this.rawData, 
		    that = this;
		
		// Return if no body rows or if not a sort column:
		if (!this.hasBody || cSortType === "none") {
			return;
		}
		
		// Store prior index order and selections:
		Store.index = rawData.length;
		Store.storeAt = rawData[0].length;
		while (Store.index) {
			rawData[--Store.index][Store.storeAt] = Store.index;
		}
		if (Store.hasSelections) {
			Store.selIndexes = this.selectedIndexes.concat();
			this.selectAll("unselectAll");
		}
		
		// Sort the body data by type:
		if (cSortType === "reverse") {
			rawData.reverse();
		} else {
			rawData.sort(function(a, b) { return that.getSortResult(cSortType, cI, a[cI], b[cI]); });
		}
		
		// Update the grid body HTML:
		this.convertDataItem_Json(this.cellData.body, rawData, "<DIV class='mgC mgBR mgR", this.columns, false);
		this.generateGridBody();
		
		// Generate new sort order array:
		Store.newOrder = [];
		Store.index = rawData.length;
		while (Store.index) {
			Store.newOrder[--Store.index] = rawData[Store.index][Store.storeAt];
			rawData[Store.index].splice(Store.storeAt, 1);
		}
		
		// Fire sort event:
		this.head.fireEvent("columnSort", [(cSortType === "reverse"), Store.newOrder.concat(), clicked, cI]);
		this.lastSortedColumn = cI;
		
		// Restore selected rows if applicable:
		if (Store.hasSelections) {
			Store.newSelIndexes = [];
			Store.index = Store.selIndexes.length;
			while (Store.index) {
				Store.newSelIndexes[--Store.index] = Store.newOrder.indexOf(Store.selIndexes[Store.index]);
			}
			this.selectIndexes(Store.newSelIndexes);
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	getSortResult : function(type, columnIndex, a, b, keyA, keyB) {
		if (a === b) {
			return 0;
		}
		
		keyA = type + "_" + a;
		keyB = type + "_" + b;
		
		if (this.cache[keyA] === undefined) {
			this.cache[keyA] = (type === "string") ? a : 
			                   (type === "number") ? parseFloat(a) || -Infinity : 
			                   (type === "date") ? new Date(a).getTime() || -Infinity : 
			                   (type === "custom") ? this.options.customSortCleaner(a, columnIndex) : a;
		}
		if (this.cache[keyB] === undefined) {
			this.cache[keyB] = (type === "string") ? b : 
			                   (type === "number") ? parseFloat(b) || -Infinity : 
			                   (type === "date") ? new Date(b).getTime() || -Infinity : 
			                   (type === "custom") ? this.options.customSortCleaner(b, columnIndex) : b;
		}
		
		return (this.cache[keyA] < this.cache[keyB]) ? -1 : 1;
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	selectIndexes : function(indexes) {
		var toSelect = [], 
		    toSelectI = 0, 
		    selectedIndexes = this.selectedIndexes;
		
		for (var i=0, len=indexes.length; i<len; i++) {
			if (!selectedIndexes.contains(indexes[i])) {
				toSelect[toSelectI++] = indexes[i];
			}
		}
		
		this.toggleRows(toSelect, []);
		this.selectedIndexes.combine(toSelect);
		this.body.fireEvent("rowSelect", [toSelect, [], null, -1]);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	selectRange : function(event, clicked) {
		if (event.rightClick) return;
		
		var rowIndex = /mgR(\d+)/.exec(clicked.get("class"))[1].toInt(), 
		    toSelect = [], 
		    toRemove = [], 
		    startIndex, 
		    indexCounter = 0, 
		    selectedIndexes = this.selectedIndexes, 
		    rowIndexSelected = selectedIndexes.contains(rowIndex), 
		    controlPressed = (event.control || (event.target.type || "").toLowerCase() === "checkbox"), 
		    shiftPressed = event.shift;
		
		if (!this.options.allowMultipleSelections || this.selectedIndexes.length === 0 || (!shiftPressed && !controlPressed)) {
			toSelect = (rowIndexSelected && selectedIndexes.length === 1) ? [] : [rowIndex];
			toRemove = selectedIndexes.concat();
		} else if (controlPressed) {
			toSelect = rowIndexSelected ? [] : [rowIndex];
			toRemove = rowIndexSelected ? [rowIndex] : [];
		} else if (shiftPressed) {
			startIndex = selectedIndexes[0];
			if (startIndex <= rowIndex) {
				for (var i=startIndex + 1; i<=rowIndex; i++) {
					if (selectedIndexes.indexOf(i) === -1) {
						toSelect[indexCounter++] = i;
					}
				}
			} else {
				for (var i=startIndex - 1; i>=rowIndex; i--) {
					if (selectedIndexes.indexOf(i) === -1) {
						toSelect[indexCounter++] = i;
					}
				}
			}
		}
		
		this.toggleRows(toSelect, toRemove);
		for (var i=0, len=toRemove.length; i<len; i++) {
			this.selectedIndexes.erase(toRemove[i]);
		}
		this.selectedIndexes.combine(toSelect);
		if (controlPressed || shiftPressed) {
			window.setTimeout(this.clearTextSelections, 25);
		}
		
		this.body.fireEvent("rowSelect", [toSelect, toRemove, event.target, rowIndex]);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	selectAll : function(toggle) {
		var toSelect = [], 
		    toRemove = [], 
		    indexCounter = 0, 
		    selectedIndexes = this.selectedIndexes, 
		    maxIndex = (this.hasBody) ? this.bodyStatic.children[this.options.fixedCols].children.length - 1 : 0;
		
		if (toggle === "selectAll") {
			for (var i=0; i<=maxIndex; i++) {
				if (selectedIndexes.indexOf(i) === -1) {
					toSelect[indexCounter++] = i;
				}
			}
			this.selectedIndexes.combine(toSelect);
		} else {
			toRemove = this.selectedIndexes.concat();
			this.selectedIndexes = [];
		}
		
		this.toggleRows(toSelect, toRemove);
		this.body.fireEvent("rowSelect", [toSelect, toRemove, null, -1]);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	toggleRows : function(toSelect, toRemove) {
		var fixedCols = this.options.fixedCols, 
		    selBgColor = this.options.selectedBgColor, 
		    fixedSelBgColor = this.options.fixedSelectedBgColor, 
		    staticChildren = this.bodyStatic.children, // Do not extend for performance reasons
		    fixedChildren = (fixedCols > 0) ? this.bodyFixed2.children : [], // Do not extend for performance reasons
		    select_length = toSelect.length, 
		    remove_length = toRemove.length, 
		    select_index, 
		    remove_index, 
		    col_index, 
		    rows;
		
		if (fixedCols > 0) {
			col_index = fixedCols;
			while (col_index) {
				rows = fixedChildren[--col_index].children;
				remove_index = remove_length;
				select_index = select_length;
				while (remove_index) {
					rows[toRemove[--remove_index]].style.backgroundColor = "";
				}
				while (select_index) {
					rows[toSelect[--select_index]].style.backgroundColor = fixedSelBgColor;
				}
			}
		}
		
		col_index = this.columns;
		while (col_index > fixedCols) {
			rows = staticChildren[--col_index].children;
			remove_index = remove_length;
			select_index = select_length;
			while (remove_index) {
				rows[toRemove[--remove_index]].style.backgroundColor = "";
			}
			while (select_index) {
				rows[toSelect[--select_index]].style.backgroundColor = selBgColor;
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	clearTextSelections : function() {
		if (!!window.getSelection) {
			this.clearTextSelections = function() {
				window.getSelection().removeAllRanges();
				return false;
			};
		} else if (!!document.selection) {
			this.clearTextSelections = function() {
				document.selection.empty();
				return false;
			};
		} else {
			this.clearTextSelections = function() {
				return false;
			};
		}
		
		this.clearTextSelections();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	cleanUp : function(fullCleanUp) { // Useful in IE to clear memory leaks
		var elementId = this.element.id;
		
		this.base.removeEvents();
		this.head.removeEvents();
		this.body.removeEvents();
		this.bodyFixed.removeEvents();
		
		this.element = null;
		this.docFrag = null;
		this.base = null;
		
		this.head = null;
		this.headFixed = null;
		this.headStatic = null;
		
		this.body = null;
		this.bodyFixed = null;
		this.bodyFixed2 = null;
		this.bodyStatic = null;
		
		this.foot = null;
		this.footFixed = null;
		this.footStatic = null;
		
		this.baseResize = null;
		
		if (!!this.ResizeInfo) {
			this.ResizeInfo.dragger = null;
		}
		
		if (fullCleanUp) {
			this.Css.sheet = null;
			
			if (!!$(elementId + "SS")) {
				$(elementId + "SS").dispose();
			}
		}
	}
});
