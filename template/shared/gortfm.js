$(document).ready(function() {
	// TODO(nsf): move this to offline
	gortfmData.consts.sort(constSort)
	gortfmData.vars.sort(varSort)

	$(document).keypress(function(e) {
		// this is required for opera
		if (e.keyCode === 9)
			e.preventDefault()
	})
	$(document).keydown(function(e) {
		if (e.keyCode === 9) {
			e.preventDefault()
			$("#filter").focus()
			$("#filter").select()
		}
	})
	
	var filterstr = ""

	// try extract the filter str from an url
	if (window.location.href.indexOf('?') != -1)
		filterstr = window.location.href.slice(window.location.href.indexOf('?') + 1)

	if (filterstr != "") {
		$("#filter").attr('value', unescape(filterstr))
		$("#filter").removeClass("inactive")
	} else
		$("#filter").attr('value', '')

	// setup UI
	$("#filter").focusin(function() {
		var filter = $(this)
		filter.select()
		if (filter.hasClass("inactive")) {
			filter.removeClass("inactive")	
		}
	})
	$("#filter").focusout(function() {
		var filter = $(this)
		if (filter.attr("value") == "" && !filter.hasClass("inactive")) {
			filter.addClass("inactive")
		}
	})
	$("#filter").keyup(function(e) {
		// redraw
		var filterstr = $(this).attr("value")
		// '<' back to index
		if (filterstr == "<" && gortfmData.index != "" && gortfmData.index != undefined) {
			window.location = gortfmData.index
			return
		}
		sortAndDrawAll(parseFilterStr(filterstr))
	})
	$("#filter").keydown(function(e) {
		// enter
		if (e.keyCode === 13) {
			window.location = "?" + $(this).attr("value")
			return
		}
	})
	$("#filter").mouseup(function(e) {
		e.preventDefault()
	})

	var r = parseFilterStr(unescape(filterstr))
	// yay!
	sortAndDrawAll(r)

	$("#filter").focus()
})

//===============================================================================

var lastR = null
var currentQuery = null

function yield(f, data) {
	setTimeout(f, 5, data)
}

function newFilterQuery(r) {
	var fq = {
		r:       r,
		discard: false,
		i:       0,

		// stage 1, data collection
		data:    [],

		// stage 2, matches count for shortcuts
		matches: 0,

		// stage 3, draw shortcuts
		html:    "",

		// stage 4, draw main info
		iter:    0,
		clear:   false,
	}

	yield(fqStage1, fq)
	return fq
}

function fqStage1(fq) {
	if (fq.discard) return

	var i = fq.i
	var cls = fq.r.cls

	if (i >= cls.length) {
		// stage 1 finished, proceed to stage 2
		fq.i = 0 // reset i
		fqStage2(fq)
		return
	}
	
	var handler = filterClassHandlers[cls[i]]
	fq.data.push(handler.prepare(fq.r))
	fq.i++

	yield(fqStage1, fq)
}

function fqStage2(fq) {
	if (fq.discard) return

	var cls = fq.r.cls
	var data = fq.data

	var n = 0
	for (var i = 0; i < cls.length; i++) {
		if (cls[i] == "m")
			continue
		n += data[i].length
	}

	fq.matches = n

	yield(fqStage3, fq)
}

function fqStage3(fq) {
	if (fq.discard) return

	var data = fq.data
	var r = fq.r
	var n = fq.matches

	// don't draw shortcuts, if there is a '.' or '!' in the class string
	if (r.dot || r.bang) {
		fqStage4(fq)
		return
	}

	var html = ""

	// hook here, we need to draw package info or help if condition is right
	if (r.arg1 == "?") {
		fq.html = helpText
		fq.iter = 1 // ;-)
		// escape from the sequence
		fqCleanup(fq)
		return
	}

	if (rIsDefault(r)) {
		// show Package title and description
		html += '<div id="package"><div class="container">'
		html += "<h1>package " + gortfmData.name + "</h1>" + gortfmData.html
		/*
		html += "<h3>Package files:</h3>"
		for (var i = 0; i < gortfmData.filenames.length; i++) {
			html += gortfmData.filenames[i] + "<br />"
		}
		*/
		html += "</div></div>"
	}

	for (var i = 0; i < r.cls.length; i++) {
		var c = r.cls[i]
		var handler = filterClassHandlers[c]
		if (n > 1)
			html += handler.drawShortcuts(r, data[i])

	}
	fq.html = html

	yield(fqStage4, fq)
}

function fqStage4(fq) {
	if (fq.discard) return

	var data = fq.data
	var r = fq.r

	// are we done?
	var done = true
	for (var i = 0; i < data.length; i++) {
		if (data[i].length) {
			done = false
			break
		}
	}

	if (done) {
		fqCleanup(fq)
		return
	}

	if (r.arg1 != "") {
		// we have some kind of a pattern here, we need to display
		// sorted stuff here
		
		// ok, one iteration is:

		// 1. find minimum score
		var min = 9999999
		for (var i = 0; i < r.cls.length; i++) {
			if (!data[i].length)
				continue

			var item = data[i][0]
			if (item.score < min)
				min = item.score
		}

		// 2. draw items with that score using 'cls' order
		var html = ""
		for (var i = 0; i < r.cls.length; i++) {
			if (!data[i].length)
				continue

			var item = data[i][0]

			// I also check for 9999999 in case if there are no score
			// at all (e.g. methods)
			if (item.score == min || min == 9999999) {
				// match here, shift and draw
				var c = r.cls[i]
				var handler = filterClassHandlers[c]

				data[i] = data[i].slice(1)
				html += handler.drawMainItem(r, item)				
				fq.iter++
			}
		}
	} else {
		// perform usual iteration here
		var html = ""
		for (var i = 0; i < r.cls.length; i++) {
			if (!data[i].length)
				continue

			var c = r.cls[i]
			var handler = filterClassHandlers[c]
			var item = data[i][0]

			data[i] = data[i].slice(1)
			html += handler.drawMainItem(r, item)
			fq.iter++
			break
		}
	}
	if (fq.iter <= 5)
		fq.html += html

	if (fq.iter >= 5 && !fq.clear) {
		$("#contents").html(fq.html)
		fq.clear = true
	} else if (fq.iter > 5)
		$("#contents").append(html)

	yield(fqStage4, fq)
}

function fqCleanup(fq) {
	if (fq.iter < 5)
		$("#contents").html(fq.html)
	if (fq.iter == 0) {
		$("#contents").append("<h2></h2><em>Found nothing :-(</em>")
	}
	fq.html = ""
	fq.data = []
}


String.prototype.startsWith = function(str) {
	return !this.indexOf(str)
}

function hrefixUrl(url) {
	return '?' + url
}

//-------------------------------------------------------------------------------
// Dispatch
//-------------------------------------------------------------------------------

var filterClassHandlers = {
	'f': {
		prepare: prepareFunc,
		drawShortcuts: drawShortcutsFunc,
		drawMainItem: drawMainItemFunc,
	},
	't': {
		prepare: prepareType,
		drawShortcuts: drawShortcutsType,
		drawMainItem: drawMainItemType,
	},
	'c': {
		prepare: prepareConst,
		drawShortcuts: drawShortcutsConst,
		drawMainItem: drawMainItemConst,
	},
	'm': {
		prepare: prepareMethod,
		drawShortcuts: drawShortcutsMethod,
		drawMainItem: drawMainItemMethod,
	},
	'v': {
		prepare: prepareVar,
		drawShortcuts: drawShortcutsVar,
		drawMainItem: drawMainItemVar,
	},
}

//-------------------------------------------------------------------------------
// Func
//-------------------------------------------------------------------------------

function prepareFunc(r) {
	return prepareNamedData(gortfmData.funcs, r.arg1, r.dot || r.bang)
}

// here, data is a result returned from prepareFunc, usually it is an array
function drawShortcutsFunc(r, data) {
	return prepareNamedDataShortcuts("Funcs", "f", data, r.arg1)
}

// here, data is an individual item from the array, returned by prepareFunc
function drawMainItemFunc(r, data) {
	return data.html
}

//-------------------------------------------------------------------------------
// Type
//-------------------------------------------------------------------------------

function prepareType(r) {
	return prepareNamedData(gortfmData.types, r.arg1, r.dot || r.bang)
}

function drawShortcutsType(r, data) {
	return prepareNamedDataShortcuts("Types", "t", data, r.arg1)
}

function drawMainItemType(r, data) {
	if (data.methods.length > 0 && !rContains(r, 'm')) {
		return data.html + '<p><a href="?tm:' + data.name + '!">Show methods</a></p>'

	}
	return data.html
}

//-------------------------------------------------------------------------------
// Const
//-------------------------------------------------------------------------------

function prepareConst(r) {
	return prepareData(gortfmData.consts, r.arg1, r.dot || r.bang, constScore, constScoreSort)
}

function drawShortcutsConst(r, data) {
	return prepareValueDataShortcuts(data, r.arg1, "c", "Consts")
}

function drawMainItemConst(r, data) {
	if (!rIsDefault(r) && data.names.length > 1 && data.type != "" && !rContains(r, 't')) {
		var newcls = insertClsAfter(r.cls, 't', 'c')
		return data.html + '<p>Corresponding type: <a href="' +
			hrefixUrl(newcls + ":" + data.type) +
			'">' + data.type + '</a></p>'
	}
	return data.html
}

//-------------------------------------------------------------------------------
// Var
//-------------------------------------------------------------------------------

function prepareVar(r) {
	return prepareData(gortfmData.vars, r.arg1, r.dot || r.bang, valueScore, varScoreSort)
}

function drawShortcutsVar(r, data) {
	return prepareValueDataShortcuts(data, r.arg1, "v", "Vars")
}

function drawMainItemVar(r, data) {
	return data.html
}

//-------------------------------------------------------------------------------
// Method
//-------------------------------------------------------------------------------

function prepareMethod(r) {
	var bestmatch = []
	if (r.arg1 != "")
		bestmatch = findBestMatch(gortfmData.types, r.arg1, namedScore)
	if (bestmatch.length == 1) {
		// yay!
		return prepareNamedData(bestmatch[0].methods, r.arg2, r.bang)
	}
	return []
}

function drawShortcutsMethod(r, data) {
	return ""
}

function drawMainItemMethod(r, data) {
	return data.html
}

//-------------------------------------------------------------------------------

// this function removes all unknown letters from the class string, also
// converts everything to lower case.
function validateFilterClass(s) {
	var countmap = {}
	var r = ""
	for (var i = 0; i < s.length; i++) {
		var c = s[i].toLowerCase()
		switch (c) {
		case 't':
		case 'c':
		case 'v':
		case 'f':
		case 'm':
			if (!countmap[c]) {
				// prevent duplicates
				countmap[c] = true
				r += c
			}
		}
	}

	if (r == "")
		return "tcfv"

	return r
}

function parseFilterStr(s) {
	var r = {
		cls  : 'tcfv',
		arg1 : '',
		dot  : false,
		arg2 : '',
		bang : false,
		dflt : false,
	}

	var colon = s.indexOf(':')
	if (colon != -1) {
		// we have a class spec, parse it
		r.cls = s.slice(0, colon)
		s = s.slice(colon+1)
	} else
		r.dflt = true

	r.cls = validateFilterClass(r.cls)

	// if 's' is empty, we're done
	if (s == "")
		return r

	if (s[s.length-1] == '!') {
		r.bang = true
		s = s.slice(0, s.length-1)
	}

	var delimpos = s.indexOf('.')
	if (delimpos == -1) {
		r.arg1 = s
	} else {
		r.dot = true
		r.arg1 = s.slice(0, delimpos)
		r.arg2 = s.slice(delimpos+1)
	}

	// special behaviour for unspecified cls
	if (r.dot && r.dflt) {
		if (r.arg2 == "")
			r.cls = "tm"
		else
			r.cls = "m"
	}

	// if 'm' is not in the class, insert 'm' after 't'
	if (r.dot && !r.dflt && !rContains(r, "m")) {
		r.cls = insertClsAfter(r.cls, "m", "t")
	}

	return r
}

function isRTheSame(r) {
	if (!lastR)
		return false

	return r.cls == lastR.cls &&
		r.arg1 == lastR.arg1 &&
		r.dot == lastR.dot &&
		r.arg2 == lastR.arg2 &&
		r.bang == lastR.bang &&
		r.dflt == lastR.dflt
}

function insertClsAfter(cls, newcls, after) {
	for (var i = 0; i < cls.length; i++) {
		var c = cls[i]
		if (c == after)
			return cls.slice(0, i+1) + newcls + cls.slice(i+1)
	}
	return cls
}

function rIsDefault(r) {
	return r.dflt &&
		r.arg1 == "" &&
		r.dot == false &&
		r.arg2 == "" &&
		r.bang == false
}

function rContains(r, cls) {
	for (var i = 0; i < r.cls.length; i++) {
		var c = r.cls[i]
		if (c == cls)
			return true
	}
	return false
}

function sortAndDrawAll(r) {
	if (isRTheSame(r))
		return
	lastR = r
	scroll(0,0)

	/* start drawing */	
	if (currentQuery != null)
		currentQuery.discard = true
	currentQuery = newFilterQuery(r)
}

//-------------------------------------------------------------------------------
// === SORTING ===
//-------------------------------------------------------------------------------

function nameSort(a, b) {
	if (a < b) {
		return -1
	}
	if (a > b) {
		return 1
	}
	return 0
}

//-------------------------------------------------------------------------------
// const/var scoring
//-------------------------------------------------------------------------------

function valueIsAGroup(v) {
	return v.names.length > 1
}

function isTypedGroup(v) {
	return v.type != ""
}

function valueGroupRank(v) {
	if (valueIsAGroup(v))
		return 0
	else
		return 1
}

function constTypedRank(v) {
	if (isTypedGroup(v))
		return 0
	else
		return 1
}

function valueScore(v, pat) {
	var min = 9999999
	
	// then individual entities
	for (var i = 0; i < v.names.length; i++) {
		var score = sequentialScore(v.names[i], pat)
		if (score == 0)
			continue

		if (score == 1)
			return 1

		if (score < min)
			min = score
	}

	if (min == 9999999)
		return 0

	return min
}

function constScore(v, pat) {
	var min = 9999999

	// check out the type name first
	if (v.type != "") {
		var score = sequentialScore(v.type, pat)
		if (score != 0) {
			if (score == 1)
				return 1
			if (score < min)
				min = score
		}
	}

	var score = valueScore(v, pat)
	if (score && score < min)
		min = score

	if (min == 9999999)
		return 0

	return min
}

function constSort(a, b) {
	// prefer groups over single consts
	// prefer typed groups over non-typed groups

	if (valueIsAGroup(a) != valueIsAGroup(b)) {
		// if one of them is a group and other is not, use group-based rank
		return valueGroupRank(a) - valueGroupRank(b)
	}
	
	// ok, at this point we have two groups or two non-groups
	if (valueIsAGroup(a)) {
		// two groups here

		if (isTypedGroup(a) != isTypedGroup(b)) {
			// if one of them is a typed group and other is not, use type-based rank
			return constTypedRank(a) - constTypedRank(b)
		}

		// here we have two groups that are typed or not typed
		if (isTypedGroup(a)) {
			// both groups are typed, use nameSort based on a type name
			return nameSort(a.type, b.type)
		} else {
			// both groups are not typed, compare them by group size, bigger goes first
			return -(a.names.length - b.names.length)
		}
	} else {
		// two non-groups here, compare by name
		return nameSort(a.names[0], b.names[0])
	}
}

function varSort(a, b) {
	if (valueIsAGroup(a) != valueIsAGroup(b))
		return valueGroupRank(a) - valueGroupRank(b)
	
	if (valueIsAGroup(a))
		return -(a.names.length - b.names.length)
	else
		return nameSort(a.names[0], b.names[0])
}
	
function constScoreSort(a, b) {
	if (a.score == b.score)
		return constSort(a, b)
	return a.score - b.score
}

function varScoreSort(a, b) {
	if (a.score == b.score)
		return varSort(a, b)
	return a.score - b.score
}

function prepareValueDataShortcuts(data, arg1, cls, clsfull) {
	if (!data.length) return ""

	var html = '<b><a class="black" href="' + hrefixUrl(cls + ":" + arg1) + '">' + clsfull + '</a>: </b>'
	for (var i = 0; i < data.length; i++) {
		var item = data[i]
		var isgroup = item.names.length > 1
		var istypedgroup = isgroup && item.type != ""
		// add type group header if any
		if (isgroup)
			html += '('
		if (istypedgroup)
			html += '<em><a class="black" href="' + hrefixUrl(cls + ":" + item.type) + '!">' + item.type + '</a></em>: '
		for (var j = 0; j < item.names.length; j++) {
			html += '<a href="' + hrefixUrl(cls + ":" + item.names[j]) + '!">' + item.names[j] + '</a>'
			if (j != item.names.length - 1)
				html += ', '
		}
		if (isgroup)
			html += ')'
	
		if (i != data.length - 1)
			html += ', '
	}
	return html + "<br />"
}

//-------------------------------------------------------------------------------
// named scoring
//-------------------------------------------------------------------------------

function namedScoreSort(a, b) {
	if (a.score == b.score)
		return nameSort(a.name, b.name)
	return a.score - b.score
}

function namedScore(n, pat) {
	return sequentialScore(n.name, pat)
}

function prepareNamedData(data, arg1, bang) {
	return prepareData(data, arg1, bang, namedScore, namedScoreSort)
}

function prepareNamedDataShortcuts(name, cls, data, arg1) {
	if (!data.length) return ""

	var html = '<b><a class="black" href="' + hrefixUrl(cls + ":" + arg1) + '">' + name + '</a>: </b>'
	for (var i = 0; i < data.length; i++) {
		html += '<a href="' + hrefixUrl(cls + ":" + data[i].name) + '!">' + data[i].name + "</a>"
		if (i != data.length - 1)
			html += ", "
	}
	return html + "<br />"
}

//-------------------------------------------------------------------------------

function findBestMatch(data, arg1, scorefunc) {
	var min = 9999999
	var imin = -1
	for (var i = 0; i < data.length; i++) {
		var item = data[i]
		var score = scorefunc(item, arg1)

		// common case - mismatch, discard it
		if (score == 0)
			continue

		// shortcut, exact match
		if (score == 1)
			return [item]

		if (score < min) {
			min = score
			imin = i
		}
	}

	// not found
	if (imin == -1)
		return []
	return [data[imin]]
}

function prepareData(data, arg1, bang, scorefunc, sortfunc) {
	if (arg1 != "") {
		if (bang) {
			// bang! means we need only the best match, use linear search
			return findBestMatch(data, arg1, scorefunc)
		} else {
			// otherwise just score everything and put into out
			var out = []
			for (var i = 0; i < data.length; i++) {
				var item = data[i]
				item.score = scorefunc(item, arg1)
				if (item.score > 0)
					out.push(item)
			}

			out.sort(sortfunc)			
			return out
		}
	}

	for (var i = 0; i < data.length; i++) {
		data[i].score = undefined
	}
	return data
}
