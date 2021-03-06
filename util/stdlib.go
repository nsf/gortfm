package main

import (
	"strings"
	"os"
	"path/filepath"
	"fmt"
	"bufio"
)

type goPackage struct {
	name string
	file string
}

var goPackages []goPackage

func prepareArgs(dir string, gofiles string) []string {
	args := strings.Split(gofiles, " ", -1)
	i := 0
	for _, a := range args {
		a = strings.TrimSpace(a)
		if a == "" {
			continue
		}
		args[i] = filepath.Join(dir, a)
		i++
	}
	args = args[:i]
	return args
}

func buildPkg(dir, outdir string) {
	data, err := getGofiles(dir, gofilesRuleTarg)
	if err != nil {
		return
	}

	dataA := strings.Split(data, ":", -1)

	targ := dataA[0]
	gofiles := dataA[1]

	// skip empty
	if targ == "" {
		return
	}

	// append to global packages list
	file := strings.Replace(targ, "/", "_", -1) + ".html"
	goPackages = append(goPackages, goPackage{targ, file})

	gortfmArgs := []string{
		"-nicename", targ,
		"-outdir", outdir,
		"-index=index.html",
		"-no-shared",
	}
	gortfmArgs = append(gortfmArgs, prepareArgs(dir, gofiles)...)

	fmt.Printf("Building documentation for %s...\n", targ)
	run("gortfm", gortfmArgs...)
}

type dirVisitor string

func (outdir dirVisitor) VisitDir(path string, f *os.FileInfo) bool {
	buildPkg(path, string(outdir))
	return true
}
func (outdir dirVisitor) VisitFile(path string, f *os.FileInfo) {}

const indexPage = `<html>
<head>
	<title>Go Library Index</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<link rel="stylesheet" href="shared/gortfm.css" />
	<script type="text/javascript" src="gortfm-index.js"></script>
	<script type="text/javascript" src="shared/jquery-1.4.2.min.js"></script>
	<script type="text/javascript" src="shared/gortfm-fuzzy.js"></script>
	<script type="text/javascript" src="shared/gortfm-index.js"></script>
</head>
<body>

<div id="header">
	<div class="line">
		<input id="filter" class="inactive" placeholder="Press TAB" />
		<span>
			Go Library Index
		</span>
	</div>
</div>

<div id="contents">
</div>

<div id="footer">
	<div>Powered by: 
		<a href="http://jquery.com">jQuery</a>
	</div>
</div>
</body>
</html>`

func exitIf(err os.Error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func writeIndexPage(outdir string) {
	f, err := os.Create(filepath.Join(outdir, "index.html"))
	exitIf(err)
	defer f.Close()

	bf := bufio.NewWriter(f)
	_, err = bf.WriteString(indexPage)
	exitIf(err)
	err = bf.Flush()
	exitIf(err)
}

func writeIndexPageData(outdir string) {
	f, err := os.Create(filepath.Join(outdir, "gortfm-index.js"))
	exitIf(err)
	defer f.Close()

	bf := bufio.NewWriter(f)
	_, err = bf.WriteString(`var gortfmData = [`)
	exitIf(err)

	for i, p := range goPackages {
		_, err = fmt.Fprintf(bf, "{name:'%s',html:'<a href=\"%s\">%s</a>'}",
			p.name, p.file, p.name)
		exitIf(err)

		if i != len(goPackages)-1 {
			_, err = bf.WriteString(",")
			exitIf(err)
		}
	}
	_, err = bf.WriteString("]")
	exitIf(err)

	err = bf.Flush()
	exitIf(err)
}

func stdlib() {
	if len(os.Args) < 4 {
		printHelpToStderr()
		os.Exit(1)
	}

	goroot := filepath.Join(os.Args[2], "src", "pkg")
	
	outdir := os.Args[len(os.Args)-1]

	fmt.Printf("Building standard library documentation from '%s' to '%s'\n",
		goroot, outdir)
	filepath.Walk(goroot, dirVisitor(outdir), nil)

	for _, pkgroot := range os.Args[3:len(os.Args)-1] {
		fmt.Printf("Building documentation from '%s' to '%s'\n",
			pkgroot, outdir)
		filepath.Walk(pkgroot, dirVisitor(outdir), nil)
	}

	fmt.Println("Writing shared data...")
	run("gortfm", "-outdir", outdir)

	fmt.Println("Writing index page...")
	writeIndexPage(outdir)

	fmt.Println("Writing index page data...")
	writeIndexPageData(outdir)
}
