import structlog
from tree_sitter import Language, Parser
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
                imports=[], exports=[], functions=[], classes=[], is_entry_point=self._is_entry(file_info.path)
            )

        lang = _LANGUAGES[ext]
        self.parser.language = lang
        
        try:
            tree = self.parser.parse(bytes(file_info.content, "utf8"))
            
            imports = self._extract_imports(tree, lang, ext)
            exports = self._extract_exports(tree, lang, ext)
            functions = self._extract_functions(tree, lang, ext)
            classes = self._extract_classes(tree, lang, ext)
            
            return ParsedFile(
                imports=imports,
                exports=exports,
                functions=functions,
                classes=classes,
                is_entry_point=self._is_entry(file_info.path)
            )
        except Exception as e:
            logger.warning("ast_parse_error", path=file_info.path, error=str(e))
            return ParsedFile(
                imports=[], exports=[], functions=[], classes=[], is_entry_point=self._is_entry(file_info.path)
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
            query_str = ""
            if ext == ".py":
                query_str = "(class_definition name: (identifier) @name)"
            elif ext in {".js", ".jsx", ".ts", ".tsx"}:
                query_str = "(class_declaration name: (identifier) @name)"
                
            if query_str:
                query = lang.query(query_str)
                captures = query.captures(tree.root_node)
                for capture in captures.get("name", []):
                    classes.append((capture.text.decode('utf8'), []))
        except Exception:
            pass
        return classes
