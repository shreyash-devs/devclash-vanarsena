import math
from dataclasses import dataclass, field

import structlog
import networkx as nx
from neo4j import GraphDatabase, AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable

from app.config import Settings

logger = structlog.get_logger()
settings = Settings()


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
            files_by_id[node_id] = {
                "id": node_id,
                "label": name.split("/")[-1] if name else node_id,
                "type": "file",
                "role": raw.get("role", "Util"),
                "path": name,
                "summary": raw.get("summary", ""),
                "code": raw.get("code", ""),
                "impact_score": raw.get("impact_score", 0.0),
                "size": raw.get("size", 2.0),
                "color": raw.get("color", "#FFFFFF"),
                "in_degree": raw.get("in_degree", 0),
                "out_degree": raw.get("out_degree", 0),
                "is_orphan": raw.get("is_orphan", False),
                "is_entry_point": raw.get("is_entry_point", False),
            }

        async with driver.session() as session:
            result = await session.run(query, repo_id=repo_id)
            async for record in result:
                n = record["n"]
                ingest_file_node(dict(n) if n else None)

                m = record["m"]
                r_rel = record["r"]
                ingest_file_node(dict(m) if m else None)

                if r_rel and n and m:
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

        nodes_out = real_folder_nodes + file_nodes
        edges_out = tree_edges + code_edges
        return nodes_out, edges_out

    async def store_parsed_repo(self, repo_id: str, parsed_files: list, summaries: dict, embeddings: dict):
        """
        Clears the existing graph for the repo, then bulk inserts new nodes and relationships.
        parsed_files is a list of tuples: (FileInfo, ParsedFile)
        """
        driver = self._get_async_driver()
        
        async with driver.session() as session:
            # 1. Clear old data for this repo to prevent duplication on re-runs
            await session.run("MATCH (n:File {repo_id: $repo_id}) DETACH DELETE n", repo_id=repo_id)

            # Build graph topology in memory first so node metrics are real (degree, orphan, impact score)
            path_to_parsed = {f.path: parsed for f, parsed in parsed_files}
            valid_paths = set(path_to_parsed.keys())

            def resolve_target_path(import_value: str):
                imp_clean = import_value.strip().strip('"\' ')
                normalized_imp = imp_clean.replace(".", "/")

                # Strategy 1: strict exact match (ignoring extensions)
                target = next(
                    (
                        p for p in valid_paths
                        if normalized_imp == p.rsplit(".", 1)[0] or imp_clean == p.rsplit(".", 1)[0]
                    ),
                    None
                )
                if target:
                    return target

                # Strategy 2: suffix/path contains match
                target = next((p for p in valid_paths if imp_clean in p or normalized_imp in p), None)
                if target:
                    return target

                # Strategy 3: Java/Kotlin class name fallback
                if "." in imp_clean:
                    class_name = imp_clean.split(".")[-1]
                    target = next(
                        (p for p in valid_paths if p.endswith(f"{class_name}.java") or p.endswith(f"{class_name}.kt")),
                        None
                    )
                    if target:
                        return target

                # Strategy 4: filename component match
                last = imp_clean.split("/")[-1].split(".")[-1]
                if last:
                    target = next((p for p in valid_paths if last in p.split("/")[-1]), None)
                    if target:
                        return target

                return None

            dependency_edges = set()
            for f, parsed in parsed_files:
                for imp_val, _imp_type in parsed.imports:
                    target_path = resolve_target_path(imp_val)
                    if target_path and target_path != f.path:
                        dependency_edges.add((f.path, target_path))

            class_first_path: dict[str, str] = {}
            for path, pf in path_to_parsed.items():
                for cname, _ in pf.classes:
                    simple = cname.split("<")[0].strip()
                    if simple and simple not in class_first_path:
                        class_first_path[simple] = path

            def resolve_via_binding(
                symbol: str, bindings: list[tuple[str, str]]
            ) -> str | None:
                for local, mod in bindings:
                    if local == symbol:
                        return resolve_target_path(mod)
                return None

            def resolve_extend_ref(
                base_str: str,
                source_path: str,
                bindings: list[tuple[str, str]],
            ) -> str | None:
                ref = base_str.strip()
                if not ref:
                    return None
                t = resolve_target_path(ref)
                if t and t != source_path:
                    return t
                t = resolve_via_binding(ref, bindings)
                if t and t != source_path:
                    return t
                head, _, tail = ref.partition(".")
                t = resolve_via_binding(head, bindings)
                if t and t != source_path:
                    return t
                simple = (tail or ref).split("<")[0].strip()
                if simple in class_first_path:
                    p = class_first_path[simple]
                    if p != source_path:
                        return p
                t = resolve_via_binding(simple, bindings)
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
                t = resolve_via_binding(r, bindings)
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
                in_degree: data.in_degree,
                out_degree: data.out_degree,
                is_orphan: data.is_orphan,
                is_entry_point: data.is_entry_point
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

                color = "#A78BFA" if role == "Entry" else "#60A5FA" if role == "Core" else "#9CA3AF"
                size = round(min(8.0, 2.0 + (impact_score * 16.0) + ((in_degree + out_degree) * 0.15)), 2)
                
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
                    "color": color,
                    "in_degree": in_degree,
                    "out_degree": out_degree,
                    "is_orphan": is_orphan,
                    "is_entry_point": parsed.is_entry_point
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
