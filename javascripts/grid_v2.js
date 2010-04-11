////////////////////////////////////
//
// Grid v2
//
////////////////////////////////////
var Grid = new Class({
	Implements : [Options, Class.Occlude], 
	
	options : {
		noCache : true, 
		allowResize : true, 
		fixedCols : 0, 
		src : ""
	}, 
	
	Css : {
		sheet : null, 
		rules : {
			grid_headMover : {}, 
			grid_bodyMover : {}, 
			grid_footMover : {}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	initialize : function(element, options) {
		this.element = document.id(element);
		if (this.occlude()) return this.occluded;
		this.setOptions(options);
		this.Css.sheet = new Element("STYLE", { "type" : "text/css" }).inject(document.head);
		this.generateSkeleton();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateSkeleton : function() {
		this.parentDimensions = this.element.getSize();
		this.base = new Element("DIV", { "class" : "grid_base" }).inject(this.element);
		this.head = new Element("DIV", { "class" : "grid_head" }).inject(this.base);
		this.body = new Element("DIV", { "class" : "grid_body" }).inject(this.base);
		this.foot = new Element("DIV", { "class" : "grid_foot" }).inject(this.base);
		
		this.fheadMover = new Element("DIV", { "class" : "grid_fheadMover" }).inject(this.head);
		this.fbodyContainer = new Element("DIV", { "class" : "grid_fbodyContainer" }).inject(this.body);
		this.fbodyMover = new Element("DIV", { "class" : "grid_fbodyMover" }).inject(this.fbodyContainer);
		this.ffootMover = new Element("DIV", { "class" : "grid_ffootMover" }).inject(this.foot);
		
		this.headMover = new Element("DIV", { "class" : "grid_headMover" }).inject(this.head);
		this.bodyMover = new Element("DIV", { "class" : "grid_bodyMover" }).inject(this.body);
		this.footMover = new Element("DIV", { "class" : "grid_footMover" }).inject(this.foot);
		
		if (this.options.allowResize) {
			this.baseResize = new Element("DIV", {
				"class" : "grid_baseResize", 
				"events" : {
					"mousedown" : this.initResizeGrid.bind(this)
				}
			}).inject(this.base);
		}
		
		new Request({
			method : "get", 
			url : this.options.src, 
			noCache : this.options.noCache
		}).addEvent("onComplete", this.parseData.bind(this)).send();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData : function(responseText, responseXML) {
		var grid = responseXML.getElementsByTagName("grid")[0];
		
		this.setAttributes(grid, this.base, "DOM");
		this.convertToCellData({
			"Head" : grid.getElementsByTagName("head")[0], 
			"Body" : grid.getElementsByTagName("body")[0], 
			"Foot" : grid.getElementsByTagName("foot")[0]
		});
		
		this.generateGrid();
		this.setDimensions(true);
		this.body.addEvent("scroll", this.syncScrolls.bind(this));
		this.alignColumns();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateGrid : function() {
		var _generate = function(rows, prefix, fixed) {
			var fixedCols = this.options.fixedCols;
			var rowClass = "class='grid_row" + ((fixed) ? " grid_fixedRow" : "") + " grid_" + prefix + "Row'";
			var html = [];
			var Slice = { "from" : ((fixed) ? 0 : fixedCols), "to" : ((fixed) ? fixedCols : 10000) };
			
			for (var i=0, row; row=rows[i]; i++) {
				html[i] = "<DIV row='" + i + "' " + rowClass + ">" + row.slice(Slice.from, Slice.to).join("") + "</DIV>";
			}
			
			return html.join("");
		}.bind(this);
		
		if (this.options.fixedCols > 0) {
			this.fheadMover.set("html", _generate(this.cellData.head, "head", 1));
			this.fbodyMover.set("html", _generate(this.cellData.body, "body", 1));
			this.ffootMover.set("html", _generate(this.cellData.foot, "foot", 1));
		}
		this.headMover.set("html", _generate(this.cellData.head, "head", 0));
		this.bodyMover.set("html", _generate(this.cellData.body, "body", 0));
		this.footMover.set("html", _generate(this.cellData.foot, "foot", 0));
		
		this.head.getElements("SPAN.grid_resizeSpan").each(function(resizer, index) {
			resizer.addEvent("mousedown", this.initResizeColumn.bind(this));
		}, this);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	convertToCellData : function(Body) {
		this.cellData = {
			head : [], 
			body : [], 
			foot : []
		};
		
		var _convert = function(arr, nodes, nClass, isHeader, isBody, isFooter) {
			var _row = 0;
			var _col = 0;
			
			for (var i=0, row; row=nodes[i]; i++) {
				_col = 0;
				arr[_row] = [];
				var cells = row.getElementsByTagName("cell");
				for (var j=0, cell; cell=cells[j]; j++) {
					arr[_row][_col] = "<DIV class='" + nClass.replace(/@@@/, _col) + "' " + this.setAttributes(cell, null, "String") + ">" + 
						((isHeader) ? "<SPAN class='grid_resizeSpan' col='" + _col + "'></SPAN>" : "") + 
						(cell.textContent || cell.text || "&nbsp;") + "</DIV>";
					_col++;
				}
				_row++;
			}
		}.bind(this);
		
		_convert(this.cellData.head, Body.Head.getElementsByTagName("row"), "grid_cell grid_headCell grid_col@@@", 1, 0, 0);
		_convert(this.cellData.body, Body.Body.getElementsByTagName("row"), "grid_cell grid_bodyCell grid_col@@@", 0, 1, 0);
		_convert(this.cellData.foot, Body.Foot.getElementsByTagName("row"), "grid_cell grid_footCell grid_col@@@", 0, 0, 1);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setDimensions : function(full) {
		if (full) {
			this.Heights = {
				head : this.headMover.offsetHeight,  
				foot : this.footMover.offsetHeight
			};
			
			this.head.setStyle("height", this.Heights.head);
			this.fbodyContainer.setStyle("top", this.Heights.head);
			this.bodyMover.setStyles({
				"padding-top" : this.Heights.head, 
				"padding-bottom" : this.Heights.foot
			});
			this.foot.setStyle("height", this.Heights.foot);
		}
		
		this.base.setStyles({
			"width" : this.parentDimensions.x, 
			"height" : this.parentDimensions.y
		});
		this.head.setStyle("width", this.parentDimensions.x - 16);
		this.body.setStyles({
			"width" : this.parentDimensions.x, 
			"height" : this.parentDimensions.y
		});
		this.fbodyContainer.setStyle("height", this.parentDimensions.y - this.Heights.head - this.Heights.foot - 16);
		this.foot.setStyle("width", this.parentDimensions.x - 16);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	alignColumns : function() {
		this.columnWidths = [];
		this.columns = this.cellData.head[0].length;
		this.lastWidth = 0;
		this.colIndex = 0;
		
		for (var i=0; i<this.columns; i++) {
			this.Css.rules["grid_col" + i] = this.Css.rules["grid_col" + i] || {};
			this.Css.rules["grid_col" + i]["display"] = "none";
		}
		this.setRules();
		
		(function() {
			this.Css.rules["grid_col" + this.colIndex] = {};
			this.setRules();
			
			var newWidth = 0;
			var offset = 5 * (this.colIndex + 1);
			if (this.colIndex < this.options.fixedCols) {
				newWidth = Math.max(this.fheadMover.offsetWidth, this.fbodyMover.offsetWidth, this.ffootMover.offsetWidth) - offset;
			} else {
				newWidth = Math.max(this.headMover.offsetWidth, this.bodyMover.offsetWidth, this.footMover.offsetWidth) - offset;
			}
			this.columnWidths[this.colIndex] = newWidth - this.lastWidth;
			this.Css.rules["grid_col" + this.colIndex]["width"] = this.columnWidths[this.colIndex] + "px";
			if (this.colIndex < this.options.fixedCols) {
				this.Css.rules["grid_headMover"]["padding-left"] = (newWidth + offset) + "px";
				this.Css.rules["grid_bodyMover"]["padding-left"] = (newWidth + offset) + "px";
				this.Css.rules["grid_footMover"]["padding-left"] = (newWidth + offset) + "px";
			}
			this.setRules();
			
			this.lastWidth = newWidth;
			this.colIndex++;
			if (this.colIndex < this.columns) {
				setTimeout(arguments.callee.bind(this), 25);
			}
		}.bind(this))();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setAttributes : function(fromEl, toEl, format) {
		var ats = fromEl.attributes;
		if (ats.length === 0) return;
		
		if (format === "DOM") {
			for (var i=0, atr; atr=ats[i]; i++) {
				if (atr.nodeName.toLowerCase() !== "class") {
					toEl.set(atr.nodeName, atr.nodeValue);
				}
			}
			return null;
		}
		
		if (format === "String") {
			var atts = [];
			for (var i=0, atr; atr=ats[i]; i++) {
				if (atr.nodeName.toLowerCase() !== "class") {
					atts[i] = atr.nodeName + "=" + atr.nodeValue;
				}
			}
			return atts.join(" ");
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	syncScrolls : function() {
		this.headMover.setStyle("margin-left", -1 * this.body.scrollLeft);
		this.footMover.setStyle("margin-left", -1 * this.body.scrollLeft);
		this.fbodyMover.setStyle("margin-top", -1 * this.body.scrollTop);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setRules : function() {
		var cssText = [], 
		    cssElText = [], 
		    i = 0, 
		    j = 0;
		
		for (var rule in this.Css.rules) {
			j = 0;
			cssElText = [];
			for (var prop in this.Css.rules[rule]) {
				cssElText[j++] = prop + " : " + this.Css.rules[rule][prop] + ";";
			}
			cssText[i++] = "." + rule + " { " + cssElText.join(" ") + " }";
		}
		
		if (Browser.Engine.trident) {
			this.Css.sheet.styleSheet.cssText = cssText.join(" ");
		} else {
			this.Css.sheet.set("text", cssText.join(" "));
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
		this.setDimensions(false);
		this.syncScrolls();
		
		if (!!window.getSelection) {
			window.getSelection().removeAllRanges();
		} else if (!!document.selection) {
			document.selection.empty();
		}
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
		var col = target.get("col").toInt();
		
		this.ResizeInfo = {
			resizer : target, 
			lPos : target.offsetLeft, 
			cIndex : col, 
			origWidth : this.columnWidths[col], 
			origX : event.page.x, 
			newWidth : this.columnWidths[col], 
			boundMouseMove : this.resizeColumn.bind(this), 
			boundMouseUp : this.endResizeColumn.bind(this)
		};
		
		this.ResizeInfo.dragger = new Element("DIV", {
			"class" : "grid_resizeDragger", 
			"styles" : { "left" : this.ResizeInfo.lPos, "height" : this.parentDimensions.y }
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
		var widthChange = event.page.x - this.ResizeInfo.origX;
		var newWidth = (widthChange >= 0) ? this.ResizeInfo.origWidth + widthChange : this.ResizeInfo.origWidth - (-1 * widthChange);
		newWidth = (newWidth < 15) ? 15 : newWidth;
		var newLeft = (widthChange >= 0) ? this.ResizeInfo.lPos + widthChange : this.ResizeInfo.lPos - (-1 * widthChange);
		
		this.ResizeInfo.newWidth = newWidth;
		if (newWidth > 15) {
			this.ResizeInfo.dragger.setStyle("left", newLeft);
		}
		
		if (!!window.getSelection) {
			window.getSelection().removeAllRanges();
		} else if (!!document.selection) {
			document.selection.empty();
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	endResizeColumn : function(event) {
		document.removeEvents({
			"mousemove" : this.ResizeInfo.boundMouseMove, 
			"mouseup" : this.ResizeInfo.boundMouseUp
		});
		
		this.ResizeInfo.dragger.dispose();
		this.Css.rules["grid_col" + this.ResizeInfo.cIndex]["width"] = this.ResizeInfo.newWidth + "px";
		this.setRules();
		this.columnWidths[this.ResizeInfo.cIndex] = this.ResizeInfo.newWidth;
		
		if (this.options.fixedCols > 0) {
			var leftPadding = this.fheadMover.offsetWidth; // fheadMover, fbodyMover, ffootMover offsetWidth all equal at this point no Math.max needed
			this.headMover.setStyle("padding-left", leftPadding);
			this.bodyMover.setStyle("padding-left", leftPadding);
			this.footMover.setStyle("padding-left", leftPadding);
		}
	}
});
