var helpText = '<h2>Help</h2>\n<p><b>TODO</b>: I need help with this \"Help\" page. Currently it\'s just a set of\ntopics. If someone can convert it to a nice english text, please contact\nme.</p>\n<ul>\n\t<li>The input field above is the center of this documentation reference\n\tsystem.</li>\n\t<li>Input field works like the Google\&trade; live search.</li>\n\t<li>Input field serves as a filter for the content of the documentation\n\tpage.</li>\n\t<li>Input field uses fuzzy matching (e.g. \'vspc\' matches\n\t\'ValueSpec\').</li>\n\t<li>The documentation system claims to be fully usable without\n\tmouse.</li>\n\t<li>TAB key focuses input field and selects all the text inside of\n\tit.</li>\n\t<li>Works fine on gecko(firefox)/webkit(chromium,safari,etc.)/presto(opera)</li>\n\t<li>Every link on the page works indirectly through the input field\n\t(means everything you click you can also get by typing text).</li>\n</ul>\n<h3>Query syntax</h3>\n<pre>\n[CLASS:]ARG1[.ARG2][!]\n</pre>\n<p>Where CLASS is a sequence of:</p>\n<ul>\n\t<li>c - const</li>\n\t<li>v - var</li>\n\t<li>m - method</li>\n\t<li>t - type</li>\n\t<li>f - func</li>\n</ul>\n<p>Default CLASS is:</p>\n<ul>\n\t<li>tcfv - type/const/func/var</li>\n</ul>\n<p>Exclamation mark (\'!\') means \"show the best match only\".</p>\n<p>If \'.\' is in the query and no class is specified, the class is changed to\n\'tm\' and \'!\' is forced for ARG1.</p>\n<p>If ARG2 is not empty and no class is specified, the class is changed to\n\'m\'</p>\n<p>ARG1 is used as a pattern to search for an entity of a certain class, which\nmatches that pattern.</p>\n<p>ARG2 is used as a pattern to filter \'m\' (method) search results.</p>\n<p>\'\&lt;\' redirects to the index page (if it was specified for this page).</p>\n'

// Source here (converted using htmlescape.net):
/*

<h2>Help</h2>
<p><b>TODO</b>: I need help with this "Help" page. Currently it's just a set of
topics. If someone can convert it to a nice english text, please contact
me.</p>
<ul>
	<li>The input field above is the center of this documentation reference
	system.</li>
	<li>Input field works like the Google&trade; live search.</li>
	<li>Input field serves as a filter for the content of the documentation
	page.</li>
	<li>Input field uses fuzzy matching (e.g. 'vspc' matches
	'ValueSpec').</li>
	<li>The documentation system claims to be fully usable without
	mouse.</li>
	<li>TAB key focuses input field and selects all the text inside of
	it.</li>
	<li>Works fine on gecko(firefox)/webkit(chromium,safari,etc.)/presto(opera)</li>
	<li>Every link on the page works indirectly through the input field
	(means everything you click you can also get by typing text).</li>
</ul>
<h3>Query syntax</h3>
<pre>
[CLASS:]ARG1[.ARG2][!]
</pre>
<p>Where CLASS is a sequence of:</p>
<ul>
	<li>c - const</li>
	<li>v - var</li>
	<li>m - method</li>
	<li>t - type</li>
	<li>f - func</li>
</ul>
<p>Default CLASS is:</p>
<ul>
	<li>tcfv - type/const/func/var</li>
</ul>
<p>Exclamation mark ('!') means "show the best match only".</p>
<p>If '.' is in the query and no class is specified, the class is changed to
'tm' and '!' is forced for ARG1.</p>
<p>If ARG2 is not empty and no class is specified, the class is changed to
'm'</p>
<p>ARG1 is used as a pattern to search for an entity of a certain class, which
matches that pattern.</p>
<p>ARG2 is used as a pattern to filter 'm' (method) search results.</p>
<p>'&lt;' redirects to the index page (if it was specified for this page).</p>

*/
