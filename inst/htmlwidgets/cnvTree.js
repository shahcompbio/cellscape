HTMLWidgets.widget({

    name: 'cnvTree',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            widgetMargin: 10 // marging between widgets
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
        config.tree_r = 5;

        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var config = vizObj.generalConfig;

        // GET PARAMS FROM R

        vizObj.userConfig = x;

        // GET CONTENT

        // get tree edges and nodes
        _getTreeInfo(vizObj)

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

        // FORCE FUNCTION

        var force = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .nodes(vizObj.data.tree_nodes)
            .links(vizObj.data.tree_edges)
            .start();

        // TOOLTIP FUNCTION
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Node:</strong> <span style='color:white'>" + d.name + "</span>";
            });
        treeSVG.call(tip);


        // PLOT NODES AND EDGES

        var link = treeSVG
            .append("g")
            .attr("class", "links")
            .selectAll(".link")
            .data(vizObj.data.tree_edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke","black");

        var node = treeSVG
            .append("g")
            .attr("class", "nodes")
            .selectAll(".node")
            .data(vizObj.data.tree_nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 5)
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

    },

    resize: function(el, width, height, instance) {

    }

});
