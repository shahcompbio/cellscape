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
            fontHeight: 12,
            topBarHeight: 30, // height of top panel
            topBarColour: "#ECECEC",
            topBarHighlight: "#C6C6C6",
            spaceBelowTopBar: 15 // amount of space (px) below the top bar
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // general configurations
        var config = $.extend(true, {}, defaults);
        config.width = width - 15; // - 15 because vertical scrollbar takes 15 px
        config.height = height - 15; // - 15 because vertical scrollbar takes 15 px

        // cnv configurations
        config.cnvHeight = config.height - config.topBarHeight - config.spaceBelowTopBar;
        config.cnvTop = 0;
        config.cnvBottom = (config.cnvHeight-config.chromLegendHeight);

        // indicator configurations
        config.indicatorHeight = config.height - config.topBarHeight - config.spaceBelowTopBar;

        // group annotation configurations
        config.groupAnnotHeight = config.height - config.topBarHeight - config.spaceBelowTopBar;

        // cnv legend configurations
        config.cnvLegendHeight = config.height - config.topBarHeight - config.spaceBelowTopBar;

        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var config = vizObj.generalConfig;
        var view_id = el.id;

        // GET PARAMS FROM R

        vizObj.userConfig = x;
        vizObj.view.groupsSpecified = (vizObj.userConfig.sc_groups != null); // (T/F) group annotation is specified

        // UPDATE GENERAL PARAMS, GIVEN USER PARAMS

        // tree configurations
        config.treeWidth = config.width - config.indicatorWidth - config.cnvLegendWidth - vizObj.userConfig.cnvWidth;
        config.treeHeight = config.height - config.topBarHeight - config.spaceBelowTopBar;

        // if group annotation specified, reduce the width of the tree
        if (vizObj.view.groupsSpecified) {
            config.treeWidth -= config.groupAnnotWidth;
        }

        // GET CNV CONTENT

        // cnv plot number of rows
        vizObj.view.cnv = {};
        vizObj.view.cnv.nrows = vizObj.userConfig.sc_ids_ordered.length;

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

        // BRUSH SELECTION FUNCTION

        var brush = d3.svg.brush()
            .y(d3.scale.linear().domain([0, config.cnvHeight]).range([0, config.cnvHeight]))
            .on("brushstart", function() { d3.select(".cnvSVG").classed("brushed", true); })
            .on("brushend", function() {
                return _brushEnd(vizObj, brush);
            });

        // TOP BAR DIV

        var topBarDIV = d3.select(el).append("div")
            .attr("class", "topBarDIV")
            .style("position", "relative")
            .style("width", config.width + "px")
            .style("height", config.topBarHeight + "px")
            .style("float", "left");

        // SPACE BETWEEN TOP BAR AND VIEW DIV

        var spaceDIV = d3.select(el)
            .append("div")
            .attr("class", "spaceDIV")
            .style("width", config.width + "px")
            .style("height", config.spaceBelowTopBar + "px")
            .style("float", "left");

        // CONTAINER DIV

        var containerDIV = d3.select(el)
            .append("div")
            .attr("class", "containerDIV")
            .style("width", config.width + "px")
            .style("height", config.cnvHeight + "px")
            .style("float", "left");

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
            .attr("height", config.indicatorHeight + "px");

        // GROUP ANNOTATION SVG

        if (vizObj.view.groupsSpecified) {
            var groupAnnotSVG = containerDIV
                .append("svg:svg")
                .attr("class", "groupAnnotSVG")
                .attr("width", config.groupAnnotWidth + "px")
                .attr("height", config.groupAnnotHeight + "px");
        }

        // CNV SVG

        var cnvSVG = containerDIV
            .append("svg:svg")
            .attr("class", "cnvSVG")
            .attr("width", vizObj.userConfig.cnvWidth + "px")
            .attr("height", config.cnvHeight + "px")

        // CNV LEGEND SVG

        var cnvLegendSVG = containerDIV
            .append("svg:svg")
            .attr("class", "cnvLegendSVG")
            .attr("width", config.cnvLegendWidth + "px")
            .attr("height", config.cnvLegendHeight + "px")

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

        var smallButtonWidth = 42; // width of the top panel reset button

        var resetButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik00MzIuOTc1LDgwLjAzNGMtMjcuOTk4LTI3Ljk2My02MC45MjYtNDcuODYtOTYuMDM3LTU5Ljc2NHY3NS4xODkNCgkJYzE2LjkwNCw4LjQxNywzMi45MjgsMTkuMzY5LDQ2Ljk4LDMzLjQ1NmM3MC4xODgsNzAuMjI0LDcwLjE4OCwxODQuMzk3LDAsMjU0LjU4NGMtNzAuMTg5LDcwLjA4NC0xODQuMjkzLDcwLjA4NC0yNTQuNTg3LDANCgkJYy03MC4xMTctNzAuMjU4LTcwLjExNy0xODQuMzYxLDAtMjU0LjU4NGMwLjE3Ny0wLjIxMSwwLjc0LTAuNTYzLDAuOTg3LTAuODhoMC4wN2w3NC4yMTcsODEuNzMxTDIxNC41LDguNUw4LjkwNSwzLjM1Ng0KCQlsNzIuNDYxLDc1LjU4NmMtMC4yNDcsMC40MjItMC42MzQsMC44NDUtMC45NTEsMS4wOTJjLTk3LjMwNSw5Ny4yNy05Ny4zMDUsMjU1LjA3OSwwLDM1Mi4zNDkNCgkJYzk3LjQ0Niw5Ny4zNzUsMjU1LjE1LDk3LjM3NSwzNTIuNTYsMEM1MzAuMjA5LDMzNS4xMTMsNTMwLjMxNCwxNzcuMzA0LDQzMi45NzUsODAuMDM0eiIvPg0KPC9nPg0KPC9zdmc+DQo="
        var selectionButton_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMS4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDYxLjM4MiA2MS4zODIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYxLjM4MiA2MS4zODI7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iMTZweCIgaGVpZ2h0PSIxNnB4Ij4KPGc+Cgk8ZyBpZD0iZ3JvdXAtNDFzdmciPgoJCTxwYXRoIGlkPSJwYXRoLTFfMzNfIiBkPSJNNTEuNDU1LDYxLjIxMmgtMi40MjhjLTAuODI5LDAtMS41LTAuNjczLTEuNS0xLjUwMWMwLTAuODMsMC42NzEtMS41MDEsMS41LTEuNTAxaDIuNDI4ICAgIGMwLjcwNCwwLDEuMzk1LTAuMTEyLDIuMDU0LTAuMzMxYzAuNzg1LTAuMjYyLDEuNjM1LDAuMTYzLDEuODk2LDAuOTVjMC4yNjIsMC43ODctMC4xNjMsMS42MzctMC45NDksMS44OTkgICAgQzUzLjQ5MSw2MS4wNDgsNTIuNDgyLDYxLjIxMiw1MS40NTUsNjEuMjEyeiBNNDQuMDI2LDYxLjIxMmgtNWMtMC44MjgsMC0xLjUtMC42NzMtMS41LTEuNTAxYzAtMC44MywwLjY3Mi0xLjUwMSwxLjUtMS41MDFoNSAgICBjMC44MjksMCwxLjUsMC42NzEsMS41LDEuNTAxQzQ1LjUyNiw2MC41MzksNDQuODU1LDYxLjIxMiw0NC4wMjYsNjEuMjEyeiBNMzQuMDI3LDYxLjIxMmgtNWMtMC44MjksMC0xLjUtMC42NzMtMS41LTEuNTAxICAgIGMwLTAuODMsMC42NzEtMS41MDEsMS41LTEuNTAxaDVjMC44MjgsMCwxLjQ5OSwwLjY3MSwxLjQ5OSwxLjUwMUMzNS41MjYsNjAuNTM5LDM0Ljg1NSw2MS4yMTIsMzQuMDI3LDYxLjIxMnogTTI0LjAyNiw2MS4yMTJoLTUgICAgYy0wLjgyOCwwLTEuNS0wLjY3My0xLjUtMS41MDFjMC0wLjgzLDAuNjcyLTEuNTAxLDEuNS0xLjUwMWg1YzAuODI5LDAsMS41LDAuNjcxLDEuNSwxLjUwMSAgICBDMjUuNTI2LDYwLjUzOSwyNC44NTUsNjEuMjEyLDI0LjAyNiw2MS4yMTJ6IE0xNC4wMjcsNjEuMjEySDkuNDU1Yy0wLjE3LDAtMC4zMzgtMC4wMDUtMC41MDctMC4wMTMgICAgYy0wLjgyNy0wLjA0NC0xLjQ2My0wLjc1LTEuNDItMS41NzhjMC4wNDMtMC44MjgsMC43MzktMS40NjcsMS41NzctMS40MjFjMC4xMTYsMC4wMDcsMC4yMzMsMC4wMSwwLjM1LDAuMDFoNC41NzIgICAgYzAuODI4LDAsMS40OTksMC42NzEsMS40OTksMS41MDFDMTUuNTI2LDYwLjUzOSwxNC44NTUsNjEuMjEyLDE0LjAyNyw2MS4yMTJ6IE00LjQzNSw1OS40MzljLTAuMzMxLDAtMC42NjQtMC4xMDgtMC45NDItMC4zMzIgICAgYy0xLjU2NC0xLjI2NC0yLjY3Mi0yLjk1NC0zLjIwMS00Ljg4OGMtMC4yMi0wLjc5OSwwLjI1MS0xLjYyNSwxLjA1LTEuODQ0YzAuNzk4LTAuMjE5LDEuNjI0LDAuMjUxLDEuODQzLDEuMDUxICAgIGMwLjM2MiwxLjMyMiwxLjEyMSwyLjQ3OCwyLjE5MywzLjM0NWMwLjY0NSwwLjUyLDAuNzQ1LDEuNDY1LDAuMjI1LDIuMTFDNS4zMDcsNTkuMjQ5LDQuODcyLDU5LjQzOSw0LjQzNSw1OS40Mzl6IE01Ny45NDQsNTcuODg5ICAgIGMtMC4zMDUsMC0wLjYxMi0wLjA5My0wLjg3Ny0wLjI4NGMtMC42NzItMC40ODYtMC44MjQtMS40MjQtMC4zMzgtMi4wOTZjMC44MDItMS4xMTIsMS4yMjYtMi40MjgsMS4yMjYtMy44MDQgICAgYzAtMC44MjksMC42NzItMS41MDEsMS41LTEuNTAxYzAuODI4LDAsMS41LDAuNjcyLDEuNSwxLjUwMWMwLDIuMDExLTAuNjIsMy45MzQtMS43OTUsNS41NjIgICAgQzU4Ljg2Nyw1Ny42NzMsNTguNDA4LDU3Ljg4OSw1Ny45NDQsNTcuODg5eiBNMS44ODIsNTAuMzQ2Yy0wLjgyOCwwLTEuNS0wLjY3Mi0xLjUtMS41MDF2LTUuMDAzYzAtMC44MywwLjY3Mi0xLjUwMiwxLjUtMS41MDIgICAgczEuNSwwLjY3MiwxLjUsMS41MDJ2NS4wMDNDMy4zODIsNDkuNjc0LDIuNzEsNTAuMzQ2LDEuODgyLDUwLjM0NnogTTU5Ljg4Miw0OS45MTljLTAuODI4LDAtMS41LTAuNjcyLTEuNS0xLjUwMXYtNS4wMDQgICAgYzAtMC44MjgsMC42NzItMS41MDEsMS41LTEuNTAxczEuNSwwLjY3MywxLjUsMS41MDF2NS4wMDRDNjEuMzgyLDQ5LjI0Nyw2MC43MSw0OS45MTksNTkuODgyLDQ5LjkxOXogTTEuODgyLDQwLjMzOSAgICBjLTAuODI4LDAtMS41LTAuNjcyLTEuNS0xLjUwMXYtNS4wMDRjMC0wLjgyOSwwLjY3Mi0xLjUwMSwxLjUtMS41MDFzMS41LDAuNjcyLDEuNSwxLjUwMXY1LjAwNCAgICBDMy4zODIsMzkuNjY3LDIuNzEsNDAuMzM5LDEuODgyLDQwLjMzOXogTTU5Ljg4MiwzOS45MTJjLTAuODI4LDAtMS41LTAuNjcyLTEuNS0xLjUwMXYtNS4wMDRjMC0wLjgyOCwwLjY3Mi0xLjUwMSwxLjUtMS41MDEgICAgczEuNSwwLjY3MywxLjUsMS41MDF2NS4wMDRDNjEuMzgyLDM5LjI0LDYwLjcxLDM5LjkxMiw1OS44ODIsMzkuOTEyeiBNMS44ODIsMzAuMzMyYy0wLjgyOCwwLTEuNS0wLjY3Mi0xLjUtMS41MDF2LTUuMDA0ICAgIGMwLTAuODI5LDAuNjcyLTEuNTAxLDEuNS0xLjUwMXMxLjUsMC42NzIsMS41LDEuNTAxdjUuMDA0QzMuMzgyLDI5LjY2LDIuNzEsMzAuMzMyLDEuODgyLDMwLjMzMnogTTU5Ljg4MiwyOS45MDUgICAgYy0wLjgyOCwwLTEuNS0wLjY3Mi0xLjUtMS41MDFWMjMuNGMwLTAuODI4LDAuNjcyLTEuNTAxLDEuNS0xLjUwMXMxLjUsMC42NzMsMS41LDEuNTAxdjUuMDA0ICAgIEM2MS4zODIsMjkuMjMzLDYwLjcxLDI5LjkwNSw1OS44ODIsMjkuOTA1eiBNMS44ODIsMjAuMzI1Yy0wLjgyOCwwLTEuNS0wLjY3Mi0xLjUtMS41MDFWMTMuODJjMC0wLjgyOSwwLjY3Mi0xLjUwMSwxLjUtMS41MDEgICAgczEuNSwwLjY3MiwxLjUsMS41MDF2NS4wMDRDMy4zODIsMTkuNjUzLDIuNzEsMjAuMzI1LDEuODgyLDIwLjMyNXogTTU5Ljg4MiwxOS44OThjLTAuODI4LDAtMS41LTAuNjcyLTEuNS0xLjUwMXYtNS4wMDQgICAgYzAtMC44MjksMC42NzItMS41MDEsMS41LTEuNTAxczEuNSwwLjY3MiwxLjUsMS41MDF2NS4wMDRDNjEuMzgyLDE5LjIyNiw2MC43MSwxOS44OTgsNTkuODgyLDE5Ljg5OHogTTEuNTAyLDEwLjMyICAgIGMtMC4wNTMsMC0wLjEwNi0wLjAwMy0wLjE2LTAuMDA5QzAuNTE4LDEwLjIyMy0wLjA3OSw5LjQ4NCwwLjAwOSw4LjY2YzAuMjEyLTEuOTk1LDEuMDM0LTMuODQxLDIuMzc4LTUuMzM4ICAgIGMwLjU1NC0wLjYxNywxLjUwMi0wLjY2OCwyLjExOC0wLjExNGMwLjYxNywwLjU1NCwwLjY2OCwxLjUwMywwLjExNCwyLjEyYy0wLjkyLDEuMDI1LTEuNDgyLDIuMjg3LTEuNjI4LDMuNjQ5ICAgIEMyLjkxLDkuNzQ4LDIuMjU5LDEwLjMyLDEuNTAyLDEwLjMyeiBNNTkuMzUxLDkuODk3Yy0wLjcyNCwwLTEuMzYxLTAuNTI1LTEuNDgtMS4yNjRjLTAuMjE3LTEuMzUyLTAuODQ1LTIuNTgyLTEuODE5LTMuNTU3ICAgIGMtMC41ODYtMC41ODYtMC41ODYtMS41MzYsMC0yLjEyMmMwLjU4Ni0wLjU4NiwxLjUzNS0wLjU4NywyLjEyMSwwYzEuNDIzLDEuNDI0LDIuMzQzLDMuMjIzLDIuNjYxLDUuMjA0ICAgIGMwLjEzMSwwLjgxOC0wLjQyNiwxLjU4OS0xLjI0MywxLjcyQzU5LjUxLDkuODkxLDU5LjQzLDkuODk3LDU5LjM1MSw5Ljg5N3ogTTcuNzU0LDMuMzUyYy0wLjY5MSwwLTEuMzEzLTAuNDgtMS40NjUtMS4xODQgICAgYy0wLjE3Ni0wLjgxLDAuMzM5LTEuNjA5LDEuMTQ5LTEuNzg0YzAuNjU5LTAuMTQzLDEuMzM4LTAuMjE1LDIuMDE3LTAuMjE1aDMuMjg3YzAuODI4LDAsMS41LDAuNjcxLDEuNSwxLjUwMSAgICBjMCwwLjgyOC0wLjY3MiwxLjUwMS0xLjUsMS41MDFIOS40NTVjLTAuNDY3LDAtMC45MzIsMC4wNS0xLjM4MywwLjE0N0M3Ljk2NSwzLjM0MSw3Ljg1OSwzLjM1Miw3Ljc1NCwzLjM1MnogTTUyLjczNywzLjI3MyAgICBjLTAuMDc5LDAtMC4xNTktMC4wMDctMC4yNC0wLjAxOWMtMC4zNDItMC4wNTYtMC42OTItMC4wODMtMS4wNDItMC4wODNoLTMuNzEzYy0wLjgyOCwwLTEuNS0wLjY3My0xLjUtMS41MDEgICAgYzAtMC44MywwLjY3Mi0xLjUwMSwxLjUtMS41MDFoMy43MTNjMC41MDgsMCwxLjAxOSwwLjA0LDEuNTE5LDAuMTIxYzAuODE3LDAuMTMxLDEuMzc0LDAuOTAxLDEuMjQzLDEuNzIgICAgQzU0LjA5OCwyLjc0Nyw1My40NjEsMy4yNzMsNTIuNzM3LDMuMjczeiBNNDIuNzQyLDMuMTcxaC01Yy0wLjgyOCwwLTEuNS0wLjY3My0xLjUtMS41MDFjMC0wLjgzLDAuNjcyLTEuNTAxLDEuNS0xLjUwMWg1ICAgIGMwLjgyOCwwLDEuNSwwLjY3MSwxLjUsMS41MDFDNDQuMjQyLDIuNDk4LDQzLjU3LDMuMTcxLDQyLjc0MiwzLjE3MXogTTMyLjc0MiwzLjE3MWgtNWMtMC44MjgsMC0xLjUtMC42NzMtMS41LTEuNTAxICAgIGMwLTAuODMsMC42NzItMS41MDEsMS41LTEuNTAxaDVjMC44MjgsMCwxLjUsMC42NzEsMS41LDEuNTAxQzM0LjI0MiwyLjQ5OCwzMy41NywzLjE3MSwzMi43NDIsMy4xNzF6IE0yMi43NDIsMy4xNzFoLTUgICAgYy0wLjgyOCwwLTEuNS0wLjY3My0xLjUtMS41MDFjMC0wLjgzLDAuNjcyLTEuNTAxLDEuNS0xLjUwMWg1YzAuODI4LDAsMS41LDAuNjcxLDEuNSwxLjUwMSAgICBDMjQuMjQyLDIuNDk4LDIzLjU3LDMuMTcxLDIyLjc0MiwzLjE3MXoiIGZpbGw9IiNGRkZGRkYiLz4KCTwvZz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K"
        var scissorsButton_base64 = "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA0NTEuNjc0IDQ1MS42NzQiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1MS42NzQgNDUxLjY3NDsiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIxNnB4IiBoZWlnaHQ9IjE2cHgiPgo8Zz4KCTxwYXRoIGQ9Ik0xNjcuODU0LDI5My4yOTljLTcuMTA0LTYuODM0LTE1LjQzLTEyLjYzMi0yNC44NS0xNy4wMjVjLTEyLjI5Mi01LjczMS0yNS4zNTYtOC42MzgtMzguODMtOC42MzggICBjLTM1LjYzLDAtNjguMzc4LDIwLjg1Ny04My40MzEsNTMuMTM4Yy0xMC4zODUsMjIuMjcxLTExLjQ3Niw0Ny4yNTUtMy4wNzEsNzAuMzQ3czI1LjI5OSw0MS41MjksNDcuNTcxLDUxLjkxNCAgIGMxMi4yOSw1LjczLDI1LjM1NCw4LjYzNywzOC44Myw4LjYzOWMzNS42MzEsMCw2OC4zNzktMjAuODU5LDgzLjQzMS01My4xMzhjMC0wLjAwMSwyMS4wMDMtMzYuMjkzLDIxLjAwMy0zNi4yOTNsLTQwLjI3Ni02OS41OTYgICBMMTY3Ljg1NCwyOTMuMjk5eiBNMTYwLjMxMywzODUuODU4Yy0xMC4xNDYsMjEuNzU3LTMyLjIxOCwzNS44MTUtNTYuMjM0LDM1LjgxNWMtOS4wNjktMC4wMDEtMTcuODY4LTEuOTYyLTI2LjE1OS01LjgyOCAgIGMtMTUuMDA5LTYuOTk5LTI2LjM5NC0xOS40MjMtMzIuMDU4LTM0Ljk4NXMtNC45MjktMzIuMzk4LDIuMDctNDcuNDA4YzEwLjE0Ni0yMS43NTcsMzIuMjIyLTM1LjgxNSw1Ni4yNDItMzUuODE1ICAgYzkuMDYxLDAsMTcuODU5LDEuOTYxLDI2LjE1MSw1LjgyN0MxNjEuMzA4LDMxNy45MTIsMTc0Ljc2MSwzNTQuODc0LDE2MC4zMTMsMzg1Ljg1OHoiIGZpbGw9IiNGRkZGRkYiLz4KCTxwYXRoIGQ9Ik0zNjIuODA0LDk1LjYyMmMxOS4zMy0zMy40OCw3Ljg1OS03Ni4yOTItMjUuNjIyLTk1LjYyMmwtOTQuMDI1LDE2Mi44NjRsNDAuMzE4LDY5LjgzNkwzNjIuODA0LDk1LjYyMnoiIGZpbGw9IiNGRkZGRkYiLz4KCTxwYXRoIGQ9Ik00MzAuOTMyLDMyMC43NzNjLTE1LjA1My0zMi4yNzktNDcuODAxLTUzLjEzNy04My40MzEtNTMuMTM3Yy0xMy40NzQsMC0yNi41MzgsMi45MDYtMzguODMsOC42MzggICBjLTkuNDIsNC4zOTMtMTcuNzQ3LDEwLjE5LTI0Ljg1LDE3LjAyNUwxMTQuNDkyLDBDODEuMDExLDE5LjMzLDY5LjU0LDYyLjE0MSw4OC44Nyw5NS42MjJsMTc1LjI5OSwzMDIuOTEgICBjMTUuMDU1LDMyLjI4NCw0Ny44MDMsNTMuMTQyLDgzLjQzMiw1My4xNDJjMTMuNDc1LDAsMjYuNTM5LTIuOTA3LDM4LjgzMS04LjYzOWMyMi4yNzEtMTAuMzg1LDM5LjE2Ni0yOC44MjIsNDcuNTcxLTUxLjkxNCAgIFM0NDEuMzE3LDM0My4wNDYsNDMwLjkzMiwzMjAuNzczeiBNNDA1LjgxMiwzODAuODZjLTUuNjY0LDE1LjU2My0xNy4wNDksMjcuOTg2LTMyLjA1OSwzNC45ODUgICBjLTguMjkyLDMuODY3LTE3LjA5MSw1LjgyOC0yNi4xNTIsNS44MjhjLTI0LjAyLDAtNDYuMDk1LTE0LjA1OS01Ni4yNDEtMzUuODE1Yy0xNC40NDgtMzAuOTg0LTAuOTk1LTY3Ljk0NiwyOS45ODgtODIuMzk1ICAgYzguMjkyLTMuODY2LDE3LjA5MS01LjgyNywyNi4xNTItNS44MjdjMjQuMDIsMCw0Ni4wOTYsMTQuMDU5LDU2LjI0MiwzNS44MTVDNDEwLjc0MSwzNDguNDYyLDQxMS40NzYsMzY1LjI5OCw0MDUuODEyLDM4MC44NnoiIGZpbGw9IiNGRkZGRkYiLz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K"

        var resetButtonIconWidth = config.topBarHeight - 10; // icon size for reset button
        var selectionButtonIconWidth = 16;
        var scissorsButtonIconWidth = 16;

        // reset button
        topBarSVG.append("rect")
            .attr("class", "resetButton")
            .attr("x", 0)
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
                // background click
                // _backgroundClick(curVizObj);
            });
        topBarSVG.append("image")
            .attr("xlink:href", resetButton_base64)
            .attr("x", (smallButtonWidth/2) - (resetButtonIconWidth/2))
            .attr("y", 5)
            .attr("width", resetButtonIconWidth)
            .attr("height", resetButtonIconWidth)
            .on("mouseover", function() {
                d3.select(".resetButton").attr("fill", config.topBarHighlight);
            })
            .on("mouseout", function() {
                d3.select(".resetButton").attr("fill", config.topBarColour);
            })
            .on("click", function() {
                // background click
                // _backgroundClick(curVizObj);
            });

        // brush selection button
        topBarSVG.append("rect")
            .attr("class", "selectionButton")
            .attr("x", smallButtonWidth)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.selectAll(".brushButtonSelected")[0].length == 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.selectAll(".brushButtonSelected")[0].length == 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushBrushSelectionButton(brush, vizObj, cnvSVG);
            });
        topBarSVG.append("image")
            .attr("xlink:href", selectionButton_base64)
            .attr("x", smallButtonWidth*3/2 - (selectionButtonIconWidth/2))
            .attr("y", 6)
            .attr("width", selectionButtonIconWidth)
            .attr("height", selectionButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.selectAll(".brushButtonSelected")[0].length == 0) {
                    d3.select(".selectionButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.selectAll(".brushButtonSelected")[0].length == 0) {
                    d3.select(".selectionButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                _pushBrushSelectionButton(brush, vizObj, cnvSVG);
            });

        // scissors button
        topBarSVG.append("rect")
            .attr("class", "scissorsButton")
            .attr("x", smallButtonWidth*2)
            .attr("y", 0)
            .attr("width", smallButtonWidth)
            .attr("height", config.topBarHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", config.topBarColour)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.selectAll(".scissorsButtonSelected")[0].length == 0) {
                    d3.select(this).attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.selectAll(".scissorsButtonSelected")[0].length == 0) {
                    d3.select(this).attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // _pushBrushSelectionButton(brush, vizObj, cnvSVG);
            });
        topBarSVG.append("image")
            .attr("xlink:href", scissorsButton_base64)
            .attr("x", smallButtonWidth*5/2 - (scissorsButtonIconWidth/2))
            .attr("y", 6)
            .attr("width", scissorsButtonIconWidth)
            .attr("height", scissorsButtonIconWidth)
            .on("mouseover", function() {
                // if this button is not selected
                if (d3.selectAll(".scissorsButtonSelected")[0].length == 0) {
                    d3.select(".scissorsButton").attr("fill", config.topBarHighlight);
                }
            })
            .on("mouseout", function() {
                // if this button is not selected
                if (d3.selectAll(".scissorsButtonSelected")[0].length == 0) {
                    d3.select(".scissorsButton").attr("fill", config.topBarColour);
                }
            })
            .on("click", function() {
                // _pushBrushSelectionButton(brush, vizObj, cnvSVG);
            });

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
            .attr("stroke", "none");
        
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

    },

    resize: function(el, width, height, instance) {

    }

});
