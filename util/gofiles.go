package main

import (
	"path"
	"strings"
	"io/ioutil"
	"bufio"
	"fmt"
	"os"
)

func gofiles() {
	var curdir string
	if len(os.Args) < 3 {
		curdir = "."
	} else {
		curdir = os.Args[2]
	}

	out, err := getGofiles(curdir, gofilesRule)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(postProcessGofiles(out))
}

const gofilesRulePE = `
gofiles:
	@echo -n "$(subst $$,\$$,$(value GOFILES)) $(subst $$,\$$,$(value CGOFILES))"
`

const gofilesRule = `
gofiles:
	@echo -n "$(GOFILES) $(CGOFILES)"
`

const gofilesRuleTarg = `
gofiles:
	@echo -n "$(TARG):$(GOFILES)"
`

func getGofiles(dir, rule string) (string, os.Error) {
	// get contents of the makefile
	makefile := path.Join(dir, "Makefile")
	mkfilecnt, err := ioutil.ReadFile(makefile)
	if err != nil {
		return "", err
	}

	// create temporary file
	tmpfile := path.Join(os.TempDir(), "__Makefile__")
	f, err := os.Open(tmpfile, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
	if err != nil {
		return "", err
	}
	defer f.Close()
	defer os.Remove(tmpfile)

	// write new makefile
	bf := bufio.NewWriter(f)
	_, err = bf.Write(mkfilecnt)
	if err != nil {
		return "", err
	}
	_, err = bf.WriteString(rule)
	if err != nil {
		return "", err
	}
	err = bf.Flush()
	if err != nil {
		return "", err
	}

	// run make
	gofilesList := run("make", "--no-print-directory", "-C", dir, "-f", tmpfile, "gofiles")
	if gofilesList == "" {
		return "", os.NewError("Failed to get output from make cmd")
	}

	// yay!
	return gofilesList, nil
}

func postProcessGofiles(gofilesList string) string {
	// post-process 'gofilesList'
	gofilesList = strings.Replace(gofilesList, " $(patsubst %.go,%.cgo1.go,$(CGOFILES))",
		"", -1)
	gofiles := strings.Split(gofilesList, " ", -1)
	i := 0
	for _, f := range gofiles {
		if strings.HasPrefix(f, "_cgo_") || strings.HasSuffix(f, ".cgo1.go") {
			continue
		}
		gofiles[i] = f
		i++
	}
	gofiles = gofiles[:i]
	return strings.TrimSpace(strings.Join(gofiles, " "))
}
