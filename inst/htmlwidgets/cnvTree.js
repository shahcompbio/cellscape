HTMLWidgets.widget({

    name: 'cnvTree',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            widgetMargin: 10, // marging between widgets
            tree_r: 3 // tree node radius
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
        config.treeWidth = config.width/2;
        config.treeHeight = config.height;

        // cnv configurations
        config.cnvWidth = config.width/2;
        config.cnvHeight = config.height;

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

        // CNV SVG

        var cnvSVG = containerDIV
            .append("svg:svg")
            .attr("class", "cnvSVG")
            .attr("width", config.cnvWidth + "px")
            .attr("height", config.cnvHeight + "px")

        // FORCE FUNCTION

        var force = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .linkDistance(10)
            .gravity(.09)
            .charge(-20)
            .nodes(vizObj.data.tree_nodes)
            .links(vizObj.data.tree_edges)
            .start();

        // NODE TOOLTIP FUNCTION

        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Node:</strong> <span style='color:white'>" + d.name + "</span>";
            });
        treeSVG.call(tip);


        // PLOT NODES AND EDGES

        var link_ids = []; // store link id's
        var link = treeSVG
            .append("g")
            .attr("class", "links")
            .selectAll(".link")
            .data(vizObj.data.tree_edges)
            .enter().append("line")
            .attr("class", "link")
            .attr("id", function(d) { 
                d.link_id = _getLinkId(d)
                link_ids.push(d.link_id);
                return d.link_id; 
            })
            .style("stroke","black")
            .on("mouseover", function(d) { 
                return _linkMouseover(d.link_id, link_ids); 
            })
            .on("mouseout", function(d) { 
                return _linkMouseout(); 
            });

        var node = treeSVG
            .append("g")
            .attr("class", "nodes")
            .selectAll(".node")
            .data(vizObj.data.tree_nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("id", function(d) {
                return "node_" + d.name;
            })
            .attr("r", config.tree_r)
            .style("fill", "#52A783")
            .style("stroke", "#1C764F")
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
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
            .attr("class", "gridCells")
            .selectAll(".gridCell")
            .data(vizObj.view.cnv.pixels)
            .enter()
            .append("rect")
            .attr("class", "gridCell")
            .attr("id", function(d) {
                return "cnv_" + d.sc_id;
            })
            .attr("x", function(d) { return d.col - d.px_length + 1; })
            .attr("y", function(d) { return (d.row/vizObj.view.cnv.nrows)*config.cnvHeight; })
            .attr("height", (1/vizObj.view.cnv.nrows)*config.cnvHeight)
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


    },

    resize: function(el, width, height, instance) {

    }

});
