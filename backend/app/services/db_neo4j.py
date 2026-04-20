import asyncio
import math
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import structlog
import networkx as nx
from neo4j import GraphDatabase, AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable

from app.config import Settings
from app.services.analysis.git_metrics import gather_git_file_intel

logger = structlog.get_logger()
settings = Settings()

_LANG_FROM_EXT: dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TSX",
    ".js": "JavaScript",
    ".jsx": "JSX",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".xml": "XML",
    ".sh": "Shell",
    ".sql": "SQL",
}


def _language_label(extension: str) -> str:
    ext = (extension or "").lower()
    if ext in _LANG_FROM_EXT:
        return _LANG_FROM_EXT[ext]
    return ext.lstrip(".").upper() or "Unknown"


def _normalize_external_package(import_value: str, extension: str) -> str | None:
    s = import_value.strip().strip("\"'`")
    if not s or s.startswith(".") or s.startswith("/"):
        return None
    if s.startswith("@") and "/" in s:
        parts = s.split("/")
        return f"{parts[0]}/{parts[1]}"
    if "/" in s:
        seg0 = s.split("/")[0]
        if seg0 == ".":
            return None
        return seg0
    if extension.lower() in {".py", ".pyw"}:
        return s.split(".")[0]
    return s.split("/")[0].split(".")[0] or None


def _external_packages_for_parsed(parsed, extension: str, max_n: int = 48) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for val, typ in parsed.imports:
        if typ != "external":
            continue
        pkg = _normalize_external_package(val, extension)
        if not pkg or pkg in seen:
            continue
        seen.add(pkg)
        out.append(pkg)
        if len(out) >= max_n:
            break
    return out


def _export_count(parsed, extension: str) -> int:
    n = len(parsed.exports)
    if n > 0:
        return n
    if extension.lower() == ".py":
        fn_pub = sum(1 for name, _, _ in parsed.functions if not name.startswith("_"))
        cls_pub = sum(
            1
            for cn, _ in parsed.classes
            if not cn.split("<")[0].strip().startswith("_")
        )
        return fn_pub + cls_pub
    return 0


def _as_int(v, default: int = 0) -> int:
    if v is None:
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _as_float(v, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _as_bool(v, default: bool = False) -> bool:
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() in ("true", "1", "yes")
    return bool(v)


def intel_signal_and_color(
    *,
    circular_dep: bool,
    change_frequency: int,
    class_count: int,
    function_count: int,
    export_count: int,
    in_degree: int,
    out_degree: int,
    role: str,
) -> tuple[str, str]:
    """
    Map analysis to HUD / 3D palette: risk (warm red), structure (cyan blue), stable (green).
    Priority: churn & circulars > structural density > calm baseline.
    """
    coupling = _as_int(in_degree) + _as_int(out_degree)
    churn = _as_int(change_frequency)
    classes = _as_int(class_count)
    funcs = _as_int(function_count)
    exports = _as_int(export_count)
    structure_score = classes + funcs + max(0, exports // 2)
    r = (role or "Util").strip()

    if circular_dep or churn >= 14 or (churn >= 7 and coupling >= 10):
        return "risk", "#f87171"
    if structure_score >= 12 or exports >= 14 or (r == "Core" and structure_score >= 7):
        return "structure", "#38bdf8"
    return "stable", "#4ade80"


def _recompute_live_graph_metrics(files_by_id: dict[str, dict], code_edges: list[dict]) -> None:
    """
    Derive in_degree, out_degree, and impact_score from the same IMPORTS/EXTENDS/CALLS edges
    returned to the client. Neo4j-stored copies can be missing, stale, or out of sync with
    the optional MATCH result set, which breaks the Intelligence HUD coupling / impact widgets.
    """
    in_deg: dict[str, int] = {}
    out_deg: dict[str, int] = {}
    for e in code_edges:
        et = (e.get("type") or "").lower()
        if et == "contains":
            continue
        s, t = e.get("source"), e.get("target")
        if not s or not t:
            continue
        out_deg[s] = out_deg.get(s, 0) + 1
        in_deg[t] = in_deg.get(t, 0) + 1

    G = nx.DiGraph()
    for nid in files_by_id:
        G.add_node(nid)
    for e in code_edges:
        et = (e.get("type") or "").lower()
        if et == "contains":
            continue
        s, t = e.get("source"), e.get("target")
        if s in files_by_id and t in files_by_id:
            G.add_edge(s, t)

    pr: dict[str, float] = {}
    if G.number_of_nodes() > 0:
        try:
            pr = nx.pagerank(G, alpha=0.85)
        except Exception as ex:
            logger.warning("live_pagerank_failed", error=str(ex))

    for nid, props in files_by_id.items():
        in_d = in_deg.get(nid, 0)
        out_d = out_deg.get(nid, 0)
        props["in_degree"] = in_d
        props["out_degree"] = out_d
        props["is_orphan"] = (in_d + out_d) == 0
        if pr:
            props["impact_score"] = float(pr.get(nid, 0.0))

        role = str(props.get("role") or "Util")
        if role not in ("Entry", "Core", "Util"):
            role = "Util"
        sig, col = intel_signal_and_color(
            circular_dep=_as_bool(props.get("circular_dep")),
            change_frequency=_as_int(props.get("change_frequency")),
            class_count=_as_int(props.get("class_count")),
            function_count=_as_int(props.get("function_count")),
            export_count=_as_int(props.get("export_count")),
            in_degree=in_d,
            out_degree=out_d,
            role=role,
        )
        props["intel_signal"] = sig
        props["color"] = col


def _rollup_folder_intel(folder_nodes: list[dict], file_nodes: list[dict]) -> None:
    """Synthetic directory nodes: sum file metrics under each folder path for HUD + 3D."""
    files = [n for n in file_nodes if n.get("type") == "file"]
    if not files or not folder_nodes:
        return

    for fd in folder_nodes:
        if fd.get("type") != "dir":
            continue
        dpath = (fd.get("path") or "").replace("\\", "/").strip("/")
        members: list[dict] = []
        for fn in files:
            fp = (fn.get("path") or fn.get("name") or "").replace("\\", "/").strip()
            if not fp:
                continue
            if not dpath:
                members.append(fn)
            elif fp == dpath or fp.startswith(dpath + "/"):
                members.append(fn)

        if not members:
            continue

        fd["line_count"] = sum(_as_int(m.get("line_count")) for m in members)
        fd["function_count"] = sum(_as_int(m.get("function_count")) for m in members)
        fd["class_count"] = sum(_as_int(m.get("class_count")) for m in members)
        fd["export_count"] = sum(_as_int(m.get("export_count")) for m in members)
        fd["change_frequency"] = sum(_as_int(m.get("change_frequency")) for m in members)
        fd["circular_dep"] = any(_as_bool(m.get("circular_dep")) for m in members)

        langs = [str(m.get("language") or "").strip() for m in members if str(m.get("language") or "").strip()]
        uniq_lang = sorted(set(langs))
        fd["language"] = langs[0] if len(uniq_lang) == 1 else "mixed"

        ext_union: list[str] = []
        seen_ext: set[str] = set()
        for m in members:
            for p in m.get("external_deps") or []:
                if p and p not in seen_ext:
                    seen_ext.add(p)
                    ext_union.append(p)
                    if len(ext_union) >= 48:
                        break
            if len(ext_union) >= 48:
                break
        fd["external_deps"] = ext_union

        co_union: list[str] = []
        seen_co: set[str] = set()
        for m in members:
            for p in m.get("co_changed_with") or []:
                if p and p not in seen_co:
                    seen_co.add(p)
                    co_union.append(p)
                    if len(co_union) >= 16:
                        break
            if len(co_union) >= 16:
                break
        fd["co_changed_with"] = co_union

        authors = [str(m.get("primary_author") or "").strip() for m in members if str(m.get("primary_author") or "").strip()]
        if authors:
            fd["primary_author"] = Counter(authors).most_common(1)[0][0]
        else:
            fd["primary_author"] = ""

        last_ts: list[str] = []
        for m in members:
            lm = str(m.get("last_modified") or "").strip()
            if lm:
                last_ts.append(lm)
        fd["last_modified"] = max(last_ts) if last_ts else ""

        in_sum = sum(_as_int(m.get("in_degree")) for m in members)
        out_sum = sum(_as_int(m.get("out_degree")) for m in members)
        fd["in_degree"] = in_sum
        fd["out_degree"] = out_sum
        fd["impact_score"] = round(
            sum(_as_float(m.get("impact_score")) for m in members) / max(1, len(members)),
            4,
        )

        sig, col = intel_signal_and_color(
            circular_dep=bool(fd["circular_dep"]),
            change_frequency=_as_int(fd["change_frequency"]),
            class_count=_as_int(fd["class_count"]),
            function_count=_as_int(fd["function_count"]),
            export_count=_as_int(fd["export_count"]),
            in_degree=_as_int(fd["in_degree"]),
            out_degree=_as_int(fd["out_degree"]),
            role="Core" if _as_int(fd["function_count"]) + _as_int(fd["class_count"]) >= 10 else "Util",
        )
        fd["intel_signal"] = sig
        fd["color"] = col


def _circular_import_nodes(dependency_edges: set[tuple[str, str]], valid_paths: set[str]) -> set[str]:
    G = nx.DiGraph()
    G.add_nodes_from(valid_paths)
    G.add_edges_from(dependency_edges)
    circular: set[str] = set()
    try:
        for scc in nx.strongly_connected_components(G):
            if len(scc) > 1:
                circular |= scc
            else:
                only = next(iter(scc))
                if G.has_edge(only, only):
                    circular.add(only)
    except Exception as e:
        logger.warning("circular_dep_scan_failed", error=str(e))
    return circular


@dataclass
class _DirTrie:
    seg: str = ""
    path: str = ""
    subdirs: dict[str, "_DirTrie"] = field(default_factory=dict)
    files: list[str] = field(default_factory=list)


def _trie_insert(root: _DirTrie, rel_path: str) -> None:
    p = rel_path.replace("\\", "/").strip("/")
    if not p:
        return
    parts = p.split("/")
    node = root
    for seg in parts[:-1]:
        if seg not in node.subdirs:
            next_path = f"{node.path}/{seg}" if node.path else seg
            node.subdirs[seg] = _DirTrie(seg=seg, path=next_path)
        node = node.subdirs[seg]
    node.files.append(p)


def _folder_id(repo_id: str, dir_path: str) -> str:
    return f"{repo_id}:__dir__:{dir_path}" if dir_path else f"{repo_id}:__dir__:"


def _scale_positions(
    positions: dict[str, tuple[float, float, float]], max_extent: float = 24.0
) -> None:
    if not positions:
        return
    mx = 0.0
    for t in positions.values():
        for c in t:
            mx = max(mx, abs(c))
    if mx > max_extent and mx > 0:
        s = max_extent / mx
        for k in positions:
            positions[k] = tuple(round(c * s, 2) for c in positions[k])


def _layout_directory_tree(
    repo_id: str,
    root: _DirTrie,
    files_props: dict[str, dict],
) -> tuple[list[dict], list[dict], dict[str, tuple[float, float, float]]]:
    """
    Assign 3D positions following repository folder hierarchy (depth on Y, siblings on XZ).
    Returns folder node payloads, tree (contains) edges, and id -> position for files + folders.
    """
    positions: dict[str, tuple[float, float, float]] = {}
    folder_nodes: list[dict] = []
    tree_edges: list[dict] = []
    seen_edge: set[str] = set()
    y_step = 2.5
    base_r = 2.2

    def visit(
        d: _DirTrie,
        depth: int,
        cx: float,
        cz: float,
        parent_fid: str | None,
    ) -> None:
        fid = _folder_id(repo_id, d.path)
        y = -depth * y_step
        positions[fid] = (round(cx, 2), round(y, 2), round(cz, 2))
        folder_nodes.append(
            {
                "id": fid,
                "label": d.seg if d.seg else repo_id,
                "type": "dir",
                "role": "Util",
                "path": d.path,
                "summary": "",
                "code": "",
                "impact_score": 0.0,
                "size": 1.15,
                "color": "#475569",
                "in_degree": 0,
                "out_degree": 0,
                "is_orphan": False,
                "is_entry_point": False,
                "line_count": 0,
                "function_count": 0,
                "class_count": 0,
                "export_count": 0,
                "language": "",
                "last_modified": "",
                "primary_author": "",
                "change_frequency": 0,
                "circular_dep": False,
                "external_deps": [],
                "co_changed_with": [],
                "intel_signal": "stable",
            }
        )
        if parent_fid:
            eid = f"{parent_fid}|contains|{fid}"
            if eid not in seen_edge:
                seen_edge.add(eid)
                tree_edges.append(
                    {
                        "id": eid,
                        "source": parent_fid,
                        "target": fid,
                        "type": "contains",
                    }
                )

        children: list[tuple[str, str, _DirTrie | None]] = []
        for name, sub in sorted(d.subdirs.items()):
            children.append(("d", name, sub))
        for fp in sorted(d.files):
            children.append(("f", fp, None))

        nch = len(children)
        child_depth = depth + 1
        fy = -child_depth * y_step

        for i, (kind, key, sub) in enumerate(children):
            ang = (2 * math.pi * i / nch) if nch else 0.0
            spread = base_r + depth * 0.28 + max(0, nch - 5) * 0.15
            lx = cx + spread * math.cos(ang)
            lz = cz + spread * math.sin(ang)

            if kind == "d" and sub is not None:
                visit(sub, child_depth, lx, lz, fid)
            else:
                file_path = key
                nid = f"{repo_id}:{file_path}"
                positions[nid] = (round(lx, 2), round(fy, 2), round(lz, 2))
                eid = f"{fid}|contains|{nid}"
                if eid not in seen_edge:
                    seen_edge.add(eid)
                    tree_edges.append(
                        {
                            "id": eid,
                            "source": fid,
                            "target": nid,
                            "type": "contains",
                        }
                    )

    visit(root, 0, 0.0, 0.0, None)

    for nid, props in files_props.items():
        if nid not in positions:
            logger.warning(
                "layout_missing_file_position",
                repo_id=repo_id,
                node_id=nid,
                path=props.get("name"),
            )
            positions[nid] = (0.0, 0.0, 0.0)

    _scale_positions(positions)
    return folder_nodes, tree_edges, positions

class Neo4jService:
    def __init__(self):
        self._uri = settings.NEO4J_URL
        self._user = settings.NEO4J_USER
        self._password = settings.NEO4J_PASSWORD
        self._driver = None
        self._async_driver = None

    def _get_async_driver(self):
        if not self._async_driver:
            self._async_driver = AsyncGraphDatabase.driver(
                self._uri, auth=(self._user, self._password)
            )
        return self._async_driver

    def _get_driver(self):
        if not self._driver:
            self._driver = GraphDatabase.driver(
                self._uri, auth=(self._user, self._password)
            )
        return self._driver

    async def verify_connectivity(self) -> bool:
        """Verify Neo4j is reachable"""
        driver = self._get_async_driver()
        try:
            await driver.verify_connectivity()
            return True
        except ServiceUnavailable as e:
            logger.error("neo4j_unreachable", error=str(e))
            return False

    async def close(self):
        if self._async_driver:
            await self._async_driver.close()
            self._async_driver = None
        if self._driver:
            self._driver.close()
            self._driver = None

    async def get_graph_for_repo(self, repo_id: str):
        """
        Fetch the entire graph for a given repo.
        Positions files and synthetic folder nodes in 3D from the directory tree;
        code edges (imports / extends / calls) connect files; contains edges mirror the tree.
        """
        driver = self._get_async_driver()
        files_by_id: dict[str, dict] = {}
        code_edges: list[dict] = []
        seen_edge_ids: set[str] = set()

        query = """
        MATCH (n:File {repo_id: $repo_id})
        OPTIONAL MATCH (n)-[r:IMPORTS|EXTENDS|CALLS]->(m:File {repo_id: $repo_id})
        RETURN n, r, m
        """

        def ingest_file_node(raw: dict | None) -> None:
            if not raw:
                return
            node_id = raw.get("id")
            if not node_id or node_id in files_by_id:
                return
            name = raw.get("name", node_id)
            role = str(raw.get("role", "Util") or "Util")
            if role not in ("Entry", "Core", "Util"):
                role = "Util"
            in_d = _as_int(raw.get("in_degree"))
            out_d = _as_int(raw.get("out_degree"))
            lc = _as_int(raw.get("line_count"))
            fc = _as_int(raw.get("function_count"))
            cc = _as_int(raw.get("class_count"))
            ec = _as_int(raw.get("export_count"))
            cf = _as_int(raw.get("change_frequency"))
            circ = _as_bool(raw.get("circular_dep"))

            sig_stored = raw.get("intel_signal")
            col_stored = str(raw.get("color") or "").strip()
            if sig_stored in ("risk", "structure", "stable") and col_stored and col_stored.upper() not in (
                "#FFFFFF",
                "#FFF",
            ):
                intel_sig = sig_stored
                color_hex = col_stored
            else:
                intel_sig, color_hex = intel_signal_and_color(
                    circular_dep=circ,
                    change_frequency=cf,
                    class_count=cc,
                    function_count=fc,
                    export_count=ec,
                    in_degree=in_d,
                    out_degree=out_d,
                    role=role,
                )

            files_by_id[node_id] = {
                "id": node_id,
                "label": name.split("/")[-1] if name else node_id,
                "type": "file",
                "role": role,
                "path": name,
                "summary": raw.get("summary", ""),
                "code": raw.get("code", ""),
                "impact_score": _as_float(raw.get("impact_score")),
                "size": _as_float(raw.get("size"), 2.0),
                "color": color_hex,
                "intel_signal": intel_sig,
                "in_degree": in_d,
                "out_degree": out_d,
                "is_orphan": _as_bool(raw.get("is_orphan")),
                "is_entry_point": _as_bool(raw.get("is_entry_point")),
                "line_count": lc,
                "function_count": fc,
                "class_count": cc,
                "export_count": ec,
                "language": str(raw.get("language") or ""),
                "last_modified": str(raw.get("last_modified") or ""),
                "primary_author": str(raw.get("primary_author") or ""),
                "change_frequency": cf,
                "circular_dep": circ,
                "external_deps": list(raw.get("external_deps") or []),
                "co_changed_with": list(raw.get("co_changed_with") or []),
                "symbols": list(raw.get("symbols") or []),
            }

        async with driver.session() as session:
            result = await session.run(query, repo_id=repo_id)
            async for record in result:
                n = record["n"]
                ingest_file_node(dict(n) if n else None)

                m = record["m"]
                r_rel = record["r"]
                ingest_file_node(dict(m) if m else None)

                if r_rel is not None and n is not None and m is not None:
                    n_id = n.get("id")
                    m_id = m.get("id")
                    rel_type = (r_rel.type or "IMPORTS").lower()
                    edge_id = f"{n_id}|{rel_type}|{m_id}"
                    if edge_id not in seen_edge_ids:
                        seen_edge_ids.add(edge_id)
                        code_edges.append(
                            {
                                "id": edge_id,
                                "source": n_id,
                                "target": m_id,
                                "type": rel_type,
                            }
                        )

        if not files_by_id:
            return [], []

        _recompute_live_graph_metrics(files_by_id, code_edges)

        root = _DirTrie()
        for props in files_by_id.values():
            rel = props.get("path") or props.get("name")
            if rel:
                _trie_insert(root, rel)

        folder_nodes, tree_edges, positions = _layout_directory_tree(
            repo_id, root, files_by_id
        )

        file_nodes: list[dict] = []
        for nid, payload in files_by_id.items():
            pos = positions.get(nid, (0.0, 0.0, 0.0))
            file_nodes.append({**payload, "position": pos})

        real_folder_nodes: list[dict] = []
        for payload in folder_nodes:
            pos = positions.get(payload.get("id"), (0.0, 0.0, 0.0))
            real_folder_nodes.append({**payload, "position": pos})

        _rollup_folder_intel(real_folder_nodes, file_nodes)

        nodes_out = real_folder_nodes + file_nodes
        edges_out = tree_edges + code_edges
        return nodes_out, edges_out

    async def store_parsed_repo(
        self,
        repo_id: str,
        parsed_files: list,
        summaries: dict,
        embeddings: dict,
        clone_root: Path | None = None,
    ):
        """
        Clears the existing graph for the repo, then bulk inserts new nodes and relationships.
        parsed_files is a list of tuples: (FileInfo, ParsedFile)
        clone_root: on-disk clone used for git history / blame signals (optional).
        """
        driver = self._get_async_driver()
        
        async with driver.session() as session:
            # 1. Clear old data for this repo to prevent duplication on re-runs
            await session.run("MATCH (n:File {repo_id: $repo_id}) DETACH DELETE n", repo_id=repo_id)

            # Build graph topology in memory first so node metrics are real (degree, orphan, impact score)
            path_to_parsed = {f.path: parsed for f, parsed in parsed_files}
            valid_paths = set(path_to_parsed.keys())

            def resolve_target_path(import_value: str, source_path: str):
                imp_clean = import_value.strip().strip('"\' ')
                
                # Support common alias patterns
                if imp_clean.startswith("@/"):
                    imp_clean = imp_clean.replace("@/", "src/")
                
                # 1. Handle explicit relative imports (./ or ../)
                if imp_clean.startswith("."):
                    import os
                    try:
                        dir_name = os.path.dirname(source_path)
                        joined = os.path.join(dir_name, imp_clean)
                        # Normalize to forward slashes for matching against valid_paths
                        resolved_rel = os.path.normpath(joined).replace("\\", "/")
                        
                        # Check exact or extension-agnostic match
                        for vp in valid_paths:
                            if vp == resolved_rel or vp.rsplit(".", 1)[0] == resolved_rel:
                                return vp
                    except Exception:
                        pass

                # 2. Strategy: strict exact match (ignoring extensions)
                normalized_imp = imp_clean.replace(".", "/")
                target = next(
                    (
                        p for p in valid_paths
                        if normalized_imp == p.rsplit(".", 1)[0] or imp_clean == p.rsplit(".", 1)[0]
                    ),
                    None
                )
                if target:
                    return target

                # 3. Strategy: suffix/path contains match
                target = next((p for p in valid_paths if imp_clean in p or normalized_imp in p), None)
                if target:
                    return target

                # 4. Strategy: Java/Kotlin class name fallback
                if "." in imp_clean:
                    class_name = imp_clean.split(".")[-1]
                    target = next(
                        (p for p in valid_paths if p.endswith(f"{class_name}.java") or p.endswith(f"{class_name}.kt")),
                        None
                    )
                    if target:
                        return target

                # 5. Strategy: filename component match
                last = imp_clean.split("/")[-1].split(".")[-1]
                if last:
                    target = next((p for p in valid_paths if last in p.split("/")[-1]), None)
                    if target:
                        return target

                return None

            dependency_edges = set()
            for f, parsed in parsed_files:
                for imp_val, _imp_type in parsed.imports:
                    target_path = resolve_target_path(imp_val, f.path)
                    if target_path and target_path != f.path:
                        dependency_edges.add((f.path, target_path))

            class_first_path: dict[str, str] = {}
            for path, pf in path_to_parsed.items():
                for cname, _ in pf.classes:
                    simple = cname.split("<")[0].strip()
                    if simple and simple not in class_first_path:
                        class_first_path[simple] = path

            def resolve_via_binding(
                symbol: str, bindings: list[tuple[str, str]], source_path: str
            ) -> str | None:
                for local, mod in bindings:
                    if local == symbol:
                        return resolve_target_path(mod, source_path)
                return None

            def resolve_extend_ref(
                base_str: str,
                source_path: str,
                bindings: list[tuple[str, str]],
            ) -> str | None:
                ref = base_str.strip()
                if not ref:
                    return None
                t = resolve_target_path(ref, source_path)
                if t and t != source_path:
                    return t
                t = resolve_via_binding(ref, bindings, source_path)
                if t and t != source_path:
                    return t
                head, _, tail = ref.partition(".")
                t = resolve_via_binding(head, bindings, source_path)
                if t and t != source_path:
                    return t
                simple = (tail or ref).split("<")[0].strip()
                if simple in class_first_path:
                    p = class_first_path[simple]
                    if p != source_path:
                        return p
                t = resolve_via_binding(simple, bindings, source_path)
                if t and t != source_path:
                    return t
                return None

            def resolve_call_ref(
                root: str,
                source_path: str,
                bindings: list[tuple[str, str]],
                local_defs: set[str],
            ) -> str | None:
                r = root.strip()
                if not r or r in local_defs:
                    return None
                t = resolve_via_binding(r, bindings, source_path)
                if t and t != source_path:
                    return t
                if r[:1].isupper() and r in class_first_path:
                    p = class_first_path[r]
                    if p != source_path:
                        return p
                return None

            extends_edges: set[tuple[str, str]] = set()
            call_edges: set[tuple[str, str]] = set()
            for f, parsed in parsed_files:
                bindings = parsed.import_bindings
                local_defs = {fn for fn, _, _ in parsed.functions}
                local_defs |= {cn.split("<")[0].strip() for cn, _ in parsed.classes}
                for base in parsed.extends_targets:
                    tgt = resolve_extend_ref(base, f.path, bindings)
                    if tgt:
                        extends_edges.add((f.path, tgt))
                for root in parsed.call_roots:
                    tgt = resolve_call_ref(root, f.path, bindings, local_defs)
                    if tgt:
                        call_edges.add((f.path, tgt))

            graph = nx.DiGraph()
            graph.add_nodes_from(valid_paths)
            graph.add_edges_from(
                dependency_edges | extends_edges | call_edges
            )

            impact_scores = {}
            if graph.number_of_nodes() > 0:
                try:
                    impact_scores = nx.pagerank(graph, alpha=0.85)
                except Exception as e:
                    logger.warning("pagerank_failed", repo_id=repo_id, error=str(e))

            circular_import_paths = _circular_import_nodes(dependency_edges, valid_paths)

            root_path = Path(clone_root) if clone_root is not None else None
            git_intel: dict[str, dict] = {}
            if root_path and root_path.exists():
                try:
                    git_intel = await asyncio.to_thread(
                        gather_git_file_intel,
                        root_path,
                        list(valid_paths),
                    )
                except Exception as e:
                    logger.warning("git_intel_failed", repo_id=repo_id, error=str(e))

            # 2. Insert all Nodes
            node_query = """
            UNWIND $batch AS data
            CREATE (n:File {
                id: data.id,
                repo_id: $repo_id,
                name: data.name,
                extension: data.extension,
                role: data.role,
                summary: data.summary,
                code: data.code,
                embedding: data.embedding,
                impact_score: data.impact_score,
                size: data.size,
                color: data.color,
                intel_signal: data.intel_signal,
                in_degree: data.in_degree,
                out_degree: data.out_degree,
                is_orphan: data.is_orphan,
                is_entry_point: data.is_entry_point,
                line_count: data.line_count,
                function_count: data.function_count,
                class_count: data.class_count,
                export_count: data.export_count,
                language: data.language,
                last_modified: data.last_modified,
                primary_author: data.primary_author,
                change_frequency: data.change_frequency,
                circular_dep: data.circular_dep,
                external_deps: data.external_deps,
                co_changed_with: data.co_changed_with,
                symbols: data.symbols
            })
            """
            
            node_batch = []
            for f, parsed in parsed_files:
                in_degree = int(graph.in_degree(f.path)) if f.path in graph else 0
                out_degree = int(graph.out_degree(f.path)) if f.path in graph else 0
                is_orphan = (in_degree + out_degree) == 0
                impact_score = float(impact_scores.get(f.path, 0.0))

                # Tier classification based on role + connectivity.
                if parsed.is_entry_point:
                    role = "Entry"
                elif (len(parsed.functions) + len(parsed.classes) >= 4) or out_degree >= 3 or in_degree >= 3:
                    role = "Core"
                else:
                    role = "Util"

                size = round(min(8.0, 2.0 + (impact_score * 16.0) + ((in_degree + out_degree) * 0.15)), 2)

                line_count = len(f.content.splitlines()) if f.content else 0
                function_count = len(parsed.functions)
                class_count = len(parsed.classes)
                export_count = _export_count(parsed, f.extension)
                language = _language_label(f.extension)
                ext_pkgs = _external_packages_for_parsed(parsed, f.extension)

                path_key = f.path.replace("\\", "/").strip()
                gmeta = git_intel.get(path_key, git_intel.get(f.path, {}))
                last_modified = str(gmeta.get("last_modified", "") or "")
                primary_author = str(gmeta.get("primary_author", "") or "")
                change_frequency = int(gmeta.get("change_frequency", 0) or 0)
                co_changed_with = list(gmeta.get("co_changed_with") or [])
                circular_file = f.path in circular_import_paths

                intel_sig, intel_color = intel_signal_and_color(
                    circular_dep=circular_file,
                    change_frequency=change_frequency,
                    class_count=class_count,
                    function_count=function_count,
                    export_count=export_count,
                    in_degree=in_degree,
                    out_degree=out_degree,
                    role=role,
                )

                node_batch.append({
                    "id": f"{repo_id}:{f.path}",
                    "name": f.path,
                    "extension": f.extension,
                    "role": role,
                    "summary": summaries.get(f.path, ""),
                    "code": f.content,
                    "embedding": embeddings.get(f.path, [0.0] * 768),
                    "impact_score": impact_score,
                    "size": size,
                    "color": intel_color,
                    "intel_signal": intel_sig,
                    "in_degree": in_degree,
                    "out_degree": out_degree,
                    "is_orphan": is_orphan,
                    "is_entry_point": parsed.is_entry_point,
                    "line_count": line_count,
                    "function_count": function_count,
                    "class_count": class_count,
                    "export_count": export_count,
                    "language": language,
                    "last_modified": last_modified,
                    "primary_author": primary_author,
                    "change_frequency": change_frequency,
                    "circular_dep": circular_file,
                    "external_deps": ext_pkgs,
                    "co_changed_with": co_changed_with,
                    "symbols": ([fn[0] for fn in parsed.functions] + [cn[0] for cn in parsed.classes])[:50],
                })
            
            logger.info("neo4j_writing_nodes", repo_id=repo_id, count=len(node_batch))
            if node_batch:
                await session.run(node_query, repo_id=repo_id, batch=node_batch)
                
            # 3. Insert relationships (Imports -> Targets)
            edge_query = """
            UNWIND $batch AS rel
            MATCH (source:File {id: rel.source_id})
            MATCH (target:File {id: rel.target_id})
            MERGE (source)-[:IMPORTS]->(target)
            """
            
            edge_batch = []
            for source_path, target_path in dependency_edges:
                edge_batch.append({
                    "source_id": f"{repo_id}:{source_path}",
                    "target_id": f"{repo_id}:{target_path}"
                })
            
            logger.info(
                "neo4j_writing_import_edges",
                repo_id=repo_id,
                count=len(edge_batch),
            )
            if edge_batch:
                await session.run(edge_query, batch=edge_batch)

            extends_batch = [
                {
                    "source_id": f"{repo_id}:{s}",
                    "target_id": f"{repo_id}:{t}",
                }
                for s, t in extends_edges
            ]
            extends_query = """
            UNWIND $batch AS rel
            MATCH (source:File {id: rel.source_id})
            MATCH (target:File {id: rel.target_id})
            MERGE (source)-[:EXTENDS]->(target)
            """
            logger.info(
                "neo4j_writing_extends_edges", repo_id=repo_id, count=len(extends_batch)
            )
            if extends_batch:
                await session.run(extends_query, batch=extends_batch)

            calls_batch = [
                {
                    "source_id": f"{repo_id}:{s}",
                    "target_id": f"{repo_id}:{t}",
                }
                for s, t in call_edges
            ]
            calls_query = """
            UNWIND $batch AS rel
            MATCH (source:File {id: rel.source_id})
            MATCH (target:File {id: rel.target_id})
            MERGE (source)-[:CALLS]->(target)
            """
            logger.info(
                "neo4j_writing_call_edges", repo_id=repo_id, count=len(calls_batch)
            )
            if calls_batch:
                await session.run(calls_query, batch=calls_batch)

neo4j_service = Neo4jService()
