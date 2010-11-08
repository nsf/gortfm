package main

import (
	"compress/gzip"
	"./doce"
	"template"
	"strings"
	"go/parser"
	"go/ast"
	"bufio"
	"bytes"
	"flag"
	"path"
	"fmt"
	"os"
	"io"
)

var (
	// the directory where we should look for a package
	optOutDir   = flag.String("outdir", "html", "output directory")
	optNiceName = flag.String("nicename", "", "use this instead of a package name in html")
	optNoShared = flag.Bool("no-shared", false, "don't write shared dir")
	optIndex    = flag.String("index", "", "add index page shortcut to package page")
)

//-------------------------------------------------------------------------------

func writePackage(docs *doce.Package, pkgname string) {
	os.MkdirAll(*optOutDir, 0755)
	writePackageData(docs, pkgname)
	writePackagePage(pkgname)
}

func writePackageData(docs *doce.Package, pkgname string) {
	// TODO: I/O error checks
	pkgfilename := strings.Replace(pkgname, "/", "_", -1)
	dest := path.Join(*optOutDir, "gortfm-"+pkgfilename+"-data.js")

	f, err := os.Open(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer f.Close()

	var b bytes.Buffer
	writeJSPackageDoc(&b, docs, *optIndex)

	f.Write([]byte("var gortfmData = "))
	f.Write(b.Bytes())
}

func writePackagePage(pkgname string) {
	// TODO: I/O error checks
	pkgfilename := strings.Replace(pkgname, "/", "_", -1)
	dest := path.Join(*optOutDir, pkgfilename+".html")

	f, err := os.Open(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer f.Close()
	bf := bufio.NewWriter(f)

	var packageTemplate = template.MustParse(packageTemplateStr, nil)

	tplparams := map[string]string{
		"pkgname":  pkgname,
		"datafile": "gortfm-" + pkgfilename + "-data.js",
	}
	packageTemplate.Execute(tplparams, bf)
	bf.Flush()
}

func getOnlyPkg(pkgs map[string]*ast.Package) *ast.Package {
	if len(pkgs) > 1 {
		fmt.Fprintln(os.Stderr, "Too many packages in Go files")
		os.Exit(1)
	}

	for _, v := range pkgs {
		return v
	}

	return nil
}

func exitIf(err os.Error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func writeUnpackedFile(data []byte, dest string) {
	// create "out"
	outfile, err := os.Open(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
	exitIf(err)
	defer outfile.Close()
	out := bufio.NewWriter(outfile)

	// create "in"
	ingzipped := bytes.NewBuffer(data)
	in, err := gzip.NewReader(ingzipped)
	exitIf(err)
	defer in.Close()

	// Copy!
	_, err = io.Copy(out, in)
	exitIf(err)

	// Flush!
	err = out.Flush()
	exitIf(err)
}

func writeSharedDir() {
	dest := path.Join(*optOutDir, "shared")
	err := os.MkdirAll(dest, 0755)
	exitIf(err)

	writeUnpackedFile(jquery_js, path.Join(dest, "jquery-1.4.2.min.js"))
	writeUnpackedFile(gortfm_js, path.Join(dest, "gortfm.js"))
	writeUnpackedFile(gortfm_fuzzy_js, path.Join(dest, "gortfm-fuzzy.js"))
	writeUnpackedFile(gortfm_help_js, path.Join(dest, "gortfm-help.js"))
	writeUnpackedFile(gortfm_index_js, path.Join(dest, "gortfm-index.js"))
	writeUnpackedFile(gortfm_css, path.Join(dest, "gortfm.css"))
}

func main() {
	flag.Parse()

	if !*optNoShared {
		writeSharedDir()
	}

	pkgs, err := parser.ParseFiles(flag.Args(), parser.ParseComments)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	pkg := getOnlyPkg(pkgs)
	if pkg != nil {
		if *optNiceName == "" {
			*optNiceName = pkg.Name
		}

		ast.PackageExports(pkg)

		docs := doce.NewPackage(pkg)
		writePackage(docs, *optNiceName)
	}
}
