SUMMARY_PROMPT = """
You are an expert developer. Summarize the following file in 1-2 sentences. 
Start directly with what the file does. Do NOT start with "This file...", or "It is a...".
Filename: {filename}
Language: {language}

Content:
{content}
"""

CLASSIFY_PROMPT = """
Analyze the file based on its name and imports, and classify it into EXACTLY ONE of the following tiers: entry | logic | util | config

Filename: {filename}
Imports: {imports}

Reply with the classification word only, nothing else.
"""

NL_QUERY_PROMPT = """
Parse the user's natural language query about a codebase architecture into a structured JSON configuration.
Return ONLY valid JSON with the exact keys: "keywords", "file_patterns", "intent", "explanation". 
Do NOT wrap the JSON in markdown code blocks.

Query: {query}
Sample files in codebase: {sample_files}
"""

ONBOARDING_PROMPT = """
You are a senior staff engineer creating an onboarding guide for a new developer joining this repository.
Generate a structured reading guide in Markdown format.
Include an overview paragraph explaining the repository based on its metadata, followed by per-file reading notes highlighting key components.

Repository Name: {repo_name}
Primary Language: {primary_language}
Total Files: {file_count}

Key Files to Review:
{file_list}
"""

IMPACT_SUMMARY_PROMPT = """
Explain in exactly one sentence why this high-impact file matters architecturally.

Filename: {filename}
In-Degree (files depending on this): {in_degree}
Out-Degree (files this depends on): {out_degree}
Sample Dependents: {dependents_sample}
"""
