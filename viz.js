/*path {
    stroke: steelblue;
    stroke-width: 2;
    fill: none;
}
 
line {
    stroke: black;
}
 
text {
    font-family: Arial;
    font-size: 9pt;
}*/


// global variables
var h = 750; //height
var w = 1200; //width
var r = 3; //radius - IS THIS EVER USED?
var rbig = 8; //max radius size - JUST SEEMS TO BE USED TO DEFINE PAD
var pad = rbig + 10 //padding around the graphing space
var xOffset = 40
var yOffset = 40

var data = [];
var start = 0;
var num_datums = 100;
var chunk_size = 100; //
var disp_year = "2008"
var weights = "0/1/-1/-4"
var rmin = 3
var rmax = 10

// tooltip stuff:
var tooltip = d3.select("#tooltip")
  .style("position", "absolute")
  .style("color", "green")
  .style("background-color", "lightgrey")
  .style("font-size", "20")
  .style("font-weight", "bold")
  .style("visibility", "hidden")

// create svg drawing board
var viz = d3.select("#viz")
  .append("svg:svg")
  .attr("width", w)
  .attr("height", h);

  // Axes 
  viz.append("svg:line")
    .attr("x1",xOffset)
    .attr("y1",0)
    .attr("x2",xOffset)
    .attr("y2",h-yOffset)
    .attr("stroke","red");
  viz.append("svg:line")
    .attr("x1",xOffset)
    .attr("y1",h-yOffset)
    .attr("x2",w)
    .attr("y2",h-yOffset)
    .attr("stroke","red");
    
// load external word data - note asynchrous behavior (parallel requests)
d3.json("/data/reweight/" + disp_year + "/" + weights, function(json) {getData()});

function getData() {
  for (i = start; i < start + num_datums; i += chunk_size) {
    if (i > start + num_datums) {i = start + num_datums;}
    d3.json("/data/" + i + "/" + chunk_size, function(json) {renderVis(json);});
  }
}

function renderVis(newdata) {
  var dd;
  maxscore = d3.max(newdata, function(d) {return d.S})
  minscore = d3.min(newdata, function(d) {return d.S})
  for (var i in newdata) {
    dd = new Object();
    s = newdata[i].S
    dd.W = newdata[i].W; // word text
    dd.Y = newdata[i].Y; // y-coordinate: book count
    dd.X = newdata[i].X; // x-coordinate: page density
    dd.S = newdata[i].S; // x-coordinate: page density
    dd.r = rmin + (s - minscore) / (maxscore - minscore) * (rmax - rmin); // radius - proportional to score
    dd.rbig = 1.8 * dd.r; // mouseover radius
    data.push(dd);
  }

  // calc max/min and calibrate axis scales
  bkmin = d3.min(data, function(d) {return d.Y;});
  bkmax = d3.max(data, function(d) {return d.Y;});

  dmin = d3.min(data, function(d) {return d.X;});
  dmax = d3.max(data, function(d) {return d.X;})

  var xscale = d3.scale.log()
   .domain([dmin, dmax])
   .range([0+xOffset+pad, w-pad])
  var yscale = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([h-yOffset-pad, 0+pad])
  
  // Tick marks on axes
  viz.selectAll(".xLabel")
    .data(xscale.ticks(5))
    .enter().append("svg:text")
    .attr("class","xLabel")
    .text(String)
    .attr("x", function(d) {return xscale(d);})
    .attr("y", h)
    .attr("text-anchor", "middle");
  viz.selectAll(".xTicks")
    .data(xscale.ticks(5))
    .enter().append("svg.line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {return xscale(d);})
    .attr("y1", h-yOffset) // probably changing this
    .attr("x2", function(d) {return xscale(d);})
    .attr("y2", h-yOffset-10) // probably changing this
    .attr("stroke", "red");
    
  var yLabels = viz.selectAll(".yLabel")
    .attr("y", function(d) {return yscale(d);})
    
  yLabels.data(yscale.ticks(4))
    .enter().append("svg:text")
    .attr("class","yLabel")
    .text(String)
    .attr("x", 0)
    .attr("y", function(d) {return yscale(d);})
    .attr("text-anchor", "right")
    .attr("dy", 4); //not sure what this line does...
    
  var yTicks = viz.selectAll(".yTicks")
    .attr("y1", function(d) {return yscale(d);})
    .attr("y2", function(d) {return yscale(d);})
    
  yTicks.data(yscale.ticks(4))
    .enter().append("svg.line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {return yscale(d);})
    .attr("x1", 0) // probably changing this
    .attr("y2", function(d) {return yscale(d);})
    .attr("x2", 10) // probably changing this
    .attr("stroke", "red");

  var circle = viz.selectAll("circle")

  // update existing circles to updated scales
  circle
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})

  // add new circles
  circle.data(data)
    .enter().append("svg:circle")
    .style("stroke", "red")
    .style("fill", "black")
    .attr("r", function(d) {return d.r;})
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})
    .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", "blue")
          .attr("r", function() {return d.rbig;});
        return tooltip
          .style("visibility", "visible")
          .style("top", event.pageY+"px").style("left",(event.pageX+15)+"px")
          .text(function() {
            return d.W + " : den=" + String(d.X) + ", #bks=" + String(d.Y)
                       + ", score=" + String(d.S)
          });
    })
    .on("mousemove", function(){
      return tooltip;
    })
    .on("mouseout", function(d){
        d3.select(this)
          .attr("r", function() {return d.r;})
          .style("fill", "black");
        return tooltip.style("visibility", "hidden");
      })

}

