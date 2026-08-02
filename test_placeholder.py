import re
import json

def validate_placeholders(template_str, param_type_map, system_prefixes):
    pos = 0
    while True:
        idx = template_str.find("{{", pos)
        if idx == -1:
            break
            
        end_idx = template_str.find("}}", idx + 2)
        if end_idx == -1:
            raise ValueError("Malformed body template: unmatched '{{' found.")
            
        # Check for nested {{ before the matching }}
        next_idx = template_str.find("{{", idx + 2)
        if next_idx != -1 and next_idx < end_idx:
            raise ValueError("Malformed body template: nested '{{' found.")
            
        placeholder_content = template_str[idx + 2:end_idx].strip()
        
        # Must match our syntax: name[.path] [| fallback]
        match = re.match(r"^([^.|\s}]+)(?:\.[^|\s}]+)*(?:\s*\|[^}]*)?$", placeholder_content)
        if not match:
            raise ValueError(f"Malformed body template: invalid placeholder syntax '{{{{{placeholder_content}}}}}'.")
            
        top_level_name = match.group(1)
        if top_level_name not in system_prefixes and top_level_name not in param_type_map:
            raise ValueError(f"Undeclared placeholder: '{{{{{top_level_name}}}}}' is not a configured parameter.")
            
        pos = end_idx + 2

try:
    validate_placeholders('{"foo": "{{ not_configured }}"}', {}, {"initial_context"})
    print("Failed to catch undeclared")
except ValueError as e:
    print(f"Caught: {e}")

try:
    validate_placeholders('{"foo": "{{ not_configured"}', {}, {"initial_context"})
    print("Failed to catch unmatched")
except ValueError as e:
    print(f"Caught: {e}")
