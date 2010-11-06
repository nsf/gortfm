$(document).ready(function() {
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
	
	// setup UI
	$("#filter").attr("value", "")
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
	$("#filter").keydown(function(e) {
		if (e.keyCode === 13) { // go to URL on enter
			window.location = $("a").attr("href")
			return
		}
	})
	$("#filter").keyup(function(e) {
		var filterstr = $(this).attr("value")
		sortAndDrawAll(filterstr)
	})
	$("#filter").mouseup(function(e) {
		e.preventDefault()
	})

	sortAndDrawAll("")
	$("#filter").focus()
})

function scoreSort(a, b) {
	return a.score - b.score
}

function prepareData(data, filterstr) {
	if (filterstr == "")
		return data

	var out = []
	for (var i = 0; i < data.length; i++) {
		var item = data[i]
		item.score = sequentialScore(item.name, filterstr)
		if (item.score > 0)
			out.push(item)
	}

	out.sort(scoreSort)
	return out
}

function sortAndDrawAll(filterstr) {
	var data = prepareData(gortfmData, filterstr)
	var html = '<b>Packages</b>: '
	for (var i = 0; i < data.length; i++) {
		if (i == 0)
			html += '<b>' + data[i].html + '</b>'
		else
			html += data[i].html
		if (i != data.length - 1)
			html += ", "
	}
	$("#contents").html(html)
}
