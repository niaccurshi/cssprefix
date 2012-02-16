/*
Tool to create a full list of correctly prefixed gradient rules.

Ongoing questions: 
	
	What do we do where there is no support? Go for a default alternate or not output that rule? For example:
	
	 o  -webkit-gradient doesn't repeat, but can repeat when combined with other rules. Assumption is to output the rule, and
		recognise other code is needed to create a matched effect that cannot be delivered via a CSS prefixing tool
	 o  filters are included only where there is no repetition or multiple gradients. Should a default background color
		be output? Assumption is, as with -webkit-gradient, the user is responsible for cross-browser testing to provide appropriate
		fallbacks.
		
	Do we worry about creating an SVG version to truly cover off old IE, rather than rely on limited filters for IE6-8?
	
*/

var allGradients = (function () {
	
	var isImportant = gradientCount = 0;
	var isRadial = false;
	var LINEAR = 'linear', RADIAL = 'radial', REPEATING = 'repeating';
	var type = rule = angle = '';
	var values = pair = [];
	var gradients = {};
	var prefixes = ["-moz-", "-webkit-", "-o-", "-ms-", ""], angleOrder = [3,0,2,3,1,2,0,1], angleDirection = [0,1,0,1,0,1,0,1];
	
	function complete(str) {
		str = str.toLowerCase();
		
		//Is it important?
		if (str.indexOf("!important") !== -1)
			isImportant = 1;
		
		//Split Rule and value(s)
		var firstColon = str.indexOf(":");
		pair = [str.substring(0,firstColon),str.substring(firstColon+1)];
		rule = pair[0];
		values = pair[1].split(",");
		
		values = reformGroups(values);
		gradientCount = 0;
		for (var section = 0; section<values.length; section++) {
			values[section] = $.trim(values[section]);
			values[section] = parseValue(values[section]);
			
			if (typeof values[section] == "object")  {
				
				gradients[section] = values[section];
				gradientCount++;
			}
		}

		return buildRule();
	}
	
	//Fix problem of splitting based on commas, themselves nested inside parenthesis where they shouldn't be split
	function reformGroups(arr) {
		
		var extraParenthesis = 0;
		for (var section = 0; section<arr.length; section++){
			if ((arr[section].indexOf('(') !== -1 && arr[section].indexOf(')') === -1) || extraParenthesis > 0) {
				arr[section] += ","+arr[section+1];
				arr.splice((section+1),1);
				extraParenthesis = (arr[section].split('(').length-1) - (arr[section].split(')').length-1);
				section--;
			}
			
		}
		
		return arr;
	}
	
	function parseValue(val) {
		
		if (val.indexOf('gradient') !== -1) {	
			var colors = [];	
			var isHex = isRGB = isHSL = isHorizontal = 0;
			var isRepeating = false;
			var func = shape = size = '';
			
			
			isRadial = false;
			//Linear or radial?
			if (val.indexOf(LINEAR) === -1)
				isRadial = true;	
			
			if (val.indexOf(REPEATING) !== -1)
				isRepeating = true;	
			
			//What function?
			var lastDash = val.lastIndexOf('-');
			func = val.substr(lastDash,(val.indexOf('(')-lastDash));	
			val = val.substr(val.indexOf('(')+1);	
				
			//Disect properties
			var chunks = val.substr(0,val.lastIndexOf(')')).split(",");
			
			for (var c in chunks) {
				chunks[c] = $.trim(chunks[c]);	
			}
			
			chunks = reformGroups(chunks);
			colors = chunks;		
			
			angle = '';
			var webkitAngle = 'center top, center bottom';
			if (!toHex(chunks[0])) {
				angle = chunks[0];
				colors.splice(0,1);
				
				if (!isRadial) {
				
					var horizontal = [[45,135],[225,315]];
					var angleVal = 0;
					
					
					var ap = [0,0,0,0];
					
					if (angle.indexOf('left') !== -1)
						ap[3] = 1;
					if (angle.indexOf('right') !== -1)
						ap[1] = 1;
					if (angle.indexOf('top') !== -1)
						ap[0] = 1;
					if (angle.indexOf('bottom') !== -1)
						ap[2] = 1;
					
					//Is the angle more horizontal or vertical?
					if (angle.indexOf('deg') !== -1 || angle.indexOf('turn') !== -1 || angle.indexOf('rad') !== -1 || angle.indexOf('grad') !== -1) {
						
						angleVal = parseFloat(angle);
						if (angle.indexOf('grad') !== -1)
							angleVal = ((angleVal/400)*360);
						if (angle.indexOf('turn') !== -1)
							angleVal = (angleVal*360);
						if (angle.indexOf('rad') !== -1)
							angleVal = ((angleVal/(2*Math.PI))*360);
						angleVal = in360(angleVal);
						if ((angleVal >= horizontal[0][0] && angleVal <= horizontal[0][1]) || ((angleVal >= horizontal[1][0] && angleVal <= horizontal[1][1])))
							isHorizontal = 1;
						ap =[0,100,100,100];
						ap = generateWKAngle(angleVal,ap,0);
						
						webkitAngle = Math.round(ap[0])+"% "+Math.round(ap[1])+"%,"+Math.round(ap[2])+"% "+Math.round(ap[3])+"%";
						
					} else {
						if (ap[3] == 1 || ap[1] == 1)
							isHorizontal = 1; 
						if (ap[3] == 1 || ap[0] == 1)
							isHorizontal = "-"+isHorizontal;
					
						//Start determining webkit positioning, start left or right
						if (ap[3] == 1)
							webkitAngle = 'left';
						if (ap[1] == 1)
							webkitAngle = 'right';	
						
						//find the corner, don't worry about horizontal only syntax, already catered for.	
						if(angle.split(" ").length == 2 && angle.indexOf('to ') === -1) {
							if (ap[0] == 1)
								webkitAngle += ' top,';
							else if (ap[2] == 1)
								webkitAngle += ' bottom,';	
									
							if (ap[3] == 1)
								webkitAngle += 'right ';
							else if (ap[1] == 1)
								webkitAngle += 'left ';	
							
							if (ap[0] == 1)
								webkitAngle += 'bottom';
							else if (ap[2] == 1)
								webkitAngle += 'top';	
							
						} else {			
							if (webkitAngle != '') {
								webkitAngle += ' center, ';
								if (ap[3] == 1)
									webkitAngle += 'right center';
								else if (ap[1] == 1)
									webkitAngle += 'left center';	
							} else {
								if (ap[0] == 1)
									webkitAngle += 'center top, center bottom';
								else if (ap[2] == 1)
									webkitAngle += 'center bottom, center top';	
							}
						}
						
					}
				}
			}
			//Get color stops
			type = (isRadial) ? RADIAL : LINEAR;
			
			
			for (var x in colors) {
				colors[x] = colors[x].split(" ");
			}
			
			
			func = type+func;
			if (isRepeating) 
				func = REPEATING+"-"+func;
		
			var props = {
				'cssFunction': func,
				'colorStops': colors,
				'msAngle': isHorizontal,
				'wkAngle': webkitAngle,
				'angle': (angle == '') ? false : angle,
				'type': type,
				'shape': shape,
				'size': size
			}
			
			return props;
		} else {
			return val;
		}
	}
	
	function generateWKAngle(angleVal,ap,i) {
		
		ap[angleOrder[i]] = (angleVal/45)*100;
		if (ap[angleOrder[i]] > 100) ap[angleOrder[i]] = 100;
		if (angleDirection[i] == 0)
			ap[angleOrder[i]] = 100-ap[angleOrder[i]];
			
		angleVal -= 45;
		if (angleVal >= 0) generateWKAngle(angleVal,ap,(i+1));
		return ap;

	}
	
	function in360(val) {
		if (val < 0)
			val = in360(360+val);
		if (val >= 360)
			val = in360(val-360);
		return val;	
	}
	
	function buildRule() {
		var CSS = "";
		
		//Old IE filters (don't bother if there are multiple gradients/repeating gradients/radial gradients... still allow with simplified (two stop) version for colour stops)
		if (gradientCount == 1 && !isRadial) {
			for(var i in gradients) {
				
				if (typeof gradients[i] == "object") {
					var msColor = gradients[i].colorStops;
					var msAngle = gradients[i].msAngle;
				}
			}
			var ieCompatable = true;
			var startColor = toHex(msColor[0][0]);
			var endColor = toHex(msColor[msColor.length-1][0]);
			if (msAngle.toString().indexOf("-") !== -1) {
				var tempColor = endColor;
				endColor = startColor;
				startColor = tempColor;
				msAngle = Math.abs(msAngle);
			}
			if (!startColor || !endColor)
				ieCompatable = false;
			
			if (ieCompatable) {
				var msFilter = "filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='"+startColor+"', endColorstr='"+endColor+"',GradientType="+msAngle+" );\n";
				CSS += msFilter;
				CSS += "-ms-"+msFilter;	
			}
		}
		
		//Old Webkit Syntax generation
		//Note: Cannot process radial formats, would need additional information from the DOM to process properly.
		if (!isRadial)
			CSS += generateCSS(false,'');
		
		//Modern syntax generation
		for (var p in prefixes) {
			CSS += generateCSS(true,prefixes[p]);
		}
		for (var d in gradients) {
			delete gradients[d];	
		}		
		return CSS;
	}
	
	function generateCSS(standard,prefix) {
		var CSS = rule+": ";
		var g = {};
		for (var s = 0; s<values.length; s++) {
			if (typeof values[s] != "object") {
				CSS += values[s]+",";
			} else {
				g = gradients[s];
				if (standard) {
					CSS += prefix+g.cssFunction+"(";
					if (g.angle) 
						CSS += g.angle+",";
						
					CSS +=getColorStops(g.colorStops,standard)+"),";
				} else {
					CSS += "-webkit-gradient("+g.type+","+g.wkAngle+","+getColorStops(g.colorStops,standard)+"),";
				}	
			}
		}
			
		CSS = CSS.slice(0, -1);
		if (isImportant)
			CSS +=" !important";
		CSS+= ";\n";
		delete g;	
		return CSS;
	}
	
	function getColorStops(arr,standard) {
		var colors = '';
		
		for (var i=0; i<arr.length; i++) {
			if (!standard)  {
				if (i == 0 && typeof arr[i][1] == 'undefined')
					colors += 'from(';
				else
					if (i+1 == arr.length && typeof arr[i][1] == 'undefined')
						colors += 'to(';
					else 
						colors += 'color-stop(';
				if (typeof arr[i][1] != 'undefined')
					if (arr[i][1].indexOf('%') !== -1)
						colors+=(parseInt(arr[i][1])/100)+", ";
					else {
						colors+=(1/(arr.length-1)*i)+", ";	
					}
					
					
			}
			colors += arr[i][0];
			if (standard) 
				if (typeof arr[i][1] != 'undefined')
					colors += ' '+arr[i][1];
			if (!standard) 
				colors += ')';
			colors +=',';
		}
		return colors.slice(0, -1);
	}
	
	
	
	function toHex(hex) {
		if (hex.indexOf('#') === -1) {
			var colorStart = hex.indexOf('(');
			var parts = hex.substr(colorStart+1,hex.indexOf(')')-colorStart-1).split(",");
			if (parts.length > 1) {
				hex = '#';
				//Is it HSL or RGB?
				if (hex.indexOf('hsl') !== -1) {
					var rgb = HSLToRGB(parts[0],parts[1],parts[2]);
					parts[0] = rgb[0];	
					parts[1] = rgb[1];
					parts[2] = rgb[2];			
				}
				if (parts.length == 4) {
					parts[3] = parts[3]*255;
					hex += hexSingle(parts[3]);
				}
				hex += hexSingle(parts[0])+hexSingle(parts[1])+hexSingle(parts[2]);	
			} else {
				hex = colorNameToHex(hex);
			}
		} 
		return hex; 
	}
	
	//Hex creation adaped from http://www.javascripter.net/faq/rgbtohex.htm
	function hexSingle(n) {
		n = parseInt(n,10); 
		if (isNaN(n)) return "00";
		n = Math.max(0,Math.min(n,255));
		return "0123456789ABCDEF".charAt((n-n%16)/16) + "0123456789ABCDEF".charAt(n%16);	
	}
	
	function colorNameToHex(color) {
		var colors = {
		"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
		"beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
		"cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
		"darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
		"darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
		"darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
		"firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
		"gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
		"honeydew":"#f0fff0","hotpink":"#ff69b4",
		"indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
		"lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
		"lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
		"lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
		"magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
		"mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
		"navajowhite":"#ffdead","navy":"#000080",
		"oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
		"palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
		"red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
		"saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
		"tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
		"violet":"#ee82ee",
		"wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
		"yellow":"#ffff00","yellowgreen":"#9acd32"};
	
		return colors[color.toLowerCase()] || false;
	}
	
	/* HSL to RGB conversion adapted from http://serennu.com/colour/rgbtohsl.php */
	
	function HSLToRGB(h,s,l) {
		h = h/360;
		s = parseInt(s)/100;
		l = parseInt(l)/100;
		var r = g = b = 0;
		var v1 = v2 = 0;
		
		if (s == 0) {
        	r = l * 255;
        	g = l * 255;
        	b = l * 255;
        } else {
        	if (l < 0.5) {
            	v2 = l * (1 + s);
           	} else {
           	    v2 = (l + s) - (s * l);
		   	}
			v1 = 2 * l - v2;
            r = 255 * hue_2_rgb(v1,v2,h + (1 / 3));
            g = 255 * hue_2_rgb(v1,v2,h);
            b = 255 * hue_2_rgb(v1,v2,h - (1 / 3));
        }
		return [r,g,b];
	}
	
	function hue_2_rgb(v1,v2,vh) {
    	if (vh < 0) {
        	vh += 1;
        }
		if (vh > 1) {
        	vh -= 1;
        }

		if ((6 * vh) < 1) {
        	return (v1 + (v2 - v1) * 6 * vh);
        }
		if ((2 * vh) < 1) {
        	return (v2);
        }
		if ((3 * vh) < 2) {
           	return (v1 + (v2 - v1) * ((2 / 3 - vh) * 6));
        }
		return (v1);
	}
	
	return {
		complete: complete
	};
	
		
})();

/* Test rules borrowed from chevalric (https://github.com/chevalric/cssprefix) and expanded */
var testRules = {
	'simple': "background-image: -moz-linear-gradient(blue, yellow);",
	'RGBA with direction': "background: -o-linear-gradient(left, rgba(10,10,10,1), rgba(10,10,10,0))",
	'background with HSLA': "background: url('http://www.google.co.uk/images/srpr/logo3w.png') no-repeat, -moz-linear-gradient(top, hsla(206,33,75,1), hsla(206,78,28,0))",
	'color stops and radians': "list-style-image: -webkit-linear-gradient(-1.82rad, blue 10%, yellow 50%, red 100%);",
	'multiple gradients': "background-image: -moz-linear-gradient(top right, blue, yellow), -moz-linear-gradient(left, green, red), -moz-linear-gradient(bottom, black, white);",
	'repeating gradient': "background-image: repeating-linear-gradient(top, green, rgb(23,45,67));",
	'simple radial': "background-image: -ms-radial-gradient(green, rgb(23,45,67));",
	'complex radial': "background-image: -moz-radial-gradient(60% 40%,circle contain,rgba(255,200,180,0.75),red 75%,rgba(120,120,120,0));",
	'repeating radial': "background-image: -webkit-repeating-radial-gradient(10% 10%, ellipse, green 20px, rgb(255,255,255) 30px);"
	/* Other tests to come: turning -webkit-gradient in to modern syntax */
	
};

$(function() {

for (rule in testRules) {
	console.log(rule);
	console.log(testRules[rule]);
	console.log(allGradients.complete(testRules[rule]));
}
});
