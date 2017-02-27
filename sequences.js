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
    .value(function(d) { return 1; });

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
        .style("opacity", 1)
        .on("mouseover", mouseover)
        .on("click", click);





    var piePath = vis.append('g').selectAll('path')
        .data(pie(dataSummary))
        .enter()
        .append('path')
        .attr('d',pieArc)
        .attr('fill', function(d,i) {
            return colors[d.data.label];
        })
        .style("opacity", 1);


    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;



    // Initialize slider
     var slider = d3.slider();

    //  .on("slide", function(evt, value) {
    //      console.log("hello");
    // });

    d3.select('#slider').call(slider);
    slider.on("slide", function(){console.log("we are friends now")})

}

function click(d) {
    var sequenceArray = getAncestors(d);
    if (!clickMode) {
        clickMode = true;
        // Fade all the segments.
        d3.selectAll(".sunburst_node")
            .style("opacity", 0.2);
        // Then highlight only those that are an ancestor of the current segment.
        vis.selectAll(".sunburst_node")
            .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("opacity", 1);
    }
    else {
        clickMode = false;
        vis.selectAll(".sunburst_node")
            .style("opacity", 1);
    }
}

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
    if (!clickMode) {
        $(".comment_body").remove();

        var sequenceArray = getAncestors(d);
        updateBreadcrumbs(sequenceArray);
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
            .style("opacity", 1)
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


// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray) {

    $.each(nodeArray, function(index,item) {
        var item_color = (item.sentiment > 0) ? colors["pos"] : colors["neg"];
        $("#sidebar").append("<div class='comment_body'>" +
                                "<p class='comment_author'> <div class='sentiment_square' style=background:" + item_color + "></div>" + item.author +
                                "<span class='comment_score'>" + item.score + " upvotes</span></p>" +
                                item.body + "</div>").linkify();
    })
/*     // TODO: fix! buggy!
    $('#sidebar').animate({
            scrollTop: $(".comment_body:last").position().top},
        'slow');*/
}

function find_all_children(data,current_node) {
    var children = []
    for (var i = 0; i < data.length; i++) {
        if (data[i].parent_id.split('_')[1] == current_node.name) {
            var child = data[i]
            child.sentiment_score >= 0 ? totalPos+=child.score : totalNeg+=child.score;
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
