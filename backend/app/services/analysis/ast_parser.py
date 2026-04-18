import structlog
from tree_sitter import Language, Parser, Node
from app.models.repo import FileInfo, ParsedFile

logger = structlog.get_logger()

# Pre-load grammars
_LANGUAGES = {}

try:
    import tree_sitter_python
    _LANGUAGES['.py'] = Language(tree_sitter_python.language())
except ImportError:
    pass

try:
    import tree_sitter_javascript
    _LANGUAGES['.js'] = Language(tree_sitter_javascript.language())
    _LANGUAGES['.jsx'] = _LANGUAGES['.js']
except ImportError:
    pass

try:
    import tree_sitter_typescript
    _LANGUAGES['.ts'] = Language(tree_sitter_typescript.language_typescript())
    _LANGUAGES['.tsx'] = Language(tree_sitter_typescript.language_tsx())
except ImportError:
    pass

try:
    import tree_sitter_go
    _LANGUAGES['.go'] = Language(tree_sitter_go.language())
except ImportError:
    pass

try:
    import tree_sitter_java
    _LANGUAGES['.java'] = Language(tree_sitter_java.language())
except ImportError:
    pass

try:
    import tree_sitter_rust
    _LANGUAGES['.rs'] = Language(tree_sitter_rust.language())
except ImportError:
    pass

class ASTParser:
    def __init__(self):
        self.parser = Parser()

    def parse_file(self, file_info: FileInfo) -> ParsedFile:
        """
        Extract from source code using tree-sitter.
        Gracefully degrades if language unsupported.
        """
        ext = file_info.extension
        if ext not in _LANGUAGES:
            return ParsedFile(
                imports=[],
                import_bindings=[],
                exports=[],
                functions=[],
                classes=[],
                extends_targets=[],
                call_roots=[],
                is_entry_point=self._is_entry(file_info.path),
            )

        lang = _LANGUAGES[ext]
        self.parser.language = lang
        
        try:
            tree = self.parser.parse(bytes(file_info.content, "utf8"))
            
            imports = self._extract_imports(tree, lang, ext)
            bindings = self._extract_import_bindings(tree, ext)
            exports = self._extract_exports(tree, lang, ext)
            functions = self._extract_functions(tree, lang, ext)
            classes = self._extract_classes(tree, lang, ext)
            extends_targets = self._extract_extends(tree, lang, ext)
            call_roots = self._extract_call_roots(tree, lang, ext)
            
            return ParsedFile(
                imports=imports,
                import_bindings=bindings,
                exports=exports,
                functions=functions,
                classes=classes,
                extends_targets=extends_targets,
                call_roots=call_roots,
                is_entry_point=self._is_entry(file_info.path),
            )
        except Exception as e:
            logger.warning("ast_parse_error", path=file_info.path, error=str(e))
            return ParsedFile(
                imports=[],
                import_bindings=[],
                exports=[],
                functions=[],
                classes=[],
                extends_targets=[],
                call_roots=[],
                is_entry_point=self._is_entry(file_info.path),
            )

    def _is_entry(self, path: str) -> bool:
        stem = path.split("/")[-1].split(".")[0].lower()
        return stem in {"main", "index", "app", "server", "wsgi", "asgi"}
        
    def _extract_imports(self, tree, lang, ext):
        # A simplistic fallback. In production, one would write strict queries per language.
        # Here we just look for node types 'import_statement', 'import_declaration', etc.
        imports = []
        try:
            query_str = ""
            if ext == ".py":
                query_str = """
                (import_statement name: (dotted_name) @name)
                (import_from_statement module_name: (dotted_name) @name)
                """
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = """
                (import_statement source: (string) @name)
                """
            # Add basic queries for others if needed...
            
            if query_str:
                query = lang.query(query_str)
                captures = query.captures(tree.root_node)
                for capture in captures.get("name", []):
                    # We would determine 'local' or 'external' based on path rules
                    val = capture.text.decode('utf8').strip("'\"`")
                    type_ = 'local' if val.startswith('.') else 'external'
                    imports.append((val, type_))
        except Exception:
            pass
        return imports

    def _extract_exports(self, tree, lang, ext):
        exports = []
        try:
            if ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = """
                (export_statement declaration: (lexical_declaration (variable_declarator name: (identifier) @name)))
                (export_statement declaration: (function_declaration name: (identifier) @name))
                """
                query = lang.query(query_str)
                captures = query.captures(tree.root_node)
                for capture in captures.get("name", []):
                    exports.append(capture.text.decode('utf8'))
        except Exception:
            pass
        return exports

    def _extract_functions(self, tree, lang, ext):
        funcs = []
        try:
            query_str = ""
            if ext == ".py":
                query_str = "(function_definition name: (identifier) @name)"
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = "(function_declaration name: (identifier) @name)"
            
            if query_str:
                query = lang.query(query_str)
                captures = query.captures(tree.root_node)
                for capture in captures.get("name", []):
                    funcs.append((capture.text.decode('utf8'), capture.start_point.row + 1, []))
        except Exception:
            pass
        return funcs

    def _extract_classes(self, tree, lang, ext):
        classes = []
        try:
            if ext == ".py":
                query_str = "(class_definition name: (identifier) @name)"
                query = lang.query(query_str)
                captures = query.captures(tree.root_node)
                for capture in captures.get("name", []):
                    classes.append((capture.text.decode("utf8"), []))
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                seen_cn: set[str] = set()
                for pattern in (
                    "(class_declaration name: (type_identifier) @name)",
                    "(class_declaration name: (identifier) @name)",
                ):
                    query = lang.query(pattern)
                    captures = query.captures(tree.root_node)
                    for capture in captures.get("name", []):
                        nm = capture.text.decode("utf8")
                        if nm not in seen_cn:
                            seen_cn.add(nm)
                            classes.append((nm, []))
        except Exception:
            pass
        return classes

    def _extract_import_bindings(self, tree, ext: str) -> list[tuple[str, str]]:
        if ext == ".py":
            return self._python_import_bindings(tree.root_node)
        if ext in {".js", ".jsx", ".ts", ".tsx"}:
            return self._ts_import_bindings(tree.root_node)
        return []

    def _python_import_bindings(self, root: Node) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        stack = [root]
        while stack:
            n = stack.pop()
            if n.type == "import_statement":
                for ch in n.named_children:
                    if ch.type != "dotted_as_names":
                        continue
                    for das in ch.named_children:
                        if das.type != "dotted_as_name":
                            continue
                        name_n = das.child_by_field_name("name")
                        alias_n = das.child_by_field_name("alias")
                        if name_n and name_n.type == "dotted_name":
                            mod = name_n.text.decode("utf8")
                            local = alias_n.text.decode("utf8") if alias_n else mod.split(".")[0]
                            out.append((local, mod))
            elif n.type == "import_from_statement":
                parts = [ch for ch in n.named_children]
                if not parts or parts[0].type == "relative_import":
                    pass
                elif parts[0].type == "dotted_name":
                    mod = parts[0].text.decode("utf8")
                    for ch in parts[1:]:
                        if ch.type == "dotted_name":
                            text = ch.text.decode("utf8")
                            local = text.split(".")[-1]
                            out.append((local, mod))
                        elif ch.type == "aliased_import":
                            dn = next(
                                (c for c in ch.named_children if c.type == "dotted_name"),
                                None,
                            )
                            idents = [c for c in ch.named_children if c.type == "identifier"]
                            if dn and idents:
                                out.append((idents[-1].text.decode("utf8"), mod))
                        elif ch.type == "dotted_as_names":
                            for das in ch.named_children:
                                if das.type != "dotted_as_name":
                                    continue
                                sub = das.child_by_field_name("name")
                                alias_n = das.child_by_field_name("alias")
                                if sub and sub.type == "dotted_name":
                                    imported = sub.text.decode("utf8")
                                    local = (
                                        alias_n.text.decode("utf8")
                                        if alias_n
                                        else imported.split(".")[-1]
                                    )
                                    out.append((local, mod))
            for ch in n.children:
                stack.append(ch)
        return out

    def _ts_import_bindings(self, root: Node) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        stack = [root]
        while stack:
            n = stack.pop()
            if n.type != "import_statement":
                for ch in n.children:
                    stack.append(ch)
                continue
            src_n = n.child_by_field_name("source")
            if not src_n:
                strs = [c for c in n.named_children if c.type == "string"]
                src_n = strs[-1] if strs else None
            if not src_n:
                continue
            raw = src_n.text.decode("utf8").strip("'\"`")
            clause = next(
                (c for c in n.named_children if c.type == "import_clause"), None
            )
            if not clause:
                for ch in n.children:
                    stack.append(ch)
                continue
            for sub in clause.named_children:
                if sub.type == "identifier":
                    out.append((sub.text.decode("utf8"), raw))
                elif sub.type == "named_imports":
                    for spec in sub.named_children:
                        if spec.type != "import_specifier":
                            continue
                        name_n = spec.child_by_field_name("name")
                        alias_n = spec.child_by_field_name("alias")
                        if name_n:
                            id_text = name_n.text.decode("utf8")
                            local = alias_n.text.decode("utf8") if alias_n else id_text
                            out.append((local, raw))
                elif sub.type == "namespace_import":
                    star = next(
                        (c for c in sub.named_children if c.type == "identifier"),
                        None,
                    )
                    if star:
                        out.append((star.text.decode("utf8"), raw))
            for ch in n.children:
                stack.append(ch)
        return out

    def _extract_extends(self, tree, lang, ext: str) -> list[str]:
        bases: list[str] = []
        try:
            query_str = ""
            if ext == ".py":
                query_str = """
                (class_definition
                  superclasses: (argument_list
                    [(identifier) (attribute)] @base))
                """
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = """
                (class_declaration
                  (class_heritage
                    (extends_clause
                      [(identifier) (member_expression)] @base)))
                """
            if not query_str:
                return []
            query = lang.query(query_str)
            captures = query.captures(tree.root_node)
            for cap in captures.get("base", []):
                t = cap.text.decode("utf8").strip()
                if t and t not in bases:
                    bases.append(t)
        except Exception:
            pass
        return bases

    def _extract_call_roots(self, tree, lang, ext: str) -> list[str]:
        roots: list[str] = []
        seen: set[str] = set()
        try:
            query_str = ""
            if ext == ".py":
                query_str = """
                (call function: (identifier) @fn)
                (call function: (attribute object: (identifier) @obj))
                """
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = """
                (call_expression
                  function: (identifier) @fn)
                (call_expression
                  function: (member_expression object: (identifier) @obj))
                """
            if not query_str:
                return []
            query = lang.query(query_str)
            captures = query.captures(tree.root_node)
            for key in ("fn", "obj"):
                for cap in captures.get(key, []):
                    r = cap.text.decode("utf8").strip()
                    if r and r not in seen:
                        seen.add(r)
                        roots.append(r)
        except Exception:
            pass
        return roots
