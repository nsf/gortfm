// Documentation extractor for Go.
// Extracts documentation for a parsed module, does minimal processing.
//
// _Very_ similar to "go/doc", but doesn't do weird stuff, like "factory"
// functions, HTML escaping, associations, BUG markers, etc.
package doce

import (
	"go/token"
	"go/ast"
	"go/doc"
	"sort"
)

type Func struct {
	Doc  string
	Name string
	Recv string
	Decl *ast.FuncDecl
}

type Value struct {
	Doc   string
	Names []string
	Type  string // type of this group (if any)
	Decl  ast.Node
}

type Type struct {
	Doc     string
	Name    string
	Decl    *ast.TypeSpec
	Methods []*Func // Recv is Name, always
}

type Package struct {
	Doc       string
	Name      string
	Filenames []string
	Types     []*Type
	Funcs     []*Func // contains only functions with Recv == ""
	Consts    []*Value
	Vars      []*Value
	FileSet   *token.FileSet

	// temporary map for building type methods
	methods map[string][]*Func
}

// sorting copy & paste

type typeSort []*Type

func (t typeSort) Len() int           { return len(t) }
func (t typeSort) Less(i, j int) bool { return t[i].Name < t[j].Name }
func (t typeSort) Swap(i, j int)      { t[i], t[j] = t[j], t[i] }

type funcSort []*Func

func (t funcSort) Len() int           { return len(t) }
func (t funcSort) Less(i, j int) bool { return t[i].Name < t[j].Name }
func (t funcSort) Swap(i, j int)      { t[i], t[j] = t[j], t[i] }

// TODO(nsf)
// const sort:
// prefer groups over single constants
// prefer typed constants over untyped constants

func NewPackage(pkg *ast.Package, fset *token.FileSet) *Package {
	p := new(Package)
	p.FileSet = fset
	p.Name = pkg.Name
	p.Filenames = make([]string, len(pkg.Files))

	// collect filenames
	i := 0
	for filename, _ := range pkg.Files {
		p.Filenames[i] = filename
		i++
	}

	// preallocate some space for doc units
	p.Types = make([]*Type, 0, 8)
	p.Funcs = make([]*Func, 0, 8)
	p.Consts = make([]*Value, 0, 8)
	p.Vars = make([]*Value, 0, 8)
	p.methods = make(map[string][]*Func)

	// process each file of the package
	for _, ast := range pkg.Files {
		p.processFile(ast)
	}

	// sort items
	sort.Sort(typeSort(p.Types))
	sort.Sort(funcSort(p.Funcs))

	p.applyMethodsToTypes()

	return p
}

func (p *Package) applyMethodsToTypes() {
	for _, t := range p.Types {
		methods, ok := p.methods[t.Name]
		if !ok {
			continue
		}
		sort.Sort(funcSort(methods))
		t.Methods = methods
	}

	// free methods map
	p.methods = nil
}

func cleanUnexportedFields(t ast.Expr) {
}

func newType(decl *ast.GenDecl, spec *ast.TypeSpec) *Type {
	if !ast.IsExported(spec.Name.Name) {
		return nil
	}

	t := new(Type)
	if spec.Doc != nil {
		t.Doc = doc.CommentText(spec.Doc)
		spec.Doc = nil
	} else {
		// if spec has no docs, try pulling comment from decl
		t.Doc = doc.CommentText(decl.Doc)
	}
	cleanUnexportedFields(spec.Type)

	t.Name = spec.Name.Name
	t.Decl = spec
	return t
}

func newValue(decl *ast.GenDecl) *Value {
	v := new(Value)
	v.Doc = doc.CommentText(decl.Doc)
	decl.Doc = nil

	// count names and figure out type
	n := 0
	for _, spec := range decl.Specs {
		vspec := spec.(*ast.ValueSpec)
		for _, name := range vspec.Names {
			if ast.IsExported(name.Name) {
				n++
			}
		}

		if v.Type == "" {
			t := typeAsString(vspec.Type)
			if t != "" && ast.IsExported(t) {
				v.Type = t
			}
		}
	}

	if n == 0 {
		return nil
	}

	// collect names
	v.Names = make([]string, n)

	i := 0
	for _, spec := range decl.Specs {
		vspec := spec.(*ast.ValueSpec)
		for _, name := range vspec.Names {
			if !ast.IsExported(name.Name) {
				continue
			}
			v.Names[i] = name.Name
			i++
		}
	}

	v.Decl = decl
	return v
}

func newFunc(decl *ast.FuncDecl) *Func {
	if !ast.IsExported(decl.Name.Name) {
		return nil
	}

	f := new(Func)
	f.Doc = doc.CommentText(decl.Doc)
	decl.Doc = nil

	f.Name = decl.Name.Name
	if decl.Recv != nil {
		f.Recv = recvAsString(decl.Recv.List[0].Type)
	}
	f.Decl = decl
	decl.Body = nil // remove body
	return f
}

func recvAsString(recv ast.Expr) string {
	switch t := recv.(type) {
	case *ast.StarExpr:
		return "*" + t.X.(*ast.Ident).Name
	case *ast.Ident:
		return t.Name
	}
	panic("baad receiver")
	return ""
}

// I'm using this for const/var type groups, returns a name only if the
// underlying type is represented using identifier.
func typeAsString(t ast.Expr) string {
	if t, ok := t.(*ast.Ident); ok {
		return t.Name
	}
	return ""
}

func (p *Package) processFile(file *ast.File) {
	if file.Doc != nil {
		// package documentation, overwrite
		p.Doc = doc.CommentText(file.Doc)
	}

	for _, d := range file.Decls {
		p.processDecl(d)
	}
}

func (p *Package) processDecl(decl ast.Decl) {
	switch t := decl.(type) {
	case *ast.GenDecl:
		switch t.Tok {
		case token.CONST:
			entity := newValue(t)
			if entity == nil {
				return
			}
			p.Consts = append(p.Consts, entity)
		case token.VAR:
			entity := newValue(t)
			if entity == nil {
				return
			}
			entity.Type = "" // no type for vars, always
			p.Vars = append(p.Vars, entity)
		case token.TYPE:
			for _, spec := range t.Specs {
				entity := newType(t, spec.(*ast.TypeSpec))
				if entity == nil {
					continue
				}
				p.Types = append(p.Types, entity)
			}
			t.Doc = nil
		}
	case *ast.FuncDecl:
		f := newFunc(t)
		if f == nil {
			return
		}
		if f.Recv != "" {
			p.appendMethod(f.Recv, f)
		} else {
			p.Funcs = append(p.Funcs, f)
		}
	}
}

func (p *Package) appendMethod(owner string, f *Func) {
	if owner[0] == '*' {
		owner = owner[1:]
	}

	methods, _ := p.methods[owner]
	methods = append(methods, f)
	p.methods[owner] = methods
}
