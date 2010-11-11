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

// _THE_ Algo:
//
// scores the match using the following scheme (* for match, > for shift):
//-------------------------------------------------------------------------------
// pat: AAA
// str: BBAAA
//
// match: >>***
//
// 1 chunk matched:
// 	chunk length: 3
// 	match position: 3 (2+1)
//
// Score for this chunk is:
// 	each letter base score (BS) = match position
// 	chunk score (CS) = chunk length * BS
//
// 	CS == 9
//
//-------------------------------------------------------------------------------
// pat: B
// str: BBAAA
//
// 1 chunk match, length: 1, pos: 1
// 	CS == 1 (but in reality == 2, 1 is reserved for exact match)
//-------------------------------------------------------------------------------
// Let's compare two near matches:
// pat:  aaa
// str1: BBaaBa
// str2: BBaBaa
//
// str1 == 12
// 	>>**>*
// 	chunk1 == 6
// 		pos: 3, length: 2, score: 3*2=6
// 	chunk2 == 6
// 		pos: 6, length: 1, score: 6*1=6
//
// 	chunk1 + chunk2 = 12
//
// str2 == 13
// 	>>*>**
// 	chunk1 == 3
// 		pos: 3, length: 1, score: 3*1=3
// 	chunk2 ==
// 		pos: 5, length: 2, score: 5*2=10
//
// 	chunk1 + chunk2 = 13
//
// As you can see str1 is preferred over str2 because its score is closer to
// zero.
//-------------------------------------------------------------------------------

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
	var score = 1
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
			score += r.clen * (r.shifts+soff+1)
		}
		soff += r.soff
		poff += r.poff
	}

	if (matches != pat.length) {
		return 0
	}
	return score
}
