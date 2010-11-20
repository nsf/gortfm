include $(GOROOT)/src/Make.inc

TARG=gortfm
GOFILES=gortfm.go packagetemplate.go jsencode.go shared.go
PREREQ+=doce.a
DEPS+=util

include $(GOROOT)/src/Make.cmd

doce.a: doce/doce.go
	gomake -C doce
	cp doce/_obj/doce.a .

clean: cleandeps

cleandeps:
	gomake -C doce clean
	gomake -C util clean

T=template
S=$T/shared
SFILES=$S/jquery-1.4.2.min.js\
       $S/gortfm.js\
       $S/gortfm-fuzzy.js\
       $S/gortfm-help.js\
       $S/gortfm-index.js\
       $S/gortfm.css

shared.go: $(SFILES)
	echo -en "package main\n\n" > shared.go
	gzip -c $S/jquery-1.4.2.min.js          | bin2go jquery_js          >> shared.go
	gzip -c $S/jquery.scrollTo-1.4.2-min.js | bin2go jquery_scrollTo_js >> shared.go
	gzip -c $S/gortfm.js                    | bin2go gortfm_js          >> shared.go
	gzip -c $S/gortfm-fuzzy.js              | bin2go gortfm_fuzzy_js    >> shared.go
	gzip -c $S/gortfm-help.js               | bin2go gortfm_help_js     >> shared.go
	gzip -c $S/gortfm-index.js              | bin2go gortfm_index_js    >> shared.go
	gzip -c $S/gortfm.css                   | bin2go gortfm_css         >> shared.go

packagetemplate.go: $T/package.html
	echo -en "package main\n\nconst packageTemplateStr = \`" > packagetemplate.go
	sed "s/gortfm-data.js/{datafile}/" $T/package.html >> packagetemplate.go
	echo -n "\`" >> packagetemplate.go
