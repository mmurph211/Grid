////////////////////////////////////
//
// MooGrid
//
// MIT-style license. Copyright 2010 Matt V. Murphy
//
////////////////////////////////////
var MooGrid = new Class({
	Implements : Options, 
	Binds : ["parseData_Xml", "parseData_Json", "alignColumns", "syncScrolls", "simulateMouseScroll", "initResizeGrid", "initResizeColumn", "selectRange", "clearTextSelections"], 
	
	options : {
		noCache : true, 
		allowGridResize : false, 
		allowColumnResize : false, 
		allowSelections : false, 
		allowMultipleSelections : false, 
		supportMultipleGridsInView : false, 
		fixedCols : 0, 
		colBGColors : [], 
		srcType : "", 
		xml_remote : "", 
		xml_local : "", 
		json_remote : "", 
		json_local : {}, 
		selectedBgColor : "#e5ebf6", 
		fixedSelectedBgColor : "#e5ebf6", 
		scrollLeftTo : 0
	}, 
	
	Css : {
		idRulePrefix : "", 
		sheet : null, 
		rules : {}
	}, 
	
	selectedIndexes : [], 
	
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
		
		this.body = new Element("DIV", { "class" : "mgBody" }).inject(this.base);
		this.bodyFixed = new Element("DIV", { "class" : "mgBodyFixed" }).inject(this.body);
		this.bodyFixed2 = new Element("DIV", { "class" : "mgBodyFixed2" }).inject(this.bodyFixed);
		this.bodyStatic = new Element("DIV", { "class" : "mgBodyStatic" }).inject(this.body);
		
		this.foot = new Element("DIV", { "class" : "mgFoot" }).inject(this.body, "before");
		this.footFixed = new Element("DIV", { "class" : "mgFootFixed" }).inject(this.foot);
		this.footStatic = new Element("DIV", { "class" : "mgFootStatic" }).inject(this.foot);
		
		if (this.options.fixedCols > 0 && !Browser.Engine.trident) { // Simulate some degree of scrolling over non-scrollable content
			this.bodyFixed.addEvent("mousewheel", this.simulateMouseScroll);
		}
		
		if (this.options.allowGridResize) {
			this.baseResize = new Element("DIV", {
				"class" : "mgBaseResize", 
				"events" : {
					"mousedown" : this.initResizeGrid
				}
			}).inject(this.base);
		}
		
		if (this.options.allowSelections || this.options.allowMultipleSelections) {
			this.options.allowSelections = true;
			this.body.addEvent("mousedown:relay(div.mgBodyRow)", this.selectRange);
		}
		
		this.columns = 0;
		this.cellData = {
			head : [], 
			body : [], 
			foot : []
		};
		
		switch (this.options.srcType) {
			case "xml_remote":
				new Request({
					method : "get", 
					url : this.options.xml_remote, 
					noCache : this.options.noCache
				}).addEvent("onComplete", this.parseData_Xml).send();
				break;
			case "xml_local":
				var xml = null;
				if (Browser.Engine.trident) {
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
					method : "get", 
					url : this.options.json_remote, 
					noCache : this.options.noCache, 
					secure : false
				}).addEvent("onComplete", this.parseData_Json).send();
				break;
			case "json_local":
				this.convertData_Json(this.options.json_local);
				this.parseData();
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
	convertData_Xml : function(Body) {
		var base = (!!Body.Head) ? Body.Head : ((!!Body.Body) ? Body.Body : ((!!Body.Foot) ? Body.Foot : null));
		if (!base) return;
		
		var _convert = function(arr, rows, rowClass, isHeader) {
			var row_index = rows.length;
			var col_length = this.columns;
			var allowColResize = isHeader && this.options.allowColumnResize;
			rowClass = "<DIV class='" + rowClass;
			
			while (row_index) {
				var fullDiv = rowClass + (--row_index) + "'>";
				var cells = rows[row_index].getElementsByTagName("cell");
				var col_index = col_length;
				while (col_index) {
					var cell = cells[--col_index]
					arr[col_index][row_index] = fullDiv + (cell.textContent || cell.text || "&nbsp;");
				}
				if (allowColResize) {
					col_index = col_length;
					while (col_index) {
						col_index--; // Not in next line due to Opera bug
						arr[col_index][row_index] += ("</DIV><SPAN class='mgResizeSpan' col='" + col_index + "'>&nbsp;</SPAN>");
					}
				}
			}
		}.bind(this);
		
		var cells = base.getElementsByTagName("row")[0].getElementsByTagName("cell").length;
		this.columns = cells;
		while (cells) {
			this.cellData.head[--cells] = [];
			this.cellData.body[cells] = [];
			this.cellData.foot[cells] = [];
		}
		
		if (!!Body.Head) {
			_convert(this.cellData.head, Body.Head.getElementsByTagName("row"), "mgCell mgHeadRow mgRow", true);
		} else {
			this.Css.rules[".mgHead"] = { display : "none" };
		}
		if (!!Body.Body) {
			_convert(this.cellData.body, Body.Body.getElementsByTagName("row"), "mgCell mgBodyRow mgRow", false);
		} else {
			this.Css.rules[".mgBodyFixed"] = { display : "none" };
		}
		if (!!Body.Foot) {
			_convert(this.cellData.foot, Body.Foot.getElementsByTagName("row"), "mgCell mgFootRow mgRow", false);
		} else {
			this.Css.rules[".mgFoot"] = { display : "none" };
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData_Json : function(responseJSON, responseText) {
		if ($type(responseJSON) === "object") {
			this.convertData_Json(responseJSON);
		}
		
		this.parseData();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertData_Json : function(Body) {
		var base = (!!Body.Head) ? Body.Head : ((!!Body.Body) ? Body.Body : ((!!Body.Foot) ? Body.Foot : null));
		if (!base) return;
		
		var _convert = function(arr, rows, rowClass, isHeader) {
			var row_index = rows.length;
			var col_length = this.columns;
			var allowColResize = isHeader && this.options.allowColumnResize;
			rowClass = "<DIV class='" + rowClass;
			
			while (row_index) {
				var fullDiv = rowClass + (--row_index) + "'>";
				var tempRow = rows[row_index];
				var col_index = col_length;
				while (col_index) {
					arr[--col_index][row_index] = fullDiv + (tempRow[col_index] || "&nbsp;");
				}
				if (allowColResize) {
					col_index = col_length;
					while (col_index) {
						col_index--; // Not in next line due to Opera bug
						arr[col_index][row_index] += ("</DIV><SPAN class='mgResizeSpan mgResizeSpan" + col_index + "'>&nbsp;</SPAN>");
					}
				}
			}
		}.bind(this);
		
		var cells = base[0].length;
		this.columns = cells;
		while (cells) {
			this.cellData.head[--cells] = [];
			this.cellData.body[cells] = [];
			this.cellData.foot[cells] = [];
		}
		
		if (!!Body.Head) {
			_convert(this.cellData.head, Body.Head, "mgCell mgHeadRow mgRow", true);
		} else {
			this.Css.rules[".mgHead"] = { display : "none" };
		}
		if (!!Body.Body) {
			_convert(this.cellData.body, Body.Body, "mgCell mgBodyRow mgRow", false);
		} else {
			this.Css.rules[".mgBodyFixed"] = { display : "none" };
		}
		if (!!Body.Foot) {
			_convert(this.cellData.foot, Body.Foot, "mgCell mgFootRow mgRow", false);
		} else {
			this.Css.rules[".mgFoot"] = { display : "none" };
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData : function() {
		this.generateGrid();
		
		this.lastScrollLeft = 0;
		this.lastScrollTop = 0;
		this.body.addEvent("scroll", this.syncScrolls);
		
		if (!!$(this.element.id + "SS")) {
			this.Css.sheet = $(this.element.id + "SS");
			this.setRules(); // Reset stylesheet to blank
		} else {
			this.Css.sheet = new Element("STYLE", { "id" : this.element.id + "SS", "type" : "text/css" }).inject(document.head);
		}
		
		this.element.appendChild(this.docFrag);
		if (this.options.scrollLeftTo > 0) {
			this.body.scrollLeft = this.options.scrollLeftTo;
		}
		
		setTimeout(this.alignColumns.pass(false), 25);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGrid : function() {
		var fixedCols = this.options.fixedCols;
		var _generate = function(cols, joinStr, closeStr) {
			var html = [];
			var col_index = cols.length;
			while (col_index) {
				html[--col_index] = ["<DIV class='mgCol mgCol", col_index, ((col_index < fixedCols) ? " mgFixedCol'>" : "'>"), cols[col_index].join(joinStr), closeStr].join("");
			}
			return {
				"fullHTML" : html.join(""), 
				"fixedHTML" : html.slice(0, fixedCols).join("")
			};
		};
		
		this.hasHead = (this.cellData.head.length > 0 && this.cellData.head[0].length > 0);
		this.hasBody = (this.cellData.body.length > 0 && this.cellData.body[0].length > 0);
		this.hasFixedBody = (this.options.fixedCols > 0);
		this.hasFoot = (this.cellData.foot.length > 0 && this.cellData.foot[0].length > 0);
		
		var allowColResize = this.options.allowColumnResize;
		var emptyHtml = { "fullHTML" : "", "fixedHTML" : "" };
		var hHTML = (this.hasHead) ? _generate(this.cellData.head, (allowColResize) ? "" : "</DIV>", (allowColResize) ? "</DIV>" : "</DIV></DIV>") : emptyHtml;
		var bHTML = (this.hasBody) ? _generate(this.cellData.body, "</DIV>", "</DIV></DIV>") : emptyHtml;
		var fHTML = (this.hasFoot) ? _generate(this.cellData.foot, "</DIV>", "</DIV></DIV>") : emptyHtml;
		
		this.headStatic.set("html", hHTML.fullHTML);
		this.bodyStatic.set("html", bHTML.fullHTML);
		this.footStatic.set("html", fHTML.fullHTML);
		if (!this.hasBody) {
			this.bodyStatic.set("html", "<DIV class='mgEmptySetMsg'>No results returned.</DIV>");
		}
		
		this.headFixed.set("html", hHTML.fixedHTML);
		if (!this.hasHead) {
			this.bodyFixed2.set("html", bHTML.fixedHTML);
		} else {
			this.bodyFixed2.set("html", [hHTML.fixedHTML, "<br>", bHTML.fixedHTML].join(""));
			this.headStatic.clone(true, true).addClass("mgHeadStaticHidden").inject(this.body, "top");
		}
		this.footStatic.clone(true, true).addClass("mgFootStaticHidden").inject(this.body);
		this.footFixed.set("html", fHTML.fixedHTML);
		
		if (allowColResize) {
			this.base.addEvent("mousedown:relay(span.mgResizeSpan)", this.initResizeColumn);
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	alignColumns : function(reAlign) {
		if (this.columns === 0) return;
		
		var allowColumnResize = this.options.allowColumnResize;
		var colBGColors = this.options.colBGColors;
		var colBGColorsLength = colBGColors.length;
		this.columnWidths = [];
		this.colIndex = 0;
		this.colNodes = {
			head : this.headStatic.children, 
			body : this.bodyStatic.children, 
			foot : this.footStatic.children
		};
		
		if (reAlign === true) {
			for (var i=0; i<this.columns; i++) {
				delete this.Css.rules[".mgCol" + i].width;
			}
			this.setRules();
		}
		
		while (true) {
			var targets = [this.colNodes.head[this.colIndex], this.colNodes.body[this.colIndex], this.colNodes.foot[this.colIndex]];
			var width = Math.max(
				(!!targets[0]) ? targets[0].offsetWidth : 0, 
				(!!targets[1]) ? targets[1].offsetWidth : 0, 
				(!!targets[2]) ? targets[2].offsetWidth : 0
			);
			
			this.columnWidths[this.colIndex] = width;
			this.Css.rules[".mgCol" + this.colIndex] = { width : width + "px" };
			if (colBGColorsLength > this.colIndex && colBGColors[this.colIndex] !== "#ffffff") {
				this.Css.rules[".mgCol" + this.colIndex]["background-color"] = colBGColors[this.colIndex];
			}
			if (allowColumnResize) {
				this.Css.rules[".mgResizeSpan" + this.colIndex] = { "margin-left" : (width - 2) + "px" };
			}
			
			this.colIndex++;
			if (this.colIndex === this.columns) {
				break;
			}
		}
		
		this.colNodes = null;
		this.Css.rules[".mgCell"] = { visibility : "visible" };
		if (allowColumnResize) {
			this.Css.rules[".mgResizeSpan"] = { display : "block", position : "absolute" };
		}
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
		if (this.hasFixedBody) {
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
				cssElText[j++] = prop + " : " + rules[rule][prop] + ";";
			}
			if (j > 0) {
				cssText[i++] = idRulePrefix + rule + " { " + cssElText.join(" ") + " }";
			}
		}
		
		if (Browser.Engine.trident) {
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
		
		if (Browser.Engine.presto925) { // Stop text selection in Opera 9.25
			event.stop();
			return false;
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	resizeGrid : function(event) {
		var xDif = event.page.x - this.ResizeInfo.origX;
		var yDif = event.page.y - this.ResizeInfo.origY;
		var newWidth = (xDif >= 0) ? this.ResizeInfo.origWidth + xDif : this.ResizeInfo.origWidth - (-1 * xDif);
		var newHeight = (yDif >= 0) ? this.ResizeInfo.origHeight + yDif : this.ResizeInfo.origHeight - (-1 * yDif);
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
		var target = $(event.target);
		var col = target.get("class").replace(/mgResizeSpan/g, "").toInt();
		
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
		
		if (Browser.Engine.presto925) { // Stop text selection in Opera 9.25
			event.stop();
			return false;
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	resizeColumn : function(event) {
		var widthChange = event.client.x - this.ResizeInfo.origX;
		var newWidth = (widthChange >= 0) ? this.ResizeInfo.origWidth + widthChange : this.ResizeInfo.origWidth - (-1 * widthChange);
		newWidth = (newWidth < 15) ? 15 : newWidth;
		var newLeft = (widthChange >= 0) ? this.ResizeInfo.lPos + widthChange : this.ResizeInfo.lPos - (-1 * widthChange);
		
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
		this.Css.rules[".mgCol" + this.ResizeInfo.cIndex]["width"] = this.ResizeInfo.newWidth + "px";
		this.Css.rules[".mgResizeSpan" + this.ResizeInfo.cIndex]["margin-left"] = (this.ResizeInfo.newWidth - 2) + "px";
		this.setRules();
		this.syncScrolls();
		this.columnWidths[this.ResizeInfo.cIndex] = this.ResizeInfo.newWidth;
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
		
		var rowIndex = /mgRow(\d+)/.exec(clicked.get("class"))[1].toInt(), 
		    toSelect = [], 
		    toRemove = [], 
		    startIndex, 
		    indexCounter = 0, 
		    selectedIndexes = this.selectedIndexes, 
		    rowIndexSelected = selectedIndexes.contains(rowIndex), 
		    controlPressed = event.control, 
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
			setTimeout(this.clearTextSelections, 25);
		}
		
		this.body.fireEvent("rowSelect", [toSelect, toRemove, event.target, rowIndex]);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	selectAll : function(toggle) {
		var toSelect = [], 
		    toRemove = [], 
		    indexCounter = 0, 
		    selectedIndexes = this.selectedIndexes, 
		    maxIndex = (this.hasBody) ? this.bodyStatic.children[0].children.length - 1 : 0;
		
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
		    fixedChildren; // Do not extend for performance reasons
		
		if (fixedCols > 0) {
			fixedChildren = this.bodyFixed2.children;
			for (var col_index=fixedCols + 1, column; column=fixedChildren[col_index]; col_index++) { // fixedCols + 1 due to hidden html
				var children = column.children;
				for (var remove_counter=0, len=toRemove.length; remove_counter<len; remove_counter++) {
					children[toRemove[remove_counter]].style.backgroundColor = "";
				}
				for (var select_counter=0, len=toSelect.length; select_counter<len; select_counter++) {
					children[toSelect[select_counter]].style.backgroundColor = fixedSelBgColor;
				}
			}
		}
		
		for (var col_index=0, column; column=staticChildren[col_index]; col_index++) {
			var bgColor = (fixedCols > col_index) ? fixedSelBgColor : selBgColor, 
			    children = column.children;
			for (var remove_counter=0, len=toRemove.length; remove_counter<len; remove_counter++) {
				children[toRemove[remove_counter]].style.backgroundColor = "";
			}
			for (var select_counter=0, len=toSelect.length; select_counter<len; select_counter++) {
				children[toSelect[select_counter]].style.backgroundColor = bgColor;
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	clearTextSelections : function() {
		if (!!window.getSelection) {
			window.getSelection().removeAllRanges();
		} else if (!!document.selection) {
			document.selection.empty();
		}
		
		return false;
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	cleanUp : function(fullCleanUp) {
		var elementId = this.element.id;
		
		this.base.removeEvents();
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

