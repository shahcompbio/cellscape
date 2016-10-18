HTMLWidgets.widget({

    name: 'cellscape',

    type: 'output',

    initialize: function(el, width, height) {

        vizObj = {};
        vizObj.width = width;
        vizObj.height = height;

        return {}

    },

    renderValue: function(el, x, instance) {
        var view_id = el.id;

        // defaults
        var defaults = {
            // tree
            tree_r: 4, // tree node radius
            min_tree_r: 3.5, // minimum tree node radius
            max_tree_r: 5.5, // maximum tree node radius
            tree_w_labels_r: 7, // tree node radius when labels displayed within
            distOn: false, // whether or not we're scaling by edge distances
            treeOpacity: 1, // tree starts with opacity 1 
            graphOpacity: 0, // graph starts with opacity 0
            phantomRoot: "phantomRoot",

            // general padding (above main view, between views)
            paddingGeneral: 15,

            // annotations & indicator width
            annotColWidth: 7, // width of the selected single cell indicator and annotations columns

            // space between annotations and heatmap
            annotHmSpace: 3,

            // colours
            defaultNodeColour: "#A3A3A3",
            highlightColour: "#000000",
            linkHighlightColour: "#000000",
            defaultLinkColour: "#CECECE",

            // chromosome legend
            chromLegendHeight: 15, // height of chromosome legend

            // heatmap and genotype legends
            heatmapLegendWidth: 60,
            legendTitleHeight: 15, // height of legend titles
            rectHeight: 12, // rectangle in legend
            rectSpacing: 2, // spacing between legend rectangles
            legendFontHeight: 12,

            // top bar
            topBarHeight: 30, // height of top panel
            topBarColour: "#D9D9D9",
            topBarHighlight: "#C6C6C6",

            // switch between graph/tree
            switchView: true,

            // title
            viewTitle: "CELLSCAPE"
        };

        // global variable curVizObj
        curVizObj = {};
        curVizObj.data = {};
        curVizObj.view = {};
        curVizObj.view_id = view_id;

        console.log("curVizObj")
        console.log(curVizObj)
        // get params from R
        curVizObj.userConfig = x;
        curVizObj.view.gtypesSpecified = (curVizObj.userConfig.sc_annot_provided); // (T/F) genotype annotation is specified
        curVizObj.view.tpsSpecified = // (T/F) timepoint annotation is specified
            (curVizObj.userConfig.sc_annot_provided) ? curVizObj.userConfig.sc_annot[0]["timepoint"] : false;

        // selected single cells list & selected links list
        curVizObj.view.selectedSCs = [];
        curVizObj.view.selectedLinks = [];

        // more configurations
        curVizObj.generalConfig = $.extend(true, {}, defaults);
        var config = curVizObj.generalConfig;

        // width and height of view
        config.width = vizObj.width - 15;    
        config.cellscapeViewHeight;
        // user wants timescape 
        if (curVizObj.userConfig.timescape_wanted) {
            config.cellscapeViewHeight = (vizObj.height) * 2/3;
            config.tsViewHeight = (vizObj.height) * 1/3;
        } 
        // user only wants cellscape
        else {
            config.cellscapeViewHeight = (vizObj.height);
        }

        // view container configurations
        config.containerHeight = config.cellscapeViewHeight - config.topBarHeight;
        config.containerWidth = config.width;

        // vertical spacing required for the title of the heatmap/tree, and the space below it
        config.spacingForTitle = config.legendTitleHeight + config.rectSpacing*2;

        // heatmap configurations
        config.hmHeight = config.cellscapeViewHeight - config.topBarHeight - config.paddingGeneral*2 - config.spacingForTitle;

        // tree configurations
        config.treeHeight = config.cellscapeViewHeight - config.topBarHeight - config.paddingGeneral*2 - config.spacingForTitle;

        // heatmap legend start
        config.heatmapLegendStartY = 1 + config.paddingGeneral; // starting y-pixel for heatmap legend

        // UPDATE GENERAL PARAMS, GIVEN USER PARAMS

        // extend heatmapLegendWidth if timescape present
        if (curVizObj.userConfig.timescape_wanted) {
            config.heatmapLegendWidth = 110;
        }

        // tree configurations
        config.treeWidth = config.width - config.annotColWidth - config.heatmapLegendWidth - curVizObj.userConfig.heatmapWidth - config.paddingGeneral*2;

        // if genotype annotation specified, reduce the width of the tree
        if (curVizObj.view.gtypesSpecified) {
            config.treeWidth -= (config.annotColWidth + config.annotHmSpace); 
        }

        // if the timepoint annotation is specified, reduce the width of the tree further
        if (curVizObj.view.tpsSpecified) {
            config.treeWidth -= config.annotColWidth;
        }

        // if the type of data is cnv, reduce tree height to account for chromosome legend
        if (curVizObj.userConfig.heatmap_type == "cnv") {
            config.treeHeight -= config.chromLegendHeight;
        }

        // smallest tree dimension on the view (width or height)
        config.smallest_tree_dim = (config.treeWidth < config.treeHeight) ? config.treeWidth : config.treeHeight;

        // GET TREE CONTENT

        // get genotype tree structure
        if (curVizObj.userConfig.gtype_tree_edges) {
            // genotype tree edges from user
            var gtype_tree_edges = $.extend([], curVizObj.userConfig.gtype_tree_edges);

            // find tree root
            var cur_source = gtype_tree_edges[0].source;
            var source_as_target = // edge where the current source is the target
                _.findWhere(gtype_tree_edges, {"target": cur_source}); 
            while (source_as_target) { // iterate as long as there are edges with the current source as the target
                cur_source = source_as_target.source;
                source_as_target = _.findWhere(gtype_tree_edges, {"target": cur_source});
            }
            var rootName = cur_source;

            // add the phantomRoot to the tree edges array
            gtype_tree_edges.push({
                "source": curVizObj.generalConfig.phantomRoot,
                "target": rootName
            })

            // get tree structure
            var rootedTrees = []; // array of trees rooted at each node 
            for (var i = 0; i < gtype_tree_edges.length; i++) {
                var parent = _gt_findTreeByRoot(rootedTrees, gtype_tree_edges[i].source);
                var child = _gt_findTreeByRoot(rootedTrees, gtype_tree_edges[i].target);
                parent["children"].push(child);
            }
            var root_tree = _gt_findTreeByRoot(rootedTrees, curVizObj.generalConfig.phantomRoot); // phantom root tree
            curVizObj.data.gtypeTreeStructure = root_tree; 
        }

        // get all the tree info (descendants, ancestors, etc)
        _getTreeInfo(curVizObj, curVizObj.userConfig.sc_tree_edges, curVizObj.userConfig.sc_tree_nodes, curVizObj.userConfig.root);

        // get nodes missing heatmap data that we should still plot (and note those that we shouldn't)
        _handleMissingScs(curVizObj);

        // order single cells by tree
        curVizObj.data.hm_sc_ids = _getNodeOrder(curVizObj.data.treeDescendantsArr, 
                                                 curVizObj.userConfig.link_ids, 
                                                 curVizObj.userConfig.root, 
                                                 [], 
                                                 curVizObj.data.missing_scs_to_plot);
        // GET CNV CONTENT

        // cnv plot number of rows
        curVizObj.view.hm = {};
        curVizObj.view.hm.nrows = curVizObj.data.hm_sc_ids.length;

        // height of each cnv row
        curVizObj.view.hm.rowHeight = (1/curVizObj.view.hm.nrows)*(config.hmHeight-config.chromLegendHeight);

        // get genotype annotation info as object w/property "genotype" : [array of single cells]
        if (curVizObj.view.gtypesSpecified) {
            _reformatGroupAnnots(curVizObj);
        }

        // ADJUST TREE NODE RADIUS BASED ON ROW HEIGHT 

        config.tree_r = (curVizObj.view.hm.rowHeight/2 < config.min_tree_r) ? 
            config.min_tree_r : curVizObj.view.hm.rowHeight/2;
        config.tree_r = (config.tree_r > config.max_tree_r) ? config.max_tree_r : config.tree_r;

        // GET X- and Y-COORDINATE FOR EACH SINGLE CELL

        _getYCoordinates(curVizObj);
        _getXCoordinates(curVizObj);

        // COLOURS

        // CNV colour scale
        var maxCNV = 6;
        var cnvColorScale;
        var discrete_colours = ["#417EAA", "#D6D5D5", "#C63C4C"];
        var targeted_colours = ["#6a90c3", "#ffffbf", "#df5952"];
        // continuous data
        if (curVizObj.userConfig.continuous_cnv) {
            cnvColorScale = d3.scale.linear()  
                .domain([0, 2, maxCNV])             
                .range(discrete_colours)
        }
        // discrete data
        else {
            cnvColorScale = d3.scale.ordinal() 
                .domain([0,1,2,3,4,5,6])
                .range(["#2e7aab", "#73a9d4", "#D6D5D5", "#fec28b", "#fd8b3a", "#ca632c", "#954c25"]);
        }

        // targeted mutation colour scale
        var targetedColorScale = d3.scale.linear()  
            .domain([0, 0.5, 1])             
            .range(targeted_colours)

        // genotype annotation colours
        if (curVizObj.view.gtypesSpecified) {

            // both alpha and regular colour assignments
            // if the genotype tree is provided, colour nodes by its phylogeny
            var colour_assignments;
            if (curVizObj.userConfig.gtype_tree_edges) {
                colour_assignments = _getPhyloColours(curVizObj);
            }
            // genotype tree not provided - random colours
            else {
                colour_assignments = _getGtypeColours(_.uniq(_.pluck(curVizObj.userConfig.sc_annot, "genotype")),
                                                        curVizObj.userConfig.clone_cols);             
            }
            curVizObj.view.colour_assignment = colour_assignments.colour_assignment;
            curVizObj.view.alpha_colour_assignment = colour_assignments.alpha_colour_assignment;
        }

        // timepoint annotation colours
        if (curVizObj.view.gtypesSpecified) {

            // sorted timepoints
            curVizObj.data.tps = _.uniq(_.pluck(curVizObj.userConfig.sc_annot, "timepoint")).sort(function(a, b) {
                                                                                          var regex = /(^[a-zA-Z]*)(\d*)$/;
                                                                                          matchA = regex.exec(a);
                                                                                          matchB = regex.exec(b); 

                                                                                          if(matchA[1] === matchB[1]) {
                                                                                            return matchA[2] > matchB[2];
                                                                                          }
                                                                                          return matchA[1] > matchB[1];
                                                                                        });

            curVizObj.view.tp_colourScale = d3.scale.ordinal()
                .domain(curVizObj.data.tps)
                .range(colorbrewer["Greys"][curVizObj.data.tps.length]);
        }

        // BRUSH SELECTION FUNCTION

        var spaceBetweenTopBarAndView = config.paddingGeneral + config.spacingForTitle;
        var brush = d3.svg.brush()
            .y(d3.scale.linear()
                .domain([spaceBetweenTopBarAndView, config.hmHeight + spaceBetweenTopBarAndView])
                .range([spaceBetweenTopBarAndView, config.hmHeight + spaceBetweenTopBarAndView])
            )
            .on("brushstart", function() { d3.select(".cnvSVG").classed("brushed", true); })
            .on("brushend", function() {
                return _brushEnd(curVizObj, brush);
            });

        // CANVAS for PNG output
        
        var canvas = d3.select(el).append("canvas")
            .attr("height", config.hmHeight + "px")
            .attr("width", config.width + "px")
            .attr("style", "display:none");

        // TOP BAR DIV

        var topBarDIV = d3.select(el).append("div")
            .attr("class", "topBarDIV")
            .style("position", "relative")
            .style("width", config.width + "px")
            .style("height", config.topBarHeight + "px")
            .style("float", "left");

        // CONTAINER DIV and SVG

        var containerDIV = d3.select(el)
            .append("div")
            .attr("class", "containerDIV")
            .style("width", config.width + "px")
            .style("height", config.containerHeight + "px")
            .style("float", "left")
            .attr("id", view_id);

        var containerSVG = containerDIV
            .append("svg:svg")
            .attr("class", "containerSVG_" + view_id)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", config.containerWidth)
            .attr("height", config.containerHeight);

        // TREE SVG

        curVizObj.view.treeSVG = containerSVG.append("g")  
            .attr("class", "treeSVG")     
            .attr("transform", "translate(" + 0 + "," + 0 + ")");

        // INDICATOR SVG

        curVizObj.view.indicatorSVG = containerSVG.append("g")
            .attr("class", "indicatorSVG")
            .attr("transform", "translate(" + (config.treeWidth + config.paddingGeneral) + "," + 0 + ")");

        // GROUP ANNOTATION SVG

        if (curVizObj.view.gtypesSpecified) {
            curVizObj.view.gtypeAnnotSVG = containerSVG.append("g")
                .attr("class", "gtypeAnnotSVG")
                .attr("transform", "translate(" + (config.treeWidth + config.paddingGeneral + config.annotColWidth) + "," + 0 + ")");
        }

        // TIME POINT ANNOTATION SVG
        if (curVizObj.view.tpsSpecified) {
            curVizObj.view.tpAnnotSVG = containerSVG.append("g")
                .attr("class", "tpAnnotSVG")
                .attr("transform", "translate(" + (config.treeWidth + config.paddingGeneral + config.annotColWidth*2) + "," + 0 + ")");
        }

        // CNV SVG

        // x transformation for heatmap
        var hm_t_x; 
        if (curVizObj.view.gtypesSpecified && curVizObj.view.tpsSpecified) { // gtype and tp annots
            hm_t_x = (config.treeWidth + config.paddingGeneral + config.annotColWidth*3 + config.annotHmSpace);
        }
        else if (curVizObj.view.gtypesSpecified) { // gtype annot only
            hm_t_x = (config.treeWidth + config.paddingGeneral + config.annotColWidth*2 + config.annotHmSpace);
        }
        else { // no annots
            hm_t_x = (config.treeWidth + config.paddingGeneral + config.annotColWidth);
        }

        curVizObj.view.cnvSVG = containerSVG.append("g")
            .attr("class", "cnvSVG")
            .attr("transform", "translate(" + hm_t_x + "," + 0 + ")");

        // CNV LEGEND SVG

        curVizObj.view.cnvLegendSVG = containerSVG.append("g")
            .attr("class", "cnvLegendSVG")
            .attr("transform", "translate(" + (hm_t_x + curVizObj.userConfig.heatmapWidth) + "," + 0 + ")");


        // TITLE FOR TREE AND HEATMAP

        containerSVG.append("text")
            .attr("x", hm_t_x + (curVizObj.userConfig.heatmapWidth/2))
            .attr("y", config.paddingGeneral)
            .attr("dy", "+0.71em")
            .attr("text-anchor", "middle")
            .attr("font-family", "Arial")
            .attr("font-weight", "bold")
            .attr("font-size", config.legendTitleHeight)
            .text("Heatmap");
        containerSVG.append("text")
            .attr("x", config.treeWidth/2)
            .attr("y", config.paddingGeneral)
            .attr("dy", "+0.71em")
            .attr("text-anchor", "middle")
            .attr("font-family", "Arial")
            .attr("font-weight", "bold")
            .attr("font-size", config.legendTitleHeight)
            .text("Single Cell Phylogeny");

        // PLOT TOP PANEL

        // svg
        var topBarSVG = topBarDIV.append("svg:svg")
            .attr("class", "topBar")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", config.width + "px")
            .attr("height", config.topBarHeight + "px");

        // background bar
        topBarSVG.append("rect")
            .attr("x",0)
            .attr("y",0)
            .attr("width", config.width + "px")
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour);

        // top panel title
        topBarSVG.append("text")
            .attr("x", 10)
            .attr("y", config.topBarHeight/2)
            .attr("text-anchor", "start")
            .attr("dy", "+0.35em")
            .attr("font-family", "Arial")
            .attr("fill", "white")
            .attr("pointer-events","none")
            .text(config.viewTitle);


        // button widths
        var smallButtonWidth = 42; 
        var bigButtonWidth = 84;

        // base 64 for each icon
        var selectionButton_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTguMS4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDU3LjY3NCA1Ny42NzQiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDU3LjY3NCA1Ny42NzQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iMTZweCIgaGVpZ2h0PSIxNnB4Ij4KPGc+Cgk8Zz4KCQk8cGF0aCBkPSJNNTUuMzM4LDE4LjE4MmMxLjI5MSwwLDIuMzM2LTEuMDQ3LDIuMzM2LTIuMzM3VjcuMDEyYzAtMS4yOS0xLjA0NS0yLjMzNy0yLjMzNi0yLjMzN2gtOC44MzQgICAgYy0xLjI5MSwwLTIuMzM4LDEuMDQ3LTIuMzM4LDIuMzM3djIuMDhIMTMuNTA4VjcuMDEzYzAtMS4yOS0xLjA0Ni0yLjMzNy0yLjMzNy0yLjMzN0gyLjMzN0MxLjA0Niw0LjY3NiwwLDUuNzIzLDAsNy4wMTN2OC44MzMgICAgYzAsMS4yOSwxLjA0NiwyLjMzNywyLjMzNywyLjMzN2gyLjA4djIxLjMxSDIuMzM4Yy0xLjI5MSwwLTIuMzM3LDEuMDQ3LTIuMzM3LDIuMzM3djguODMzYzAsMS4yOTEsMS4wNDYsMi4zMzcsMi4zMzcsMi4zMzdoOC44MzQgICAgYzEuMjkxLDAsMi4zMzctMS4wNDcsMi4zMzctMi4zMzd2LTIuMDhoMzAuNjU3djIuMDhjMCwxLjI5MSwxLjA0NiwyLjMzNywyLjMzNywyLjMzN2g4LjgzM2MxLjI5MSwwLDIuMzM4LTEuMDQ3LDIuMzM4LTIuMzM3ICAgIHYtOC44MzNjMC0xLjI5MS0xLjA0Ny0yLjMzNy0yLjMzOC0yLjMzN2gtMi4wNzhWMTguMTgySDU1LjMzOHogTTQ4Ljg0MSw5LjM0OUg1M3Y0LjE1OGgtMi4wOGgtMi4wNzl2LTIuMDc4ICAgIEM0OC44NDEsMTEuNDI5LDQ4Ljg0MSw5LjM0OSw0OC44NDEsOS4zNDl6IE00LjY3NCw5LjM1MWg0LjE2djIuMDc4djIuMDhoLTIuMDhoLTIuMDhWOS4zNTF6IE04LjgzNCw0OC4zMjZINC42NzV2LTQuMTU5aDIuMDc5ICAgIGgyLjA4djIuMDc5VjQ4LjMyNnogTTUzLDQ4LjMyNmgtNC4xNnYtMi4wOHYtMi4wNzloMi4wOEg1M0M1Myw0NC4xNjcsNTMsNDguMzI2LDUzLDQ4LjMyNnogTTQ4LjU4MywzOS40OTNoLTIuMDggICAgYy0xLjI5MSwwLTIuMzM3LDEuMDQ3LTIuMzM3LDIuMzM3djIuMDc4SDEzLjUwOVY0MS44M2MwLTEuMjkxLTEuMDQ2LTIuMzM3LTIuMzM3LTIuMzM3aC0yLjA4di0yMS4zMWgyLjA3OSAgICBjMS4yOTEsMCwyLjMzNy0xLjA0NywyLjMzNy0yLjMzN3YtMi4wOGgzMC42NTh2Mi4wNzljMCwxLjI5LDEuMDQ3LDIuMzM3LDIuMzM4LDIuMzM3aDIuMDc5ICAgIEM0OC41ODMsMTguMTgyLDQ4LjU4MywzOS40OTMsNDguNTgzLDM5LjQ5M3oiIGZpbGw9IiNGRkZGRkYiLz4KCTwvZz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K";
        var scissorsButton_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA0NTEuNjc0IDQ1MS42NzQiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1MS42NzQgNDUxLjY3NDsiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIxNnB4IiBoZWlnaHQ9IjE2cHgiPgo8Zz4KCTxwYXRoIGQ9Ik0xNjcuODU0LDI5My4yOTljLTcuMTA0LTYuODM0LTE1LjQzLTEyLjYzMi0yNC44NS0xNy4wMjVjLTEyLjI5Mi01LjczMS0yNS4zNTYtOC42MzgtMzguODMtOC42MzggICBjLTM1LjYzLDAtNjguMzc4LDIwLjg1Ny04My40MzEsNTMuMTM4Yy0xMC4zODUsMjIuMjcxLTExLjQ3Niw0Ny4yNTUtMy4wNzEsNzAuMzQ3czI1LjI5OSw0MS41MjksNDcuNTcxLDUxLjkxNCAgIGMxMi4yOSw1LjczLDI1LjM1NCw4LjYzNywzOC44Myw4LjYzOWMzNS42MzEsMCw2OC4zNzktMjAuODU5LDgzLjQzMS01My4xMzhjMC0wLjAwMSwyMS4wMDMtMzYuMjkzLDIxLjAwMy0zNi4yOTNsLTQwLjI3Ni02OS41OTYgICBMMTY3Ljg1NCwyOTMuMjk5eiBNMTYwLjMxMywzODUuODU4Yy0xMC4xNDYsMjEuNzU3LTMyLjIxOCwzNS44MTUtNTYuMjM0LDM1LjgxNWMtOS4wNjktMC4wMDEtMTcuODY4LTEuOTYyLTI2LjE1OS01LjgyOCAgIGMtMTUuMDA5LTYuOTk5LTI2LjM5NC0xOS40MjMtMzIuMDU4LTM0Ljk4NXMtNC45MjktMzIuMzk4LDIuMDctNDcuNDA4YzEwLjE0Ni0yMS43NTcsMzIuMjIyLTM1LjgxNSw1Ni4yNDItMzUuODE1ICAgYzkuMDYxLDAsMTcuODU5LDEuOTYxLDI2LjE1MSw1LjgyN0MxNjEuMzA4LDMxNy45MTIsMTc0Ljc2MSwzNTQuODc0LDE2MC4zMTMsMzg1Ljg1OHoiIGZpbGw9IiNGRkZGRkYiLz4KCTxwYXRoIGQ9Ik0zNjIuODA0LDk1LjYyMmMxOS4zMy0zMy40OCw3Ljg1OS03Ni4yOTItMjUuNjIyLTk1LjYyMmwtOTQuMDI1LDE2Mi44NjRsNDAuMzE4LDY5LjgzNkwzNjIuODA0LDk1LjYyMnoiIGZpbGw9IiNGRkZGRkYiLz4KCTxwYXRoIGQ9Ik00MzAuOTMyLDMyMC43NzNjLTE1LjA1My0zMi4yNzktNDcuODAxLTUzLjEzNy04My40MzEtNTMuMTM3Yy0xMy40NzQsMC0yNi41MzgsMi45MDYtMzguODMsOC42MzggICBjLTkuNDIsNC4zOTMtMTcuNzQ3LDEwLjE5LTI0Ljg1LDE3LjAyNUwxMTQuNDkyLDBDODEuMDExLDE5LjMzLDY5LjU0LDYyLjE0MSw4OC44Nyw5NS42MjJsMTc1LjI5OSwzMDIuOTEgICBjMTUuMDU1LDMyLjI4NCw0Ny44MDMsNTMuMTQyLDgzLjQzMiw1My4xNDJjMTMuNDc1LDAsMjYuNTM5LTIuOTA3LDM4LjgzMS04LjYzOWMyMi4yNzEtMTAuMzg1LDM5LjE2Ni0yOC44MjIsNDcuNTcxLTUxLjkxNCAgIFM0NDEuMzE3LDM0My4wNDYsNDMwLjkzMiwzMjAuNzczeiBNNDA1LjgxMiwzODAuODZjLTUuNjY0LDE1LjU2My0xNy4wNDksMjcuOTg2LTMyLjA1OSwzNC45ODUgICBjLTguMjkyLDMuODY3LTE3LjA5MSw1LjgyOC0yNi4xNTIsNS44MjhjLTI0LjAyLDAtNDYuMDk1LTE0LjA1OS01Ni4yNDEtMzUuODE1Yy0xNC40NDgtMzAuOTg0LTAuOTk1LTY3Ljk0NiwyOS45ODgtODIuMzk1ICAgYzguMjkyLTMuODY2LDE3LjA5MS01LjgyNywyNi4xNTItNS44MjdjMjQuMDIsMCw0Ni4wOTYsMTQuMDU5LDU2LjI0MiwzNS44MTVDNDEwLjc0MSwzNDguNDYyLDQxMS40NzYsMzY1LjI5OCw0MDUuODEyLDM4MC44NnoiIGZpbGw9IiNGRkZGRkYiLz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K";
        var forceDirectedIcon_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgMzE0LjAxNCAzMTQuMDE1IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAzMTQuMDE0IDMxNC4wMTU7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPGc+Cgk8ZyBpZD0iX3gzNF8yOC5fTmV0d29yayI+CgkJPGc+CgkJCTxwYXRoIGQ9Ik0yNjYuOTExLDEwOS44OThjLTIwLjQ5OCwwLTM3Ljg5NCwxMy4xMjUtNDQuMzU0LDMxLjQwOEgxMTYuNDA2bDUxLjczNC01MS43MzJjNi4xNDcsMi45MzYsMTMsNC42MzEsMjAuMjcsNC42MzEgICAgIGMyNi4wMDQsMCw0Ny4xMDQtMjEuMDk1LDQ3LjEwNC00Ny4xMDRDMjM1LjUxMywyMS4wODcsMjE0LjQxNCwwLDE4OC40MSwwYy0yNi4wMDUsMC00Ny4xMDQsMjEuMDg3LTQ3LjEwNCw0Ny4xMDIgICAgIGMwLDcuMjY4LDEuNjk1LDE0LjEyMiw0LjYzMSwyMC4yNjRsLTYxLjI3OCw2MS4yODhjLTguNTktMTEuMzgzLTIyLjIwMS0xOC43NDctMzcuNTU4LTE4Ljc0NyAgICAgQzIxLjA5MywxMDkuOTA2LDAsMTMwLjk5MSwwLDE1Ny4wMDdjMCwyNi4wMDQsMjEuMDkzLDQ3LjEwMyw0Ny4xMDEsNDcuMTAzYzE1LjM2NSwwLDI4Ljk2OC03LjM2MSwzNy41NTgtMTguNzU1bDYxLjI3OCw2MS4yODYgICAgIGMtMi45MzYsNi4xNTEtNC42MzEsMTMuMDA0LTQuNjMxLDIwLjI3YzAsMjYuMDA0LDIxLjA5OSw0Ny4xMDQsNDcuMTA0LDQ3LjEwNGMyNi4wMDQsMCw0Ny4xMDQtMjEuMSw0Ny4xMDQtNDcuMTA0ICAgICBjMC0yNi4wMTctMjEuMS00Ny4xLTQ3LjEwNC00Ny4xYy03LjI3LDAtMTQuMTIyLDEuNjkxLTIwLjI3LDQuNjI5bC01MS43MzQtNTEuNzMyaDEwNi4xNTEgICAgIGM2LjQ2OCwxOC4yODYsMjMuODU1LDMxLjQwMiw0NC4zNTQsMzEuNDAyYzI2LjAwOSwwLDQ3LjEwNC0yMS4wOTksNDcuMTA0LTQ3LjEwMyAgICAgQzMxNC4wMTQsMTMwLjk5MSwyOTIuOTE5LDEwOS44OTgsMjY2LjkxMSwxMDkuODk4eiBNMTg4LjQxLDMxLjQwMmM4LjY2NCwwLDE1LjcwMSw3LjAyNSwxNS43MDEsMTUuNjk5ICAgICBjMCw4LjY2OC03LjAzNywxNS43MDEtMTUuNzAxLDE1LjcwMXMtMTUuNzAxLTcuMDMzLTE1LjcwMS0xNS43MDFDMTcyLjcwOCwzOC40MjgsMTc5Ljc0NiwzMS40MDIsMTg4LjQxLDMxLjQwMnogTTQ3LjEwMiwxNzIuNzA4ICAgICBjLTguNjY2LDAtMTUuNjk5LTcuMDM3LTE1LjY5OS0xNS43MDFjMC04LjY3NCw3LjAzMy0xNS43MDEsMTUuNjk5LTE1LjcwMWM4LjY2OCwwLDE1LjcwMSw3LjAyNywxNS43MDEsMTUuNzAxICAgICBDNjIuODAzLDE2NS42NzEsNTUuNzcsMTcyLjcwOCw0Ny4xMDIsMTcyLjcwOHogTTE4OC40MSwyNTEuMjE0YzguNjY0LDAsMTUuNzAxLDcuMDIxLDE1LjcwMSwxNS42OTcgICAgIGMwLDguNjY0LTcuMDM3LDE1LjcwMS0xNS43MDEsMTUuNzAxcy0xNS43MDEtNy4wMzctMTUuNzAxLTE1LjcwMUMxNzIuNzA4LDI1OC4yMzQsMTc5Ljc0NiwyNTEuMjE0LDE4OC40MSwyNTEuMjE0eiAgICAgIE0yNjYuOTExLDE3Mi43MDhjLTguNjYsMC0xNS42OTctNy4wMzctMTUuNjk3LTE1LjcwMWMwLTguNjc0LDcuMDM3LTE1LjcwMSwxNS42OTctMTUuNzAxYzguNjY0LDAsMTUuNzAxLDcuMDI3LDE1LjcwMSwxNS43MDEgICAgIEMyODIuNjEyLDE2NS42NzEsMjc1LjU3NSwxNzIuNzA4LDI2Ni45MTEsMTcyLjcwOHoiIGZpbGw9IiNGRkZGRkYiLz4KCQk8L2c+Cgk8L2c+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPC9zdmc+Cg==";
        var phylogenyIcon_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgMzE0LjAxNCAzMTQuMDE1IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAzMTQuMDE0IDMxNC4wMTU7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPGc+Cgk8ZyBpZD0iX3gzNF8yOS5fTmV0d29yayI+CgkJPGc+CgkJCTxwYXRoIGQ9Ik0yODIuNjEyLDIyMi41NTd2LTQ5Ljg0OWMwLTE3LjM0Mi0xNC4wNTgtMzEuNDAyLTMxLjM5OC0zMS40MDJoLTc4LjUwNVY5MS40NjQgICAgIGMxOC4yODYtNi40NzQsMzEuNDAyLTIzLjg2NiwzMS40MDItNDQuMzY4YzAtMjYuMDA4LTIxLjEtNDcuMDk2LTQ3LjEwNC00Ny4wOTZjLTI2LjAwOCwwLTQ3LjEwMiwyMS4wODctNDcuMTAyLDQ3LjA5NiAgICAgYzAsMjAuNTAyLDEzLjExNywzNy44OTQsMzEuNCw0NC4zNjh2NDkuODQySDYyLjgwM2MtMTcuMzQsMC0zMS40LDE0LjA2LTMxLjQsMzEuNDAydjQ5Ljg0OUMxMy4xMTcsMjI5LjAxNywwLDI0Ni40MTMsMCwyNjYuOTExICAgICBjMCwyNi4wMDQsMjEuMDkzLDQ3LjEwNCw0Ny4xMDEsNDcuMTA0czQ3LjEwMy0yMS4xLDQ3LjEwMy00Ny4xMDRjMC0yMC40OTgtMTMuMTE4LTM3Ljg5NS0zMS40MDItNDQuMzU0di00OS44NDloNzguNTAzdjQ5Ljg0OSAgICAgYy0xOC4yODQsNi40Ni0zMS40LDIzLjg1Ni0zMS40LDQ0LjM1NGMwLDI2LjAwNCwyMS4wOTMsNDcuMTA0LDQ3LjEwMiw0Ny4xMDRjMjYuMDA0LDAsNDcuMTA0LTIxLjEsNDcuMTA0LTQ3LjEwNCAgICAgYzAtMjAuNDk4LTEzLjExNi0zNy44OTUtMzEuNDAyLTQ0LjM1NHYtNDkuODQ5aDc4LjUwNXY0OS44NDljLTE4LjI4NSw2LjQ2LTMxLjQwMSwyMy44NTYtMzEuNDAxLDQ0LjM1NCAgICAgYzAsMjYuMDA0LDIxLjA5NSw0Ny4xMDQsNDcuMDk5LDQ3LjEwNGMyNi4wMDksMCw0Ny4xMDQtMjEuMSw0Ny4xMDQtNDcuMTA0QzMxNC4wMTQsMjQ2LjQxMywzMDAuODk4LDIyOS4wMTcsMjgyLjYxMiwyMjIuNTU3eiAgICAgIE00Ny4xMDIsMjgyLjYxMmMtOC42NjYsMC0xNS42OTktNy4wMzctMTUuNjk5LTE1LjcwMWMwLTguNjc3LDcuMDMzLTE1LjY5NywxNS42OTktMTUuNjk3YzguNjY4LDAsMTUuNzAxLDcuMDIxLDE1LjcwMSwxNS42OTcgICAgIEM2Mi44MDMsMjc1LjU3NSw1NS43NywyODIuNjEyLDQ3LjEwMiwyODIuNjEyeiBNMTU3LjAwNywyODIuNjEyYy04LjY2NiwwLTE1LjcwMS03LjAzNy0xNS43MDEtMTUuNzAxICAgICBjMC04LjY3Nyw3LjAzNS0xNS42OTcsMTUuNzAxLTE1LjY5N2M4LjY2NCwwLDE1LjcwMSw3LjAyMSwxNS43MDEsMTUuNjk3QzE3Mi43MDgsMjc1LjU3NSwxNjUuNjcxLDI4Mi42MTIsMTU3LjAwNywyODIuNjEyeiAgICAgIE0xNTcuMDA3LDYyLjgwM2MtOC42NjYsMC0xNS43MDEtNy4wMzMtMTUuNzAxLTE1LjcwN2MwLTguNjc2LDcuMDM1LTE1LjY5MywxNS43MDEtMTUuNjkzYzguNjY0LDAsMTUuNzAxLDcuMDI1LDE1LjcwMSwxNS42OTMgICAgIEMxNzIuNzA4LDU1Ljc2MiwxNjUuNjcxLDYyLjgwMywxNTcuMDA3LDYyLjgwM3ogTTI2Ni45MTEsMjgyLjYxMmMtOC42NiwwLTE1LjY5Ny03LjAzNy0xNS42OTctMTUuNzAxICAgICBjMC04LjY3Nyw3LjAzNy0xNS42OTcsMTUuNjk3LTE1LjY5N2M4LjY2NCwwLDE1LjcwMSw3LjAyMSwxNS43MDEsMTUuNjk3QzI4Mi42MTIsMjc1LjU3NSwyNzUuNTc1LDI4Mi42MTIsMjY2LjkxMSwyODIuNjEyeiIgZmlsbD0iI0ZGRkZGRiIvPgoJCTwvZz4KCTwvZz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K";
        var downloadButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNTEyIDUxMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8cG9seWdvbiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjM1NC41LDMzMy41IDMzMy41LDMxMy41IDI3MS44MzUsMzY1LjU2NCAyNzEuODM1LDcuOTE3IDI0MC4xNjUsNy45MTcgMjQwLjE2NSwzNjUuNTY0IDE4MC41LDMxNC41IA0KCTE1Ny41LDMzNi41IDI1Niw0MjYuMTg4ICIvPg0KPHBvbHlnb24gZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIyOC41LDQ3Mi40MTIgNDg5LjUsNDcyLjQxMiA0OTAuNSw1MDQuMDgyIDI3LjUsNTA0LjA4MiAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMjYuNTgsMzY2LjQxMiA2My40NjcsMzY2LjQxMiA2My41NDcsNTAyLjUgMjYuNSw1MDIuNSAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iNDUyLjUzMywzNjUuNDEyIDQ4OS40MTksMzY1LjQxMiA0ODkuNSw1MDEuNSA0NTIuNDUzLDUwMS41ICIvPg0KPC9zdmc+DQo=";
        var rulerIcon_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjMxNi45OXB4IiBoZWlnaHQ9IjEyNy42N3B4IiB2aWV3Qm94PSIwIDAgMzE2Ljk5IDEyNy42NyIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzE2Ljk5IDEyNy42NyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8cmVjdCB4PSI4LjczOSIgeT0iOS43MDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyMyIgd2lkdGg9IjI5OS45OTkiIGhlaWdodD0iMTA5LjcwOCIvPg0KPGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIzIiB4MT0iNjEuMTM3IiB5MT0iOS43NSIgeDI9IjYxLjEzNyIgeTI9IjQ3LjUzMSIvPg0KPGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIzIiB4MT0iMTEwLjYyMiIgeTE9IjEwLjExNSIgeDI9IjExMC42MjIiIHkyPSI3NS43MjgiLz4NCjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyMyIgeDE9IjE2MS4xNjUiIHkxPSIxMC4yNzYiIHgyPSIxNjEuMTY1IiB5Mj0iNDguMDU4Ii8+DQo8bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMjMiIHgxPSIyMDkuNzY3IiB5MT0iMTAuMDg2IiB4Mj0iMjA5Ljc2NyIgeTI9Ijc3LjE4NCIvPg0KPGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIzIiB4MT0iMjU5LjI4MiIgeTE9IjkuNjAxIiB4Mj0iMjU5LjI4MiIgeTI9IjQ3LjM4MiIvPg0KPC9zdmc+DQo=";
        var rerootButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNi4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMzkxLjA5M3B4IiBoZWlnaHQ9IjM5My4zMjlweCIgdmlld0JveD0iMCAwIDM5MS4wOTMgMzkzLjMyOSIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzkxLjA5MyAzOTMuMzI5Ig0KCSB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRkZGRkZGIiBjeD0iMTQ3LjQ5NSIgY3k9IjgwLjQ0MSIgcj0iNDkuMTY1Ii8+DQo8Y2lyY2xlIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0ZGRkZGRiIgY3g9IjQ5LjE2NSIgY3k9IjIxMi4zMDIiIHI9IjQ5LjE2NSIvPg0KPGNpcmNsZSBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNGRkZGRkYiIGN4PSIxNDcuNDk1IiBjeT0iMzQ0LjE2NCIgcj0iNDkuMTY1Ii8+DQo8Zz4NCgk8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMzAyLjc3Nyw4MC40NGw4NS41MzEtNzIuNjZjMy43MTMtMS43ODgsMy43MTMtNC42NTMsMC02LjQ0MWMtMy43MTQtMS43ODYtOS42NjYtMS43ODYtMTMuMzgxLDANCgkJTDIxNy4yNDIsNzcuMjMzYy0zLjcwOCwxLjc4Ny0zLjcwOCw0LjY1MiwwLDYuNDRsMTU3LjY4Niw3NS44NTljMS44MjEsMC44NzYsNC4yNzQsMS4zNDksNi42NTYsMS4zNDkNCgkJYzIuMzgzLDAsNC44MzQtMC40MzgsNi42NTMtMS4zNDljMy43MTUtMS43ODYsMy43MTUtNC42NTIsMC02LjQ0TDMwMi43NzcsODAuNDR6Ii8+DQo8L2c+DQo8L3N2Zz4NCg==";
        var flipBranchButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNi4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMzc4LjQ1OXB4IiBoZWlnaHQ9IjQ2OC42NDdweCIgdmlld0JveD0iMCAwIDM3OC40NTkgNDY4LjY0NyIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzc4LjQ1OSA0NjguNjQ3Ig0KCSB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRkZGRkZGIiBjeD0iNTguODg3IiBjeT0iNTguODg2IiByPSI1OC44ODciLz4NCjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRkZGRkZGIiBjeD0iNTguODg3IiBjeT0iMjM0LjMyMyIgcj0iNTguODg3Ii8+DQo8Y2lyY2xlIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0ZGRkZGRiIgY3g9IjU4Ljg4NyIgY3k9IjQwOS43NiIgcj0iNTguODg3Ii8+DQo8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTQ5LjE4OCw0MS4yNTdjMCwxNi40NiwxMC41ODksMzEuMzI5LDI2Ljg1NiwzNy42OTVjNjcuMTA1LDI2LjI4OSwxMTQuMzk4LDg4LjEwNCwxMTQuMzk4LDE2MC4xNjkNCgljMCwzOS43MTgtMTQuNTg2LDc2LjEzMi0zOC43NzcsMTA1LjMyNGwtMy43OTQtMjIuODgxYy0xLjI5OS03LjgxNi03Ljk0Mi0xMy44OTYtMTYuMzM5LTE0Ljk1NQ0KCWMtOC4zOTMtMS4wNjItMTYuNTM1LDMuMTYtMjAuMDA0LDEwLjM2N0wxNTAuODc2LDQ0Mi44MWMtMi42NTQsNS41MTYtMi4xNDUsMTEuOTA2LDEuMzU2LDE2Ljk5DQoJYzMuNTA2LDUuMDc2LDkuNTIzLDguMTU4LDE1Ljk5NSw4LjE5M2wxNDguNTUsMC42NTJjOC40NTEsMC4wNDMsMTUuOTI1LTUuMDk4LDE4LjM4OC0xMi42MzdjMi40NjMtNy41NDktMC42NjMtMTUuNzA3LTcuNjk3LTIwLjA3NA0KCWwtMjcuOTI4LTE3LjM0NGM0OC43NzEtNDYuMjQyLDc4LjkxOS0xMDkuNjA1LDc4LjkxOS0xNzkuNDdjMC0xMDUuOTM0LTY5LjMxLTE5Ny4wMTMtMTY3LjgyLTIzNS44NTgNCgljLTEzLjY1NS01LjM5NS0yOS4yODktNC4wMzUtNDEuNjQzLDMuNjAzQzE1Ni42NCwxNC41MDQsMTQ5LjE4OCwyNy40MTYsMTQ5LjE4OCw0MS4yNTd6Ii8+DQo8L3N2Zz4NCg==";

        // icon sizes
        var selectionButtonIconWidth = 16;
        var scissorsButtonIconWidth = 16;
        var graphTreeIconWidth = 16;
        var downloadButtonIconWidth = config.topBarHeight - 10; // icon size for download button
        var rulerIconWidth = 21;
        var rerootButtonIconWidth = 16;
        var flipBranchButtonIconWidth = 16;


        // SVG button
        topBarSVG.append("rect")
            .attr("class", "svgButton")
            .attr("x", config.width - bigButtonWidth)
            .attr("y", 0)
            .attr("width", bigButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                d3.select(this).attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // download the svg
                downloadSVG("containerSVG_" + view_id);
            })
            .append("title")
            .text("Download SVG");
        topBarSVG.append("text")
            .attr("class", "svgButtonText")
            .attr("x", config.width - 10)
            .attr("y", config.topBarHeight/2)
            .attr("text-anchor", "end")
            .attr("dy", "+0.35em")
            .attr("font-family", "Arial")
            .attr("fill", "white")
            .attr("pointer-events","none")
            .text("SVG")
            .append("title")
            .text("Download SVG");
        topBarSVG.append("image")
            .attr("xlink:href", downloadButton_base64)
            .attr("x", config.width - bigButtonWidth + 10)
            .attr("y", 5)
            .attr("width", downloadButtonIconWidth)
            .attr("height", downloadButtonIconWidth)
            .on("mouseover", function() {
                d3.select("#" + view_id).select(".svgButton").attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select("#" + view_id).select(".svgButton").attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // download the svg
                downloadSVG("containerSVG_" + view_id);
            })
            .append("title")
            .text("Download SVG");


        // PNG button
        topBarSVG.append("rect")
            .attr("class", "pngButton")
            .attr("x", config.width - bigButtonWidth*2)
            .attr("y", 0)
            .attr("width", bigButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill",config.topBarColour)
            .on("mouseover", function() {
                d3.select(this).attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", config.topBarColour);
            })
            .on("click", function(){
                // download the png
                _downloadPNG("containerSVG_" + view_id, "containerSVG_" + view_id + ".png");
            })
            .append("title")
            .text("Download PNG");
        topBarSVG.append("text")
            .attr("class", "pngButtonText")
            .attr("x", config.width - bigButtonWidth - 10)
            .attr("y", config.topBarHeight/2)
            .attr("text-anchor", "end")
            .attr("dy", "+0.35em")
            .attr("font-family", "Arial")
            .attr("fill", "white")
            .attr("pointer-events","none")
            .text("PNG")
            .append("title")
            .text("Download PNG");
        topBarSVG.append("image")
            .attr("xlink:href", downloadButton_base64)
            .attr("x", config.width - 2*bigButtonWidth + 10)
            .attr("y", 5)
            .attr("width", downloadButtonIconWidth)
            .attr("height", downloadButtonIconWidth)
            .on("mouseover", function() {
                d3.select("#" + view_id).select(".pngButton").attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select("#" + view_id).select(".pngButton").attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // download the png
                _downloadPNG("containerSVG_" + view_id, "containerSVG_" + view_id + ".png");
            })
            .append("title")
            .text("Download PNG");

        // brush selection button
        topBarSVG.append("rect")
            .attr("class", "selectionButton")
            .attr("x", config.width - 2*bigButtonWidth - smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // if scissors button is selected, turn off scissors
                if (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {
                    _pushScissorsButton(curVizObj);
                }
                // push selection button function
                _pushBrushSelectionButton(brush, curVizObj);
            })
            .append("title")
            .text("Select Single Cells in Heatmap");
        topBarSVG.append("image")
            .attr("xlink:href", selectionButton_base64)
            .attr("x", config.width - 2*bigButtonWidth - smallButtonWidth + (smallButtonWidth - selectionButtonIconWidth)/2)
            .attr("y", 7)
            .attr("width", selectionButtonIconWidth)
            .attr("height", selectionButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".selectionButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".selectionButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // if scissors button is selected, turn off scissors
                if (d3.selectAll(".scissorsButtonSelected")[0].length == 1) {
                    _pushScissorsButton(curVizObj);
                }
                // push selection button function
                _pushBrushSelectionButton(brush, curVizObj);
            })
            .append("title")
            .text("Select Single Cells in Heatmap");

        // scissors button
        topBarSVG.append("rect")
            .attr("class", "scissorsButton")
            .attr("x", config.width - 2*bigButtonWidth - 2*smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // if brush selection button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length == 1) {
                    _clearBrush(curVizObj.view_id);
                    _pushBrushSelectionButton(brush, curVizObj);
                }
                // push scissors button function
                _pushScissorsButton(curVizObj);
            })
            .append("title")
            .text("Prune Tree/Graph");
        topBarSVG.append("image")
            .attr("xlink:href", scissorsButton_base64)
            .attr("x", config.width - 2*bigButtonWidth - 2*smallButtonWidth + (smallButtonWidth - scissorsButtonIconWidth)/2)
            .attr("y", 7)
            .attr("width", scissorsButtonIconWidth)
            .attr("height", scissorsButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".scissorsButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".scissorsButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // if brush selection button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length == 1) {
                    _clearBrush(curVizObj.view_id);
                    _pushBrushSelectionButton(brush, curVizObj);
                }
                // push scissors button function
                _pushScissorsButton(curVizObj);
            })
            .append("title")
            .text("Prune Tree/Graph");

        // graph/tree button
        topBarSVG.append("rect")
            .attr("class", "graphTreeButton")
            .attr("x", config.width - 2*bigButtonWidth - 3*smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                d3.select(this).attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // switch between tree and graph views
                _switchView(curVizObj);
            })
            .append("title")
            .text("Switch Tree/Graph View");
        topBarSVG.append("image")
            .classed("forceDirectedIcon", true)
            .attr("xlink:href", forceDirectedIcon_base64)
            .attr("x", config.width - 2*bigButtonWidth - 3*smallButtonWidth + (smallButtonWidth - graphTreeIconWidth)/2)
            .attr("y", 7)
            .attr("width", graphTreeIconWidth)
            .attr("height", graphTreeIconWidth)
            .attr("opacity", 1)
            .on("mouseover", function() {
                d3.select("#" + view_id).select(".graphTreeButton").attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select("#" + view_id).select(".graphTreeButton").attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // switch between tree and graph views
                _switchView(curVizObj);
            })
            .append("title")
            .text("Switch Tree/Graph View");
        topBarSVG.append("image")
            .classed("phylogenyIcon", true)
            .attr("xlink:href", phylogenyIcon_base64)
            .attr("x", config.width - 2*bigButtonWidth - 3*smallButtonWidth + (smallButtonWidth - graphTreeIconWidth)/2)
            .attr("y", 7)
            .attr("width", graphTreeIconWidth)
            .attr("height", graphTreeIconWidth)
            .attr("opacity", 0)
            .on("mouseover", function() {
                d3.select("#" + view_id).select(".graphTreeButton").attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select("#" + view_id).select(".graphTreeButton").attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // switch between tree and graph views
                _switchView(curVizObj);
            })
            .append("title")
            .text("Switch Tree/Graph View");

        // re-root button
        topBarSVG.append("rect")
            .classed("rerootButton", true)
            .attr("x", config.width - 2*bigButtonWidth - 4*smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushRerootButton(curVizObj);
                // if branch flip button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length !== 0) {
                    _pushBranchFlipButton(curVizObj);
                }
                // if ruler is on, turn it off
                if (curVizObj.generalConfig.distOn) {
                    _scaleTree(curVizObj);
                }
            })
            .append("title")
            .text("Re-root Phylogeny");
        topBarSVG.append("image")
            .classed("rerootButton", true)
            .attr("xlink:href", rerootButton_base64)
            .attr("x", config.width - 2*bigButtonWidth - 4*smallButtonWidth + (smallButtonWidth - rerootButtonIconWidth)/2)
            .attr("y", 7)
            .attr("width", rerootButtonIconWidth)
            .attr("height", rerootButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".rerootButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".rerootButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushRerootButton(curVizObj);
                // if branch flip button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length !== 0) {
                    _pushBranchFlipButton(curVizObj);
                }
                // if ruler is on, turn it off
                if (curVizObj.generalConfig.distOn) {
                    _scaleTree(curVizObj);
                }
            })
            .append("title")
            .text("Re-root Phylogeny");

        // flip branches button
        topBarSVG.append("rect")
            .classed("flipBranchButton", true)
            .attr("x", config.width - 2*bigButtonWidth - 5*smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length === 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushBranchFlipButton(curVizObj);
                // if reroot button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length !== 0) {
                    _pushRerootButton(curVizObj);
                }
            })
            .append("title")
            .text("Flip Branch");
        topBarSVG.append("image")
            .classed("flipBranchButton", true)
            .attr("xlink:href", flipBranchButton_base64)
            .attr("x", config.width - 2*bigButtonWidth - 5*smallButtonWidth + (smallButtonWidth - flipBranchButtonIconWidth)/2)
            .attr("y", 7)
            .attr("width", flipBranchButtonIconWidth)
            .attr("height", flipBranchButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".flipBranchButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.select("#" + view_id).selectAll(".flipBranchButtonSelected")[0].length === 0) {
                    d3.select("#" + view_id).select(".flipBranchButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushBranchFlipButton(curVizObj);
                // if reroot button is selected, turn it off
                if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length !== 0) {
                    _pushRerootButton(curVizObj);
                }
            })
            .append("title")
            .text("Flip Branch");



        // ruler icon button
        if (curVizObj.userConfig.distances_provided) {
            topBarSVG.append("rect")
                .attr("class", "rulerButton")
                .attr("x", config.width - 2*bigButtonWidth - 6*smallButtonWidth)
                .attr("y", 0)
                .attr("width", smallButtonWidth)
                .attr("height", config.topBarHeight)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", config.topBarColour)
                .on("mouseover", function() {
                    // if this button is not selected
                    if (d3.select("#" + view_id).selectAll(".rulerButtonSelected")[0].length === 0) {
                        d3.select(this).attr("fill", config.topBarHighlight);
                    }
                })
                .on("mouseout", function() {
                    // if this button is not selected
                    if (d3.select("#" + view_id).selectAll(".rulerButtonSelected")[0].length === 0) {
                        d3.select(this).attr("fill", config.topBarColour);
                    }
                })
                .on("click", function() {
                    // if brush selection button is selected, turn it off
                    if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length == 1) {
                        _pushBrushSelectionButton(brush, curVizObj);
                    }
                    // if reroot button is selected, turn it off
                    if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length !== 0) {
                        _pushRerootButton(curVizObj);
                    }
                    // scale or unscale tree
                    _scaleTree(curVizObj);
                })
                .append("title")
                .text("Scale Tree/Graph");
            topBarSVG.append("image")
                .attr("xlink:href", rulerIcon_base64)
                .attr("x", config.width - 2*bigButtonWidth - 6*smallButtonWidth + (smallButtonWidth - rulerIconWidth)/2)
                .attr("y", 5)
                .attr("width", rulerIconWidth)
                .attr("height", rulerIconWidth)
                .on("mouseover", function() {
                    // if this button is not selected
                    if (d3.select("#" + view_id).selectAll(".rulerButtonSelected")[0].length === 0) {
                        d3.select("#" + view_id).select(".rulerButton").attr("fill", config.topBarHighlight);
                    }
                })
                .on("mouseout", function() {
                    // if this button is not selected
                    if (d3.select("#" + view_id).selectAll(".rulerButtonSelected")[0].length === 0) {
                        d3.select("#" + view_id).select(".rulerButton").attr("fill", config.topBarColour);
                    }
                })
                .on("click", function() {
                    // if brush selection button is selected, turn it off
                    if (d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length == 1) {
                        _pushBrushSelectionButton(brush, curVizObj);
                    }
                    // if reroot button is selected, turn it off
                    if (d3.select("#" + view_id).selectAll(".rerootButtonSelected")[0].length !== 0) {
                        _pushRerootButton(curVizObj);
                    }
                    // scale or unscale tree
                    _scaleTree(curVizObj);
                })
                .append("title")
                .text("Scale Tree/Graph");
        }

        // TOOLTIP FUNCTIONS

        // single cell node tip
        curVizObj.nodeTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>" + curVizObj.userConfig.node_type + ":</strong> <span style='color:white'>" + 
                    d + "</span>";
            });
        curVizObj.view.treeSVG.call(curVizObj.nodeTip);

        // mutation site tip
        curVizObj.mutTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Site:</strong> <span style='color:white'>" + d + "</span>";
            });
        curVizObj.view.cnvSVG.call(curVizObj.mutTip);

        // mutation value tip
        curVizObj.valTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>" + curVizObj.userConfig.value_type + ":</strong> <span style='color:white'>" + 
                    d + "</span>";
            });
        curVizObj.view.cnvSVG.call(curVizObj.valTip);

        // PLOT CNV 

        var gridCellsG = curVizObj.view.cnvSVG
            .append("g")
            .classed("gridCells", true)

        // for each single cell
        for (var i = 0; i < curVizObj.data.hm_sc_ids.length; i++) {
            var cur_sc = curVizObj.data.hm_sc_ids[i];
            var cur_data = curVizObj.userConfig.heatmap_info[[cur_sc]]; 

            // if this single cell has heatmap data, plot the data
            if (cur_data) {
               
                gridCellsG
                    .append("g")
                    .attr("class", "gridCellG sc_" + cur_sc)
                    .selectAll(".gridCell.sc_" + cur_sc)
                    .data(cur_data)
                    .enter()
                    .append("rect")
                    .attr("class", function(d) {
                        // genotype annotation
                        var genotype;
                        if (curVizObj.view.gtypesSpecified) {
                            // check that this single cell has a genotype
                            var sc_w_gtype = _.findWhere(curVizObj.userConfig.sc_annot, {single_cell_id: d.sc_id});
                            genotype = (sc_w_gtype) ? sc_w_gtype.genotype : "none";
                        }
                        else {
                            genotype = "none";
                        }
                        var mut = (curVizObj.userConfig.heatmap_type == "targeted") ? d.site.replace(":","coord") : "none";
                        return "gridCell sc_" + d.sc_id + " gtype_" + genotype + " mut_" + mut;
                    })
                    .attr("x", function(d) { 
                        return d.x; 
                    })
                    .attr("y", function(d) { 
                        d.y = curVizObj.data.yCoordinates[d.sc_id];
                        return d.y; 
                    })
                    .attr("height", curVizObj.view.hm.rowHeight)
                    .attr("width", function(d) { 
                        return d.px_width; 
                    })
                    .attr("fill", function(d) { 
                        // color scale
                        var cur_colorscale = (curVizObj.userConfig.heatmap_type == "cnv") ?
                            cnvColorScale : targetedColorScale;

                        // no data
                        if (typeof(d.gridCell_value) == "undefined") {
                            return "white";
                        }

                        // cnv data, but above max cnv value
                        else if (curVizObj.userConfig.heatmap_type == "cnv" && 
                                d.gridCell_value > maxCNV) {
                            return cur_colorscale(maxCNV);
                        }

                        // regular data
                        return cur_colorscale(d.gridCell_value);
                    })
                    .on("mouseover", function(d) {
                        if (_checkForSelections(view_id)) {
                            _mouseoverNode(d.sc_id, view_id, curVizObj.nodeTip, config.switchView, curVizObj.userConfig.sc_annot);

                            // for targeted mutations, show mutation tooltip on top of the first row in the heatmap
                            if (curVizObj.userConfig.heatmap_type == "targeted") {
                                curVizObj.mutTip.show(d.site, 
                                    containerDIV.select(".gridCell.sc_" + curVizObj.data.hm_sc_ids[0] + ".mut_" + d.site.replace(":","coord")).node());
                            }

                            // show mutation value 
                            curVizObj.valTip.show(d.gridCell_value);
                        }
                    })
                    .on("mouseout", function(d) {
                        if (_checkForSelections(view_id)) {
                            _mouseoutNode(d.sc_id, curVizObj.view_id, curVizObj.nodeTip);
                            curVizObj.mutTip.hide();
                            curVizObj.valTip.hide();
                        }
                    });
            }
        }

        // PLOT CHROMOSOME LEGEND
        // note y-coordinate for chromosome legend
        config.chromLegendStartYCoord = config.paddingGeneral + config.spacingForTitle + config.hmHeight - config.chromLegendHeight;
        var chromBoxes = curVizObj.view.cnvSVG
            .append("g")
            .classed("chromLegend", true)
            .selectAll(".chromBoxG")
            .data(curVizObj.userConfig.chrom_boxes)
            .enter().append("g")
            .attr("class", "chromBoxG")

        var nextColour = "#FFFFFF";
        chromBoxes.append("rect")
            .attr("class", function(d) { return "chromBox chr" + d.chr; })
            .attr("x", function(d) { return d.x; })
            .attr("y", config.chromLegendStartYCoord)
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
            .attr("class", function(d) { return "chromBoxText chr" + d.chr; })
            .attr("x", function(d) { return d.x + (d.width / 2); })
            .attr("y", config.chromLegendStartYCoord + (config.chromLegendHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-family", "Arial")
            .text(function(d) { return d.chr; })
            .attr("font-size", "8px");

        // PLOT INDICATOR RECTANGLES

        var indicators = curVizObj.view.indicatorSVG
            .append("g")
            .classed("indicators", true)
            .selectAll(".indic")
            .data(curVizObj.data.hm_sc_ids)
            .enter()
            .append("rect")
            .attr("class", function(d) {
                var gtype = _getGenotype(curVizObj.userConfig.sc_annot, d);
                var tp = _getTP(curVizObj.userConfig.sc_annot, d);
                return "indic sc_" + d + " gtype_" + gtype + " tp_" + tp;
            })
            .attr("x", 0)
            .attr("y", function(d) { 
                return curVizObj.data.yCoordinates[d]; 
            })
            .attr("height", curVizObj.view.hm.rowHeight)
            .attr("width", config.annotColWidth)
            .attr("fill", config.highlightColour)
            .attr("fill-opacity", 0)
            .attr("stroke", "none");
        
        
        // PLOT GROUP ANNOTATION COLUMN

        if (curVizObj.view.gtypesSpecified) {

            var gtypeAnnot = curVizObj.view.gtypeAnnotSVG
                .append("g")
                .classed("gtypeAnnotG", true)
                .selectAll(".gtypeAnnot")
                .data(curVizObj.userConfig.sc_annot)
                .enter()
                .append("rect")
                .attr("class", function(d) {
                    return "gtypeAnnot gtype_" + d.genotype + " sc_" + d.single_cell_id;
                })
                .attr("x", 0)
                .attr("y", function(d) { 
                    d.y = curVizObj.data.yCoordinates[d.single_cell_id];
                    return d.y; 
                })
                .attr("height", curVizObj.view.hm.rowHeight)
                .attr("width", config.annotColWidth)
                .attr("fill", function(d) {
                    return curVizObj.view.colour_assignment[d.genotype];
                })
                .attr("stroke", "none")
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverNode(d.single_cell_id, view_id, curVizObj.nodeTip, config.switchView, curVizObj.userConfig.sc_annot);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutNode(d.single_cell_id, curVizObj.view_id, curVizObj.nodeTip);
                    }
                });
        }

        // PLOT TIMEPOINT ANNOTATION COLUMN

        if (curVizObj.view.tpsSpecified) {

            var tpAnnot = curVizObj.view.tpAnnotSVG
                .append("g")
                .classed("tpAnnotG", true)
                .selectAll(".tpAnnot")
                .data(curVizObj.userConfig.sc_annot)
                .enter()
                .append("rect")
                .attr("class", function(d) {
                    return "tpAnnot tp_" + d.timepoint + " sc_" + d.single_cell_id;
                })
                .attr("x", 0)
                .attr("y", function(d) { 
                    d.y = curVizObj.data.yCoordinates[d.single_cell_id];
                    return d.y; 
                })
                .attr("height", curVizObj.view.hm.rowHeight)
                .attr("width", config.annotColWidth)
                .attr("fill", function(d) {
                    return curVizObj.view.tp_colourScale(d.timepoint);
                })
                .attr("stroke", "none")
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverNode(d.single_cell_id, view_id, curVizObj.nodeTip, config.switchView, curVizObj.userConfig.sc_annot);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutNode(d.single_cell_id, curVizObj.view_id, curVizObj.nodeTip);
                    }
                });
        }

        // PLOT CLASSICAL PHYLOGENY & FORCE DIRECTED GRAPH

        _plotForceDirectedGraph(curVizObj); // originally force-directed graph has opacity of 0
        _plotAlignedPhylogeny(curVizObj);

        // PLOT HEATMAP LEGEND

        // heatmap legend title
        curVizObj.view.cnvLegendSVG.append("text")
            .attr("x", config.paddingGeneral)
            .attr("y", config.heatmapLegendStartY) 
            .attr("dy", "+0.71em")
            .attr("font-family", "Arial")
            .attr("font-weight", "bold")
            .attr("font-size", config.legendTitleHeight)
            .text(curVizObj.userConfig.value_type);

        // starting y-coordinate for the heatmap rectangle(s) in legend
        var legendRectStart = config.heatmapLegendStartY + config.legendTitleHeight + config.rectSpacing*2;
        
        // height for continuous cnv data legend rectangle (make it the same as the discrete CNV legend height)
        var legendRectHeight = (maxCNV+1)*(config.rectHeight + config.rectSpacing);


        // CNV LEGEND
        if (curVizObj.userConfig.heatmap_type == "cnv") {

            // CONTINUOUS DATA
            if (curVizObj.userConfig.continuous_cnv) {
                // 2/maxCNV 
                var normal_relative = (2/maxCNV);

                // linear gradient for fill of targeted mutation legend
                curVizObj.view.cnvLegendSVG
                    .append("linearGradient")
                    .attr("id", "targetedGradient")
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("x1", 0).attr("y1", legendRectStart)
                    .attr("x2", 0).attr("y2", legendRectStart + legendRectHeight)
                    .selectAll("stop")
                    .data([
                        {offset: "0%", color: discrete_colours[2]},
                        {offset: (((1 - normal_relative)*100) + "%"), color: discrete_colours[1]}, 
                        {offset: "100%", color: discrete_colours[0]}
                    ])
                    .enter().append("stop")
                    .attr("offset", function(d) { return d.offset; })
                    .attr("stop-color", function(d) { return d.color; });

                // legend rectangle with gradient
                curVizObj.view.cnvLegendSVG
                    .append("rect")
                    .attr("x", config.paddingGeneral)
                    .attr("y", legendRectStart)
                    .attr("width", config.rectHeight)
                    .attr("height", legendRectHeight)
                    .attr("fill", "url(#targetedGradient)");

                // legend text
                curVizObj.view.cnvLegendSVG
                    .append("text")
                    .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                    .attr("y", legendRectStart)
                    .attr("dy", "+0.71em")
                    .text(">=" + maxCNV)
                    .attr("font-family", "Arial")
                    .attr("font-size", config.legendFontHeight)
                    .style("fill", "black");
                curVizObj.view.cnvLegendSVG
                    .append("text")
                    .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                    .attr("y", legendRectStart + (1-normal_relative)*legendRectHeight)
                    .attr("dy", "+0.35em")
                    .text("2")
                    .attr("font-family", "Arial")
                    .attr("font-size", config.legendFontHeight)
                    .style("fill", "black");
                curVizObj.view.cnvLegendSVG
                    .append("text")
                    .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                    .attr("y", legendRectStart + legendRectHeight)
                    .text("0")
                    .attr("font-family", "Arial")
                    .attr("font-size", config.legendFontHeight)
                    .style("fill", "black");
            }

            // DISCRETE DATA
            else {

                // heatmap legend rectangle / text genotype
                var heatmapLegendG = curVizObj.view.cnvLegendSVG
                    .selectAll(".heatmapLegendG")
                    .data(cnvColorScale.domain())
                    .enter()
                    .append("g")
                    .classed("heatmapLegendG", true);

                // CNV legend rectangles
                heatmapLegendG
                    .append("rect")
                    .attr("x", config.paddingGeneral)
                    .attr("y", function(d,i) {
                        return legendRectStart + i*(config.rectHeight + config.rectSpacing);
                    })
                    .attr("height", config.rectHeight)
                    .attr("width", config.rectHeight)
                    .attr("fill", function(d) {
                        return cnvColorScale(d);
                    });

                // CNV legend text
                heatmapLegendG
                    .append("text")
                    .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                    .attr("y", function(d,i) {
                        return config.heatmapLegendStartY + config.legendTitleHeight + config.rectSpacing*2 + 
                            i*(config.rectHeight + config.rectSpacing) + (config.legendFontHeight/2);
                    })
                    .attr("dy", "+0.35em")
                    .text(function(d) { 
                        if (d==maxCNV) {
                            return ">=" + d;
                        }
                        return d; 
                    })
                    .attr("font-family", "Arial")
                    .attr("font-size", config.legendFontHeight)
                    .style("fill", "black");
            }

        }
        // TARGETED HEATMAP LEGEND
        else {
            // linear gradient for fill of targeted mutation legend
            curVizObj.view.cnvLegendSVG.append("linearGradient")
                .attr("id", "targetedGradient")
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", 0).attr("y1", legendRectStart)
                .attr("x2", 0).attr("y2", legendRectStart + legendRectHeight)
                .selectAll("stop")
                .data([
                    {offset: "0%", color: targeted_colours[2]},
                    {offset: "50%", color: targeted_colours[1]},
                    {offset: "100%", color: targeted_colours[0]}
                ])
                .enter().append("stop")
                .attr("offset", function(d) { return d.offset; })
                .attr("stop-color", function(d) { return d.color; });

            // VAF legend rectangle with gradient
            curVizObj.view.cnvLegendSVG
                .append("rect")
                .attr("x", config.paddingGeneral)
                .attr("y", legendRectStart)
                .attr("width", config.rectHeight)
                .attr("height", legendRectHeight)
                .attr("fill", "url(#targetedGradient)");

            // VAF legend text
            curVizObj.view.cnvLegendSVG
                .append("text")
                .attr("class", "VAFlegendText")
                .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                .attr("y", legendRectStart)
                .attr("dy", "+0.71em")
                .attr("font-family", "Arial")
                .attr("font-size", config.legendFontHeight)
                .attr("fill", "black")
                .text("1");
            curVizObj.view.cnvLegendSVG
                .append("text")
                .attr("class", "VAFlegendText")
                .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                .attr("y", legendRectStart + legendRectHeight/2)
                .attr("dy", "+0.35em")
                .attr("font-family", "Arial")
                .attr("font-size", config.legendFontHeight)
                .attr("fill", "black")
                .text("0.5");
            curVizObj.view.cnvLegendSVG
                .append("text")
                .attr("class", "VAFlegendText")
                .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                .attr("y", legendRectStart + legendRectHeight)
                .attr("font-family", "Arial")
                .attr("font-size", config.legendFontHeight)
                .attr("fill", "black")
                .text("0");
        }
        config.gtypeAnnotStartY = legendRectStart + legendRectHeight + config.paddingGeneral; // starting y-pixel for genotype annotation legend

        // GENOTYPE ANNOTATION LEGEND
        if (curVizObj.view.gtypesSpecified) {

            // genotype annotation legend title
            curVizObj.view.cnvLegendSVG.append("text")
                .attr("x", config.paddingGeneral)
                .attr("y", config.gtypeAnnotStartY)
                .attr("dy", "+0.71em")
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("font-size", config.legendTitleHeight)
                .text(curVizObj.userConfig.clone_title);

            // genotype annotation legend rectangle / text genotype
            var gtypeAnnotLegendG = curVizObj.view.cnvLegendSVG
                .selectAll(".gtypeAnnotLegendG")
                .data(Object.keys(curVizObj.data.gtypes))
                .enter()
                .append("g")
                .classed("gtypeAnnotLegendG", true);

            // genotype annotation legend rectangles
            gtypeAnnotLegendG
                .append("rect")
                .attr("class", function(d) { return "legendGroupRect gtype_" + d; })
                .attr("x", config.paddingGeneral)
                .attr("y", function(d,i) {
                    return config.gtypeAnnotStartY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing);
                })
                .attr("height", config.rectHeight)
                .attr("width", config.rectHeight)
                .attr("fill", function(d) {
                    return curVizObj.view.alpha_colour_assignment[d];
                })
                .attr("stroke", function(d) {
                    return curVizObj.view.colour_assignment[d];
                })
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverGenotype(d, view_id);
                        // show labels in timescape
                        if (curVizObj.userConfig.timescape_wanted) {
                            _showLabels(d, view_id);
                        }
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutGenotype(view_id);
                        // hide labels in timescape
                        if (curVizObj.userConfig.timescape_wanted) {
                            _hideLabels(view_id);
                        }
                    }
                });

            // genotype annotation legend text
            gtypeAnnotLegendG
                .append("text")
                .attr("class", function(d) { return "legendGroupText gtype_" + d; })
                .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                .attr("y", function(d,i) {
                    return config.gtypeAnnotStartY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing) + (config.legendFontHeight/2);
                })
                .attr("dy", "+0.35em")
                .text(function(d) { return d; })
                .attr("font-family", "Arial")
                .attr("font-size", config.legendFontHeight)
                .attr("fill", "black")
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverGenotype(d, view_id);
                        // show labels in timescape
                        if (curVizObj.userConfig.timescape_wanted) {
                            _showLabels(d, view_id);
                        }
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutGenotype(view_id);
                        // hide labels in timescape
                        if (curVizObj.userConfig.timescape_wanted) {
                            _hideLabels(view_id);
                        }
                    }
                });

            // note end of genotype annotation legend
            config.gtypeAnnotEndY = config.gtypeAnnotStartY + config.legendTitleHeight + config.rectSpacing*2 + 
              Object.keys(curVizObj.data.gtypes).length*(config.rectHeight + config.rectSpacing) + 
              config.legendFontHeight;
        }


        // TIMEPOINT ANNOTATION LEGEND
        if (curVizObj.view.tpsSpecified) {

            // genotype annotation legend title
            curVizObj.view.cnvLegendSVG.append("text")
                .attr("x", config.paddingGeneral)
                .attr("y", config.gtypeAnnotEndY)
                .attr("dy", "+0.71em")
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("font-size", config.legendTitleHeight)
                .text(curVizObj.userConfig.timepoint_title);

            // genotype annotation legend rectangle / text genotype
            var tpAnnotLegendG = curVizObj.view.cnvLegendSVG
                .selectAll(".tpAnnotLegendG")
                .data(curVizObj.data.tps)
                .enter()
                .append("g")
                .classed("tpAnnotLegendG", true);

            // genotype annotation legend rectangles
            tpAnnotLegendG
                .append("rect")
                .attr("class", function(d) { return "legendTpRect tp_" + d; })
                .attr("x", config.paddingGeneral)
                .attr("y", function(d,i) {
                    return config.gtypeAnnotEndY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing);
                })
                .attr("height", config.rectHeight)
                .attr("width", config.rectHeight)
                .attr("fill", function(d) {
                    return curVizObj.view.tp_colourScale(d);
                })
                .attr("stroke", function(d) {
                    return curVizObj.view.tp_colourScale(d);
                })
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverTp(d, view_id);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutTp(view_id);
                    }
                });

            // genotype annotation legend text
            tpAnnotLegendG
                .append("text")
                .attr("class", function(d) { return "legendTpText tp_" + d; })
                .attr("x", config.paddingGeneral + config.rectHeight + config.rectSpacing)
                .attr("y", function(d,i) {
                    return config.gtypeAnnotEndY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing) + (config.legendFontHeight/2);
                })
                .attr("dy", "+0.35em")
                .text(function(d) { return d; })
                .attr("font-family", "Arial")
                .attr("font-size", config.legendFontHeight)
                .attr("fill", "black")
                .on("mouseover", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoverTp(d, view_id);
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(view_id)) {
                        _mouseoutTp(view_id);
                    }
                });
        }


        // RUN TIMESCAPE
        if (curVizObj.userConfig.timescape_wanted) {
            _run_timescape(el.id, config.width, config.tsViewHeight, x);
        }
    },

    resize: function(el, width, height, instance) {

    }

});
