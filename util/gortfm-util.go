package main

import (
	"strings"
	"exec"
	"os"
	"io/ioutil"
	"fmt"
)

func run(name string, args ...string) string {
	path, err := exec.LookPath(name)
	if err != nil {
		panic(err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		panic(err)
	}

	p, err := exec.Run(path, append([]string{name}, args...), os.Environ(),
		cwd, exec.Pipe, exec.Pipe, exec.Pipe)
	if err != nil {
		panic(err)
	}
	defer p.Close()

	data, err := ioutil.ReadAll(p.Stdout)
	if err != nil {
		panic(err)
	}

	return strings.TrimSpace(string(data))
}

const usage = `usage: %s gofiles [<dir>]
       %s genrule [<dir>]
       %s stdlib <goroot> <pkgroot>* <outdir>
`

func printHelpToStderr() {
	nm := os.Args[0]
	fmt.Fprintf(os.Stderr, usage, nm, nm, nm)
}

func main() {
	if len(os.Args) < 2 {
		printHelpToStderr()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "gofiles":
		gofiles()
	case "genrule":
		genrule()
	case "stdlib":
		stdlib()
	default:
		printHelpToStderr()
		os.Exit(1)
	}
}
