import re

def check(placeholder_content):
    _match = re.match(
        r"^([^.|\s}]+)(?:\.[^|\s}]+)*(?:\s*\|\s*[^:}]+(?::[^}]+)?)?$", placeholder_content
    )
    return _match.group(1) if _match else None

print(check("status | "))
print(check("status | fallback"))
print(check("current_time_America/New_York"))
