////////////////////////////////////
//
// Grid
// MIT-style license. Copyright 2012 Matt V. Murphy
//
////////////////////////////////////
(function(window, document, undefined) {
	"use strict";
	
	var Grid = function(element, options) {
		if (typeof element === "string") {
			element = document.getElementById(element);
		}
		if ((this.element = element)) {
			this.css = { idRulePrefix : "", sheet : null, rules : {} };
			this.columns = 0;
			this.columnWidths = [];
			this.lastSortedColumn = -1;
			this.alignTimer = null;
			this.rawData = [];
			this.selectedIndexes = [];
			this.cellData = { head : [], body : [], foot : [] };
			this.sortCache = {};
			this.usesTouch = (window.ontouchstart !== undefined);
			this.startEvt = (this.usesTouch) ? "touchstart" : "mousedown";
			this.moveEvt = (this.usesTouch) ? "touchmove" : "mousemove";
			this.endEvt = (this.usesTouch) ? "touchend" : "mouseup";
			this.options = {
				srcType : "", // "xml", "json"
				srcData : "", 
				allowGridResize : false, 
				allowColumnResize : false, 
				allowClientSideSorting : false, 
				allowSelections : false, 
				allowMultipleSelections : false, 
				showSelectionColumn : false, 
				onColumnSort : this.nothing, 
				onResizeGrid : this.nothing, 
				onResizeGridEnd : this.nothing, 
				onResizeColumn : this.nothing, 
				onResizeColumnEnd : this.nothing, 
				onRowSelect : this.nothing, 
				supportMultipleGridsInView : false, 
				fixedCols : 0, 
				selectedBgColor : "#eaf1f7", 
				fixedSelectedBgColor : "#dce7f0", 
				colAlign : [], // "left", "center", "right"
				colBGColors : [], 
				colSortTypes : [], // "string", "number", "date", "custom", "none"
				customSortCleaner : null
			};
			
			if (options) {
				for (var option in this.options) {
					if (options[option] !== undefined) {
						this.options[option] = options[option];
					}
				}
			}
			
			this.options.allowColumnResize = this.options.allowColumnResize && !this.usesTouch;
			this.options.allowMultipleSelections = this.options.allowMultipleSelections && this.options.allowSelections;
			this.options.showSelectionColumn = this.options.showSelectionColumn && this.options.allowSelections;
			this.init();
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.nothing = function(){};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.init = function() {
		var srcType = this.options.srcType, 
		    srcData = this.options.srcData, 
		    data;
		
		this.generateSkeleton();
		this.addEvents();
		// JSON:
		if (srcType === "json" && (data = parseJSON(srcData))) {
			this.convertData(data);
			
		// XML:
		} else if (srcType === "xml" && (data = parseXML(srcData))) {
			if ((data = data.getElementsByTagName("grid")[0])) {
				this.convertData(this.convertXmlDataToJsonData(data));
			}
		}
		
		this.generateGrid();
		this.displayGrid();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateSkeleton = function() {
		var doc = document, 
		    elems = [["base", "mgBase", "docFrag"], 
		             ["head", "mgHead", "base"], 
		             ["headFixed", "mgHeadFixed", "head"], 
		             ["headStatic", "mgHeadStatic", "head"], 
		             ["foot", "mgFoot", "base"], 
		             ["footFixed", "mgFootFixed", "foot"], 
		             ["footStatic", "mgFootStatic", "foot"], 
		             ["body", "mgBody", "base"], 
		             ["bodyFixed", "mgBodyFixed", "body"], 
		             ["bodyFixed2", "mgBodyFixed2", "bodyFixed"], 
		             ["bodyStatic", "mgBodyStatic", "body"]];
		
		this.parentDimensions = { x : this.element.offsetWidth, y : this.element.offsetHeight };
		this.docFrag = doc.createDocumentFragment();
		for (var i=0, elem; elem=elems[i]; i++) {
			this[elem[0]] = doc.createElement("DIV");
			this[elem[0]].className = elem[1];
			this[elem[2]].appendChild(this[elem[0]]);
		}
		
		if (this.options.allowGridResize) {
			this.baseResize = document.createElement("DIV");
			this.baseResize.className = "mgBaseResize";
			this.base.appendChild(this.baseResize);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.addEvents = function() {
		var wheelEvent;
		
		// Simulate mouse scrolling over non-scrollable content:
		if (this.options.fixedCols > 0 && !this.usesTouch && !msie) {
			try {
				wheelEvent = (WheelEvent("wheel")) ? "wheel" : undefined;
			} catch (e) {
				wheelEvent = (document.onmousewheel !== undefined) ? "mousewheel" : "DOMMouseScroll";
			}
			if (wheelEvent) {
				addEvent(this.bodyFixed, wheelEvent, bind(this.simulateMouseScroll, this));
			}
		}
		
		// Grid resizing:
		if (this.options.allowGridResize) {
			addEvent(this.baseResize, this.startEvt, bind(this.initResizeGrid, this));
		}
		
		// Column resizing and client side sorting:
		if (this.options.allowColumnResize || this.options.allowClientSideSorting) {
			addEvent(this.head, this.startEvt, bind(this.delegateHeaderEvent, this));
		}
		
		// Row selection:
		if (this.options.allowSelections) {
			addEvent(this.body, this.startEvt, bind(this.selectRange, this));
			if (this.options.showSelectionColumn) {
				addEvent(this.body, "click", bind(this.preventSelectionInputStateChange, this));
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.convertXmlDataToJsonData = function(data) {
		var sections = ["Head", "Body", "Foot"], 
		    cellText = (msie < 9) ? "text" : "textContent", 
		    gEBT = "getElementsByTagName", 
		    section, node, rows, cells, 
		    arr, arr2, i, j, k, 
		    json = {};
		
		// By section:
		for (i=0; section=sections[i]; i++) {
			if ((node = data[gEBT](section.toLowerCase())[0])) {
				json[section] = arr = [];
				
				// By row:
				j = (rows = node[gEBT]("row")).length;
				while (j) {
					arr[--j] = arr2 = [];
					
					// By cell:
					k = (cells = rows[j][gEBT]("cell")).length;
					while (k) {
						arr2[--k] = cells[k][cellText] || "";
					}
				}
			}
		}
		
		return json;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.convertData = function(data) {
		var base, cols;
		
		this.addSelectionColumn(data);
		this.rawData = data.Body || [];
		if ((base = data.Head || data.Body || data.Foot || null)) {
			cols = this.columns = base[0].length;
			while (cols) {
				this.cellData.head[--cols] = [];
				this.cellData.body[cols] = [];
				this.cellData.foot[cols] = [];
			}
			
			cols = this.columns;
			if (data.Head) {
				this.convertDataItem(this.cellData.head, data.Head, "<DIV class='mgC mgHR mgR", cols, this.options.allowColumnResize);
			} else {
				this.css.rules[".mgHead"] = { display : "none" };
			}
			if (data.Body) {
				this.convertDataItem(this.cellData.body, data.Body, "<DIV class='mgC mgBR mgR", cols, false);
			} else {
				this.css.rules[".mgBodyFixed"] = { display : "none" };
			}
			if (data.Foot) {
				this.convertDataItem(this.cellData.foot, data.Foot, "<DIV class='mgC mgFR mgR", cols, false);
			} else {
				this.css.rules[".mgFoot"] = { display : "none" };
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.convertDataItem = function(arr, rows, rowClass, cols, allowColResize) {
		var rowIdx = rows.length, 
		    rowDiv, row, colIdx;
		
		while (rowIdx) {
			rowDiv = rowClass + (--rowIdx) + "'>";
			row = rows[rowIdx];
			colIdx = cols;
			while (colIdx) {
				arr[--colIdx][rowIdx] = rowDiv + (row[colIdx] || "&nbsp;");
			}
		}
		if (allowColResize && (rowIdx = rows.length)) {
			colIdx = cols;
			while (colIdx) {
				arr[--colIdx][0] = ("<SPAN class='mgRS mgRS" + colIdx + "'>&nbsp;</SPAN>") + arr[colIdx][0];
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.addSelectionColumn = function(data) {
		var html, rows, i;
		
		if (this.options.showSelectionColumn) {
			this.options.fixedCols++;
			this.options.colBGColors.unshift(this.options.colBGColors[0] || "");
			this.options.colSortTypes.unshift("none");
			this.options.colAlign.unshift("left");
			
			if ((rows = data.Head) && (i = rows.length)) {
				while (i) { rows[--i].unshift(""); }
			}
			if ((rows = data.Body) && (i = rows.length)) {
				html = "<LABEL class=mgSH><INPUT tabIndex='-1' type=";
				html += ((this.options.allowMultipleSelections) ? "checkbox class=mgCb" : "radio  class=mgRd");
				html += ">&nbsp;</LABEL>";
				while (i) { rows[--i].unshift(html); }
			}
			if ((rows = data.Foot) && (i = rows.length)) {
				while (i) { rows[--i].unshift(""); }
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateGrid = function() {
		this.hasHead = (this.cellData.head.length > 0 && this.cellData.head[0].length > 0);
		this.hasBody = (this.cellData.body.length > 0 && this.cellData.body[0].length > 0);
		this.hasFoot = (this.cellData.foot.length > 0 && this.cellData.foot[0].length > 0);
		this.hasHeadOrFoot = (this.hasHead || this.hasFoot);
		this.hasFixedCols = (this.options.fixedCols > 0);
		
		this.generateGridHead();
		this.generateGridBody();
		this.generateGridFoot();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateGridHead = function() {
		var hHTML;
		
		if (this.hasHead) {
			hHTML = this.generateGridSection(this.cellData.head);
			this.headStatic.innerHTML = hHTML.fullHTML;
			if (this.hasFixedCols) {
				this.headFixed.innerHTML = hHTML.fixedHTML;
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateGridBody = function() {
		var bHTML;
		
		if (this.hasBody) {
			bHTML = this.generateGridSection(this.cellData.body);
			this.bodyStatic.innerHTML = bHTML.fullHTML;
			if (this.hasFixedCols) {
				this.bodyFixed2.innerHTML = bHTML.fixedHTML;
			}
		} else {
			this.bodyStatic.innerHTML = "<DIV class='mgEmptySetMsg'>No results returned.</DIV>";
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateGridFoot = function() {
		var fHTML;
		
		if (this.hasFoot) {
			fHTML = this.generateGridSection(this.cellData.foot);
			this.footStatic.innerHTML = fHTML.fullHTML;
			if (this.hasFixedCols) {
				this.footFixed.innerHTML = fHTML.fixedHTML;
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.generateGridSection = function(cols) {
		var replaceFunc = function($1, $2) { return cols[parseInt($2, 10)].join("</DIV>"); }, 
		    replaceRgx = /@(\d+)@/g, 
		    fixedCols = this.options.fixedCols, 
		    fHtml = [], sHtml = [], 
		    colIdx = cols.length;
		
		while (colIdx) {
			if ((--colIdx) < fixedCols) {
				fHtml[colIdx] = "<DIV class='mgCl mgCl" + colIdx + " mgFCl'>@" + colIdx + "@</DIV></DIV>";
				sHtml[colIdx] = "<DIV class='mgCl mgCl" + colIdx + " mgFCl'></DIV>";
			} else {
				sHtml[colIdx] = "<DIV class='mgCl mgCl" + colIdx + "'>@" + colIdx + "@</DIV></DIV>";
			}
		}
		
		return { fixedHTML : (fixedCols) ? fHtml.join("").replace(replaceRgx, replaceFunc) : "", 
		         fullHTML : sHtml.join("").replace(replaceRgx, replaceFunc) };
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.displayGrid = function() {
		// Setup scrolling:
		this.lastScrollLeft = 0;
		this.lastScrollTop = 0;
		this.body.onscroll = bind(this.syncScrolls, this);
		
		// Prep style element:
		try {
			this.css.sheet.parentNode.removeChild(this.css.sheet);
		} catch (e) {
			this.css.sheet = document.createElement("STYLE");
			this.css.sheet.id = this.element.id + "SS";
			this.css.sheet.type = "text/css";
		}
		
		// Insert grid into DOM:
		this.element.appendChild(this.docFrag);
		
		// Align columns:
		this.alignTimer = window.setTimeout(bind(this.alignColumns, this, [false]), 16);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.alignColumns = function(reAlign) {
		var sNodes = [this.headStatic.children || [], this.bodyStatic.children || [], this.footStatic.children || []], 
		    fNodes = [this.headFixed.children || [], this.bodyFixed2.children || [], this.footFixed.children || []], 
		    allowColumnResize = this.options.allowColumnResize, 
		    colBGColors = this.options.colBGColors, 
		    colAlign = this.options.colAlign, 
		    fixedCols = this.options.fixedCols, 
		    rules = this.css.rules, 
		    colWidth, nodes;
		
		// Compute base styles first, or remove old column width styling if realigning the columns:
		if (reAlign !== true) {
			this.computeBaseStyles();
		} else {
			for (var i=0, len=this.columns; i<len; i++) {
				delete rules[".mgCl" + i].width;
			}
			this.setRules();
		}
		
		// Compute column width, alignment and background styles:
		this.columnWidths = [];
		for (var i=0, len=this.columns; i<len; i++) {
			nodes = (i < fixedCols) ? fNodes : sNodes;
			colWidth = Math.max((nodes[0][i] || {}).offsetWidth || 0, 
			                    (nodes[1][i] || {}).offsetWidth || 0, 
			                    (nodes[2][i] || {}).offsetWidth || 0);
			
			this.columnWidths[i] = colWidth;
			rules[".mgCl" + i] = { "width" : colWidth + "px", "text-align" : (colAlign[i] || "left") };
			if ((colBGColors[i] || "#ffffff") !== "#ffffff") {
				rules[".mgCl" + i]["background-color"] = colBGColors[i];
			}
			if (allowColumnResize) {
				rules[".mgRS" + i] = { "margin-left" : (colWidth - 2) + "px" };
			}
		}
		this.setRules();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.computeBaseStyles = function() {
		var rules = this.css.rules, 
		    headHeight = (this.hasHead) ? this.head.offsetHeight : 0, 
		    footHeight = (this.hasFoot) ? this.foot.offsetHeight : 0, 
		    sBarSize = { "x" : this.body.offsetWidth - this.body.clientWidth, 
		                 "y" : this.body.offsetHeight - this.body.clientHeight };
		
		rules[".mgC"] = { "visibility" : "visible" };
		rules[".mgCl"] = { "background-color" : "#fff" };
		rules[".mgBodyStatic"] = { "padding" : headHeight + "px 0px " + footHeight + "px 0px" };
		if (this.hasHead) {
			rules[".mgHead"] = { "right" : sBarSize.x + "px" };
		}
		if (this.hasFoot) {
			rules[".mgFoot"] = { "bottom" : sBarSize.y + "px", "right" : sBarSize.x + "px" };
		}
		if (this.hasFixedCols) {
			rules[".mgBodyFixed" + ((msie < 8) ? "2" : "")] = { "top" : headHeight + "px", "bottom" : sBarSize.y + "px" };
		}
		if (this.options.allowGridResize) {
			rules[".mgBaseResize"] = { "width" : sBarSize.x + "px", "height" : sBarSize.y + "px" };
		}
		if (this.options.allowColumnResize) {
			rules[".mgResizeDragger"] = { "bottom" : sBarSize.y + "px" };
			rules[".mgRS"] = { "display" : "block", 
			                   "position" : "relative", 
			                   "margin-bottom" : (headHeight * -1) + "px", 
			                   "height" : headHeight + "px" };
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.syncScrolls = function(event) {
		var sL = (this.hasHeadOrFoot) ? this.body.scrollLeft : 0, 
		    sT = (this.hasFixedCols) ? this.body.scrollTop : 0;
		
		if (sL !== this.lastScrollLeft) {
			this.lastScrollLeft = sL;
			if (this.hasHead) {
				this.headStatic.style.marginLeft = (-1 * sL) + "px";
			}
			if (this.hasFoot) {
				this.footStatic.style.marginLeft = (-1 * sL) + "px";
			}
		}
		if (sT !== this.lastScrollTop) {
			this.lastScrollTop = sT;
			this.bodyFixed2.style.marginTop = (-1 * sT) + "px";
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.simulateMouseScroll = function(event) {
		var event = event || window.event, 
		    deltaY = 0;
		
		if (event.deltaY !== undefined) {
			deltaY = event.deltaY;
		} else if (event.wheelDelta !== undefined) {
			deltaY = event.wheelDelta * (-1/40);
		} else if (event.detail !== undefined) {
			deltaY = event.detail;
		}
		
		this.body.scrollTop += (deltaY * 33);
		this.syncScrolls();
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.setRules = function() {
		var idRulePrefix = "", 
		    sheet = this.css.sheet, 
		    rules = this.css.rules, 
		    doc = document, 
		    cssText = [], 
		    i = 0;
		
		if (this.options.supportMultipleGridsInView) {
			idRulePrefix = this.css.idRulePrefix || "#" + this.element.id + " ";
		}
		
		for (var rule in rules) {
			cssText[i++] = idRulePrefix + rule + "{";
			for (var prop in rules[rule]) {
				cssText[i++] = prop + ":" + rules[rule][prop] + ";";
			}
			cssText[i++] = "} ";
		}
		
		if (!sheet.styleSheet) {
			sheet.appendChild(doc.createTextNode(cssText.join("")));
		}
		if (!doc.getElementById(sheet.id)) {
			(doc.head || doc.getElementsByTagName("head")[0]).appendChild(sheet);
		}
		if (sheet.styleSheet) {
			sheet.styleSheet.cssText = cssText.join("");
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.initResizeGrid = function(event) {
		var event = event || window.event, 
		    pagePos;
		
		if (event.button !== 2 && this.options.allowGridResize) {
			pagePos = getEventPositions(event, "page");
			
			this.tmp = {
				throttle : -1, 
				origX : pagePos.x, 
				origY : pagePos.y, 
				origWidth : this.parentDimensions.x, 
				origHeight : this.parentDimensions.y, 
				boundMoveEvt : bind(this.resizeGrid, this), 
				boundEndEvt : bind(this.endResizeGrid, this)
			};
			
			addEvent(document, this.moveEvt, this.tmp.boundMoveEvt);
			addEvent(document, this.endEvt, this.tmp.boundEndEvt);
			return stopEvent(event);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.resizeGrid = function(event) {
		var pagePos, xDif, yDif, newWidth, newHeight, elemStyle;
		
		if ((this.tmp.throttle++) & 1) {
			pagePos = getEventPositions(event || window.event, "page");
			xDif = pagePos.x - this.tmp.origX;
			yDif = pagePos.y - this.tmp.origY;
			newWidth = Math.max(60, (xDif > 0) ? this.tmp.origWidth + xDif : this.tmp.origWidth - Math.abs(xDif));
			newHeight = Math.max(30, (yDif > 0) ? this.tmp.origHeight + yDif : this.tmp.origHeight - Math.abs(yDif));
			
			elemStyle = this.element.style;
			elemStyle.width = newWidth + "px";
			elemStyle.height = newHeight + "px";
			
			this.parentDimensions = { x : newWidth, y : newHeight };
			this.syncScrolls();
			clearTextSelections();
			this.options.onResizeGrid(newWidth, newHeight);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.endResizeGrid = function(event) {
		removeEvent(document, this.moveEvt, this.tmp.boundMoveEvt);
		removeEvent(document, this.endEvt, this.tmp.boundEndEvt);
		this.options.onResizeGridEnd(this.parentDimensions.x, this.parentDimensions.y);
		this.tmp = undefined;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.delegateHeaderEvent = function(event) {
		var event = event || window.event, 
		    target = event.target || event.srcElement, 
		    targetClass = target.className || "";
		
		if (event.button !== 2) {
			if (this.options.allowColumnResize && targetClass.indexOf("mgRS") > -1) {
				return this.initResizeColumn(event, target, targetClass);
			} else if (this.options.allowClientSideSorting) {
				this.sortColumn(target, targetClass);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.initResizeColumn = function(event, target, targetClass) {
		var colIdx = parseInt(targetClass.replace(/mgRS/g, ""), 10), 
		    doc = document;
		
		this.tmp = {
			lastLeft : -1, 
			colIdx : colIdx, 
			origX : getEventPositions(event, "client").x, 
			origWidth : this.columnWidths[colIdx], 
			origLeft : target.offsetLeft, 
			boundMoveEvt : bind(this.resizeColumn, this), 
			boundEndEvt : bind(this.endResizeColumn, this), 
			dragger : doc.createElement("DIV")
		};
		
		this.tmp.dragger.className = "mgResizeDragger";
		this.tmp.dragger.style.left = this.tmp.origLeft + "px";
		this.base.insertBefore(this.tmp.dragger, this.base.firstChild);
		
		addEvent(doc, this.moveEvt, this.tmp.boundMoveEvt);
		addEvent(doc, this.endEvt, this.tmp.boundEndEvt);
		return stopEvent(event);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.resizeColumn = function(event) {
		var clientX = getEventPositions(event || window.event, "client").x, 
		    xDif = clientX - this.tmp.origX, 
		    newWidth = Math.max(15, (xDif > 0) ? this.tmp.origWidth + xDif : this.tmp.origWidth - Math.abs(xDif)), 
		    newLeft = (xDif > 0) ? this.tmp.origLeft + xDif : this.tmp.origLeft - Math.abs(xDif);
		
		this.tmp.newWidth = newWidth;
		if (this.tmp.lastLeft !== newLeft && newWidth > 15) {
			this.tmp.dragger.style.left = newLeft + "px";
			this.tmp.lastLeft = newLeft;
		}
		
		clearTextSelections();
		this.options.onResizeColumn(this.tmp.colIdx, newWidth);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.endResizeColumn = function(event) {
		var newWidth = this.tmp.newWidth || this.tmp.origWidth, 
		    colIdx = this.tmp.colIdx;
		
		removeEvent(document, this.moveEvt, this.tmp.boundMoveEvt);
		removeEvent(document, this.endEvt, this.tmp.boundEndEvt);
		
		this.tmp.dragger.parentNode.removeChild(this.tmp.dragger);
		this.css.rules[".mgCl" + colIdx]["width"] = newWidth + "px";
		this.css.rules[".mgRS" + colIdx]["margin-left"] = (newWidth - 2) + "px";
		this.columnWidths[colIdx] = newWidth;
		this.setRules();
		this.syncScrolls();
		this.options.onResizeColumnEnd(colIdx, newWidth);
		this.tmp = undefined;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.sortColumn = function(target, targetClass) {
		var colIdx, colSortAs;
		
		if (this.hasBody) {
			while (targetClass.indexOf("mgCl") === -1 && targetClass !== "mgHead") {
				targetClass = (target = target.parentNode).className || "";
			}
			if (targetClass.indexOf("mgCl") > -1) {
				colIdx = parseInt(/mgCl(\d+)/.exec(targetClass)[1], 10);
				colSortAs = this.options.colSortTypes[colIdx] || "string";
				if (colSortAs !== "none") {
					colSortAs = (colIdx === this.lastSortedColumn) ? "reverse" : colSortAs;
					this.sortRawData(colIdx, colSortAs);
				}
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.sortRawData = function(colIdx, colSortAs) {
		var rawData = this.rawData, 
		    newSelIndexes = [], 
		    newIdxOrder = [], 
		    that = this, 
		    selIndexes, i;
		
		// Store prior index order:
		i = rawData.length;
		while (i) { rawData[--i].pIdx = i; }
		
		// Sort the body data by type:
		if (colSortAs === "reverse") {
			rawData.reverse();
		} else {
			rawData.sort(function(a, b) {
				return that.getSortResult(colSortAs, colIdx, a[colIdx], b[colIdx]);
			});
		}
		
		// Update the grid body HTML:
		this.convertDataItem(this.cellData.body, rawData, "<DIV class='mgC mgBR mgR", this.columns, false);
		this.generateGridBody();
		
		// Generate new sort order array:
		i = rawData.length;
		while (i) { newIdxOrder[--i] = rawData[i].pIdx; }
		
		// Fire sort event:
		this.options.onColumnSort(newIdxOrder.concat(), colIdx, this.lastSortedColumn);
		this.lastSortedColumn = colIdx;
		
		// Update selected row indexes if applicable:
		if (this.options.allowSelections && (selIndexes = this.selectedIndexes.concat()).length) {
			i = selIndexes.length;
			while (i) { newSelIndexes[--i] = indexOf(newIdxOrder, selIndexes[i]); }
			this.highlightRows((this.selectedIndexes = newSelIndexes), []);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.getSortResult = function(type, colIdx, a, b, keyA, keyB) {
		if (a === b) {
			return 0;
		}
		
		if (this.sortCache[(keyA = type + "_" + a)] === undefined) {
			this.sortCache[keyA] = (type === "string") ? a : 
			                       (type === "number") ? parseFloat(a) || -Infinity : 
			                       (type === "date") ? new Date(a).getTime() || -Infinity : 
			                       (type === "custom") ? this.options.customSortCleaner(a, colIdx) : a;
		}
		if (this.sortCache[(keyB = type + "_" + b)] === undefined) {
			this.sortCache[keyB] = (type === "string") ? b : 
			                       (type === "number") ? parseFloat(b) || -Infinity : 
			                       (type === "date") ? new Date(b).getTime() || -Infinity : 
			                       (type === "custom") ? this.options.customSortCleaner(b, colIdx) : b;
		}
		
		return (this.sortCache[keyA] < this.sortCache[keyB]) ? -1 : 1;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.toggleSelectAll = function(toggle) {
		var selIndexes = this.selectedIndexes, 
		    toSelect = [], toRemove = [], 
		    i;
		
		if (this.hasBody && this.options.allowSelections) {
			if (toggle) {
				toSelect = [0];
				if (this.options.allowMultipleSelections) {
					i = this.rawData.length;
					while (i) { toSelect[--i] = i; }
				}
				this.selectIndexes(toSelect);
			} else if (selIndexes.length) {
				toRemove = selIndexes.concat();
				this.selectedIndexes = [];
				this.highlightRows(toSelect, toRemove);
				this.options.onRowSelect(toSelect, toRemove, -1);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.selectIndexes = function(rowIndexes) {
		var selIndexes = this.selectedIndexes, 
		    toSelect = [], toRemove = [], 
		    i = rowIndexes.length, 
		    j = 0;
		
		if (i && this.hasBody && this.options.allowSelections) {
			if (this.options.allowMultipleSelections) {
				while (i) {
					if (indexOf(selIndexes, rowIndexes[--i]) === -1) {
						toSelect[j++] = rowIndexes[i];
					}
				}
			} else {
				toRemove = selIndexes.concat();
				toSelect[0] = rowIndexes[0];
				selIndexes = [];
			}
			
			this.selectedIndexes = selIndexes.concat(toSelect);
			this.highlightRows(toSelect, toRemove);
			this.options.onRowSelect(toSelect, toRemove, -1);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.selectRange = function(event) {
		var event = event || window.event, 
		    target = event.target || event.srcElement, 
		    targetClass = target.className || "", 
		    isCbSelect = (targetClass.indexOf("mgCb") > -1), 
		    rowIdx;
		
		if (event.button !== 2 && this.options.allowSelections) {
			while (targetClass.indexOf("mgBR") === -1 && targetClass !== "mgBody") {
				targetClass = (target = target.parentNode).className || "";
			}
			if (targetClass.indexOf("mgBR") > -1) {
				rowIdx = parseInt(/mgR(\d+)/.exec(targetClass)[1], 10);
				this.updateSelectedIndexes(rowIdx, event.ctrlKey || isCbSelect, event.shiftKey);
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.updateSelectedIndexes = function(rowIdx, ctrlPressed, shiftPressed) {
		var selIndexes = this.selectedIndexes.concat(), 
		    rowIdxSelected = (indexOf(selIndexes, rowIdx) > -1), 
		    toSelect = [], toRemove = [], 
		    startIdx, i, j, len;
		
		if (!this.options.allowMultipleSelections || !selIndexes.length || (!ctrlPressed && !shiftPressed)) {
			toSelect = (rowIdxSelected && selIndexes.length === 1) ? [] : [rowIdx];
			toRemove = selIndexes.concat();
		} else if (ctrlPressed) {
			toSelect = rowIdxSelected ? [] : [rowIdx];
			toRemove = rowIdxSelected ? [rowIdx] : [];
		} else if (shiftPressed) {
			if ((startIdx = selIndexes[0]) <= rowIdx) {
				for (i=startIdx + 1, j=0; i<=rowIdx; i++) {
					if (indexOf(selIndexes, i) === -1) { toSelect[j++] = i; }
				}
			} else {
				for (i=startIdx - 1, j=0; i>=rowIdx; i--) {
					if (indexOf(selIndexes, i) === -1) { toSelect[j++] = i; }
				}
			}
		}
		
		for (i=0, len=toRemove.length; i<len; i++) {
			if ((j = indexOf(selIndexes, toRemove[i])) > -1) { selIndexes.splice(j, 1); }
		}
		this.selectedIndexes = selIndexes.concat(toSelect);
		this.highlightRows(toSelect, toRemove);
		if (ctrlPressed || shiftPressed) {
			(!msie) ? clearTextSelections() : window.setTimeout(clearTextSelections, 25);
		}
		this.options.onRowSelect(toSelect, toRemove, rowIdx);
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.highlightRows = function(toSelect, toRemove) {
		var nodes = [this.bodyFixed2.children, this.bodyStatic.children], 
		    fixedSelBgColor = this.options.fixedSelectedBgColor, 
		    selBgColor = this.options.selectedBgColor, 
		    fixedCols = this.options.fixedCols, 
		    colIdx = this.columns, 
		    bgColor, rows, inputs, i;
		
		while (colIdx) {
			rows = (((--colIdx) < fixedCols) ? nodes[0] : nodes[1])[colIdx].children;
			bgColor = (colIdx < fixedCols) ? fixedSelBgColor : selBgColor;
			
			i = toRemove.length;
			while (i) { rows[toRemove[--i]].style.backgroundColor = ""; }
			
			i = toSelect.length;
			while (i) { rows[toSelect[--i]].style.backgroundColor = bgColor; }
		}
		if (this.options.showSelectionColumn && (inputs = nodes[0][0].getElementsByTagName("INPUT"))) {
			i = toRemove.length;
			while (i) { inputs[toRemove[--i]].checked = false; }
			
			i = toSelect.length;
			while (i) { inputs[toSelect[--i]].checked = true; }
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.preventSelectionInputStateChange = function(event) {
		var event = event || window.event, 
		    target = event.target || event.srcElement, 
		    targetClass = target.className || "", 
		    rowIdx;
		
		if (event.button !== 2) {
			if (targetClass.indexOf("mgCb") > -1 || targetClass.indexOf("mgRd") > -1) {
				do {
					targetClass = (target = target.parentNode).className || "";
				} while (targetClass.indexOf("mgBR") === -1 && targetClass !== "mgBody");
				
				if (targetClass.indexOf("mgBR") > -1) {
					rowIdx = parseInt(/mgR(\d+)/.exec(targetClass)[1], 10);
					(event.target || event.srcElement).checked = (indexOf(this.selectedIndexes, rowIdx) > -1);
				}
			}
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	Grid.prototype.cleanUp = function() {
		this.alignTimer = (this.alignTimer) ? window.clearTimeout(this.alignTimer) : null;
		this.element.innerHTML = "";
		try { this.css.sheet.parentNode.removeChild(this.css.sheet); } catch (e) {}
		return null;
	};
	
	//////////////////////////////////
	//
	// Utility Methods
	//
	//////////////////////////////////////////////////////////////////////////////////
	var getIEVersion = function() {
		var nav = navigator, 
		    version;
		
		if (nav.appName === "Microsoft Internet Explorer") {
			if (new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})").exec(nav.userAgent)) {
				version = parseFloat(RegExp.$1);
			}
		}
		return (version > 5) ? version : undefined;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var parseJSON = function(source) {
		var sourceType = typeof(source), 
		    json, win;
		
		if (sourceType === "string") {
			if (((win = window).JSON || {}).parse) {
				json = win.JSON.parse(source);
			} else {
				json = (function() { try { return (new Function("return " + source))(); } catch (e) { return; } })();
			}
		}
		
		return json || (sourceType === "object" && (json = source)) || null;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var parseXML = function(source) {
		var sourceType = typeof(source), 
		    dE, xml;
		
		if (sourceType === "string") {
			if (window.DOMParser) {
				xml = new DOMParser().parseFromString(source, "text/xml");
			} else if (window.ActiveXObject) {
				xml = new ActiveXObject("Microsoft.XMLDOM");
				xml.async = false;
				xml.loadXML(source);
			}
		} else if (sourceType === "object") {
			dE = (source.ownerDocument || source).documentElement || {};
			if (dE.nodeName && dE.nodeName.toUpperCase() !== "HTML") {
				xml = source;
			}
		}
		
		return xml || null;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var addEvent = function(elem, type, listener) {
		if (elem.addEventListener) {
			elem.addEventListener(type, listener, false);
		} else {
			elem.attachEvent("on" + type, listener);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var stopEvent = function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
			event.preventDefault();
		} else {
			event.returnValue = false;
			event.cancelBubble = true;
		}
		return false;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var removeEvent = function(elem, type, listener) {
		if (elem.removeEventListener) {
			elem.removeEventListener(type, listener, false);
		} else {
			elem.detachEvent("on" + type, listener);
		}
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var getEventPositions = function(event, type) {
		var doc, elem;
		
		// Client position:
		if (type === "client") {
			if (event.pageX !== undefined || event.pageY !== undefined) {
				return { x : event.pageX - window.pageXOffset, y : event.pageY - window.pageYOffset };
			}
			return { x : event.clientX, y : event.clientY };
		}
		
		// Page position:
		if (event.pageX === undefined || event.pageY === undefined) {
			elem = ((doc = document).documentElement.scrollLeft !== undefined) ? doc.documentElement : doc.body;
			return { x : event.clientX + elem.scrollLeft, y : event.clientY + elem.scrollTop };
		}
		return { x : event.pageX, y : event.pageY };
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var bind = function(func, that, args) {
		var args = [].concat(args || []), 
		    a = args.length;
		
		return function() {
			if (a || arguments.length) {
				for (var i=0, arg; arg=arguments[i]; i++) {
					args[a+i] = arg;
				}
				return func.apply(that, args);
			}
			return func.call(that);
		};
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var indexOf = function(arr, item) {
		if (arr.indexOf) {
			return arr.indexOf(item);
		}
		for (var i=0, len=arr.length; i<len; i++) {
			if (arr[i] === item) { return i; }
		}
		return -1;
	};
	
	//////////////////////////////////////////////////////////////////////////////////
	var clearTextSelections = (window.getSelection) ? 
		function() { window.getSelection().removeAllRanges(); return false; } : (document.selection) ? 
		function() { document.selection.empty(); return false; } : 
		function() { return false; };
	
	//////////////////////////////////////////////////////////////////////////////////
	var msie = getIEVersion();
	
	// Expose:
	window.Grid = Grid;
	
})(this, this.document);

