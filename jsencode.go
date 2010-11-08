package main

import (
	"bytes"
	"./doce"
	"go/printer"
	"go/doc"
	"template"
)

func codeToString(i interface{}) string {
	b := bytes.NewBuffer(make([]byte, 0, 128))
	flags := printer.UseSpaces | printer.TabIndent | printer.GenHTML
	config := printer.Config{flags, 8, nil}
	config.Fprint(b, i)
	return b.String()
}

func commentToHTML(comment string) string {
	b := bytes.NewBuffer(make([]byte, 0, 128))
	doc.ToHTML(b, []byte(comment), nil)
	return b.String()
}

func writeJSPackageDoc(b *bytes.Buffer, p *doce.Package, index string) {
	b.WriteString(`{`)
	if index != "" {
		writeJSPropString(b, "index", index)
		b.WriteString(`,`)
	}
	writeJSPropString(b, "html", commentToHTML(p.Doc))
	b.WriteString(`,`)
	writeJSPropString(b, "name", p.Name)
	b.WriteString(`,`)
	// types
	writeJSPropStart(b, "types")
	b.WriteString(`[`)
	for i, t := range p.Types {
		writeJSTypeDoc(b, t)
		if i != len(p.Types)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]`)
	b.WriteString(`,`)
	// funcs
	writeJSPropStart(b, "funcs")
	b.WriteString(`[`)
	for i, f := range p.Funcs {
		writeJSFuncDoc(b, f, funcTemplate)
		if i != len(p.Funcs)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]`)
	b.WriteString(`,`)
	// consts
	writeJSPropStart(b, "consts")
	b.WriteString(`[`)
	for i, f := range p.Consts {
		writeJSConstDoc(b, f)
		if i != len(p.Consts)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]`)
	b.WriteString(`,`)
	// vars
	writeJSPropStart(b, "vars")
	b.WriteString(`[`)
	for i, f := range p.Vars {
		writeJSVarDoc(b, f)
		if i != len(p.Vars)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]`)
	b.WriteString(`}`)
}

//-------------------------------------------------------------------------
// type
//-------------------------------------------------------------------------

var typeTemplateStr = `
<h2><a class="black" href="?t:">type</a> <a href="?t:{name}!">{name}</a></h2>
<pre>{code}</pre>
{comment}
`

var typeTemplate = template.MustParse(typeTemplateStr, nil)

func typeToHTML(t *doce.Type) string {
	b := bytes.NewBuffer(make([]byte, 0, 128))
	var data = map[string]string{
		"name":    t.Name,
		"code":    "type " + codeToString(t.Decl),
		"comment": commentToHTML(t.Doc),
	}
	typeTemplate.Execute(data, b)
	return b.String()
}

func writeJSTypeDoc(b *bytes.Buffer, t *doce.Type) {
	b.WriteString(`{`)
	writeJSPropString(b, "html", typeToHTML(t))
	b.WriteString(`,`)
	writeJSPropString(b, "name", t.Name)
	b.WriteString(`,"methods":[`)
	for i, m := range t.Methods {
		writeJSFuncDoc(b, m, methodTemplate)
		if i != len(t.Methods)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]}`)
}

//-------------------------------------------------------------------------
// const/var
//-------------------------------------------------------------------------

var valueTemplateStr = `
<h2><a class="black" href="?{cls}:">{clsfull}</a> <a href="?{cls}:{href}!">{name}</a></h2>
<pre>{code}</pre>
{comment}
`

var valueTemplate = template.MustParse(valueTemplateStr, nil)

func valueToHTML(t *doce.Value, cls, clsfull string) string {
	b := bytes.NewBuffer(make([]byte, 0, 128))

	// prefer type as a href, but if type is nil, use name of the first value
	href := t.Type
	if href == "" {
		href = t.Names[0]
	}

	// prefer type as name as well, but if it's not defined, use "group"
	var name string
	if len(t.Names) == 1 {
		name = t.Names[0]
	} else {
		name = t.Type
		if name == "" {
			name = "<em>group</em>"
		}
	}

	var data = map[string]string{
		"cls":     cls,
		"clsfull": clsfull,
		"name":    name,
		"href":    href,
		"code":    codeToString(t.Decl),
		"comment": commentToHTML(t.Doc),
	}
	valueTemplate.Execute(data, b)
	return b.String()
}

//-------------------------------------------------------------------------
// const
//-------------------------------------------------------------------------

func writeJSConstDoc(b *bytes.Buffer, t *doce.Value) {
	b.WriteString(`{`)
	writeJSPropString(b, "html", valueToHTML(t, "c", "const"))
	b.WriteString(`,`)
	writeJSPropStringSlice(b, "names", t.Names)
	b.WriteString(`,`)
	writeJSPropString(b, "type", t.Type)
	b.WriteString(`}`)
}

//-------------------------------------------------------------------------
// var
//-------------------------------------------------------------------------

func writeJSVarDoc(b *bytes.Buffer, t *doce.Value) {
	b.WriteString(`{`)
	writeJSPropString(b, "html", valueToHTML(t, "v", "var"))
	b.WriteString(`,`)
	writeJSPropStringSlice(b, "names", t.Names)
	b.WriteString(`,`)
	writeJSPropString(b, "type", t.Type)
	b.WriteString(`}`)
}

//-------------------------------------------------------------------------
// func & method
//-------------------------------------------------------------------------

var funcTemplateStr = `
<h2><a class="black" href="?f:">func</a> <a href="?f:{name}!">{name}</a></h2>
<code>{code}</code>
{comment}
`

var funcTemplate = template.MustParse(funcTemplateStr, nil)

var methodTemplateStr = `
<h2><a class="black" href="?m:{recvnostar}">func ({recv})</a> <a href="?m:{recvnostar}.{name}!">{name}</a></h2>
<code>{code}</code>
{comment}
`

var methodTemplate = template.MustParse(methodTemplateStr, nil)

func funcToHTML(t *doce.Func, tpl *template.Template) string {
	b := bytes.NewBuffer(make([]byte, 0, 128))

	recvnostar := t.Recv
	if recvnostar != "" && recvnostar[0] == '*' {
		recvnostar = recvnostar[1:]
	}

	var data = map[string]string{
		"name":       t.Name,
		"code":       codeToString(t.Decl),
		"comment":    commentToHTML(t.Doc),
		"recv":       t.Recv,
		"recvnostar": recvnostar,
	}
	tpl.Execute(data, b)
	return b.String()
}

func writeJSFuncDoc(b *bytes.Buffer, f *doce.Func, tpl *template.Template) {
	b.WriteString(`{`)
	writeJSPropString(b, "html", funcToHTML(f, tpl))
	b.WriteString(`,`)
	writeJSPropString(b, "name", f.Name)
	b.WriteString(`}`)
}

func writeJSString(b *bytes.Buffer, s string) {
	b.WriteRune('"')
	for _, rune := range s {
		switch rune {
		case '\'':
			b.WriteString(`\'`)
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		case '\v':
			b.WriteString(`\v`)
		default:
			if rune > 0x7F {
				b.WriteString(`\u`)
				b.WriteRune((rune >> 12) & 0xf)
				b.WriteRune((rune >> 8) & 0xf)
				b.WriteRune((rune >> 4) & 0xf)
				b.WriteRune(rune & 0xf)
			} else {
				b.WriteRune(rune)
			}
		}
	}
	b.WriteRune('"')
}

func writeJSPropStart(b *bytes.Buffer, name string) {
	b.WriteString(name)
	b.WriteString(`:`)
}

func writeJSPropString(b *bytes.Buffer, name string, prop string) {
	writeJSPropStart(b, name)
	writeJSString(b, prop)
}

func writeJSPropStringSlice(b *bytes.Buffer, name string, prop []string) {
	writeJSPropStart(b, name) // name:
	b.WriteString(`[`)
	for i, p := range prop {
		writeJSString(b, p)
		if i != len(prop)-1 {
			b.WriteString(`,`)
		}
	}
	b.WriteString(`]`)
}
