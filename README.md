Grid
====

HTML-based table with fixed headers, fixed footers, fixed left columns, row selection, sorting and more.

Demo
----

http://www.matts411.com/static/demos/grid/index.html

Features
--------

* Cross browser compatible (Chrome, Firefox, Safari, Opera, Internet Explorer 7+)
* Framework independent - Works with jQuery, Mootools, etc.
* Fixed header, footer, columns
* Column resizing
* Column sorting
* Grid resizing
* Row selection (singular and multi-select)
* Accepts JSON or XML as input or retrieves from DOM
* Tablet friendly

Installation
------------

Minify and add `src/Grid.js` and `src/Grid.css` to your website's resources 
directory. You can change some of the styling in Grid.css to suit your needs.

Usage
-----

Create a `div` element with an `id` attribute and preferably a fixed width and height:

    <div id="myGrid" style="width:800px;height:360px;"></div>

Initialize the grid using Javascript:

    var gridData = {
          Head : [["Header 1", "Header 2", "Header 3"]], 
          Body : [["Row 1, Cell 1", "Row 1, Cell 2", "Row 1, Cell 3"], 
                  ["Row 2, Cell 1", "Row 2, Cell 2", "Row 2, Cell 3"], 
                  ["Row 3, Cell 1", "Row 3, Cell 2", "Row 3, Cell <em>3</em>"]]
        };
    
    new Grid("myGrid", {
      srcType : "json", 
      srcData : gridData, 
      allowGridResize : true, 
      allowColumnResize : true, 
      allowClientSideSorting : true, 
      allowSelections : true, 
      allowMultipleSelections : true, 
      showSelectionColumn : true, 
      fixedCols : 1
    });

Grid data can also be in XML format or retrieved from the DOM:

    <table id="myGridTable">
      <thead>
        <tr><td>Header 1</td><td>Header 2</td><td>Header 3</td></tr>
      </thead>
      <tbody>
        <tr><td>Row 1, Cell 1</td><td>Row 1, Cell 2</td><td>Row 1, Cell 3</td></tr>
        <tr><td>Row 2, Cell 1</td><td>Row 2, Cell 2</td><td>Row 2, Cell 3</td></tr>
        <tr><td>Row 3, Cell 1</td><td>Row 3, Cell 2</td><td>Row 3, Cell <em>3</em></td></tr> <!-- In XML the <em> tags would be escaped -->
      </tbody>
    </table>

See the demo source code for a full example.

Options
-------

**srcType**  
String. Must be either `"dom"`, `"json"` or `"xml"`. For best performance use `"json"`. If using `"dom"`, make sure to wrap your table rows 
in `<thead>`, `<tbody>` and `<tfoot>` elements.  
Default is `""`.

**srcData**  
Variable. If `srcType` is `"dom"`, an HTMLTableElement or string ID for an HTMLTableElement is accepted. If `srcType` is `"json"`, a json 
string or object is accepted. If `srcType` is `"xml"`, an xml string or document is accepted.  
Default is `""`.

**allowGridResize**  
Boolean. Whether or not the user can resize the grid.  
Default is `false`.

**allowColumnResize**  
Boolean. Whether or not the user can resize columns. Disabled automatically in touch devices.  
Default is `false`.

**allowClientSideSorting**  
Boolean. Whether or not the user can sort column data. For ajax-based sorting set this to false and integrate something custom yourself. 
Note you can use HTML within the grid data input to add ID's, events, etc.  
Default is `false`.

**allowSelections**  
Boolean. Whether or not the user can select rows.  
Default is `false`.

**allowMultipleSelections**  
Boolean. Wether or not the user can select multiple rows. `allowSelections` must be `true` if this option is set to `true`.  
Default is `false`.

**showSelectionColumn**  
Boolean. Whether or not to show a radio or checkbox column in the grid to aid in row selection. `allowSelections` must be 
`true` if this option is set to `true`.  
Default is `false`.

**onColumnSort**
Function. If `allowClientSideSorting` is `true`, this function will be called immediately after a user sorts a column. Returned 
in `arguments` are an array of the new row indexes order with their prior index order values, the sorted column index and the prior 
sorted column index if it exists. To sort a column programmatically, call the 
`myGridInstanceObject.sortColumn((int) columnIndex, (boolean) sortAscending)` method.  
Default is a function that does nothing.

**onResizeGrid**  
Function. If `allowGridResize` is `true`, this function will be called as the user resizes the grid. Returned in `arguments` are 
the current width and height of the grid in pixels.  
Default is a function that does nothing.

**onResizeGridEnd**  
Function. If `allowGridResize` is `true`, this function will be called after the user finishes resizing the grid. Returned in 
`arguments` are the new width and height of the grid in pixels.  
Default is a function that does nothing.

**onResizeColumn**  
Function. If `allowColumnResize` is `true`, this function will be called as the user resizes a column. Returned in `arguments` are 
the column index and current width of the column in pixels.  
Default is a function that does nothing.

**onResizeColumnEnd**  
Function. If `allowColumnResize` is `true`, this function will be called after the user finishes resizing a column. Returned in 
`arguments` are the column index and new width of the column in pixels.  
Default is a function that does nothing.

**onRowSelect**  
Function. If `allowSelections` is `true`, this function will be called after the user selects one or more (shift key) rows. 
Returned in `arguments` are an array of newly selected row indexes, an array of newly unselected row indexes and the row index which 
was clicked on. To access all of the currently selected row indexes, look at the `myGridInstanceObject.selectedIndexes` array. To 
select or unselect all rows, call the `myGridInstanceObject.toggleSelectAll(boolean)` method. To select one or more rows in particular, 
call the `myGridInstanceObject.selectIndexes(arrayOfRowIndexes)` method.  
Default is a function that does nothing.

**onLoad**  
Function. This function will be called after the grid finishes loading. No arguments are returned.  
Default is a function that does nothing.

**supportMultipleGridsInView**  
Boolean. Whether or not the grid code should support multiple grids in the same window. By default this is set to `false` for 
performance gain in CSS selectors.  
Default is `false`.

**fixedCols**  
Integer. The number of columns to fix starting from the leftmost column. If `showSelectionColumn` is `true` this option will 
automatically increment by 1. Disabled automatically in touch devices.  
Default is `0`.

**selectedBgColor**  
String. The color value to set as the background color for selected rows. `allowSelections` must be `true` for this option to be 
used.  
Default is `"#eaf1f7"`.

**fixedSelectedBgColor**  
String. The color value to set as the background color for selected, fixed rows. `allowSelections` must be `true` and `fixedCols` > 0 
for this option to be used.  
Default is `"#dce7f0"`.

**colAlign**  
Array. An array of strings specifying column text alignment. `colAlign[0]` specifies the 1st column's text alignment, and so forth. 
Accepted array values are `"left"`, `"center"` and `"right"`.  
Default is `"left"` for every column.

**colBGColors**  
Array. An array of strings specifying column background color. `colBGColors[0]` specifies the 1st column's background color, and so 
forth.  
Default is `"#ffffff"` for every column.

**colSortTypes**  
Array. An array of string specifying column sort types. `colSortTypes[0]` specifies the 1st column's sort type, and so forth. 
`allowClientSideSorting` must be `true` for this option to be used. Accepted array values are `"string"`, `"number"`, `"date"`, 
`"custom"` and `"none"`. Use `"none"` to disable sorting for a particular column.  
Default is `"string"` for every column except the column created by setting `showSelectionColumn` to `true`.

**customSortCleaner**  
Function. If a column sort type specified in `colSortTypes` is set to `"custom"`, this function will be called on every cell value 
within the column being sorted. ie, it is used within Javascript's native sort() function. Returned in `arguments` are the cell 
value and the column index being sorted on. You may want to use this option, for example, to sanitize formatted numbers for sorting 
comparisons.  
Default is `null`.

Future Features
---------------

None scheduled at this time.

License
-------

MIT License.  
Copyright (c) 2018 Matt V. Murphy | bW11cnBoMjExQGdtYWlsLmNvbQ==
