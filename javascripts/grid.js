////////////////////////////////////
//
// Grid
//
////////////////////////////////////
var Grid = new Class({
	Implements : [Options, Class.Occlude], 
	
	options : {
		src : "", 
		noCache : true
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	initialize : function(element, options) {
		this.element = document.id(element);
		if (this.occlude()) return this.occluded;
		this.setOptions(options);
		this.generateSkeleton();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateSkeleton : function() {
		this.parentDimensions = this.element.setStyle("overflow", "hidden").getSize();
		this.base = new Element("DIV").inject(this.element);
		this.thead = new Element("DIV").inject(this.base);
		this.tbody = new Element("DIV").inject(this.base);
		this.tfoot = new Element("DIV").inject(this.base);
		
		new Request({
			method : "get", 
			url : this.options.src, 
			noCache : this.options.noCache
		}).addEvent("onComplete", this.parseData.bind(this)).send();
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	parseData : function(responseText, responseXML) {
		var tableGrid = responseXML.getElementsByTagName("tableGrid")[0];
		
		this.setAttributes(tableGrid, this.base);
		this.generateTHead(tableGrid.getElementsByTagName("thead")[0]);
		this.generateTBody(tableGrid.getElementsByTagName("tbody")[0]);
		this.generateTFoot(tableGrid.getElementsByTagName("tfoot")[0]);
		
		this.base.addClass("grid_base");
		this.thead.addClass("grid_thead");
		this.tbody.addClass("grid_tbody");
		this.tfoot.addClass("grid_tfoot");
		
		this.alignColumns();
		this.setDimensions();
		this.tbody.addEvent("scroll", this.syncScrolls.bind(this));
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateTHead : function(thead) {
		this.setAttributes(thead, this.thead);
		this.theadTbl = new Element("TABLE", { "class" : "grid_theadTbl" }).inject(this.thead);
		this.theadTHd = new Element("THEAD").inject(this.theadTbl);
		
		for (var i=0, row; row=thead.childNodes[i]; i++) {
			if (row.tagName !== "tr") continue;
			
			var tr = new Element("TR");
			this.setAttributes(row, tr);
			for (var j=0, cell; cell=row.childNodes[j]; j++) {
				if (cell.tagName !== "th") continue;
				
				var th = new Element("TH");
				this.setAttributes(cell, th);
				th.addClass("grid_theadTh").set("html", "<DIV class='grid_theadThDiv'>" + (cell.textContent || cell.text || "") + "</DIV>").inject(tr);
			}
			if (tr.childNodes.length > 0) {
				tr.inject(this.theadTHd);
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateTBody : function(tbody) {
		this.setAttributes(tbody, this.tbody);
		this.tbodyTbl = new Element("TABLE", { "class" : "grid_tbodyTbl" }).inject(this.tbody);
		this.tbodyTBd = new Element("TBODY").inject(this.tbodyTbl);
		
		for (var i=0, row; row=tbody.childNodes[i]; i++) {
			if (row.tagName !== "tr") continue;
			
			var tr = new Element("TR");
			this.setAttributes(row, tr);
			for (var j=0, cell; cell=row.childNodes[j]; j++) {
				if (cell.tagName !== "td") continue;
				
				var td = new Element("TD");
				this.setAttributes(cell, td);
				td.addClass("grid_tbodyTd").set("html", "<DIV class='grid_tbodyTdDiv'>" + (cell.textContent || cell.text || "") + "</DIV>").inject(tr);
			}
			if (tr.childNodes.length > 0) {
				tr.inject(this.tbodyTBd);
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	generateTFoot : function(tfoot) {
		this.setAttributes(tfoot, this.tfoot);
		this.tfootTbl = new Element("TABLE", { "class" : "grid_tfootTbl" }).inject(this.tfoot);
		this.tfootTFt = new Element("TFOOT").inject(this.tfootTbl);
		
		for (var i=0, row; row=tfoot.childNodes[i]; i++) {
			if (row.tagName !== "tr") continue;
			
			var tr = new Element("TR");
			this.setAttributes(row, tr);
			for (var j=0, cell; cell=row.childNodes[j]; j++) {
				if (cell.tagName !== "td") continue;
				
				var td = new Element("TD");
				this.setAttributes(cell, td);
				td.addClass("grid_tfootTd").set("html", "<DIV class='grid_tfootTdDiv'>" + (cell.textContent || cell.text || "") + "</DIV>").inject(tr);
			}
			if (tr.childNodes.length > 0) {
				tr.inject(this.tfootTFt);
			}
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setAttributes : function(fromEl, toEl) {
		for (var i=0, atr; atr=fromEl.attributes[i]; i++) {
			toEl.set(atr.nodeName, atr.nodeValue);
		}
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	setDimensions : function() {
		this.theadDimensions = this.thead.getSize();
		this.tfootDimensions = this.tfoot.getSize();
		
		this.base.setStyles({
			"width" : this.parentDimensions.x, 
			"height" : this.parentDimensions.y
		});
		this.thead.setStyle("width", this.parentDimensions.x - 16);
		this.tbody.setStyles({
			"width" : this.parentDimensions.x, 
			"height" : this.parentDimensions.y - this.theadDimensions.y - this.tfootDimensions.y + 2, 
			"padding-top" : this.theadDimensions.y - 1, 
			"padding-bottom" : this.tfootDimensions.y - 1
		});
		this.tfoot.setStyle("width", this.parentDimensions.x - 16);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	alignColumns : function() {
		var colGroup = new Element("COLGROUP");
		var headCells = (this.theadTHd.rows.length > 0) ? this.theadTHd.rows[0].cells : [];
		var bodyCells = (this.tbodyTBd.rows.length > 0) ? this.tbodyTBd.rows[0].cells : [];
		var footCells = (this.tfootTFt.rows.length > 0) ? this.tfootTFt.rows[0].cells : [];
		var columnSum = 0;
		
		for (var i=0, hCell; hCell=headCells[i]; i++) {
			var bCell = bodyCells[i];
			var fCell = footCells[i];
			var width = Math.max(hCell.offsetWidth, bCell.offsetWidth, fCell.offsetWidth);
			new Element("COL", { styles : { width : width } }).inject(colGroup);
			columnSum += width;
		}
		
		colGroup.clone(true, false).inject(this.theadTbl, "top");
		this.theadTbl.setStyle("width", columnSum + 1);
		colGroup.clone(true, false).inject(this.tbodyTbl, "top");
		this.tbodyTbl.setStyle("width", columnSum + 1);
		colGroup.clone(true, false).inject(this.tfootTbl, "top");
		this.tfootTbl.setStyle("width", columnSum + 1);
	}, 
	
	//////////////////////////////////////////////////////////////////////////////////
	syncScrolls : function() {
		this.theadTbl.setStyle("margin-left", -1 * this.tbody.scrollLeft);
		this.tfootTbl.setStyle("margin-left", -1 * this.tbody.scrollLeft);
	}
});

