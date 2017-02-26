// Dimensions of sunburst.
var width = 750; //original =750
var height = 600; //original =60
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
    w: 120, h: 20, s: 4, t: 10
};

var c = {
    w: 120, h: 15, s: 3, t: 10
};


// Mapping of step names to colors.
var colors = {
    "pos": "#77d1ef",
    "neg": "#ff8787",
};

// wrap text to specific width
function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0;
var totalPos = 0;
var totalNeg = 0;
var totalNodes = 0;
var clickMode = false;

var vis = d3.select("#chart").append("svg")
    .style("margin", "auto")
    .style("position", "relative")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


var pieArc = d3.svg.arc()
    .innerRadius(0)
    .outerRadius(radius/4)

var pie = d3.layout.pie()
    .value(function(d) {return d.count;})
    .sort(null)


var partition = d3.layout.partition()
    .sort(function (a, b) { return d3.ascending(a.time, b.time); })
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.n_leaves+1; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// Use d3.text and d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("5rrasx_out.json", function(text) {
    var data = JSON.parse(text);
    var json = buildHierarchy(data,'5rrasx');

    createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

    // Basic setup of page elements.
    initializeBreadcrumbTrail();

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = partition.nodes(json);
    var dataSummary = [{label: 'pos', count: totalPos}, {label: 'neg', count: totalNeg}];

    //set title
    $("#title").text(json.title.replace(/\[.*\]/g,""));

    //set chart
    var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("path")
        .attr("class", "sunburst_node")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) { return (d.sentiment > 0) ? colors["pos"] : colors["neg"]; })
        .style("opacity", function(d) { return Math.abs(d.sentiment); })
        .on("mouseover", mouseover)
        .on("click", click);


    var piePath = vis.append('g').selectAll('path')
        .data(pie(dataSummary))
        .enter()
        .append('path')
        .attr('d',pieArc)
        .attr('fill', function(d,i) {
            return colors[d.data.label];
        });

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
};

function click(d) {
    var sequenceArray = getAncestors(d);
    if (!clickMode) {
        clickMode = true;
        vis.selectAll(".sunburst_node")
            .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("stroke", "black");
    }
    else {
        clickMode = false;
        vis.selectAll(".sunburst_node")
            .style("stroke", "white");
    }
}

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
    if (!clickMode) {
        $(".comment_body").remove();

        var sequenceArray = getAncestors(d);
        updateBreadcrumbs(sequenceArray);
        updateConversation(sequenceArray);
        // Fade all the segments.
        d3.selectAll(".sunburst_node")
            .style("opacity", 0.6);
        // Then highlight only those that are an ancestor of the current segment.
        vis.selectAll(".sunburst_node")
            .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("opacity", 1);
    }

}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {
    if (!clickMode) {
        // $(".comment_body").remove();
        // Hide the breadcrumb trail
        /*d3.select("#trail")
            .style("visibility", "hidden");*/

        // Deactivate all segments during transition.
        d3.selectAll(".sunburst_node").on("mouseover", null);

        // Transition each segment to full opacity and then reactivate it.
        d3.selectAll(".sunburst_node")
            .transition()
            .duration(1000)
            .style("opacity", function(d) { return Math.abs(d.sentiment); })
            .each("end", function() {
                d3.select(this).on("mouseover", mouseover);
            });

        d3.select("#explanation")
            .style("visibility", "hidden");
    }

}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}

function getAncestorsSize(node) {
    var ancestors = getAncestors(node);
    tot_size = 0;
    for (var i = 0; i < ancestors.length; i++){
        tot_size += ancestors[i].size;
    }
    return tot_size;
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
   /* var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", 1500)
        .attr("height", 1500)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");*/
}
function initializeConversation() {
    // Add the svg area.
    /*var trail = d3.select("#conversation").append("svg:svg")
        .attr("width", width)
        .attr("height", 50)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");*/
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
    var points = [];
    points.push(0,0);
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray) {

    // Data join; key function combines name and depth (= position in sequence).
    /*var g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function (d) {
            return d;
        });*/


    // Add breadcrumb and label for entering nodes.
   /* var entering = g.select("#trail").append("svg:g");*/

    /*  entering.append("svg:polygon")
     .attr("points", breadcrumbPoints)
     .style("fill", function(d) { return colors[d.author]; });*/
    $.each(nodeArray, function(index,item) {
        $("#sidebar").append("<div class='comment_body'>" + item.body + '</div>');
    })


        /*var text = entering.append("text")
        /!*       .attr("x", (b.w + b.t) / 4)
         .attr("y", b.h / 2)*!/
            .attr("dy", "0.35em")
            .attr("text-anchor", "left")
            .text(function (d) {
                return d.body;
            })*/


        // Set position for entering and updating nodes.
        g.attr("transform", function (d, i) {

            if (g.select("text").node() == null) {
                return "translate( 0," + i * (b.h ) + ")";
            }
            else {

                bbox = g.select("text").node().getBBox()
                return "translate( 0," + i * (bbox.height + b.h + b.s) + ")";
            }

        });

        // Remove exiting nodes.b
        g.exit().remove();


        /*    // Now move and update the percentage at the end.
         d3.select("#trail").select("#endlabel")
         .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
         .attr("y", b.h / 2)
         .attr("dy", "0.35em")
         .attr("text-anchor", "middle")
         .text(percentageString);*/

        // Make the breadcrumb trail visible, if it's hidden.
        /*d3.select("#trail")
            .style("visibility", "");*/

    }

function updateConversation(nodeArray) {
    /*var g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) { return d.author + d.depth; });*/
}
function find_all_children(data,current_node) {
    var children = []
    for (var i = 0; i < data.length; i++) {
        if (data[i].parent_id.split('_')[1] == current_node.name) {
            var child = data[i]
            child.sentiment_score >= 0 ? totalPos++ : totalNeg++;
            totalNodes++;
            var child_node =
                {
                    "displayText": child.author,
                    "name": child.id,
                    "children": [],
                    "n_leaves": 0,
                    "body": child.body,
                    "author": child.author,
                    "parent_id": child.parent_id,
                    "score": child.score,
                    "sentiment": child.sentiment_score
                }
            child_node["children"] = find_all_children(data,child_node)
            children.push(child_node)

        }

    }
    if (children.length ==0) {
        current_node.n_leaves = 1;
    }
    for (var i=0 ;i<children.length; i++)
    {
        var child_node = children[i];
        if (child_node == undefined){
        }

        child_node["children"] = find_all_children(data,child_node)

    }
    return children
}

function buildHierarchy(data,root_name) {
    var root = {
        "name": root_name,
        "children": [],
        "n_leaves": 100,
        'title': data[0].submission_title,
        "body": data[0].submission_text,
        "score": data[0].submission_score,
    }
    var current_node = root;
    //find all children for current node
    data = data[1]
    root.children = find_all_children(data,root)
    return root;
}
