package main

import (
	"os"
	"fmt"
)

func genrule() {
	var curdir string
	if len(os.Args) < 3 {
		curdir = "."
	} else {
		curdir = os.Args[2]
	}

	gofiles, err := getGofiles(curdir, gofilesRulePE)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	gofiles = postProcessGofiles(gofiles)

	fmt.Println("html:", gofiles)
	fmt.Println("\tgortfm", gofiles)
	fmt.Println("CLEANFILES+=html")
}
