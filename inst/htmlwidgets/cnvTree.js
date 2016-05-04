HTMLWidgets.widget({

    name: 'cnvTree',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            widgetMargin: 10, // marging between widgets
            tree_r: 3, // tree node radius
            indicatorWidth: 7, // width of the selected single cell indicator
            groupAnnotWidth: 10, // width of the selected single cell group annotation
            defaultNodeColour: "#3458A5",
            highlightColour: "#000000",
            linkHighlightColour: "#000000",
            defaultLinkColour: "#838181",
            chromLegendHeight: 15,
            cnvLegendWidth: 50,
            groupAnnotStart: 140, // starting y-pixel for group annotation legend
            titleHeight: 14, // height of legend titles
            rectHeight: 12, // rectangle in legend
            spacing: 2, // spacing between legend rectangles
            fontHeight: 12
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
        config.cnvTop = 0;
        config.cnvBottom = (config.cnvHeight-config.chromLegendHeight);

        // indicator configurations
        config.indicatorHeight = config.height;

        // group annotation configurations
        config.groupAnnotHeight = config.height;

        // cnv legend configurations
        config.cnvLegendHeight = config.height;

        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var config = vizObj.generalConfig;

        // GET PARAMS FROM R

        vizObj.userConfig = x;
        vizObj.view.groupsSpecified = (vizObj.userConfig.sc_groups != null); // (T/F) group annotation is specified

        // UPDATE GENERAL PARAMS, GIVEN USER PARAMS

        // if group annotation specified, reduce the width of the tree
        if (vizObj.view.groupsSpecified) {
            config.treeWidth -= config.groupAnnotWidth;
        }

        // GET CNV CONTENT

        // cnv plot number of rows & columns
        vizObj.view.cnv = {};
        vizObj.view.cnv.nrows = vizObj.userConfig.sc_ids_ordered.length;
        vizObj.view.cnv.ncols = Math.floor(config.cnvWidth);

        // height of each cnv row
        vizObj.view.cnv.rowHeight = (1/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight);

        // get group annotation info as object w/properties group : [array of single cells]
        if (vizObj.view.groupsSpecified) {
            _reformatGroupAnnots(vizObj);
        }

        console.log("vizObj");
        console.log(vizObj);

        // COLOURS

        // cnv colour scale
        var maxCNV = 6;
        var colorScale = d3.scale.ordinal()
            .domain([0,1,2,3,4,5,6])
            .range(["#2e7aab", "#73a9d4", "#D6D5D5", "#fec28b", "#fd8b3a", "#ca632c", "#954c25"]);

        // group annotation colours
        if (vizObj.view.groupsSpecified) {
            vizObj.view.colour_assignment = _getColours(_.uniq(_.pluck(vizObj.userConfig.sc_groups, "group")));
        }

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

        // GROUP ANNOTATION SVG

        if (vizObj.view.groupsSpecified) {
            var groupAnnotSVG = containerDIV
                .append("svg:svg")
                .attr("class", "groupAnnotSVG")
                .attr("width", config.groupAnnotWidth + "px")
                .attr("height", config.groupAnnotHeight + "px")
        }

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
            .nodes(vizObj.userConfig.tree_nodes)
            .links(vizObj.userConfig.tree_edges)
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

        var link = treeSVG
            .append("g")
            .classed("links", true)
            .selectAll(".link")
            .data(vizObj.userConfig.tree_edges)
            .enter().append("line")
            .classed("link", true)
            .attr("id", function(d) { 
                return d.link_id; 
            })
            .style("stroke","#838181")
            .on("mouseover", function(d) {
                // if there's no node or link selection taking place, highlight downstream links
                if (_checkForSelections()) {
                    return _linkMouseover(vizObj, d.link_id);                     
                }
            })
            .on("mouseout", function(d) { 
                // if there's no node or link selection taking place, reset the links
                if (_checkForSelections()) {
                    return _linkMouseout(vizObj); 
                }
            });

        var node = treeSVG
            .append("g")
            .classed("nodes", true)
            .selectAll(".node")
            .data(vizObj.userConfig.tree_nodes)
            .enter().append("circle")
            .classed("node", true)
            .attr("id", function(d) {
                return "node_" + d.name;
            })
            .attr("r", config.tree_r)
            .style("fill", function(d) {
                // group annotations specified -- colour by group
                if (vizObj.view.groupsSpecified) {
                    var group = _.findWhere(vizObj.userConfig.sc_groups, {single_cell_id: d.name}).group;
                    return vizObj.view.colour_assignment[group];
                }
                // no group annotations -- default colour
                return config.defaultNodeColour;
            })
            .style("stroke", "#838181")
            .on('mouseover', function(d) {
                // if there's no node or link selection taking place
                if (_checkForSelections()) {
                    // show tooltip
                    nodeTip.show(d);

                    // highlight node
                    _highlightNode(d.name, vizObj);

                    // highlight indicator
                    _highlightIndicator(d.name, vizObj);
                }
            })
            .on('mouseout', function(d) {
                // if there's no node or link selection taking place
                if (_checkForSelections()) {
                    // hide tooltip
                    nodeTip.hide(d);

                    // reset node
                    _resetNode(d.name, vizObj);

                    // reset indicator
                    _resetIndicator(d.name);
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

        var gridCellsG = cnvSVG
            .append("g")
            .classed("gridCells", true)

        // for each single cell
        for (var i = 0; i < vizObj.userConfig.sc_ids_ordered.length; i++) {
            var cur_sc = vizObj.userConfig.sc_ids_ordered[i];
            var cur_data = vizObj.userConfig.pixel_info[[cur_sc]]; 
               
            gridCellsG
                .selectAll(".gridCell.sc_"+cur_sc)
                .data(cur_data)
                .enter()
                .append("rect")
                .attr("class", function(d) {
                    // group annotation
                    var group = (vizObj.view.groupsSpecified) ?
                        _.findWhere(vizObj.userConfig.sc_groups, {single_cell_id: d.sc_id}).group : "none";
                    return "gridCell sc_" + d.sc_id + " group_" + group;
                })
                .attr("x", function(d) { return d.px; })
                .attr("y", function(d) { 
                    var sc_index = vizObj.userConfig.sc_ids_ordered.indexOf(cur_sc);
                    d.y = (sc_index/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight);
                    return d.y; 
                })
                .attr("height", vizObj.view.cnv.rowHeight)
                .attr("width", function(d) { return d.px_width; })
                .attr("fill", function(d) { 
                    // cnv data, but above max cnv value
                    if (d.mode_cnv > maxCNV) {
                        return colorScale(maxCNV);
                    }
                    // regular cnv data
                    return colorScale(d.mode_cnv);
                })
                .on("mouseover", function(d) {
                    if (_checkForSelections()) {
                        // show indicator tooltip & highlight indicator
                        indicatorTip.show(d.sc_id, d3.select(".indic.sc_" + d.sc_id).node());
                        _highlightIndicator(d.sc_id, vizObj);

                        // highlight node
                        _highlightNode(d.sc_id, vizObj);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections()) {
                        // hide indicator tooltip & unhighlight indicator
                        indicatorTip.hide(d.sc_id);
                        _resetIndicator(d.sc_id);

                        // reset node
                        _resetNode(d.sc_id, vizObj);
                    }
                });

        }

        // PLOT CHROMOSOME LEGEND
        var chromBoxes = cnvSVG
            .append("g")
            .classed("chromLegend", true)
            .selectAll(".chromBoxG")
            .data(vizObj.userConfig.chrom_boxes)
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
            .attr("font-family", "sans-serif")
            .text(function(d) { return d.chr; })
            .attr("font-size", "8px");

        // PLOT INDICATOR RECTANGLES

        var indicators = indicatorSVG
            .append("g")
            .classed("indicators", true)
            .selectAll(".indic")
            .data(vizObj.userConfig.sc_ids_ordered)
            .enter()
            .append("rect")
            .attr("class", function(d) {
                return "indic sc_" + d;
            })
            .attr("x", 0)
            .attr("y", function(d) { 
                var index = vizObj.userConfig.sc_ids_ordered.indexOf(d);
                return (index/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight); 
            })
            .attr("height", vizObj.view.cnv.rowHeight)
            .attr("width", config.indicatorWidth)
            .attr("fill", config.highlightColour)
            .attr("fill-opacity", 0)
            .attr("stroke", "none")
            .on("mouseover", function(d) {
                // if there's no node or link selection taking place
                if (_checkForSelections()) {

                    // show tooltip
                    indicatorTip.show(d, d3.select(this).node());

                    // highlight node
                    _highlightNode(d, vizObj);

                    // highlight indicator
                    _highlightIndicator(d, vizObj);
                }
            })
            .on("mouseout", function(d) {
                // if there's no node or link selection taking place
                if (_checkForSelections()) {

                    // hide tooltip
                    indicatorTip.hide(d);

                    // reset node
                    _resetNode(d, vizObj);

                    // reset indicator
                    _resetIndicator(d);
                }
            });
        
        // PLOT GROUP ANNOTATION COLUMN

        if (vizObj.view.groupsSpecified) {
            var groupAnnot = groupAnnotSVG
                .append("g")
                .classed("groupAnnotG", true)
                .selectAll(".groupAnnot")
                .data(vizObj.userConfig.sc_groups)
                .enter()
                .append("rect")
                .attr("class", function(d) {
                    return "groupAnnot group_" + d.group;
                })
                .attr("x", 0)
                .attr("y", function(d) { 
                    var index = vizObj.userConfig.sc_ids_ordered.indexOf(d.single_cell_id);
                    return (index/vizObj.view.cnv.nrows)*(config.cnvHeight-config.chromLegendHeight); 
                })
                .attr("height", vizObj.view.cnv.rowHeight)
                .attr("width", config.groupAnnotWidth-3)
                .attr("fill", function(d) {
                    return vizObj.view.colour_assignment[d.group];
                })
                .attr("stroke", "none")
                .on("mouseover", function(d) {
                    if (_checkForSelections()) {
                        // highlight indicator & node for all sc's with this group annotation id,
                        // highlight group annotation rectangle in legend
                        _mouseoverGroupAnnot(d.group, vizObj);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections()) {
                        // reset indicators, nodes, group annotation rectangles in legend
                        _mouseoutGroupAnnot(vizObj);
                    }
                });
        }

        // PLOT CNV LEGEND

        // CNV legend title
        cnvLegendSVG.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "+0.71em")
            .attr("font-family", "sans-serif")
            .attr("font-size", config.titleHeight)
            .text("CNV");

        // CNV legend rectangle / text group
        var cnvLegendG = cnvLegendSVG
            .selectAll(".cnvLegendG")
            .data(colorScale.domain())
            .enter()
            .append("g")
            .classed("cnvLegendG", true);

        // CNV legend rectangles
        cnvLegendG
            .append("rect")
            .attr("x", 0)
            .attr("y", function(d,i) {
                return config.titleHeight + config.spacing*2 + i*(config.rectHeight + config.spacing);
            })
            .attr("height", config.rectHeight)
            .attr("width", config.rectHeight)
            .attr("fill", function(d) {
                return colorScale(d);
            });

        // CNV legend text
        cnvLegendG
            .append("text")
            .attr("x", config.rectHeight + config.spacing)
            .attr("y", function(d,i) {
                return config.titleHeight + config.spacing*2 + i*(config.rectHeight + config.spacing) + 
                    (config.fontHeight/2);
            })
            .attr("dy", "+0.35em")
            .text(function(d) { 
                if (d==maxCNV) {
                    return ">=" + d;
                }
                return d; 
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", config.fontHeight)
            .style("fill", "black");

        // GROUP ANNOTATION LEGEND
        if (vizObj.view.groupsSpecified) {

            // group annotation legend title
            cnvLegendSVG.append("text")
                .attr("x", 0)
                .attr("y", config.groupAnnotStart)
                .attr("dy", "+0.71em")
                .attr("font-family", "sans-serif")
                .attr("font-size", config.titleHeight)
                .text("Group");

            // group annotation legend rectangle / text group
            var groupAnnotLegendG = cnvLegendSVG
                .selectAll(".groupAnnotLegendG")
                .data(Object.keys(vizObj.data.groups))
                .enter()
                .append("g")
                .classed("groupAnnotLegendG", true);

            // group annotation legend rectangles
            groupAnnotLegendG
                .append("rect")
                .attr("class", function(d) { return "legendGroupRect group_" + d; })
                .attr("x", 0)
                .attr("y", function(d,i) {
                    return config.groupAnnotStart + config.titleHeight + config.spacing*2 + i*(config.rectHeight + config.spacing);
                })
                .attr("height", config.rectHeight)
                .attr("width", config.rectHeight)
                .attr("fill", function(d) {
                    return vizObj.view.colour_assignment[d];
                })
                .on("mouseover", function(d) {
                    if (_checkForSelections()) {
                        // highlight indicator & node for all sc's with this group annotation id,
                        // highlight group annotation rectangle in legend
                        _mouseoverGroupAnnot(d, vizObj);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections()) {
                        // reset indicators, nodes, group annotation rectangles in legend
                        _mouseoutGroupAnnot(vizObj);
                    }
                });

            // group annotation legend text
            groupAnnotLegendG
                .append("text")
                .attr("class", function(d) { return "legendGroupText group_" + d; })
                .attr("x", config.rectHeight + config.spacing)
                .attr("y", function(d,i) {
                    return config.groupAnnotStart + config.titleHeight + config.spacing*2 + i*(config.rectHeight + config.spacing) + (config.fontHeight/2);
                })
                .attr("dy", "+0.35em")
                .text(function(d) { return d; })
                .attr("font-family", "sans-serif")
                .attr("font-size", config.fontHeight)
                .attr("fill", "black")
                .on("mouseover", function(d) {
                    if (_checkForSelections()) {
                        // highlight indicator & node for all sc's with this group annotation id,
                        // highlight group annotation rectangle in legend
                        _mouseoverGroupAnnot(d, vizObj);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections()) {
                        // reset indicators, nodes, group annotation rectangles in legend
                        _mouseoutGroupAnnot(vizObj);
                    }
                });
        }


        // brush selection
        var brush = d3.svg.brush()
            .y(d3.scale.linear().domain([0, config.cnvHeight]).range([0, config.cnvHeight]))
            .on("brushstart", function() { d3.select(".cnvSVG").classed("brushed", true); })
            .on("brushend", brushEnd);

        cnvSVG.append("g")
            .attr("class", "brush")
            .call(brush)
            .selectAll('rect')
            .attr('width', config.cnvWidth)

        function brushEnd() {
            var selectedSCs = [];
            var extent = d3.event.target.extent();
            if (!brush.empty()) {

                // highlight selected grid cell rows
                d3.selectAll(".gridCell").classed("active", function(d) {
                    var brushed = extent[0] <= (d.y+vizObj.view.cnv.rowHeight) && d.y <= extent[1];
                    if (brushed) {
                        selectedSCs.push(d.sc_id);
                    }
                    return brushed;
                });

                // highlight selected sc's indicators & nodes
                selectedSCs.forEach(function(sc_id) {
                    _highlightIndicator(sc_id, vizObj);   
                    _highlightNode(sc_id, vizObj);    
                });
            } else {
                d3.select(".cnvSVG").classed("brushed", false)

                // reset nodes and indicators
                _resetNodes(vizObj);
                _resetIndicators();
            }

            // clear brush
            d3.select(".brush").call(brush.clear());
        }

    },

    resize: function(el, width, height, instance) {

    }

});
