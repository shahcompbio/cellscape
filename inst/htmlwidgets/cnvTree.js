HTMLWidgets.widget({

    name: 'cnvTree',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            widgetMargin: 10, // marging between widgets
            tree_r: 3, // tree node radius
            indicatorWidth: 10, // width of the selected single cell indicator
            defaultNodeColour: "#3458A5",
            highlightRed: "#F73A3A",
            linkHighlightRed: "#FF5F5F",
            defaultLinkColour: "#838181",
            chromLegendHeight: 15,
            cnvLegendWidth: 50
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // general configurations
        var config = $.extend(true, {}, defaults);
        config.width = width - 15; // - 15 because vertical scrollbar takes 15 px
        config.height = height - 15; // - 15 because vertical scrollbar takes 15 px

        // tree configurations
        config.treeWidth = config.width/2 - config.indicatorWidth/2 - config.cnvLegendWidth/2;
        config.treeHeight = config.height;

        // cnv configurations
        config.cnvWidth = config.width/2 - config.indicatorWidth/2 - config.cnvLegendWidth/2;
        config.cnvHeight = config.height;

        // indicator configurations
        config.indicatorHeight = config.height;

        // cnv legend configurations
        config.cnvLegendHeight = config.height;

        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var config = vizObj.generalConfig;

        // GET PARAMS FROM R

        vizObj.userConfig = x;

        // GET TREE CONTENT

        _getTreeInfo(vizObj)

        // GET CNV CONTENT

        // sorted single cell ids
        var sc_id_order = vizObj.userConfig.sc_id_order;
        var sc_ids = _.uniq(_.pluck(vizObj.userConfig.cnv_data, "single_cell_id"));
        if (sc_id_order == "NA") {
            vizObj.data.sc_ids = sc_ids;
        }
        else {
            vizObj.data.sc_ids = [];
            sc_id_order.forEach(function(key) {
                if (sc_ids.indexOf(key) != -1) {
                    vizObj.data.sc_ids.push(key);
                }
            })
        }

        // chromosomes
        vizObj.data.chroms = _.uniq(_.pluck(vizObj.userConfig.cnv_data, "chr")).sort(_sortAlphaNum);

        // cnv plot number of rows & columns
        vizObj.view.cnv = {};
        vizObj.view.cnv.nrows = vizObj.data.sc_ids.length;
        vizObj.view.cnv.ncols = Math.floor(config.cnvWidth);

        // get bounds of chromosome
        vizObj.data.chrom_bounds = _getChromBounds(vizObj);

        // get the length of the genome 
        _getGenomeLength(vizObj.data.chrom_bounds);

        // create interval tree of segments for each chromosome of each single cell id
        vizObj.data.itrees = _getIntervalTree(vizObj);

        // set up empty pixel grid
        vizObj.view.cnv.pixels = _getEmptyGrid(vizObj);

        // fill pixel grid with chromosome information
        _fillPixelWithChromInfo(vizObj);

        // get chromosome box info
        _getChromBoxInfo(vizObj);

        console.log("vizObj");
        console.log(vizObj);

        // COLOUR SCALE

        var maxCNV = 6;
        var colorScale = d3.scale.ordinal()
            .domain([0,1,2,3,4,5,6])
            .range(["#176CA2", "#64A0D0", "#ABABAB", "#FEBC7E", "#FD7F25", "#C55215", "#8A390D"]);

        // CONTAINER DIV

        var containerDIV = d3.select(el)
            .append("div")
            .attr("class", "containerDIV")
            .style("position", "relative")
            .style("width", config.width + "px")
            .style("height", config.height + "px");

        // TREE SVG

        var treeSVG = containerDIV
            .append("svg:svg")
            .attr("class", "treeSVG")
            .attr("width", config.treeWidth + "px")
            .attr("height", config.treeHeight + "px")
            .on('dblclick', function() {

                // turn off node & link selection
                d3.selectAll(".nodeSelected")
                    .classed("nodeSelected",false);
                d3.selectAll(".linkSelected")
                    .classed("linkSelected",false);

                // reset nodes, links & indicators
                _resetNodes(vizObj);
                _resetLinks(vizObj);
                _resetIndicators();
            })

        // INDICATOR SVG

        var indicatorSVG = containerDIV
            .append("svg:svg")
            .attr("class", "indicatorSVG")
            .attr("width", config.indicatorWidth + "px")
            .attr("height", config.indicatorHeight + "px")

        // CNV SVG

        var cnvSVG = containerDIV
            .append("svg:svg")
            .attr("class", "cnvSVG")
            .attr("width", config.cnvWidth + "px")
            .attr("height", config.cnvHeight + "px")

        // CNV LEGEND SVG

        var cnvLegendSVG = containerDIV
            .append("svg:svg")
            .attr("class", "cnvLegendSVG")
            .attr("width", config.cnvLegendWidth + "px")
            .attr("height", config.cnvLegendHeight + "px")

        // FORCE FUNCTION

        var force = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .linkDistance(10)
            .gravity(.09)
            .charge(-20)
            .nodes(vizObj.data.tree_nodes)
            .links(vizObj.data.tree_edges)
            .start();

        // TOOLTIP FUNCTIONS

        var nodeTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Cell:</strong> <span style='color:white'>" + d.name + "</span>";
            });
        treeSVG.call(nodeTip);

        var indicatorTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Cell:</strong> <span style='color:white'>" + d + "</span>";
            });
        indicatorSVG.call(indicatorTip);

        // PLOT NODES AND EDGES

        var link_ids = []; // store link id's
        var link = treeSVG
            .append("g")
            .classed("links", true)
            .selectAll(".link")
            .data(vizObj.data.tree_edges)
            .enter().append("line")
            .classed("link", true)
            .attr("id", function(d) { 
                d.link_id = _getLinkId(d)
                link_ids.push(d.link_id);
                return d.link_id; 
            })
            .style("stroke","#838181")
            .on("mouseover", function(d) {
                // if there's no node or link selection taking place, highlight downstream links
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {
                    return _linkMouseover(vizObj, d.link_id, link_ids);                     
                }
            })
            .on("mouseout", function(d) { 
                // if there's no node or link selection taking place, reset the links
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {
                    return _linkMouseout(vizObj); 
                }
            })
            .on("click", function(d) {
                // if there's no node selection taking place
                if (d3.selectAll(".nodeSelected")[0].length == 0) {
                    
                    // if this link is selected, unselect it
                    if (d3.select(this).classed("linkSelected")) {
                        d3.select(this)
                            .classed("linkSelected", false);
                    }
                    // if link not selected, select it
                    else {
                        d3.select(this)
                            .classed("linkSelected", true);
                    }
                }
            })

        var node = treeSVG
            .append("g")
            .classed("nodes", true)
            .selectAll(".node")
            .data(vizObj.data.tree_nodes)
            .enter().append("circle")
            .classed("node", true)
            .attr("id", function(d) {
                return "node_" + d.name;
            })
            .attr("r", config.tree_r)
            .style("fill", config.defaultNodeColour)
            .style("stroke", "#838181")
            .on('mouseover', function(d) {

                // show tooltip
                nodeTip.show(d);

                // if there's no node or link selection taking place
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {
                    // highlight node
                    _highlightNode(d.name, vizObj);

                    // highlight indicator
                    _highlightIndicator(d.name);
                }
            })
            .on('mouseout', function(d) {

                // hide tooltip
                nodeTip.hide(d);

                // if there's no node or link selection taking place
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {

                    // reset node
                    _resetNode(d.name, vizObj);

                    // reset indicator
                    _resetIndicator(d.name);
                }
            })
            .on('click', function(d) {
                // if there's no link selection taking place
                if (d3.selectAll(".linkSelected")[0].length == 0) {

                    // hide tooltip
                    nodeTip.hide(d);

                    // if not already selected, add "selected" class
                    if (!d3.select(this).classed("nodeSelected")) {
                        d3.select(this)
                            .classed("nodeSelected", true);
                    }
                    // if selected, unselect
                    else {
                        d3.select(this)
                            .classed("nodeSelected", false);
                    }

                    // highlight node
                    _highlightNode(d.name, vizObj);

                    // highlight indicator
                    _highlightIndicator(d.name);
                }
            })
            .call(force.drag);

        force.on("tick", function() {

            node.attr("cx", function(d) { 
                    return d.x = Math.max(config.tree_r, Math.min(config.treeWidth - config.tree_r, d.x)); 
                })
                .attr("cy", function(d) { 
                    return d.y = Math.max(config.tree_r, Math.min(config.treeHeight - config.tree_r, d.y)); 
                });

            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

        });

        // PLOT CNV 

        var gridCell = cnvSVG
            .append("g")
            .classed("gridCells", true)
            .selectAll(".gridCell")
            .data(vizObj.view.cnv.pixels)
            .enter()
            .append("rect")
            .classed("gridCell", true)
            .attr("id", function(d) {
                return "cnv_" + d.sc_id;
            })
            .attr("x", function(d) { return d.col - d.px_length + 1; })
            .attr("y", function(d) { 
                return (d.row/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight); 
            })
            .attr("height", (1/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight))
            .attr("width", function(d) { return d.px_length; })
            .attr("fill", function(d) { 
                // no cnv data
                if (isNaN(d.mode_cnv)) {
                    // chromosome separator
                    if (d.separator) {
                        return "white";
                    }
                    // past the right side of the genome
                    else if (d.chr == "NA") {
                        return "white";
                    }
                    // NA value within the cnv data
                    else {
                        return "black";
                    }
                }
                // cnv data, but above max cnv value
                else if (d.mode_cnv > maxCNV) {
                    return colorScale(maxCNV);
                }
                // regular cnv data
                return colorScale(d.mode_cnv);
            })
            .append("title")
            .text(function(d) { return d.sc_id});

        // PLOT CHROMOSOME LEGEND
        var chromBoxes = cnvSVG
            .append("g")
            .classed("chromLegend", true)
            .selectAll(".chromBoxG")
            .data(vizObj.data.chrom_boxes)
            .enter().append("g")
            .attr("class", "chromBoxG")

        var nextColour = "#FFFFFF";
        chromBoxes.append("rect")
            .attr("class", function(d) { return "chromBox chr" + d.chr; })
            .attr("x", function(d) { return d.x; })
            .attr("y", config.cnvHeight-config.chromLegendHeight)
            .attr("height", config.chromLegendHeight)
            .attr("width", function(d) { return d.width; })
            .style("fill", function(d) { 
                if (nextColour == "#FFFFFF")
                    nextColour = "#F7F7F7";
                else
                    nextColour = "#FFFFFF";
                return nextColour;
            })

        chromBoxes.append("text")
            .attr("x", function(d) { return d.x + (d.width / 2); })
            .attr("y", config.cnvHeight - (config.chromLegendHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.chr; })
            .attr("font-size", "8px");

        // PLOT INDICATOR RECTANGLES

        var indicators = indicatorSVG
            .append("g")
            .classed("indicators", true)
            .selectAll(".indicator")
            .data(vizObj.data.sc_ids)
            .enter()
            .append("rect")
            .classed("indicator", true)
            .attr("id", function(d) {
                return "indic_" + d;
            })
            .attr("x", 0)
            .attr("y", function(d) { 
                var index = vizObj.data.sc_ids.indexOf(d);
                return (index/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight); 
            })
            .attr("height", (1/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight))
            .attr("width", config.indicatorWidth-3)
            .style("fill", config.highlightRed)
            .style("fill-opacity", 0)
            .on("mouseover", function(d) {
                // show tooltip
                indicatorTip.show(d);

                // if there's no node or link selection taking place
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {

                    // highlight node
                    _highlightNode(d, vizObj);

                    // highlight indicator
                    _highlightIndicator(d);
                }
            })
            .on("mouseout", function(d) {
                // hide tooltip
                indicatorTip.hide(d);

                // if there's no node or link selection taking place
                if ((d3.selectAll(".nodeSelected")[0].length == 0) &&
                    (d3.selectAll(".linkSelected")[0].length == 0)) {

                    // reset node
                    _resetNode(d, vizObj);

                    // reset indicator
                    _resetIndicator(d);
                }
            })
            .on("click", function(d) {
                // if there's no link selection taking place
                if (d3.selectAll(".linkSelected")[0].length == 0) {

                    // if not already selected, add "selected" class
                    if (!d3.select("#node_" + d).classed("nodeSelected")) {
                        d3.select("#node_" + d)
                            .classed("nodeSelected", true);

                        // highlight node
                        _highlightNode(d, vizObj);

                        // highlight indicator
                        _highlightIndicator(d);
                    }
                    // if selected, unselect
                    else {
                        d3.select("#node_" + d)
                            .classed("nodeSelected", false);
                        // reset node
                        _resetNode(d, vizObj);

                        // reset indicator
                        _resetIndicator(d);
                    }
                }
            });
        
        // PLOT CNV LEGEND

        // legend title
        var titleHeight = 14;
        cnvLegendSVG.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "+0.71em")
            .attr("font-family", "sans-serif")
            .attr("font-size", titleHeight)
            .text("Legend");

        // legend rectangle / text group
        var rectHeight = 12;
        var spacing = 2;
        var cnvLegendG = cnvLegendSVG
            .selectAll(".legendG")
            .data(colorScale.domain())
            .enter()
            .append("g")
            .classed("legendG", true);

        // legend rectangles
        cnvLegendG
            .append("rect")
            .attr("x", 0)
            .attr("y", function(d,i) {
                return titleHeight + spacing*2 + i*(rectHeight + spacing);
            })
            .attr("height", rectHeight)
            .attr("width", rectHeight)
            .attr("fill", function(d) {
                return colorScale(d);
            });

        // legend text
        var fontHeight = 12;
        cnvLegendG
            .append("text")
            .attr("x", rectHeight + spacing)
            .attr("y", function(d,i) {
                return titleHeight + spacing*2 + i*(rectHeight + spacing) + (fontHeight/2);
            })
            .attr("dy", "+0.35em")
            .text(function(d) { 
                if (d==maxCNV) {
                    return ">=" + d;
                }
                return d; 
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", fontHeight)
            .style("fill", "black");



    },

    resize: function(el, width, height, instance) {

    }

});
