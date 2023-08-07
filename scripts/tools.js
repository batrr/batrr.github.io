/*
 * Copyright 2010-2013, Georgiy Korneev (kgeorgiy@kgeorgiy.info)
 *
 * The original location of this file is 
 * $URL: https://neerc.ifmo.ru/svn/projects/trunk/contests/standings/resources/finalizer/tools.js $
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

function reduce(collection, zero, f) {
    if (collection == undefined) {
        return zero;
    }
    for (var i = 0; i < collection.length; i++) {
        zero = f(collection[i], zero);
    }
    return zero;
}
function forEach(collection, f) {
    reduce(collection, undefined, function(value, accumulator) {
        f(value);
    });
}

function indexOf(collection, value) {
    for (var i = 0; i < collection.length; i++) {
        if (collection[i] == value) {
            return i;
        }
    }
    return -1;
}

function map(collection, f) {
    return reduce(collection, new Array(), function(value, accumulator){
        accumulator.push(f(value));
        return accumulator;
    });
}

function filter(collection, predicate) {
    return reduce(collection, new Array(), function(value, accumulator){
        if (predicate(value)) {
            accumulator.push(value);
        }
        return accumulator;
    });
}

function xmlToObject(element, factory) {
    var object = (factory == undefined || factory.create == undefined)
            ? new Object()
            : factory.create(element.nodeName.toLowerCase());

    forEach(element.attributes, function(attribute){
        object[attribute.name] = attribute.value;
    });

    forEach(element.childNodes, function(child) {
        var name = child.nodeName.toLowerCase();
        if (!object.hasOwnProperty(name)) {
            object[name] = [];
        }
        object[name].push(xmlToObject(child, object))
    });

    if (object.hasOwnProperty("init")) {
        object.init();
    }

    return object;
}

function createTextNodeStyle(name, text, style, id) {
    var element = document.createElement(name);
    element.appendChild(document.createTextNode(text));
    if (style != undefined) {
        setClass(element, style);
    }
    if (id != undefined) {
        element.id = id;
    }
    return element;
}

function setClass(element, value) {
    element.setAttribute("class", value);
    element.setAttribute("className", value, 0);
}

function createElement(name, attributes, children, id) {
    var element = document.createElement(name);

    if (attributes != undefined) {
        for (var attributeName in attributes) {
            var value = attributes[attributeName];
            if (attributeName == "__text") {
                element.appendChild(document.createTextNode(value));
            } else if (attributeName == "__class") {
                setClass(element, value);
            } else if (attributeName == "onclick") {
                element.onclick = value;
            } else if (attributeName == "checked") {
                element.checked = value;
            } else {
                element.setAttribute(attributeName, value, 0);
                if (attributeName != "style") {
                    element[attributeName] = value;
                }
            }
        }
    }

    forEach(children, function(child) {
        element.appendChild(child);
    });

    if (id != undefined) {
        element.id = id;
    }

    return element;
}

function div(value, div) {
    return Math.floor(value / div);
}

function rgbToColor(color) {
    if (color == undefined) {
        return undefined;
    }
    return "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
}

var gradient = $.browser.webkit ? "-webkit-linear-gradient" : "-moz-linear-gradient";

function  gradientBackground(color) {
    if (color == undefined) {
        return "transparent";
    }
    var borderColor = dimColor(color, 0.7);
    var centerColor = color;
    return gradient + "(top, " + borderColor + " 0%, " + centerColor + " 35%, "  + centerColor + " 65%, "+ borderColor + " 100%)";
}

function gradientBackground2(color) {
    if (color == undefined) {
        return "transparent";
    }
    var borderColor = dimColor(color, 0.7);
    var centerColor = color;
    return gradient + "(top, " + borderColor + " 0%, " + centerColor + " 10%, "  + centerColor + " 90%, "+ borderColor + " 100%)";
}

function dimColor(color, dimFactor) {
    var rgb = colorToRgb(color);
    if (rgb == undefined) {
        return undefined;
    }
    return animateColor(rgb, [255, 255, 255], dimFactor);
}

jQuery.fx.step["gradientBackground"] = function (fx) {
    if (fx.state == 0) {
        var colors = fx.end.split("&");
        fx.start_ = colorToRgb(colors[0]);
        fx.end_ = colorToRgb(colors[1]);
    }
    fx.elem.style.background = gradientBackground(animateColor(fx.start_, fx.end_, fx.pos));
}

function animateColor(from, to, pos) {
    if (to == undefined) {
        to = [255, 161, 255];
    }
    if (from == undefined) {
        from = [255, 161, 255];
    }
    return rgbToColor([
        Math.max(Math.min(parseInt((pos * (to[0] - from[0])) + from[0]), 255), 0),
        Math.max(Math.min(parseInt((pos * (to[1] - from[1])) + from[1]), 255), 0),
        Math.max(Math.min(parseInt((pos * (to[2] - from[2])) + from[2]), 255), 0)
    ]);
}

function animateBackground(node, from, to, duration, complete) {
    node.animate({gradientBackground: from + "&" + to}, duration, complete);
}

// Color Conversion functions from highlightFade
// By Blair Mitchelmore
// http://jquery.offput.ca/highlightFade/

// Parse strings looking for color tuples [255,255,255]
function colorToRgb(color) {
    var result;

    // Check if we're already dealing with an array of colors
    if ( color && color.constructor == Array && color.length == 3 )
        return color;

    // Look for rgb(num,num,num)
    if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color))
        return [parseInt(result[1]), parseInt(result[2]), parseInt(result[3])];

    // Look for rgb(num%,num%,num%)
    if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
        return [parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55];

    // Look for #a0b1c2
    if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
        return [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)];

    // Look for #fff
    if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
        return [parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16)];

    // Otherwise, we're most likely dealing with a named color
    return colors[jQuery.trim(color).toLowerCase()];
}

// Some named colors to work with
// From Interface by Stefan Petre
// http://interface.eyecon.ro/

var colors = {
    aqua:[0,255,255],
    azure:[240,255,255],
    beige:[245,245,220],
    black:[0,0,0],
    blue:[0,0,255],
    brown:[165,42,42],
    cyan:[0,255,255],
    darkblue:[0,0,139],
    darkcyan:[0,139,139],
    darkgrey:[169,169,169],
    darkgreen:[0,100,0],
    darkkhaki:[189,183,107],
    darkmagenta:[139,0,139],
    darkolivegreen:[85,107,47],
    darkorange:[255,140,0],
    darkorchid:[153,50,204],
    darkred:[139,0,0],
    darksalmon:[233,150,122],
    darkviolet:[148,0,211],
    fuchsia:[255,0,255],
    gold:[255,215,0],
    green:[0,128,0],
    indigo:[75,0,130],
    khaki:[240,230,140],
    lightblue:[173,216,230],
    lightcyan:[224,255,255],
    lightgreen:[144,238,144],
    lightgrey:[211,211,211],
    lightpink:[255,182,193],
    lightyellow:[255,255,224],
    lime:[0,255,0],
    magenta:[255,0,255],
    maroon:[128,0,0],
    navy:[0,0,128],
    olive:[128,128,0],
    orange:[255,165,0],
    pink:[255,192,203],
    purple:[128,0,128],
    violet:[128,0,128],
    red:[255,0,0],
    silver:[192,192,192],
    white:[255,255,255],
    yellow:[255,255,0]
};
