// Custom fuzzy matching algorithm written by me (nsf).
// What's interesting:
//  - Uses integer arithmetic, therefore has very predictable behaviour.
//  - Can be easily tuned to work with unicode code points.
//  - Fast.
//  - Does what you want (yes, I know what _you_ want :D).
//  - Sort friendly (discard 0s, sort sequentially).
//
// Use 'function sequentialScore(str, path)' to compare strings.
//
// Score of 1 means best match.
// If score > 1 then it's less good.
// 0 means no match.

function charEquals(a, b) {
	return a.toLowerCase() == b.toLowerCase()
}

function shiftAndMatchChunk(str, pat) {
	var sr = str[0]
	var pr = pat[0]
	var si = 1
	var pi = 1

	var r = {
		'shifts': 0,
		'clen': 0,
		'soff': 0,
		'poff': 0,
	}

	while (sr != undefined && pr != undefined) {
		if (charEquals(sr, pr)) {
			r.clen++
			r.soff = si
			r.poff = pi
			pr = pat[pi]
			pi++
		} else if (r.clen) {
			// chunk finished
			return r
		}
		sr = str[si]
		si++
		if (r.clen == 0) {
			r.shifts++
		}
	}
	r.soff = si
	r.poff = pi
	return r
}

function sequentialScore(str, pat) {
	var score = 2
	var matches = 0

	var soff = 0
	var poff = 0

	while (soff < str.length) {
		var r = shiftAndMatchChunk(str.slice(soff), pat.slice(poff))
		if (r.clen) {
			// shortcut, complete match!
			if (pat.length == str.length && r.clen == pat.length)
				return 1

			matches += r.clen
			if (r.shifts != 0)
				score += r.shifts * r.clen * (poff+1)
		}
		soff += r.soff
		poff += r.poff
	}

	if (matches != pat.length) {
		return 0
	}
	return score
}
